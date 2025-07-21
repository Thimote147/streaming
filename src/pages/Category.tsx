import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import MediaRow from '../components/MediaRow';
import { streamingAPI } from '../services/api';
import { cleanTitleForUrl } from '../utils/urlUtils';
import type { MediaItem } from '../services/api';

const Category: React.FC = () => {
  const { categoryType } = useParams<{ categoryType: string }>();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (categoryType) {
      loadCategoryContent(categoryType);
    }
  }, [categoryType]);

  const loadCategoryContent = async (category: string) => {
    try {
      setIsLoading(true);
      const data = await streamingAPI.fetchCategoryContent(category);
      setItems(data);
    } catch (error) {
      console.error(`Error loading ${category}:`, error);
    } finally {
      setIsLoading(false);
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

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'Films':
        return 'Films';
      case 'Series':
        return 'Series';
      case 'Musiques':
        return 'Musiques';
      default:
        return category;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement du contenu...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="pt-20 pb-12">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.5 }}
        >
          <MediaRow
            title={getCategoryDisplayName(categoryType || '')}
            items={items}
            onPlay={handlePlay}
            onMoreInfo={handleMoreInfo}
            onAddToList={handleAddToList}
            useHorizontalScroll={false}
          />
        </motion.div>
      </AnimatePresence>

      {/* Empty State */}
      {items.length === 0 && (
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-gray-400 text-lg">Aucun contenu disponible</p>
        </motion.div>
      )}
    </main>
  );
};

export default Category;