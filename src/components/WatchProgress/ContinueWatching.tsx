import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, CheckCircle, Music, Film, Tv, X } from 'lucide-react';
import { useWatchProgress } from '../../hooks/useWatchProgress';
import { useMovieData } from '../../hooks/useMovieData';
import { streamingAPI } from '../../services/api';
import type { WatchProgress } from '../../lib/supabase';
import type { MediaItem } from '../../services/api';

interface ContinueWatchingProps {
  onMovieSelect: (moviePath: string, startTime?: number) => void;
}

interface MovieProgressItemProps {
  progress: WatchProgress;
  onMovieSelect: (moviePath: string, startTime?: number) => void;
  onRemove?: (moviePath: string) => void;
}

const MovieProgressItem: React.FC<MovieProgressItemProps> = ({ progress, onMovieSelect, onRemove }) => {
  // Déterminer le type de média basé sur le nom du fichier ou le chemin
  const getMediaType = (moviePath: string) => {
    const ext = moviePath.toLowerCase().split('.').pop();
    if (['.mp3', '.flac', '.wav', 'mp3', 'flac', 'wav'].includes(ext || '')) {
      return 'music';
    } else if (moviePath.includes('/Series/') || moviePath.includes('S0') || moviePath.includes('E0')) {
      return 'series';
    }
    return 'movie';
  };

  const mediaType = getMediaType(progress.movie_path);
  const { poster, backdrop, frenchTitle, releaseYear } = useMovieData(progress.movie_title, undefined, mediaType as 'movie' | 'series' | 'music');
  
  // Utiliser le titre français si disponible, ou extraire le titre complet depuis le path
  const getDisplayTitle = () => {
    if (frenchTitle) return frenchTitle;
    
    // Extraire le nom de fichier depuis le path pour avoir le titre complet avec numéro
    const fileName = progress.movie_path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
    
    // Si le fileName contient plus d'informations (comme le numéro), l'utiliser
    if (fileName && fileName.length > progress.movie_title.length) {
      return fileName;
    }
    
    return progress.movie_title;
  };
  
  const displayTitle = getDisplayTitle();
  
  // Pour les musiques, récupérer les données depuis l'API
  const [musicData, setMusicData] = useState<MediaItem | null>(null);
  
  useEffect(() => {
    const fetchMusicData = async () => {
      if (mediaType === 'music') {
        try {
          const categories = await streamingAPI.fetchCategories();
          const musicCategory = categories.find(cat => cat.type === 'Musiques');
          const allMusics = musicCategory?.items || [];
          
          // Chercher par titre ou nom de fichier
          const fileName = progress.movie_path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
          const foundMusic = allMusics.find(music => 
            music.title.toLowerCase() === progress.movie_title.toLowerCase() ||
            music.title.toLowerCase() === fileName.toLowerCase() 
          );
          
          if (foundMusic) {
            setMusicData(foundMusic);
          }
        } catch (error) {
          console.error('Erreur chargement données musique:', error);
        }
      }
    };
    
    fetchMusicData();
  }, [mediaType, progress.movie_title, progress.movie_path]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (progress: WatchProgress) => {
    if (progress.progress_percentage >= 90) {
      return <CheckCircle size={16} className="text-green-400" />;
    }
    return <Clock size={16} className="text-yellow-400" />;
  };

  const getMediaTypeIcon = () => {
    switch (mediaType) {
      case 'music':
        return <Music size={20} className="text-purple-400" />;
      case 'series':
        return <Tv size={20} className="text-blue-400" />;
      default:
        return <Film size={20} className="text-red-400" />;
    }
  };

  const getMediaTypeLabel = () => {
    switch (mediaType) {
      case 'music':
        return 'Musique';
      case 'series':
        return 'Série';
      default:
        return 'Film';
    }
  };

  return (
    <motion.div
      className="flex-shrink-0 w-64 bg-zinc-900/95 backdrop-blur-md rounded-lg overflow-hidden border border-zinc-700/50 hover:border-red-500/60 transition-all cursor-pointer group shadow-xl hover:shadow-red-500/20"
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onMovieSelect(progress.movie_path, progress.current_position)}
    >
      {/* Image principale */}
      <div className="h-32 relative overflow-hidden bg-zinc-800">
        {(poster || backdrop || musicData?.poster) ? (
          <>
            <img 
              src={backdrop || poster || musicData?.poster}
              alt={displayTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            {/* Gradient overlay subtil */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-transparent" />
          </>
        ) : (
          <>
            {/* Fallback avec pattern moderne */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800" />
            <div className="absolute inset-0 opacity-30">
              {mediaType === 'music' ? (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-purple-800" />
              ) : mediaType === 'series' ? (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-800" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-orange-600 to-red-800" />
              )}
            </div>
          </>
        )}

        {/* Badge du type de média compact */}
        <div className="absolute top-2 left-2 bg-zinc-900/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
          {getMediaTypeIcon()}
          <span className="text-xs text-white font-medium">{getMediaTypeLabel()}</span>
        </div>

        {/* Remove button - plus visible et plus facile à cliquer */}
        {onRemove && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove(progress.movie_path);
            }}
            className="absolute top-2 right-2 w-8 h-8 bg-black/80 hover:bg-red-600 backdrop-blur-sm rounded-full flex items-center justify-center opacity-80 hover:opacity-100 transition-all duration-300 z-50 border border-white/20 hover:border-red-400"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            title="Supprimer de continuer à regarder"
          >
            <X size={14} className="text-white transition-colors" />
          </motion.button>
        )}

        {/* Play button overlay compact */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <motion.div
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl hover:shadow-white/20"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Play fill="black" size={20} className="text-black ml-0.5" />
          </motion.div>
        </motion.div>
        
        {/* Barre de progression raffinée */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800/60">
          <motion.div 
            className={`h-full ${getProgressColor(progress.progress_percentage)} shadow-lg`}
            style={{ width: `${progress.progress_percentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress_percentage}%` }}
            transition={{ delay: 0.2, duration: 1.2, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Section d'informations compacte */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-2">
            <h3 className="text-white font-semibold text-sm line-clamp-2 leading-tight mb-2">
              {displayTitle}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Badge artiste/année compact */}
              {musicData?.artist ? (
                <span className="text-xs text-purple-200 bg-purple-600/20 px-2 py-0.5 rounded-full border border-purple-500/30 font-medium">
                  {musicData.artist}
                </span>
              ) : releaseYear && (
                <span className="text-xs text-zinc-300 bg-zinc-700/50 px-2 py-0.5 rounded-full font-medium">
                  {releaseYear}
                </span>
              )}
              {/* Badge progression compact */}
              <span className="text-xs text-red-200 bg-red-600/20 px-2 py-0.5 rounded-full border border-red-500/30 font-medium">
                {Math.round(progress.progress_percentage)}%
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            {getStatusIcon(progress)}
          </div>
        </div>

        {/* Informations temporelles compactes */}
        <div className="bg-zinc-800/50 rounded-md p-3 border border-zinc-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-zinc-400" />
              <span className="text-xs font-medium text-white">
                {formatTime(progress.current_position)}
                {progress.duration && (
                  <span className="text-zinc-400 font-normal">
                    {' / '}
                    <span className="text-zinc-300">{formatTime(progress.duration)}</span>
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>
              {new Date(progress.last_watched_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onMovieSelect }) => {
  const { recentProgress, loading, removeProgress } = useWatchProgress();

  const handleRemoveProgress = async (moviePath: string) => {
    try {
      await removeProgress(moviePath);
    } catch (error) {
      console.error('Error removing progress:', error);
    }
  };

  // Filtrer les films en cours de visionnage (pas terminés)
  const inProgressMovies = recentProgress.filter(
    progress => progress.progress_percentage < 90 && progress.progress_percentage > 1
  );

  if (loading) {
    return (
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full" />
            <h2 className="text-2xl font-bold text-white">Continuer la lecture</h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
        </div>
        <div className="flex space-x-6">
          {[1, 2, 3].map((i) => (
            <motion.div 
              key={i} 
              className="w-72 h-56 bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl animate-pulse border border-gray-700/30"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  if (inProgressMovies.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className="mb-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full" />
          <h2 className="text-2xl font-bold text-white">Continuer la lecture</h2>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
      </div>
      
      <div className="flex space-x-6 overflow-x-auto pb-6 px-2 py-4 -mx-2 scrollbar-hide">
        {inProgressMovies.map((progress, index) => (
          <motion.div
            key={progress.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <MovieProgressItem
              progress={progress}
              onMovieSelect={onMovieSelect}
              onRemove={handleRemoveProgress}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ContinueWatching;