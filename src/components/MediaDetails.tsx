import React from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, Share, ArrowLeft, Calendar } from 'lucide-react';
import type { MediaItem } from '../services/api';
import { useMovieData } from '../hooks/useMovieData';
import type { WatchProgress } from '../lib/supabase';

interface MediaDetailsProps {
  media: MediaItem;
  onPlay: (media: MediaItem) => void;
  onClose: () => void;
  onAddToList?: (media: MediaItem) => void;
  watchProgress?: WatchProgress | null;
}

const MediaDetails: React.FC<MediaDetailsProps> = ({ 
  media, 
  onPlay, 
  onClose, 
  onAddToList,
  watchProgress 
}) => {
  // Only fetch TMDB data for movies and series, not for music
  const shouldFetchTMDB = media.type === 'movie' || media.type === 'series';
  const { poster, frenchPoster, backdrop, frenchTitle, frenchDescription, releaseYear } = useMovieData(
    shouldFetchTMDB ? media.title : '', 
    shouldFetchTMDB ? media.year : undefined, 
    shouldFetchTMDB ? media.type : undefined
  );
  
  // For music, use the embedded data directly
  // For movies/series, use TMDB data first
  const displayTitle = media.type === 'music' 
    ? media.title 
    : (frenchTitle || media.frenchTitle || media.title);
  const displayPoster = media.type === 'music' 
    ? media.poster 
    : (frenchPoster || poster || media.poster);
  const displayDescription = media.type === 'music' 
    ? media.description 
    : (frenchDescription || media.description);
  const displayYear = media.type === 'music' 
    ? media.year 
    : (releaseYear || media.year);
  const displayBackdrop = media.type === 'music' 
    ? media.poster 
    : (backdrop || displayPoster);
  
  // Check if this is a group with episodes
  const isGroup = media.isGroup && media.episodes && media.episodes.length > 0;
  
  // Determine button text based on watch progress
  const getPlayButtonText = () => {
    if (isGroup) {
      return 'Lire le premier épisode';
    }
    
    if (!watchProgress) {
      return 'Lecture';
    }
    
    const progressPercent = watchProgress.progress_percentage || 0;
    
    if (progressPercent >= 90) {
      return 'Recommencer';
    } else if (progressPercent > 1) {
      return 'Continuer la lecture';
    } else {
      return 'Lecture';
    }
  };
  
  // Share functionality
  const handleShare = async () => {
    const shareData = {
      title: `${displayTitle} - Streaming`,
      text: `Regardez ${displayTitle} sur notre plateforme de streaming`,
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        // TODO: Show a toast notification
        console.log('Lien copié dans le presse-papiers !');
      }
    } catch (err) {
      console.error('Erreur lors du partage:', err);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop Background - Full Page */}
      <div className="absolute inset-0">
        {displayBackdrop ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${displayBackdrop})`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <motion.button
          onClick={onClose}
          className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
          <span className="text-sm sm:text-base">Retour</span>
        </motion.button>
        
        <motion.button
          onClick={handleShare}
          className="p-2 sm:p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Partager"
        >
          <Share size={18} className="sm:w-5 sm:h-5" />
        </motion.button>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden relative z-10 overflow-y-auto h-full pt-4 px-4 sm:px-6 pb-24">
        {/* Mobile Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            {displayTitle}
          </h1>
        </motion.div>

        {/* Mobile Poster and Info */}
        <div className="mb-6">
          {/* Mobile Poster */}
          <div className="flex justify-center mb-4">
            <motion.div
              className="relative rounded-lg overflow-hidden shadow-2xl w-48 sm:w-56"
              style={{ aspectRatio: media.type === 'music' ? '1/1' : '2/3' }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
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
                    <div className="text-4xl mb-3">🎬</div>
                    <div className="text-sm px-3">{displayTitle}</div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2 mb-4">
            <motion.button
              onClick={() => onPlay(media)}
              className="bg-white text-black px-4 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play size={18} fill="currentColor" />
              <span>{getPlayButtonText()}</span>
            </motion.button>
            
            {onAddToList && (
              <motion.button
                onClick={() => onAddToList(media)}
                className="bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors flex items-center justify-center gap-2 text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={18} />
                <span>Ma liste</span>
              </motion.button>
            )}
          </div>
          
          {/* Mobile Meta Info */}
          <div className="flex items-center justify-center flex-wrap gap-4 text-center">
            {displayYear && (
              <div className="flex items-center space-x-2 text-gray-300">
                <Calendar size={16} />
                <span className="text-base">{displayYear}</span>
              </div>
            )}
            {media.genre && (
              <span className="bg-gray-700 text-white px-4 py-2 rounded-full text-sm">
                {media.genre}
              </span>
            )}
            <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm capitalize">
              {media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'}
            </span>
          </div>
        </div>
        
        {/* Mobile Description and Episodes */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Synopsis</h3>
            <p className="text-gray-300 leading-relaxed text-base">
              {displayDescription || `Découvrez ${displayTitle}, un ${media.type === 'movie' ? 'film' : media.type === 'series' ? 'série' : 'contenu musical'} captivant disponible sur votre plateforme de streaming personnelle.`}
            </p>
          </div>
          
          {isGroup && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">
                {media.type === 'series' ? 'Épisodes' : 'Films de la saga'}
              </h3>
              <div className="space-y-3">
                {media.episodes?.map((episode) => (
                  <div
                    key={episode.id}
                    className="flex items-center p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => onPlay(episode)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base truncate">{episode.title}</div>
                      {episode.seasonNumber && episode.episodeNumber && (
                        <div className="text-gray-400 text-sm mt-1">
                          S{episode.seasonNumber.toString().padStart(2, '0')}E{episode.episodeNumber.toString().padStart(2, '0')}
                        </div>
                      )}
                    </div>
                    <Play size={20} className="text-gray-400 ml-2 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full relative z-10">
        {/* Left Column - Poster (Static) */}
        <div className="w-1/3 flex flex-col justify-start items-center px-8 pt-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full space-y-6"
          >
            {/* Title above poster */}
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight text-left">
              {displayTitle}
            </h1>
            
            {/* Poster */}
            <div className="flex justify-center">
              <div 
                className="relative rounded-lg overflow-hidden shadow-2xl"
                style={{ 
                  aspectRatio: media.type === 'music' ? '1/1' : '2/3',
                  maxWidth: '300px',
                  width: '100%'
                }}
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
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-8 max-w-4xl mb-24"
          >
            {/* Meta Info and Buttons */}
            <div>
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                {displayYear && (
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Calendar size={18} />
                    <span className="text-lg">{displayYear}</span>
                  </div>
                )}
                {media.genre && (
                  <span className="bg-gray-700 text-white px-4 py-2 rounded-full text-lg">
                    {media.genre}
                  </span>
                )}
                <span className="bg-red-600 text-white px-4 py-2 rounded-full text-lg capitalize">
                  {media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mb-8">
                <motion.button
                  onClick={() => onPlay(media)}
                  className="bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center gap-3 text-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play size={24} fill="currentColor" />
                  <span>{getPlayButtonText()}</span>
                </motion.button>
                
                {onAddToList && (
                  <motion.button
                    onClick={() => onAddToList(media)}
                    className="bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-500 transition-colors flex items-center gap-3 text-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus size={24} />
                    <span>Ma liste</span>
                  </motion.button>
                )}
              </div>
            </div>
            
            {/* Description */}
            <div>
              <h3 className="text-2xl font-semibold text-white mb-4">Synopsis</h3>
              <p className="text-gray-300 leading-relaxed text-lg">
                {displayDescription || `Découvrez ${displayTitle}, un ${media.type === 'movie' ? 'film' : media.type === 'series' ? 'série' : 'contenu musical'} captivant disponible sur votre plateforme de streaming personnelle. Une expérience de divertissement unique vous attend.`}
              </p>
            </div>
                                                
            {/* Episodes/Movies List */}
            {isGroup && (
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">
                  {media.type === 'series' ? 'Épisodes' : 'Films de la saga'}
                </h3>
                <div className="space-y-4">
                  {media.episodes?.map((episode) => (
                    <motion.div
                      key={episode.id}
                      className="flex items-center p-6 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => onPlay(episode)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-white text-lg">{episode.title}</div>
                        {episode.seasonNumber && episode.episodeNumber && (
                          <div className="text-gray-400">
                            Saison {episode.seasonNumber} • Épisode {episode.episodeNumber}
                          </div>
                        )}
                        {episode.sequelNumber && (
                          <div className="text-gray-400">
                            Film {episode.sequelNumber}
                          </div>
                        )}
                      </div>
                      <Play size={24} className="text-gray-400" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default MediaDetails;