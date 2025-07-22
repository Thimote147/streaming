import React from 'react';
import { Play, Info, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MediaItem } from '../services/api';
import { useMovieData } from '../hooks/useMovieData';
import { usePlayer } from '../utils/usePlayer';
import { useImagePreloader } from '../hooks/useImagePreloader';

interface MediaCardProps {
  media: MediaItem;
  onMoreInfo: (media: MediaItem) => void;
  onAddToList?: (media: MediaItem) => void;
  index?: number;
}

const MediaCard: React.FC<MediaCardProps> = ({ 
  media, 
  onMoreInfo, 
  onAddToList, 
  index = 0 
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const { startPlaying } = usePlayer();
  
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

  // Preload the image to avoid flash
  const { isLoaded: imageLoaded, error: imageError } = useImagePreloader(displayPoster || null);
  
  
  // Use TMDB release year as primary source, fallback to file year
  const displayYear = releaseYear || media.year;
  
  // For groups, show episode count
  const isGroup = media.isGroup && media.episodes && media.episodes.length > 0;
  const episodeText = isGroup ? 
    (media.type === 'series' ? `${media.episodeCount} épisodes` : `${media.episodeCount} films`) : 
    null;

  const getPlaceholderImage = () => {
    // Generate a gradient based on media title for unique colors
    const hash = media.title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const hue = Math.abs(hash) % 360;
    const gradientStart = `hsl(${hue}, 60%, 30%)`;
    const gradientEnd = `hsl(${(hue + 60) % 360}, 60%, 20%)`;
    
    const typeIcon = media.type === 'movie' ? '🎬' : 
                    media.type === 'series' ? '📺' : 
                    media.type === 'music' ? '🎵' : '🎬';

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${gradientStart};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${gradientEnd};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#gradient)" />
        <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="60" text-anchor="middle" fill="white" opacity="0.3">
          ${typeIcon}
        </text>
        <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="white" opacity="0.8">
          ${media.title.substring(0, 20)}${media.title.length > 20 ? '...' : ''}
        </text>
      </svg>
    `)}`;
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

  // Only render when:
  // 1. Image is successfully loaded, OR
  // 2. We're still loading TMDB data (show loading state), OR  
  // 3. Image failed and we can show placeholder
  const shouldRender = (displayPoster && imageLoaded) || loading || (imageError && displayPoster);
  
  if (!shouldRender) {
    return (
      <div className={`relative rounded-lg overflow-hidden bg-transparent ${
        media.type === 'music' ? 'aspect-square' : 'aspect-[2/3]'
      }`}>
        {/* Invisible placeholder to maintain layout */}
      </div>
    );
  }

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
        {displayPoster && imageLoaded && !imageError ? (
          <img 
            src={displayPoster} 
            alt={displayTitle}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          />
        ) : !imageLoaded && displayPoster ? (
          <img 
            src={getPlaceholderImage()} 
            alt={displayTitle}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-800">
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
                  startPlaying(media);
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
                    startPlaying(firstItem);
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