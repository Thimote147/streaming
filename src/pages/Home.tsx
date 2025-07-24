import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import ContinueWatching from '../components/WatchProgress/ContinueWatching';
import { streamingAPI } from '../services/api';
import { cleanTitleForUrl } from '../utils/urlUtils';
import type { MediaItem, MediaCategory } from '../services/api';

const Home: React.FC = () => {
  const [categories, setCategories] = useState<MediaCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await streamingAPI.fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // handlePlay removed - using global MiniPlayer with startPlaying instead

  const handleMoreInfo = (media: MediaItem) => {
    const route = media.type === 'movie' ? 'films' : media.type === 'series' ? 'series' : media.type === 'music' ? 'musiques' : 'films';
    const title = media.frenchTitle || media.title;
    const cleanTitle = cleanTitleForUrl(title);
    navigate(`/${route}/${cleanTitle}`);
  };

  const handleAddToList = (media: MediaItem) => {
    console.log('Add to list:', media.title);
  };

  const handleContinueWatching = (moviePath: string) => {
    const fileName = moviePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
    const isMusic = /\.(mp3|flac|wav)$/i.test(moviePath);
    const isSeries = moviePath.includes('/Series/') || /S\d{2}E\d{2}/i.test(fileName);
    
    let navigationUrl: string;
    
    if (isMusic) {
      const cleanTitle = cleanTitleForUrl(fileName);
      navigationUrl = `/player/musiques/${cleanTitle}`;
    } else if (isSeries) {
      const episodeMatch = fileName.match(/(.+?)[.\s]+S(\d+?)E(\d+)/i);
      if (episodeMatch) {
        const [, seriesTitle, season, episode] = episodeMatch;
        const cleanSeriesTitle = cleanTitleForUrl(seriesTitle);
        const seasonFormatted = `s${season.padStart(2, '0')}`;
        const episodeFormatted = `e${episode.padStart(2, '0')}`;
        navigationUrl = `/player/series/${cleanSeriesTitle}/${seasonFormatted}/${episodeFormatted}`;
      } else {
        const cleanTitle = cleanTitleForUrl(fileName);
        navigationUrl = `/player/series/${cleanTitle}`;
      }
    } else {
      // Movies - need to extract sequel number or default to 1
      const sequelMatch = fileName.match(/(.+?)\s+(\d+)$/);
      if (sequelMatch) {
        const [, baseTitle, number] = sequelMatch;
        const cleanTitle = cleanTitleForUrl(baseTitle);
        navigationUrl = `/player/films/${cleanTitle}/${number}`;
      } else {
        const cleanTitle = cleanTitleForUrl(fileName);
        navigationUrl = `/player/films/${cleanTitle}/1`;
      }
    }
    
    navigate(navigationUrl);
  };

  const getFeaturedMedia = () => {
    if (categories.length === 0) return undefined;
    const allItems = categories.flatMap(cat => cat.items);
    return allItems[0];
  };

  const getShuffledCategories = () => {
    return [...categories];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement de votre contenu...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <Hero
          featuredMedia={getFeaturedMedia()}
          onMoreInfo={handleMoreInfo}
        />
      </motion.section>

      {/* Content Sections */}
      <section className="relative -mt-20">
        {/* Continue Watching Section */}
        <div className="px-4 md:px-8 lg:px-12 mb-8 pt-8">
          <ContinueWatching onMovieSelect={handleContinueWatching} />
        </div>

        <AnimatePresence>
          {getShuffledCategories().map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <MediaRow
                title={category.name}
                items={category.items}
                onMoreInfo={handleMoreInfo}
                onAddToList={handleAddToList}
                useHorizontalScroll={true}
                isLast={index === getShuffledCategories().length - 1}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {categories.length === 0 && (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-gray-400 text-lg">Aucun contenu disponible</p>
          </motion.div>
        )}
      </section>
    </main>
  );
};

export default Home;