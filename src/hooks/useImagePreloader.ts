import { useState, useEffect } from 'react';

interface ImagePreloadResult {
  isLoaded: boolean;
  error: boolean;
}

export const useImagePreloader = (src: string | null): ImagePreloadResult => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setIsLoaded(false); // No image available - not loaded
      setError(false);
      return;
    }

    setIsLoaded(false);
    setError(false);

    const img = new Image();
    
    const handleLoad = () => {
      setIsLoaded(true);
      setError(false);
    };

    const handleError = () => {
      setIsLoaded(true); // Consider loaded even on error
      setError(true);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    
    img.src = src;

    // If image is cached, it might load synchronously
    if (img.complete) {
      if (img.naturalWidth > 0) {
        handleLoad();
      } else {
        handleError();
      }
    }

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src]);

  return { isLoaded, error };
};