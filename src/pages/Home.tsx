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

  const handlePlay = (media: MediaItem) => {
    let navigationUrl: string;
    
    // 0. Détecter les groupes de sequels (hero section avec ID comme "sequel_john_wick")
    if (media.id?.startsWith('sequel_') && media.isGroup && media.episodes && media.episodes.length > 0) {
      // Pour les groupes de sequels, jouer le premier épisode
      const firstEpisode = media.episodes[0];
      if (firstEpisode.sequelNumber) {
        const baseName = media.title.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_');
        navigationUrl = `/player/films/${baseName}/${firstEpisode.sequelNumber}`;
      } else {
        navigationUrl = `/player/${encodeURIComponent(firstEpisode.id)}`;
      }
    }
    // 1. Détecter si c'est un épisode (seasonNumber et episodeNumber existent)
    else if (media.seasonNumber && media.episodeNumber) {
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

  const handleContinueWatching = (moviePath: string) => {
    // Extraire le titre du fichier à partir du chemin
    const fileName = moviePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
    
    // Détecter le type de média
    const isMusic = /\.(mp3|flac|wav)$/i.test(moviePath);
    const isSeries = moviePath.includes('/Series/') || /S\d{2}E\d{2}/i.test(fileName);
    
    let navigationUrl: string;
    
    if (isMusic) {
      // Pour la musique, utiliser l'ID basé sur le nom de fichier avec underscores
      const cleanFileName = fileName.replace(/\s+/g, '_');
      navigationUrl = `/player/musiques/${cleanFileName}`;
    } else if (isSeries) {
      // Pour les séries, essayer d'extraire les informations
      const episodeMatch = fileName.match(/(.+?)\s*S(\d{2})E(\d{2})/i);
      if (episodeMatch) {
        const [, seriesName, season, episode] = episodeMatch;
        const cleanSeriesName = seriesName.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_');
        navigationUrl = `/player/series/${cleanSeriesName}/s${season}/e${episode}`;
      } else {
        // Fallback pour les séries
        navigationUrl = `/player/${encodeURIComponent(moviePath)}`;
      }
    } else {
      // Pour les films, vérifier s'il y a un numéro de suite
      const sequelMatch = fileName.match(/(.+?)\s+(\d+)$/);
      if (sequelMatch) {
        const [, baseName, sequelNumber] = sequelMatch;
        const cleanBaseName = baseName.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_');
        navigationUrl = `/player/films/${cleanBaseName}/${sequelNumber}`;
      } else {
        // Fallback pour les films simples
        navigationUrl = `/player/${encodeURIComponent(moviePath)}`;
      }
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
      <section className="relative -mt-32">
        {/* Continue Watching Section */}
        <div className="px-4 md:px-8 lg:px-12 mb-2">
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