import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import { streamingAPI } from '../services/api';
import type { MediaItem } from '../services/api';

const Player: React.FC = () => {
  const { mediaId, mediaType, seriesTitle, seasonNumber, episodeNumber, title } = useParams<{ 
    mediaId?: string;
    mediaType?: string;
    seriesTitle?: string;
    seasonNumber?: string;
    episodeNumber?: string;
    title?: string;
  }>();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadEpisodeByReadableUrl = async (type: string, title: string, season: string, episode: string) => {
      try {
        console.log('[DEBUG] Recherche épisode par URL lisible:', { type, title, season, episode });
        setIsLoading(true);
        
        const categories = await streamingAPI.fetchCategories();
        const allItems = categories.flatMap(cat => cat.items);
        
        // Chercher dans les groupes de séries
        const groups = allItems.filter(item => item.isGroup && item.episodes && item.type === 'series');
        const allEpisodes = groups.flatMap(group => group.episodes || []);
        
        // Normaliser le titre pour la comparaison
        const normalizedTitle = title.replace(/_/g, ' ').toLowerCase();
        const seasonNum = parseInt(season.replace('s', ''));
        const episodeNum = parseInt(episode.replace('e', ''));
        
        console.log('[DEBUG] Recherche épisode pour:', { normalizedTitle, seasonNum, episodeNum });
        
        const foundEpisode = allEpisodes.find(ep => {
          const epTitle = (ep.seriesTitle || ep.title).toLowerCase();
          const hasSeasonNumber = ep.seasonNumber === seasonNum;
          const hasEpisodeNumber = ep.episodeNumber === episodeNum;
          const titleMatches = epTitle.includes(normalizedTitle) || normalizedTitle.includes(epTitle.split(' ')[0]);
          
          console.log('[DEBUG] Comparaison épisode:', { 
            epTitle, 
            hasSeasonNumber, 
            hasEpisodeNumber, 
            titleMatches,
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber
          });
          
          return titleMatches && hasSeasonNumber && hasEpisodeNumber;
        });
        
        if (foundEpisode) {
          console.log('[DEBUG] Épisode trouvé par URL lisible:', foundEpisode.title);
          setMedia(foundEpisode);
        } else {
          console.log('[DEBUG] Aucun épisode trouvé pour URL lisible');
          setError(`Épisode "${title}" saison ${seasonNum} épisode ${episodeNum} introuvable`);
        }
      } catch (error) {
        console.error('Error loading episode by readable URL:', error);
        setError('Erreur lors du chargement de l\'épisode');
      } finally {
        setIsLoading(false);
      }
    };

    const loadMediaByReadableUrl = async (type: string, title: string, episode: string) => {
      try {
        console.log('[DEBUG] Recherche par URL lisible:', { type, title, episode });
        setIsLoading(true);
        
        const categories = await streamingAPI.fetchCategories();
        const allItems = categories.flatMap(cat => cat.items);
        
        // Chercher dans les groupes
        const groups = allItems.filter(item => item.isGroup && item.episodes);
        const allEpisodes = groups.flatMap(group => group.episodes || []);
        
        // Normaliser le titre pour la comparaison
        const normalizedTitle = title.replace(/_/g, ' ').toLowerCase();
        const episodeNum = parseInt(episode);
        
        console.log('[DEBUG] Recherche dans les épisodes pour:', { normalizedTitle, episodeNum });
        
        const foundEpisode = allEpisodes.find(ep => {
          const epTitle = ep.title.toLowerCase();
          const hasSequelNumber = ep.sequelNumber === episodeNum;
          const titleMatches = epTitle.includes(normalizedTitle) || normalizedTitle.includes(epTitle.split(' ')[0]);
          
          console.log('[DEBUG] Comparaison:', { epTitle, hasSequelNumber, titleMatches, sequelNumber: ep.sequelNumber });
          
          return titleMatches && hasSequelNumber;
        });
        
        if (foundEpisode) {
          console.log('[DEBUG] Épisode trouvé par URL lisible:', foundEpisode.title);
          setMedia(foundEpisode);
        } else {
          console.log('[DEBUG] Aucun épisode trouvé pour URL lisible');
          setError(`Film "${title}" épisode ${episodeNum} introuvable`);
        }
      } catch (error) {
        console.error('Error loading media by readable URL:', error);
        setError('Erreur lors du chargement du média');
      } finally {
        setIsLoading(false);
      }
    };

    const loadMediaById = async (id: string) => {
      try {
        setIsLoading(true);
        
        const categories = await streamingAPI.fetchCategories();
        const allItems = categories.flatMap(cat => cat.items);
        
        const foundMedia = allItems.find(item => item.id === id);
        
        if (foundMedia) {
          setMedia(foundMedia);
        } else {
          // Chercher dans les épisodes des groupes
          const groups = allItems.filter(item => item.isGroup && item.episodes);
          const allEpisodes = groups.flatMap(group => group.episodes || []);
          const foundEpisode = allEpisodes.find(episode => episode.id === id);
          
          if (foundEpisode) {
            setMedia(foundEpisode);
          } else {
            setError(`Média avec l'ID "${id}" introuvable`);
          }
        }
      } catch (error) {
        console.error('Error loading media:', error);
        setError('Erreur lors du chargement du média');
      } finally {
        setIsLoading(false);
      }
    };

    const loadMusicByTitle = async (title: string) => {
      try {
        setIsLoading(true);
        
        const categories = await streamingAPI.fetchCategories();
        const musicCategory = categories.find(cat => cat.type === 'Musiques');
        const allMusics = musicCategory?.items || [];
        
        // Normaliser le titre pour la comparaison
        const normalizedTitle = title.replace(/_/g, ' ').toLowerCase();
        
        const foundMusic = allMusics.find(music => {
          const musicTitle = music.title.toLowerCase();
          const titleMatches = musicTitle.includes(normalizedTitle) || 
                               normalizedTitle.includes(musicTitle) ||
                               musicTitle.replace(/\s+/g, '_') === title.replace(/\s+/g, '_');
          
          
          return titleMatches;
        });
        
        if (foundMusic) {
          setMedia(foundMusic);
        } else {
          setError(`Musique "${title}" introuvable`);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la musique:', error);
        setError('Erreur lors du chargement de la musique');
      } finally {
        setIsLoading(false);
      }
    };

    // Décider quelle fonction utiliser selon le format d'URL
    const urlPath = window.location.pathname;
    if (urlPath.startsWith('/player/musiques/')) {
      const musicTitle = urlPath.split('/')[3];
      loadMusicByTitle(musicTitle);
      return;
    }
    
    if (mediaType && seriesTitle && seasonNumber && episodeNumber) {
      // Format: /player/series/good_american_family/s01/e01
      loadEpisodeByReadableUrl(mediaType, seriesTitle, seasonNumber, episodeNumber);
    } else if (mediaType && seriesTitle && episodeNumber) {
      // Format: /player/films/john_wick/1
      loadMediaByReadableUrl(mediaType, seriesTitle, episodeNumber);
    } else if (mediaType === 'musiques' && title) {
      // Format: /player/musiques/safe_and_sound
      console.log('🎵 [ROUTE] Détection route musique:', { mediaType, title });
      loadMusicByTitle(title);
    } else if (mediaId) {
      // Format: /player/film_john_wick_1_1_56e4f0
      loadMediaById(decodeURIComponent(mediaId));
    }
  }, [mediaId, mediaType, seriesTitle, seasonNumber, episodeNumber, title, navigate]);


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

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center px-4 max-w-lg">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-2xl font-bold text-white mb-4">Média introuvable</h1>
          <p className="text-gray-400 text-lg mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              ← Retour
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              🏠 Accueil
            </button>
          </div>
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