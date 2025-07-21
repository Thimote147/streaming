import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, CheckCircle, Music, Film, Tv } from 'lucide-react';
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
}

const MovieProgressItem: React.FC<MovieProgressItemProps> = ({ progress, onMovieSelect }) => {
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
  
  // Utiliser le titre français si disponible
  const displayTitle = frenchTitle || progress.movie_title;
  
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
      className="flex-shrink-0 w-72 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/30 hover:border-red-500/50 transition-all cursor-pointer group shadow-xl"
      whileHover={{ scale: 1.03, y: -8 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onMovieSelect(progress.movie_path, progress.current_position)}
    >
      {/* Header avec image de fond */}
      <div className="h-36 relative flex items-center justify-center overflow-hidden">
        {/* Image de fond (poster, backdrop, ou artwork) */}
        {(poster || backdrop || musicData?.poster) ? (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${backdrop || poster || musicData?.poster})`,
                backgroundPosition: 'center',
              }}
            />
            {/* Overlay sombre pour la lisibilité */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          </>
        ) : (
          <>
            {/* Fallback gradient si pas d'image */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600" />
            {/* Pattern coloré selon le type */}
            <div className="absolute inset-0 opacity-20">
              {mediaType === 'music' ? (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500" />
              ) : mediaType === 'series' ? (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500" />
              )}
            </div>
          </>
        )}

        {/* Icon du type de média */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 rounded-full px-2 py-1">
          {getMediaTypeIcon()}
          <span className="text-xs text-white font-medium">{getMediaTypeLabel()}</span>
        </div>

        {/* Play button overlay */}
        <motion.div
          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          whileHover={{ opacity: 1 }}
        >
          <motion.div
            className="bg-white/20 backdrop-blur-sm rounded-full p-4 border border-white/30"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Play size={32} className="text-white fill-white ml-1" />
          </motion.div>
        </motion.div>
        
        {/* Barre de progression moderne */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20">
          <motion.div 
            className={`h-full ${getProgressColor(progress.progress_percentage)} transition-all duration-500 shadow-lg`}
            style={{ width: `${progress.progress_percentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Informations */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-white font-semibold text-base line-clamp-2 leading-snug">
              {displayTitle}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              {/* Afficher l'artiste pour les musiques ou l'année pour les films */}
              {musicData?.artist ? (
                <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-1 rounded-full">
                  {musicData.artist}
                </span>
              ) : releaseYear && (
                <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full">
                  {releaseYear}
                </span>
              )}
              <span className="text-xs text-gray-300 font-medium">
                {Math.round(progress.progress_percentage)}% terminé
              </span>
            </div>
          </div>
          <div className="ml-3">
            {getStatusIcon(progress)}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Clock size={14} />
              <span>
                {formatTime(progress.current_position)}
                {progress.duration && (
                  <span className="text-gray-500">
                    {' / '}
                    <span className="text-gray-400">{formatTime(progress.duration)}</span>
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
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
  const { recentProgress, loading } = useWatchProgress();

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
      
      <div className="flex space-x-6 overflow-x-auto pb-6 scrollbar-hide">
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
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ContinueWatching;