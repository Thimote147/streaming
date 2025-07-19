import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MediaDetails from '../components/MediaDetails';
import { streamingAPI } from '../services/api';
import type { MediaItem } from '../services/api';

const Details: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadMediaByTitle = async (mediaTitle: string) => {
      try {
        setIsLoading(true);
        // Search through all categories to find media by title
        const categories = await streamingAPI.fetchCategories();
        const allItems = categories.flatMap(cat => cat.items);
        const foundMedia = allItems.find(item => 
          item.title === mediaTitle || 
          item.frenchTitle === mediaTitle ||
          item.title.toLowerCase() === mediaTitle.toLowerCase() ||
          (item.frenchTitle && item.frenchTitle.toLowerCase() === mediaTitle.toLowerCase())
        );
        
        if (foundMedia) {
          setMedia(foundMedia);
        } else {
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Error loading media:', error);
        navigate('/', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    if (title) {
      loadMediaByTitle(decodeURIComponent(title));
    }
  }, [title, navigate]);


  const handlePlay = (media: MediaItem) => {
    navigate(`/player/${encodeURIComponent(media.id)}`);
  };

  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

  const handleAddToList = (media: MediaItem) => {
    // TODO: Implement add to watchlist
    console.log('Add to list:', media.title);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg">Média introuvable</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <MediaDetails
        media={media}
        onPlay={handlePlay}
        onClose={handleClose}
        onAddToList={handleAddToList}
      />
    </AnimatePresence>
  );
};

export default Details;