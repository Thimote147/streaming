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
    if (media.type === 'music') {
      navigate(`/player/musiques/${media.id}`);
    } else {
      navigate(`/player/${encodeURIComponent(media.id)}`);
    }
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