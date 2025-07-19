import { useState, useEffect } from 'react';
import { streamingAPI } from '../services/api';

export const usePoster = (title: string, year?: number, type?: string) => {
  const [poster, setPoster] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only fetch posters for movies
    if (type !== 'movie' || !title) {
      return;
    }

    const fetchPoster = async () => {
      setLoading(true);
      try {
        const posterUrl = await streamingAPI.fetchMoviePoster(title, year);
        setPoster(posterUrl);
      } catch (error) {
        console.error('Error fetching poster:', error);
        setPoster(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPoster();
  }, [title, year, type]);

  return { poster, loading };
};