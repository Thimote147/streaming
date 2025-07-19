import { useState, useEffect, useCallback } from 'react';
import { supabase, type WatchProgress, type WatchHistory } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useWatchProgress = () => {
  const { user } = useAuth();
  const [recentProgress, setRecentProgress] = useState<WatchProgress[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [loading, setLoading] = useState(false);

  // Récupérer la progression récente
  const fetchRecentProgress = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('watch_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_watched_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentProgress(data || []);
    } catch (error) {
      console.error('Error fetching watch progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Récupérer l'historique de visionnage
  const fetchWatchHistory = useCallback(async (limit = 50) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setWatchHistory(data || []);
    } catch (error) {
      console.error('Error fetching watch history:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Obtenir la progression pour un film spécifique
  const getProgressForMovie = useCallback(async (moviePath: string): Promise<WatchProgress | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('watch_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('movie_path', moviePath)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data || null;
    } catch (error) {
      console.error('Error fetching movie progress:', error);
      return null;
    }
  }, [user]);

  // Sauvegarder ou mettre à jour la progression
  const saveProgress = useCallback(async (
    moviePath: string,
    movieTitle: string,
    currentTime: number,
    duration?: number
  ) => {
    if (!user) return;

    const progressPercentage = duration ? Math.round((currentTime / duration) * 100) : 0;

    try {
      const { error } = await supabase
        .from('watch_progress')
        .upsert({
          user_id: user.id,
          movie_path: moviePath,
          movie_title: movieTitle,
          current_position: Math.round(currentTime),
          duration: duration ? Math.round(duration) : null,
          progress_percentage: progressPercentage,
          last_watched_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,movie_path'
        });

      if (error) throw error;
      
      // Rafraîchir la liste locale
      await fetchRecentProgress();
    } catch (error) {
      console.error('Error saving watch progress:', error);
    }
  }, [user, fetchRecentProgress]);

  // Ajouter une entrée à l'historique
  const addToHistory = useCallback(async (
    moviePath: string,
    movieTitle: string,
    watchDuration: number,
    totalDuration?: number,
    sessionStart?: Date,
    sessionEnd?: Date
  ) => {
    if (!user) return;

    const completionPercentage = totalDuration ? Math.round((watchDuration / totalDuration) * 100) : 0;

    try {
      const { error } = await supabase
        .from('watch_history')
        .insert({
          user_id: user.id,
          movie_path: moviePath,
          movie_title: movieTitle,
          watch_duration: Math.round(watchDuration),
          total_duration: totalDuration ? Math.round(totalDuration) : null,
          completion_percentage: completionPercentage,
          watched_at: new Date().toISOString(),
          session_start: sessionStart?.toISOString(),
          session_end: sessionEnd?.toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding to watch history:', error);
    }
  }, [user]);

  // Supprimer une progression (film terminé par exemple)
  const removeProgress = useCallback(async (moviePath: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('watch_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('movie_path', moviePath);

      if (error) throw error;
      
      // Rafraîchir la liste locale
      await fetchRecentProgress();
    } catch (error) {
      console.error('Error removing watch progress:', error);
    }
  }, [user, fetchRecentProgress]);

  // Marquer un film comme terminé
  const markAsCompleted = useCallback(async (
    moviePath: string,
    movieTitle: string,
    totalDuration: number
  ) => {
    if (!user) return;

    try {
      // Ajouter à l'historique comme film terminé
      await addToHistory(moviePath, movieTitle, totalDuration, totalDuration);
      
      // Supprimer de la progression (plus besoin de le suivre)
      await removeProgress(moviePath);
    } catch (error) {
      console.error('Error marking as completed:', error);
    }
  }, [user, addToHistory, removeProgress]);

  // Charger les données au montage du hook
  useEffect(() => {
    if (user) {
      fetchRecentProgress();
      fetchWatchHistory();
    }
  }, [user, fetchRecentProgress, fetchWatchHistory]);

  return {
    recentProgress,
    watchHistory,
    loading,
    getProgressForMovie,
    saveProgress,
    addToHistory,
    removeProgress,
    markAsCompleted,
    fetchRecentProgress,
    fetchWatchHistory
  };
};