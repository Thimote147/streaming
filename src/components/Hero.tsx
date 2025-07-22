import React, { memo } from 'react';
import { Play, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MediaItem } from '../services/api';
import { useMovieData } from '../hooks/useMovieData';
import { HeroSkeleton } from './SkeletonLoader';
import { usePlayer } from '../utils/usePlayer';

interface HeroProps {
  featuredMedia?: MediaItem;
  onMoreInfo: (media: MediaItem) => void;
}

const Hero: React.FC<HeroProps> = memo(({ featuredMedia, onMoreInfo }) => {
  const { poster, backdrop, frenchTitle, frenchDescription, releaseYear } = useMovieData(featuredMedia?.title || '', featuredMedia?.year, featuredMedia?.type);
  const { startPlaying } = usePlayer();

  // Show skeleton only for initial load when we have no media at all
  if (!featuredMedia) {
    return <HeroSkeleton />;
  }

  const defaultFeaturedMedia: MediaItem = {
    id: 'featured',
    title: 'Bienvenue sur votre plateforme de streaming',
    path: '',
    type: 'movie',
    description: 'Découvrez une large sélection de films, Series et musiques disponibles sur votre serveur personnel. Profitez d\'une expérience de streaming optimisée avec une interface moderne et intuitive.',
    year: 2024,
    genre: 'Streaming'
  };

  const media = featuredMedia || defaultFeaturedMedia;
  
  // Use French title and description if available for featured media
  const displayTitle = featuredMedia && frenchTitle ? frenchTitle : media.title;
  const displayYear = featuredMedia && releaseYear ? releaseYear : media.year;
  const displayDescription = featuredMedia && frenchDescription ? frenchDescription : media.description;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image/Video */}
      <div className="absolute inset-0">
        {/* Movie Backdrop/Poster Background */}
        <div 
          className="absolute inset-0 bg-no-repeat bg-center transition-all duration-500"
          style={{
            backgroundImage: (backdrop || poster) ? `url(${backdrop || poster})` : 'linear-gradient(to right, #111827, #1f2937, #000000)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
        
        {/* Responsive gradient overlays with smooth transitions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20 transition-all duration-700 ease-in-out" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent transition-all duration-700 ease-in-out" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center h-full transition-all duration-300">
        <div className="container mx-auto px-4 md:px-8 pt-24 md:pt-32 transition-all duration-300">
          <div className="max-w-2xl w-full">
            <motion.h1 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-white mb-3 md:mb-4 leading-tight transition-all duration-300"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {displayTitle}
            </motion.h1>
            
            <motion.p 
              className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mb-4 md:mb-6 leading-relaxed overflow-hidden transition-all duration-300"
              style={{ 
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical'
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {displayDescription}
            </motion.p>

            {/* Media Info */}
            <motion.div 
              className="flex flex-wrap items-center gap-2 mb-4 md:mb-6 text-xs md:text-sm transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {displayYear && (
                <span className="bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-200 transition-all duration-300">
                  {displayYear}
                </span>
              )}
              {media.genre && (
                <span className="bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-200 transition-all duration-300">
                  {media.genre}
                </span>
              )}
              <span className="bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-200 capitalize transition-all duration-300">
                {media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'}
              </span>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 w-full transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <motion.button
                onClick={() => startPlaying(media)}
                className="bg-white text-black px-4 sm:px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base shadow-lg backdrop-blur-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play size={18} fill="currentColor" />
                <span>Lecture</span>
              </motion.button>
              
              <motion.button
                onClick={() => onMoreInfo(media)}
                className="bg-gray-600/90 backdrop-blur-sm text-white px-4 sm:px-6 py-3 rounded-lg font-semibold hover:bg-gray-500/90 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base shadow-lg border border-gray-500/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Info size={18} />
                <span>Plus d'infos</span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
});

Hero.displayName = 'Hero';

export default Hero;