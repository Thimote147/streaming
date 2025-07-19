import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import ContinueWatching from '../components/WatchProgress/ContinueWatching';
import { streamingAPI } from '../services/api';
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

  const handlePlay = (media: MediaItem) => {
    navigate(`/player/${encodeURIComponent(media.id)}`);
  };

  const handleContinueWatching = (moviePath: string, startTime?: number) => {
    // Trouver le media correspondant ou créer une navigation directe
    navigate(`/player/${encodeURIComponent(moviePath)}${startTime ? `?t=${startTime}` : ''}`);
  };

  const handleMoreInfo = (media: MediaItem) => {
    const route = media.type === 'movie' ? 'films' : media.type === 'series' ? 'series' : 'films';
    const title = media.frenchTitle || media.title;
    navigate(`/${route}/${encodeURIComponent(title)}`);
  };

  const handleAddToList = (media: MediaItem) => {
    // TODO: Implement add to watchlist
    console.log('Add to list:', media.title);
  };

  const getFeaturedMedia = (): MediaItem | undefined => {
    const allItems = categories.flatMap(cat => cat.items);
    return allItems.length > 0 ? allItems[0] : undefined;
  };

  const getShuffledCategories = () => {
    return categories.map(category => ({
      ...category,
      items: [...category.items].sort(() => Math.random() - 0.5)
    }));
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
          onPlay={handlePlay}
          onMoreInfo={handleMoreInfo}
        />
      </motion.section>

      {/* Content Sections */}
      <section className="relative -mt-32 pb-12">
        {/* Continue Watching Section */}
        <div className="px-4 md:px-8 lg:px-12 mb-8">
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
                onPlay={handlePlay}
                onMoreInfo={handleMoreInfo}
                onAddToList={handleAddToList}
                useHorizontalScroll={true}
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