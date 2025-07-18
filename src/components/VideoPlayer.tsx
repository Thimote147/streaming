import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MediaItem } from '../services/api';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { useAuth } from '../hooks/useAuth';

interface VideoPlayerProps {
  media: MediaItem;
  onClose: () => void;
  isVisible: boolean;
  startTime?: number; // Position de départ en secondes
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ media, onClose, isVisible, startTime = 0 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hooks pour le suivi de progression
  const { saveProgress, addToHistory, markAsCompleted, getProgressForMovie } = useWatchProgress();
  const { user } = useAuth();
  
  // États pour le suivi de progression
  const [sessionStart] = useState(new Date());
  const [lastSavedTime, setLastSavedTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // Sauvegarder la progression
  const saveProgressCallback = useCallback(async () => {
    if (!videoRef.current || !user || !hasStarted) return;

    const current = videoRef.current.currentTime;
    const totalDuration = videoRef.current.duration;

    // Éviter de sauvegarder trop souvent
    if (Math.abs(current - lastSavedTime) < 10) return;

    await saveProgress(media.path, media.title, current, totalDuration);
    setLastSavedTime(current);
  }, [media.path, media.title, saveProgress, user, hasStarted, lastSavedTime]);

  // Gérer la fin du visionnage
  const handleVideoEnd = useCallback(async () => {
    if (!videoRef.current || !user) return;

    const totalDuration = videoRef.current.duration;
    const sessionEnd = new Date();
    const sessionDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000;

    await markAsCompleted(media.path, media.title, totalDuration);
    await addToHistory(media.path, media.title, sessionDuration, totalDuration, sessionStart, sessionEnd);
  }, [media.path, media.title, markAsCompleted, addToHistory, sessionStart, user]);

  // Charger la progression sauvegardée
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!user || !videoRef.current) return;

      try {
        const progress = await getProgressForMovie(media.path);
        if (progress && progress.current_position > 30) { // Reprendre seulement si > 30 secondes
          videoRef.current.currentTime = startTime || progress.current_position;
          setLastSavedTime(startTime || progress.current_position);
        } else if (startTime) {
          videoRef.current.currentTime = startTime;
          setLastSavedTime(startTime);
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
      }
    };

    if (duration > 0) {
      loadSavedProgress();
    }
  }, [media.path, startTime, getProgressForMovie, user, duration]);

  useEffect(() => {
    const video = videoRef.current; // Save ref to local variable

    if (video) {
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
        setIsLoading(false);
      };
      const handleLoadedData = () => setIsLoading(false);
      const handleCanPlay = () => setIsLoading(false);
      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        if (video.currentTime > 0) setHasStarted(true);
      };
      const handlePlay = () => {
        setIsPlaying(true);
        setHasStarted(true);
      };
      const handlePause = () => setIsPlaying(false);
      const handleVolumeChange = () => {
        setVolume(video.volume);
        setIsMuted(video.muted);
      };
      const handleError = () => {
        console.error('Video playback error');
        setIsLoading(false);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('volumechange', handleVolumeChange);
      video.addEventListener('error', handleError);
      video.addEventListener('ended', handleVideoEnd);

      return () => {
        // Use the same local variable for cleanup
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('volumechange', handleVolumeChange);
        video.removeEventListener('error', handleError);
        video.removeEventListener('ended', handleVideoEnd);
      };
    }
  }, [media.path, handleVideoEnd]);

  // Configuration des intervalles de sauvegarde
  useEffect(() => {
    const video = videoRef.current;
    if (!user) return;

    const progressInterval = setInterval(saveProgressCallback, 30000); // Toutes les 30 secondes
    const quickSaveInterval = setInterval(() => {
      if (video && !video.paused && hasStarted) {
        saveProgressCallback();
      }
    }, 10000); // Sauvegarde rapide toutes les 10 secondes

    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && hasStarted) {
        saveProgressCallback();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(progressInterval);
      clearInterval(quickSaveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Sauvegarde finale avant le démontage
      if (video && hasStarted && video.currentTime > 0) {
        saveProgressCallback();
      }
    };
  }, [saveProgressCallback, user, hasStarted]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className="fixed inset-0 bg-black z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseMove={handleMouseMove}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={`/api/stream/${encodeURIComponent(media.path)}`}
          autoPlay
          preload="metadata"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
              <p>Chargement...</p>
            </div>
          </div>
        )}

        {/* Close Button - Show on hover or with controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div 
              className="absolute top-4 right-4 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-white hover:text-gray-300 hover:bg-white/10 p-3 rounded-full transition-all duration-200 backdrop-blur-sm bg-black/50"
                aria-label="Fermer le lecteur vidéo"
              >
                <X size={24} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Top Controls */}
              <div className="absolute top-4 left-4 right-16 flex justify-between items-center">
                <h2 className="text-white text-xl font-semibold">{media.title}</h2>
              </div>

              {/* Center Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.button
                  onClick={togglePlay}
                  className="bg-black/50 text-white p-4 rounded-full hover:bg-black/70 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
                </motion.button>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-4 left-4 right-4">
                {/* Progress Bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-300 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={togglePlay}
                      className="text-white hover:text-gray-300 transition-colors"
                    >
                      {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                    </button>
                    
                    <button
                      onClick={() => skip(-10)}
                      className="text-white hover:text-gray-300 transition-colors"
                    >
                      <SkipBack size={24} />
                    </button>
                    
                    <button
                      onClick={() => skip(10)}
                      className="text-white hover:text-gray-300 transition-colors"
                    >
                      <SkipForward size={24} />
                    </button>

                    {/* Volume Controls */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={toggleMute}
                        className="text-white hover:text-gray-300 transition-colors"
                      >
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={toggleFullscreen}
                      className="text-white hover:text-gray-300 transition-colors"
                    >
                      {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoPlayer;