import { useState, useEffect } from 'react';
import { streamingAPI } from '../services/api';

export const useMovieData = (title: string, year?: number, type?: string) => {
  const [poster, setPoster] = useState<string | null>(null);
  const [frenchPoster, setFrenchPoster] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const [frenchTitle, setFrenchTitle] = useState<string | null>(null);
  const [frenchDescription, setFrenchDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only fetch data for movies
    if (type !== 'movie' || !title) {
      return;
    }

    const fetchMovieData = async () => {
      setLoading(true);
      try {
        const movieData = await streamingAPI.fetchMovieData(title, year);
        setPoster(movieData?.poster || null);
        setFrenchPoster(movieData?.frenchPoster || null);
        setBackdrop(movieData?.backdrop || null);
        setFrenchTitle(movieData?.frenchTitle || null);
        setFrenchDescription(movieData?.frenchDescription || null);
      } catch (error) {
        console.error('Error fetching movie data:', error);
        setPoster(null);
        setFrenchPoster(null);
        setBackdrop(null);
        setFrenchTitle(null);
        setFrenchDescription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [title, year, type]);

  return { poster, frenchPoster, backdrop, frenchTitle, frenchDescription, loading };
};