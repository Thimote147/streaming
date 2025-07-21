import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MediaDetails from '../components/MediaDetails';
import { streamingAPI } from '../services/api';
import { cleanTitleForUrl } from '../utils/urlUtils';
import type { MediaItem } from '../services/api';

const Details: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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


  const handlePlay = (media: MediaItem) => {
    console.log('🎬 handlePlay appelée');
    console.log('📽️ ID du média reçu:', media.id);
    
    let navigationUrl: string;
    
    // Vérifier si le média a une propriété sequelNumber (film de saga)
    if (media.sequelNumber && media.type === 'movie') {
      console.log('🎭 Détection d\'un film de saga avec sequelNumber:', media.sequelNumber);
      
      // Extraire le nom de base de la série (enlever le numéro à la fin)
      const baseTitle = media.title
        .replace(/\s+\d+$/g, '') // Enlever les nombres à la fin (ex: "John Wick 4" -> "John Wick")
        .replace(/\s+(I{1,4}|V|VI{1,3}|IX|X)$/g, ''); // Enlever les chiffres romains à la fin
      
      const baseName = cleanTitleForUrl(baseTitle);
      
      // Générer l'URL au format /player/films/nom_serie/numero
      navigationUrl = `/player/films/${baseName}/${media.sequelNumber}`;
      console.log('🔗 URL de saga générée:', navigationUrl);
      console.log('📝 Nom de base extrait:', baseName);
    } else if (media.sequelNumber && media.type === 'series') {
      // Cas des séries avec sequelNumber
      console.log('📺 Détection d\'une série avec sequelNumber:', media.sequelNumber);
      
      const baseTitle = media.title
        .replace(/\s+\d+$/g, '')
        .replace(/\s+(I{1,4}|V|VI{1,3}|IX|X)$/g, '');
      
      const baseName = cleanTitleForUrl(baseTitle);
      
      navigationUrl = `/player/series/${baseName}/${media.sequelNumber}`;
      console.log('🔗 URL de série générée:', navigationUrl);
      console.log('📝 Nom de base extrait:', baseName);
    } else {
      // Utiliser l'ancien format en fallback
      navigationUrl = `/player/${encodeURIComponent(media.id)}`;
      console.log('🔗 URL classique utilisée (fallback):', navigationUrl);
    }
    
    console.log('🚀 Navigation en cours...');
    navigate(navigationUrl);
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