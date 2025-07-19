import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, TrendingUp, Filter } from 'lucide-react';
import { useWatchProgress } from '../../hooks/useWatchProgress';
import { useMovieData } from '../../hooks/useMovieData';
import type { WatchHistory } from '../../lib/supabase';

interface HistoryEntryProps {
  entry: WatchHistory;
}

const HistoryEntry: React.FC<HistoryEntryProps> = ({ entry }) => {
  const { releaseYear } = useMovieData(entry.movie_title, undefined, 'movie');

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getCompletionColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCompletionBadge = (percentage: number): string => {
    if (percentage >= 90) return 'Terminé';
    if (percentage >= 50) return 'En cours';
    return 'Commencé';
  };

  return (
    <motion.div
      className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-medium">{entry.movie_title}</h3>
            {releaseYear && (
              <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                {releaseYear}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <Clock size={14} />
              <span>{formatDuration(entry.watch_duration)}</span>
              {entry.total_duration && (
                <span>/ {formatDuration(entry.total_duration)}</span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Calendar size={14} />
              <span>
                {new Date(entry.watched_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`text-sm font-medium ${getCompletionColor(entry.completion_percentage)}`}>
            {Math.round(entry.completion_percentage)}%
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            entry.completion_percentage >= 90 
              ? 'bg-green-500/20 text-green-400' 
              : entry.completion_percentage >= 50
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
          }`}>
            {getCompletionBadge(entry.completion_percentage)}
          </span>
        </div>
      </div>

      <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all ${
            entry.completion_percentage >= 90 
              ? 'bg-green-500' 
              : entry.completion_percentage >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${entry.completion_percentage}%` }}
        />
      </div>
    </motion.div>
  );
};

const WatchHistoryView: React.FC = () => {
  const { watchHistory, loading } = useWatchProgress();
  const [filter, setFilter] = useState<'all' | 'completed' | 'partial'>('all');

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };


  const filteredHistory = watchHistory.filter(entry => {
    switch (filter) {
      case 'completed':
        return entry.completion_percentage >= 90;
      case 'partial':
        return entry.completion_percentage < 90;
      default:
        return true;
    }
  });

  const stats = {
    totalMovies: new Set(watchHistory.map(entry => entry.movie_path)).size,
    totalWatchTime: watchHistory.reduce((sum, entry) => sum + entry.watch_duration, 0),
    completedMovies: watchHistory.filter(entry => entry.completion_percentage >= 90).length,
    averageCompletion: watchHistory.length > 0 
      ? watchHistory.reduce((sum, entry) => sum + entry.completion_percentage, 0) / watchHistory.length 
      : 0
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Historique de visionnage</h2>
        
        <div className="flex items-center space-x-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'completed' | 'partial')}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:outline-none focus:border-red-500"
          >
            <option value="all">Tous</option>
            <option value="completed">Terminés</option>
            <option value="partial">Partiellement vus</option>
          </select>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-blue-400" size={24} />
            <div>
              <p className="text-gray-400 text-sm">Films uniques</p>
              <p className="text-white text-xl font-bold">{stats.totalMovies}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center space-x-3">
            <Clock className="text-green-400" size={24} />
            <div>
              <p className="text-gray-400 text-sm">Temps total</p>
              <p className="text-white text-xl font-bold">{formatDuration(stats.totalWatchTime)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center space-x-3">
            <Calendar className="text-purple-400" size={24} />
            <div>
              <p className="text-gray-400 text-sm">Films terminés</p>
              <p className="text-white text-xl font-bold">{stats.completedMovies}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-yellow-400" size={24} />
            <div>
              <p className="text-gray-400 text-sm">Completion moy.</p>
              <p className="text-white text-xl font-bold">{Math.round(stats.averageCompletion)}%</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Liste de l'historique */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>Aucun historique de visionnage trouvé</p>
          </div>
        ) : (
          filteredHistory.map((entry) => (
            <HistoryEntry key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
};

export default WatchHistoryView;