import React, { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MediaItem } from '../services/api';
import { streamingAPI } from '../services/api';
import { PlayerContext } from '../utils/usePlayer';
import { cleanTitleForUrl, extractTitleAndSequel } from '../utils/urlUtils';

export interface PlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}

export interface PlayerContextType {
  // Player state
  currentMedia: MediaItem | null;
  isMinimized: boolean;
  playerState: PlayerState;
  
  // Actions
  setCurrentMedia: (media: MediaItem | null) => void;
  setIsMinimized: (minimized: boolean) => void;
  updatePlayerState: (updates: Partial<PlayerState>) => void;
  closePlayer: () => void;
  minimizePlayer: () => void;
  maximizePlayer: () => void;
  startPlaying: (media: MediaItem, shouldMinimize?: boolean) => Promise<void>;
  
  // Callbacks for MiniPlayer
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
}

export interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 1,
    isMuted: false,
  });

  const closePlayer = () => {
    setCurrentMedia(null);
    setIsMinimized(false);
    setPlayerState({
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      volume: 1,
      isMuted: false,
    });
  };

  const minimizePlayer = () => {
    setIsMinimized(true);
  };

  const maximizePlayer = () => {
    setIsMinimized(false);
  };

  const updatePlayerState = (updates: Partial<PlayerState>) => {
    setPlayerState(prev => ({ ...prev, ...updates }));
  };

  const onTimeUpdate = (currentTime: number, duration: number) => {
    setPlayerState(prev => ({ ...prev, currentTime, duration }));
  };

  const onPlayStateChange = (isPlaying: boolean) => {
    setPlayerState(prev => ({ ...prev, isPlaying }));
  };

  const checkIfPartOfSaga = async (media: MediaItem): Promise<boolean> => {
    try {
      if (media.type !== 'movie') return false;
      
      const categories = await streamingAPI.fetchCategories();
      const filmsCategory = categories.find(cat => cat.type === 'Films');
      const allFilms = filmsCategory?.items || [];
      
      // Check if there are other films with the same base title
      const { baseTitle } = extractTitleAndSequel(media.title);
      const relatedFilms = allFilms.filter(film => {
        if (film.id === media.id) return false; // Exclude current film
        const { baseTitle: otherBaseTitle } = extractTitleAndSequel(film.title);
        return baseTitle === otherBaseTitle;
      });
      
      return relatedFilms.length > 0;
    } catch (error) {
      console.error('Error checking saga:', error);
      return false;
    }
  };

  const startPlaying = async (media: MediaItem, shouldMinimize = false) => {
    setCurrentMedia(media);
    setIsMinimized(shouldMinimize);
    setPlayerState(prev => ({
      ...prev,
      currentTime: 0,
      duration: 0,
      isPlaying: false, // Will be set to true by Player when it starts
    }));
    
    // If not minimizing, navigate to the player page
    if (!shouldMinimize) {
      let navigationUrl: string;
      
      if (media.type === 'music') {
        const cleanTitle = cleanTitleForUrl(media.title);
        navigationUrl = `/player/musiques/${cleanTitle}`;
      } else if (media.type === 'series') {
        // Handle series episodes
        if (media.seasonNumber && media.episodeNumber) {
          const cleanTitle = cleanTitleForUrl(media.seriesTitle || media.title);
          const season = `s${media.seasonNumber.toString().padStart(2, '0')}`;
          const episode = `e${media.episodeNumber.toString().padStart(2, '0')}`;
          navigationUrl = `/player/series/${cleanTitle}/${season}/${episode}`;
        } else {
          const cleanTitle = cleanTitleForUrl(media.title);
          navigationUrl = `/player/series/${cleanTitle}`;
        }
      } else if (media.type === 'movie') {
        // Handle movies with sequel numbers
        const { baseTitle, sequelNumber } = extractTitleAndSequel(media.title);
        const finalSequelNumber = media.sequelNumber || sequelNumber || 1;
        
        // Check if this movie is part of a saga
        const isPartOfSaga = await checkIfPartOfSaga(media);
        
        if (isPartOfSaga || sequelNumber || media.sequelNumber || media.isGroup) {
          // Always include number for saga movies
          navigationUrl = `/player/films/${baseTitle}/${finalSequelNumber}`;
        } else {
          // Standalone movie, no number needed
          navigationUrl = `/player/films/${baseTitle}`;
        }
      } else {
        // Fallback for other media types
        const cleanTitle = cleanTitleForUrl(media.title);
        navigationUrl = `/player/${media.type}/${cleanTitle}`;
      }
      
      navigate(navigationUrl);
    }
  };

  const value: PlayerContextType = {
    currentMedia,
    isMinimized,
    playerState,
    setCurrentMedia,
    setIsMinimized,
    updatePlayerState,
    closePlayer,
    minimizePlayer,
    maximizePlayer,
    startPlaying,
    onTimeUpdate,
    onPlayStateChange,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};