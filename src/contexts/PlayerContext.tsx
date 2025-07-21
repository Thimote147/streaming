import React, { useState, useRef, type ReactNode } from 'react';
import type { MediaItem } from '../services/api';
import { PlayerContext } from '../utils/usePlayer';

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
  mediaRef: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>;
  
  // Actions
  setCurrentMedia: (media: MediaItem | null) => void;
  setIsMinimized: (minimized: boolean) => void;
  setPlayerState: (state: PlayerState) => void;
  closePlayer: () => void;
  minimizePlayer: () => void;
  maximizePlayer: () => void;
  
  // Media controls
  playPause: () => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
  toggleMute: () => void;
}

export interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 1,
    isMuted: false,
  });
  
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

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

  const playPause = () => {
    if (mediaRef.current) {
      if (playerState.isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play().catch(console.error);
      }
    }
  };

  const setVolume = (volume: number) => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
      setPlayerState(prev => ({ ...prev, volume, isMuted: volume === 0 }));
    }
  };

  const seek = (time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setPlayerState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      const newMuted = !playerState.isMuted;
      mediaRef.current.muted = newMuted;
      setPlayerState(prev => ({ ...prev, isMuted: newMuted }));
    }
  };

  const value: PlayerContextType = {
    currentMedia,
    isMinimized,
    playerState,
    mediaRef,
    setCurrentMedia,
    setIsMinimized,
    setPlayerState,
    closePlayer,
    minimizePlayer,
    maximizePlayer,
    playPause,
    setVolume,
    seek,
    toggleMute,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};