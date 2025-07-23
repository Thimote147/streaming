import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MediaDetails from '../components/MediaDetails';
import { streamingAPI } from '../services/api';
import { useWatchProgress } from '../hooks/useWatchProgress';
import type { MediaItem } from '../services/api';
import type { WatchProgress } from '../lib/supabase';

const Details: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [watchProgress, setWatchProgress] = useState<WatchProgress | null>(null);
  const navigate = useNavigate();
  const { recentProgress } = useWatchProgress();

  useEffect(() => {
    const generateTitleVariants = (titleParam: string): string[] => {
      const variants = [titleParam];
      
      // Si le titre contient des underscores, créer une variante avec des espaces
      if (titleParam.includes('_')) {
        const spaceVariant = titleParam.replace(/_/g, ' ');
        variants.push(spaceVariant);
        
        // Créer une variante avec capitalisation appropriée
        const capitalizedVariant = spaceVariant
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        variants.push(capitalizedVariant);
      }
      
      // Si le titre contient des espaces, créer une variante avec des underscores
      if (titleParam.includes(' ')) {
        const underscoreVariant = titleParam.toLowerCase().replace(/\s+/g, '_');
        variants.push(underscoreVariant);
      }
      
      return variants;
    };

    const loadMediaByTitle = async (mediaTitle: string) => {
      try {
        setIsLoading(true);
        // Search through all categories to find media by title
        const categories = await streamingAPI.fetchCategories();
        const allItems = categories.flatMap(cat => cat.items);
        
        // Générer toutes les variantes possibles du titre
        const titleVariants = generateTitleVariants(mediaTitle);
        
        const foundMedia = allItems.find(item => {
          // Tester chaque variante contre le titre et le titre français
          return titleVariants.some(variant => 
            item.title === variant || 
            item.frenchTitle === variant ||
            item.title.toLowerCase() === variant.toLowerCase() ||
            (item.frenchTitle && item.frenchTitle.toLowerCase() === variant.toLowerCase()) ||
            // Tester aussi la conversion inverse (titre du média vers underscore)
            item.title.toLowerCase().replace(/\s+/g, '_') === variant.toLowerCase() ||
            (item.frenchTitle && item.frenchTitle.toLowerCase().replace(/\s+/g, '_') === variant.toLowerCase())
          );
        });
        
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

  // Effet pour détecter le progrès de visionnage quand le média et les données de progrès sont chargés
  useEffect(() => {
    if (media && recentProgress) {
      // Chercher le progrès pour ce média
      const progress = recentProgress.find(p => {
        // Essayer de matcher par titre du média
        if (p.movie_title?.toLowerCase() === media.title.toLowerCase()) {
          return true;
        }
        
        // Essayer de matcher par path si disponible
        if (media.path && p.movie_path?.includes(media.path)) {
          return true;
        }
        
        // Pour les médias avec ID, essayer de matcher par nom de fichier
        if (media.id) {
          const fileName = media.id.replace(/^(film_|series_|music_)/, '').replace(/_\w{6}$/, '').replace(/_/g, ' ');
          if (p.movie_title?.toLowerCase().includes(fileName.toLowerCase()) || 
              fileName.toLowerCase().includes(p.movie_title?.toLowerCase() || '')) {
            return true;
          }
        }
        
        return false;
      });
      
      setWatchProgress(progress || null);
    }
  }, [media, recentProgress]);

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
        onClose={handleClose}
        onAddToList={handleAddToList}
        watchProgress={watchProgress}
      />
    </AnimatePresence>
  );
};

export default Details;