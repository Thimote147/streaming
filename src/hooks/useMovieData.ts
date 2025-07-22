import { useState, useEffect, useRef } from 'react';
import { streamingAPI } from '../services/api';

export const useMovieData = (title: string, year?: number, type?: string) => {
  const [poster, setPoster] = useState<string | null>(null);
  const [frenchPoster, setFrenchPoster] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const [frenchTitle, setFrenchTitle] = useState<string | null>(null);
  const [frenchDescription, setFrenchDescription] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState<string | null>(null);
  const [releaseYear, setReleaseYear] = useState<number | null>(null);
  const [genres, setGenres] = useState<number[]>([]);
  const [voteAverage, setVoteAverage] = useState<number | null>(null);
  const [voteCount, setVoteCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Only fetch data for movies and series
    if ((type !== 'movie' && type !== 'series') || !title) {
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchMovieData = async () => {
      setLoading(true);
      try {
        const movieData = await streamingAPI.fetchMovieData(title, year, type);
        
        // Check if request was aborted
        if (controller.signal.aborted) {
          return;
        }
        
        setPoster(movieData?.poster || null);
        setFrenchPoster(movieData?.frenchPoster || null);
        setBackdrop(movieData?.backdrop || null);
        setFrenchTitle(movieData?.frenchTitle || null);
        setFrenchDescription(movieData?.frenchDescription || null);
        setReleaseDate(movieData?.releaseDate || null);
        setReleaseYear(movieData?.releaseYear || null);
        setGenres(movieData?.genres || []);
        setVoteAverage(movieData?.voteAverage || null);
        setVoteCount(movieData?.voteCount || null);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error fetching movie data:', error);
          setPoster(null);
          setFrenchPoster(null);
          setBackdrop(null);
          setFrenchTitle(null);
          setFrenchDescription(null);
          setReleaseDate(null);
          setReleaseYear(null);
          setGenres([]);
          setVoteAverage(null);
          setVoteCount(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchMovieData();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [title, year, type]);

  return { 
    poster, 
    frenchPoster, 
    backdrop, 
    frenchTitle, 
    frenchDescription,
    releaseDate,
    releaseYear,
    genres,
    voteAverage,
    voteCount,
    loading 
  };
};