import React from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, Share, ArrowLeft, Star, Calendar } from 'lucide-react';
import type { MediaItem } from '../services/api';
import { useMovieData } from '../hooks/useMovieData';

interface MediaDetailsProps {
  media: MediaItem;
  onPlay: (media: MediaItem) => void;
  onClose: () => void;
  onAddToList?: (media: MediaItem) => void;
}

const MediaDetails: React.FC<MediaDetailsProps> = ({ 
  media, 
  onPlay, 
  onClose, 
  onAddToList 
}) => {
  const { poster, frenchPoster, backdrop, frenchTitle, frenchDescription, releaseYear } = useMovieData(media.title, media.year, media.type);
  
  // Use French title, poster and description if available
  const displayTitle = frenchTitle || media.title;
  const displayPoster = frenchPoster || poster;
  const displayDescription = frenchDescription || media.description;
  const displayYear = releaseYear || media.year;

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background */}
      <div className="relative min-h-screen">
        {/* Backdrop/Poster Background */}
        {(backdrop || poster) ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${backdrop || poster})`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-6">
            <motion.button
              onClick={onClose}
              className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={24} />
              <span>Retour</span>
            </motion.button>
            
            <motion.button
              className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Share size={20} />
            </motion.button>
          </div>

          {/* Main Content */}
          <div className="container mx-auto px-6 pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              
              {/* Left Column - Poster */}
              <div className="lg:col-span-1">
                <motion.div
                  className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  {displayPoster ? (
                    <img 
                      src={displayPoster} 
                      alt={displayTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <div className="text-6xl mb-4">🎬</div>
                        <div className="text-sm">{displayTitle}</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Right Column - Details */}
              <div className="lg:col-span-2 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    {displayTitle}
                  </h1>
                  
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    {displayYear && (
                      <div className="flex items-center space-x-1 text-gray-300">
                        <Calendar size={16} />
                        <span>{displayYear}</span>
                      </div>
                    )}
                    
                    {media.genre && (
                      <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm">
                        {media.genre}
                      </span>
                    )}
                    
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm capitalize">
                      {media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'}
                    </span>
                    
                    {/* Rating placeholder */}
                    <div className="flex items-center space-x-1 text-yellow-500">
                      <Star size={16} fill="currentColor" />
                      <span className="text-white">8.5</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <motion.button
                      onClick={() => onPlay(media)}
                      className="bg-white text-black px-8 py-3 rounded font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play size={20} fill="currentColor" />
                      <span>Lecture</span>
                    </motion.button>
                    
                    {onAddToList && (
                      <motion.button
                        onClick={() => onAddToList(media)}
                        className="bg-gray-600/80 text-white px-6 py-3 rounded font-semibold hover:bg-gray-500/80 transition-colors flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Plus size={20} />
                        <span>Ma liste</span>
                      </motion.button>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Synopsis</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {displayDescription || `Découvrez ${displayTitle}, un ${media.type === 'movie' ? 'film' : media.type === 'series' ? 'série' : 'contenu musical'} captivant disponible sur votre plateforme de streaming personnelle. Une expérience de divertissement unique vous attend.`}
                    </p>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Informations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Type : </span>
                        <span className="text-white capitalize">{media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'}</span>
                      </div>
                      {displayYear && (
                        <div>
                          <span className="text-gray-400">Année : </span>
                          <span className="text-white">{displayYear}</span>
                        </div>
                      )}
                      {media.genre && (
                        <div>
                          <span className="text-gray-400">Genre : </span>
                          <span className="text-white">{media.genre}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Qualité : </span>
                        <span className="text-white">HD</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MediaDetails;