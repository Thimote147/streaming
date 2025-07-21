import React from 'react';
import { Play, Info, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MediaItem } from '../services/api';
import { useMovieData } from '../hooks/useMovieData';

interface MediaCardProps {
  media: MediaItem;
  onPlay: (media: MediaItem) => void;
  onMoreInfo: (media: MediaItem) => void;
  onAddToList?: (media: MediaItem) => void;
  index?: number;
}

const MediaCard: React.FC<MediaCardProps> = ({ 
  media, 
  onPlay, 
  onMoreInfo, 
  onAddToList, 
  index = 0 
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  
  // Only fetch TMDB data for movies and series, not for music
  const shouldFetchTMDB = media.type === 'movie' || media.type === 'series';
  const { poster, frenchPoster, frenchTitle, releaseYear, loading } = useMovieData(
    shouldFetchTMDB ? media.title : '', 
    shouldFetchTMDB ? media.year : undefined, 
    shouldFetchTMDB ? media.type : undefined
  );
  
  // For music, use the embedded artwork first, then fallback to TMDB
  // For movies/series, use TMDB first, then fallback to embedded data
  const displayTitle = frenchTitle || media.frenchTitle || media.title;
  const displayPoster = media.type === 'music' 
    ? (media.poster || frenchPoster || poster)  // Music: use embedded artwork first
    : (frenchPoster || poster || media.poster); // Movies/Series: use TMDB first
  
  
  // Use TMDB release year as primary source, fallback to file year
  const displayYear = releaseYear || media.year;
  
  // For groups, show episode count
  const isGroup = media.isGroup && media.episodes && media.episodes.length > 0;
  const episodeText = isGroup ? 
    (media.type === 'series' ? `${media.episodeCount} épisodes` : `${media.episodeCount} films`) : 
    null;

  const getPlaceholderImage = () => {
    const colors = ['bg-red-900', 'bg-blue-900', 'bg-green-900', 'bg-purple-900', 'bg-yellow-900'];
    return colors[index % colors.length];
  };

  const getTypeIcon = () => {
    switch (media.type) {
      case 'movie':
        return '🎬';
      case 'series':
        return '📺';
      case 'music':
        return '🎵';
      default:
        return '📁';
    }
  };

  return (
    <motion.div
      className="relative group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      style={{ zIndex: isHovered ? 20 : 1 }}
    >
      {/* Main Card */}
      <div className={`relative group cursor-pointer rounded-lg overflow-hidden bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 ${
        media.type === 'music' ? 'aspect-square' : 'aspect-[2/3]'
      }`}>
        {/* Poster or Placeholder */}
        {displayPoster && !imageError ? (
          <img 
            src={displayPoster} 
            alt={displayTitle}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            onError={() => setImageError(true)}
            onLoad={() => setImageError(false)}
          />
        ) : (
          <div className={`absolute inset-0 flex flex-col items-center justify-center text-white ${getPlaceholderImage()}`}>
            <div className="text-center text-white p-4">
              {loading ? (
                <div className="animate-spin text-5xl mb-4">⏳</div>
              ) : (
                <div className="text-6xl mb-4">{getTypeIcon()}</div>
              )}
              <div className="text-xs font-medium text-center leading-tight">{displayTitle}</div>
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <motion.div 
          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <div className="flex space-x-2">
            {!isGroup && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(media);
                }}
                className="bg-white/90 text-black p-3 rounded-full hover:bg-white transition-colors shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Play size={20} fill="currentColor" />
              </motion.button>
            )}
            {isGroup && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  // Play first episode/movie in the group
                  const firstItem = media.episodes?.[0];
                  if (firstItem) {
                    onPlay(firstItem);
                  }
                }}
                className="bg-white/90 text-black p-3 rounded-full hover:bg-white transition-colors shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Play size={20} fill="currentColor" />
              </motion.button>
            )}
            
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onMoreInfo(media);
              }}
              className="bg-gray-600/90 text-white p-3 rounded-full hover:bg-gray-500 transition-colors shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Info size={20} />
            </motion.button>
            
            {onAddToList && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToList(media);
                }}
                className="bg-gray-600/90 text-white p-3 rounded-full hover:bg-gray-500 transition-colors shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Plus size={20} />
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Progress Bar (if applicable) */}
        {Math.random() > 0.7 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
            <div 
              className="h-full bg-red-600 transition-all duration-300"
              style={{ width: `${Math.random() * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="mt-3 px-1 relative">
        <h3 className="text-white font-semibold text-sm mb-1 truncate group-hover:text-gray-300 transition-colors">
          {displayTitle}
        </h3>
        
        <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2">
          {displayYear && <span>{displayYear}</span>}
          {episodeText && (
            <>
              <span>•</span>
              <span className="text-blue-400">{episodeText}</span>
            </>
          )}
          {media.genre && (
            <>
              <span>•</span>
              <span>{media.genre}</span>
            </>
          )}
          <span>•</span>
          <span className="capitalize">{media.type === 'series' && isGroup ? 'Série' : media.type === 'movie' && isGroup ? 'Saga' : media.type}</span>
        </div>
        
      </div>

    </motion.div>
  );
};

export default MediaCard;