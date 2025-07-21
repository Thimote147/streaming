import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MediaRow from '../components/MediaRow';
import { streamingAPI } from '../services/api';
import { cleanTitleForUrl } from '../utils/urlUtils';
import type { MediaItem } from '../services/api';

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (query.trim()) {
      handleSearch(query);
    }
  }, [query]);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.trim()) {
      try {
        setIsLoading(true);
        const results = await streamingAPI.searchMedia(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handlePlay = (media: MediaItem) => {
    let navigationUrl: string;
    
    // 1. Détecter si c'est un épisode (seasonNumber et episodeNumber existent)
    if (media.seasonNumber && media.episodeNumber) {
      const seriesName = media.seriesTitle || media.title;
      const cleanSeriesName = seriesName.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      
      const seasonFormatted = media.seasonNumber.toString().padStart(2, '0');
      const episodeFormatted = media.episodeNumber.toString().padStart(2, '0');
      
      navigationUrl = `/player/series/${cleanSeriesName}/s${seasonFormatted}/e${episodeFormatted}`;
    } 
    // 2. Film de saga avec sequelNumber
    else if (media.sequelNumber && media.type === 'movie') {
      const baseTitle = media.title
        .replace(/\s+\d+$/g, '')
        .replace(/\s+(I{1,4}|V|VI{1,3}|IX|X)$/g, '');
      
      const baseName = baseTitle.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      
      navigationUrl = `/player/films/${baseName}/${media.sequelNumber}`;
    } 
    // 3. Série avec sequelNumber
    else if (media.sequelNumber && media.type === 'series') {
      const baseTitle = media.title
        .replace(/\s+\d+$/g, '')
        .replace(/\s+(I{1,4}|V|VI{1,3}|IX|X)$/g, '');
      
      const baseName = baseTitle.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      
      navigationUrl = `/player/series/${baseName}/${media.sequelNumber}`;
    } 
    // 4. Fichier musical
    else if (media.type === 'music') {
      navigationUrl = `/player/musiques/${media.id}`;
    } 
    // 5. Fallback
    else {
      navigationUrl = `/player/${encodeURIComponent(media.id)}`;
    }
    
    navigate(navigationUrl);
  };

  const handleMoreInfo = (media: MediaItem) => {
    const route = media.type === 'movie' ? 'films' : media.type === 'series' ? 'series' : media.type === 'music' ? 'musiques' : 'films';
    const title = media.frenchTitle || media.title;
    const cleanTitle = cleanTitleForUrl(title);
    navigate(`/${route}/${cleanTitle}`);
  };

  const handleAddToList = (media: MediaItem) => {
    // TODO: Implement add to watchlist
    console.log('Add to list:', media.title);
  };

  return (
    <main className="pt-20 pb-12">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-white text-lg">Recherche en cours...</p>
          </div>
        </div>
      ) : (
        <>
          {searchResults.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <MediaRow
                title={`Résultats pour "${query}"`}
                items={searchResults}
                onPlay={handlePlay}
                onMoreInfo={handleMoreInfo}
                onAddToList={handleAddToList}
                useHorizontalScroll={false}
              />
            </motion.div>
          ) : query.trim() ? (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-gray-400 text-lg">
                Aucun résultat trouvé pour "{query}"
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-gray-400 text-lg">
                Effectuez une recherche pour voir les résultats
              </p>
            </motion.div>
          )}
        </>
      )}
    </main>
  );
};

export default Search;