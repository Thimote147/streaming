import React from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, CheckCircle } from 'lucide-react';
import { useWatchProgress } from '../../hooks/useWatchProgress';
import { useMovieData } from '../../hooks/useMovieData';
import type { WatchProgress } from '../../lib/supabase';

interface ContinueWatchingProps {
  onMovieSelect: (moviePath: string, startTime?: number) => void;
}

interface MovieProgressItemProps {
  progress: WatchProgress;
  onMovieSelect: (moviePath: string, startTime?: number) => void;
}

const MovieProgressItem: React.FC<MovieProgressItemProps> = ({ progress, onMovieSelect }) => {
  const { releaseYear } = useMovieData(progress.movie_title, undefined, 'movie');

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

  return (
    <motion.div
      className="flex-shrink-0 w-80 bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700/50 hover:border-red-500/50 transition-all cursor-pointer group"
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onMovieSelect(progress.movie_path, progress.current_position)}
    >
      {/* Image placeholder - à remplacer par une vraie image/thumbnail */}
      <div className="h-32 bg-gradient-to-r from-gray-800 to-gray-700 relative flex items-center justify-center">
        <motion.div
          className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          whileHover={{ opacity: 1 }}
        >
          <Play size={48} className="text-white" />
        </motion.div>
        
        {/* Barre de progression */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
          <div 
            className={`h-full ${getProgressColor(progress.progress_percentage)} transition-all`}
            style={{ width: `${progress.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Informations */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-white font-medium text-sm line-clamp-2">
              {progress.movie_title}
            </h3>
            {releaseYear && (
              <span className="text-xs text-gray-400 mt-1">
                {releaseYear}
              </span>
            )}
          </div>
          {getStatusIcon(progress)}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {formatTime(progress.current_position)}
              {progress.duration && ` / ${formatTime(progress.duration)}`}
            </span>
            <span>{Math.round(progress.progress_percentage)}%</span>
          </div>

          <div className="text-xs text-gray-500">
            Dernière fois: {new Date(progress.last_watched_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Continuer le visionnage</h2>
        <div className="flex space-x-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-80 h-48 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (inProgressMovies.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">Continuer le visionnage</h2>
      
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {inProgressMovies.map((progress) => (
          <MovieProgressItem
            key={progress.id}
            progress={progress}
            onMovieSelect={onMovieSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default ContinueWatching;