import React from 'react';
import { Play, Info, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MediaItem } from '../services/api';
import { useMovieData } from '../hooks/useMovieData';

interface HeroProps {
  featuredMedia?: MediaItem;
  onPlay: (media: MediaItem) => void;
  onMoreInfo: (media: MediaItem) => void;
}

const Hero: React.FC<HeroProps> = ({ featuredMedia, onPlay, onMoreInfo }) => {
  const [isMuted, setIsMuted] = React.useState(true);
  const { poster, backdrop, frenchTitle, frenchDescription } = useMovieData(featuredMedia?.title || '', featuredMedia?.year, featuredMedia?.type);

  const defaultFeaturedMedia: MediaItem = {
    id: 'featured',
    title: 'Bienvenue sur votre plateforme de streaming',
    path: '',
    type: 'movie',
    description: 'Découvrez une large sélection de films, séries et musiques disponibles sur votre serveur personnel. Profitez d\'une expérience de streaming optimisée avec une interface moderne et intuitive.',
    year: 2024,
    genre: 'Streaming'
  };

  const media = featuredMedia || defaultFeaturedMedia;
  
  // Use French title and description if available for featured media
  const displayTitle = featuredMedia && frenchTitle ? frenchTitle : media.title;
  const displayDescription = featuredMedia && frenchDescription ? frenchDescription : media.description;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image/Video */}
      <div className="absolute inset-0">
        {/* Movie Backdrop/Poster Background */}
        {(backdrop || poster) && featuredMedia ? (
          <div 
            className="absolute inset-0 bg-no-repeat bg-center"
            style={{
              backgroundImage: `url(${backdrop || poster})`,
              backgroundSize: backdrop ? 'contain' : 'cover',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-black" />
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        
        {/* Pattern overlay for non-poster/backdrop backgrounds */}
        {!backdrop && !poster && (
          <div className="absolute inset-0 opacity-5">
            <div className="h-full w-full bg-repeat" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center h-full">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-2xl">
            <motion.h1 
              className="text-3xl md:text-4xl lg:text-6xl font-bold text-white mb-4 text-shadow"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {displayTitle}
            </motion.h1>
            
            <motion.p 
              className="text-base md:text-lg lg:text-xl text-gray-300 mb-8 leading-relaxed text-shadow"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {displayDescription}
            </motion.p>

            {/* Media Info */}
            <motion.div 
              className="flex items-center space-x-4 mb-8 text-sm text-gray-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {media.year && (
                <span className="bg-gray-800 px-2 py-1 rounded text-xs">{media.year}</span>
              )}
              {media.genre && (
                <span className="bg-gray-800 px-2 py-1 rounded text-xs">{media.genre}</span>
              )}
              <span className="bg-gray-800 px-2 py-1 rounded text-xs capitalize">{media.type}</span>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <motion.button
                onClick={() => onPlay(media)}
                className="bg-white text-black px-6 py-3 rounded font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play size={20} fill="currentColor" />
                <span>Lecture</span>
              </motion.button>
              
              <motion.button
                onClick={() => onMoreInfo(media)}
                className="bg-gray-600/80 text-white px-6 py-3 rounded font-semibold hover:bg-gray-500/80 transition-all duration-200 flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Info size={20} />
                <span>Plus d'infos</span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Volume Control */}
      <motion.button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-20 right-8 p-3 bg-black/50 rounded-full border border-gray-600 text-white hover:bg-black/70 transition-colors shadow-lg"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </motion.button>
    </div>
  );
};

export default Hero;