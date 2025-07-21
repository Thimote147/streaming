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
      className="fixed inset-0 bg-black z-50 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background */}
      <div className="relative min-h-screen">
        {/* Backdrop/Poster Background */}
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

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6">
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

          {/* Main Content */}
          <div className="container mx-auto px-4 sm:px-6 pb-8">
            <div className="space-y-4 mt-4 sm:mt-6">
              
              {/* Title - Always visible */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-4"
              >
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight">
                  {displayTitle}
                </h1>
              </motion.div>

              {/* Responsive Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 transition-all duration-300 ease-out">
                
                {/* Left Column - Poster */}
                <div className="md:col-span-1 transition-all duration-300 ease-out">
                  <div className="flex gap-3 sm:gap-4 md:block transition-all duration-300 ease-out">
                    <motion.div
                      className="relative rounded-lg overflow-hidden shadow-2xl w-32 sm:w-40 md:w-full max-w-sm flex-shrink-0 transition-all duration-300 ease-out"
                      style={{ aspectRatio: media.type === 'music' ? '1/1' : '2/3' }}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        duration: 0.6, 
                        delay: 0.2
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
                            <div className="text-2xl md:text-6xl mb-1 md:mb-4">🎬</div>
                            <div className="text-xs md:text-sm">{displayTitle}</div>
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* Mobile Info - Adjacent to poster */}
                    <div className="flex-1 flex flex-col justify-between md:hidden transition-all duration-300 ease-out">
                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {media.type === 'music' ? (
                          <>
                            {media.artist && (
                              <div className="text-gray-300 text-xs">
                                <span className="font-semibold">Artiste:</span> {media.artist}
                              </div>
                            )}
                            {media.album && (
                              <div className="text-gray-300 text-xs">
                                <span className="font-semibold">Album:</span> {media.album}
                              </div>
                            )}
                            {displayYear && (
                              <div className="flex items-center space-x-1 text-gray-300 text-xs">
                                <Calendar size={12} />
                                <span>{displayYear}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {displayYear && (
                              <div className="flex items-center space-x-1 text-gray-300 text-xs">
                                <Calendar size={12} />
                                <span>{displayYear}</span>
                              </div>
                            )}
                            
                            {media.genre && (
                              <span className="bg-gray-700 text-white px-2 py-1 rounded-full text-xs">
                                {media.genre}
                              </span>
                            )}
                          </>
                        )}
                        
                        <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs capitalize">
                          {media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'}
                        </span>
                        
                        <div className="flex items-center space-x-1 text-yellow-500">
                          <Star size={12} fill="currentColor" />
                          <span className="text-white text-xs">8.5</span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="text-xs text-gray-400 space-y-1 mb-3">
                        <div>Type : <span className="text-white">{media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'}</span></div>
                        <div>Qualité : <span className="text-white">HD</span></div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 transition-all duration-300 ease-out">
                        <motion.button
                          onClick={() => {
                            if (isGroup && media.episodes && media.episodes.length > 0) {
                              onPlay(media.episodes[0]);
                            } else {
                              onPlay(media);
                            }
                          }}
                          className="bg-white text-black px-3 py-2 rounded font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-xs"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ 
                            duration: 0.2
                          }}
                        >
                          <Play size={14} fill="currentColor" />
                          <span>{isGroup ? 'Lire le premier épisode' : 'Lecture'}</span>
                        </motion.button>
                        
                        {onAddToList && (
                          <motion.button
                            onClick={() => onAddToList(media)}
                            className="bg-gray-600/80 text-white px-3 py-2 rounded font-semibold hover:bg-gray-500/80 transition-colors flex items-center justify-center gap-2 text-xs"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ 
                              duration: 0.2
                            }}
                          >
                            <Plus size={14} />
                            <span>Ma liste</span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Details */}
                <div className="md:col-span-2 space-y-4 md:space-y-6 transition-all duration-300 ease-out">
                  <div className="hidden md:block transition-all duration-300 ease-out">
                    {/* Meta Info - Desktop */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4 md:mb-6">
                      {media.type === 'music' ? (
                        <>
                          {media.artist && (
                            <div className="text-gray-300 text-sm md:text-base">
                              <span className="font-semibold">Artiste:</span> {media.artist}
                            </div>
                          )}
                          {media.album && (
                            <div className="text-gray-300 text-sm md:text-base">
                              <span className="font-semibold">Album:</span> {media.album}
                            </div>
                          )}
                          {displayYear && (
                            <div className="flex items-center space-x-1 text-gray-300 text-sm md:text-base">
                              <Calendar size={14} className="md:w-4 md:h-4" />
                              <span>{displayYear}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {displayYear && (
                            <div className="flex items-center space-x-1 text-gray-300 text-sm md:text-base">
                              <Calendar size={14} className="md:w-4 md:h-4" />
                              <span>{displayYear}</span>
                            </div>
                          )}
                          
                          {media.genre && (
                            <span className="bg-gray-700 text-white px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm">
                              {media.genre}
                            </span>
                          )}
                        </>
                      )}
                      
                      <span className="bg-red-600 text-white px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm capitalize">
                        {media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'}
                      </span>
                      
                      <div className="flex items-center space-x-1 text-yellow-500">
                        <Star size={14} className="md:w-4 md:h-4" fill="currentColor" />
                        <span className="text-white text-sm md:text-base">8.5</span>
                      </div>
                    </div>

                    {/* Action Buttons - Desktop */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6 transition-all duration-300 ease-out">
                      <motion.button
                        onClick={() => {
                          if (isGroup && media.episodes && media.episodes.length > 0) {
                            onPlay(media.episodes[0]);
                          } else {
                            onPlay(media);
                          }
                        }}
                        className="bg-white text-black px-6 py-2.5 md:px-8 md:py-3 rounded font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ 
                          duration: 0.2
                        }}
                      >
                        <Play size={16} className="md:w-5 md:h-5" fill="currentColor" />
                        <span>{isGroup ? 'Lire le premier épisode' : 'Lecture'}</span>
                      </motion.button>
                      
                      {onAddToList && (
                        <motion.button
                          onClick={() => onAddToList(media)}
                          className="bg-gray-600/80 text-white px-4 py-2.5 md:px-6 md:py-3 rounded font-semibold hover:bg-gray-500/80 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ 
                            duration: 0.2
                          }}
                        >
                          <Plus size={16} className="md:w-5 md:h-5" />
                          <span>Ma liste</span>
                        </motion.button>
                      )}
                    </div>

                    {/* Additional Info - Desktop */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 text-sm mb-4 md:mb-6">
                      <div>
                        <span className="text-gray-400">Type : </span>
                        <span className="text-white capitalize">{media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'}</span>
                      </div>
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

                  {/* Description */}
                  <div className="space-y-3 transition-all duration-300 ease-out">
                    <h3 className="text-lg md:text-xl font-semibold text-white">Synopsis</h3>
                    <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                      {displayDescription || `Découvrez ${displayTitle}, un ${media.type === 'movie' ? 'film' : media.type === 'series' ? 'série' : 'contenu musical'} captivant disponible sur votre plateforme de streaming personnelle. Une expérience de divertissement unique vous attend.`}
                    </p>
                  </div>

                  {/* Episodes/Movies List for Groups */}
                  {isGroup && (
                    <div className="space-y-3 transition-all duration-300 ease-out">
                      <h3 className="text-lg md:text-xl font-semibold text-white">
                        {media.type === 'series' ? 'Épisodes' : 'Films de la saga'}
                      </h3>
                      <div className="space-y-2 md:space-y-3 max-h-72 md:max-h-96 overflow-y-auto transition-all duration-300 ease-out">
                        {media.episodes?.map((episode) => (
                          <motion.div
                            key={episode.id}
                            className="flex items-center p-3 md:p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                            onClick={() => {
                              console.log('🎬 DEBUG: Clic sur film de saga détecté');
                              console.log('🎬 DEBUG: ID du film cliqué:', episode.id);
                              console.log('🎬 DEBUG: Titre du film:', episode.title);
                              console.log('🎬 DEBUG: Données complètes de l\'épisode:', episode);
                              console.log('🎬 DEBUG: Appel de onPlay avec l\'épisode');
                              onPlay(episode);
                              console.log('🎬 DEBUG: onPlay appelé avec succès');
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ 
                              duration: 0.2
                            }}
                          >
                            <div className="flex-shrink-0 w-16 h-10 md:w-20 md:h-12 bg-gray-600 rounded overflow-hidden mr-3 md:mr-4 relative">
                              {backdrop ? (
                                <img 
                                  src={backdrop} 
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play size={14} className="md:w-4 md:h-4 text-white" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Play size={12} className="md:w-3.5 md:h-3.5 text-white opacity-80" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-white font-medium text-sm md:text-base truncate">
                                  {media.type === 'series' ? (
                                    `S${episode.seasonNumber?.toString().padStart(2, '0')}E${episode.episodeNumber?.toString().padStart(2, '0')}`
                                  ) : (
                                    episode.title
                                  )}
                                </h4>
                                {media.type === 'series' && episode.episodeNumber === 1 && episode.seasonNumber && (
                                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded ml-2 flex-shrink-0">
                                    Saison {episode.seasonNumber}
                                  </span>
                                )}
                              </div>
                              {media.type === 'series' && (
                                <p className="text-gray-400 text-xs md:text-sm truncate">{episode.title}</p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MediaDetails;