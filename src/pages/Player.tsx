import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import { streamingAPI } from '../services/api';
import type { MediaItem } from '../services/api';

const Player: React.FC = () => {
  const { mediaId } = useParams<{ mediaId: string }>();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadMediaById = async (id: string) => {
      try {
        setIsLoading(true);
        // Since we don't have a direct API to get media by ID, 
        // we'll search through all categories
        const categories = await streamingAPI.fetchCategories();
        const allItems = categories.flatMap(cat => cat.items);
        const foundMedia = allItems.find(item => item.id === id);
        
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

    if (mediaId) {
      loadMediaById(decodeURIComponent(mediaId));
    }
  }, [mediaId, navigate]);


  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement du lecteur...</p>
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
    <VideoPlayer
      media={media}
      onClose={handleClose}
      isVisible={true}
    />
  );
};

export default Player;