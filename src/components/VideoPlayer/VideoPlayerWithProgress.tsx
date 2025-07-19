import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useWatchProgress } from '../../hooks/useWatchProgress';
import { useAuth } from '../../hooks/useAuth';

interface VideoPlayerWithProgressProps {
  src: string;
  movieTitle: string;
  startTime?: number; // Position de départ en secondes
  onClose?: () => void;
  className?: string;
}

const VideoPlayerWithProgress: React.FC<VideoPlayerWithProgressProps> = ({
  src,
  movieTitle,
  startTime = 0,
  onClose,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { saveProgress, addToHistory, markAsCompleted, getProgressForMovie } = useWatchProgress();
  const { user } = useAuth();
  
  const [sessionStart] = useState(new Date());
  const [lastSavedTime, setLastSavedTime] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Sauvegarder la progression toutes les 30 secondes
  const saveProgressCallback = useCallback(async () => {
    if (!videoRef.current || !user || !isVideoLoaded) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    // Éviter de sauvegarder trop souvent (minimum 10 secondes de différence)
    if (Math.abs(currentTime - lastSavedTime) < 10) return;

    await saveProgress(src, movieTitle, currentTime, duration);
    setLastSavedTime(currentTime);
  }, [src, movieTitle, saveProgress, user, isVideoLoaded, lastSavedTime]);

  // Gérer la fin du visionnage
  const handleVideoEnd = useCallback(async () => {
    if (!videoRef.current || !user) return;

    const duration = videoRef.current.duration;
    const sessionEnd = new Date();
    const sessionDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000;

    // Marquer comme terminé et ajouter à l'historique
    await markAsCompleted(src, movieTitle, duration);
    await addToHistory(src, movieTitle, sessionDuration, duration, sessionStart, sessionEnd);
  }, [src, movieTitle, markAsCompleted, addToHistory, sessionStart, user]);

  // Gérer la fermeture/pause prolongée
  const handleVisibilityChange = useCallback(async () => {
    if (document.hidden && videoRef.current && user && hasStarted) {
      // L'utilisateur a quitté l'onglet, sauvegarder la progression
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      
      if (currentTime > 0) {
        await saveProgress(src, movieTitle, currentTime, duration);
        
        // Ajouter une entrée d'historique pour cette session
        const sessionEnd = new Date();
        const sessionDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000;
        await addToHistory(src, movieTitle, sessionDuration, duration, sessionStart, sessionEnd);
      }
    }
  }, [src, movieTitle, saveProgress, addToHistory, sessionStart, user, hasStarted]);

  // Charger la progression sauvegardée
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!user) return;

      try {
        const progress = await getProgressForMovie(src);
        if (progress && videoRef.current) {
          const timeToSet = startTime || progress.current_position;
          videoRef.current.currentTime = timeToSet;
          setLastSavedTime(timeToSet);
        } else if (startTime && videoRef.current) {
          videoRef.current.currentTime = startTime;
          setLastSavedTime(startTime);
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
      }
    };

    if (isVideoLoaded) {
      loadSavedProgress();
    }
  }, [src, startTime, getProgressForMovie, user, isVideoLoaded]);

  // Configuration des événements
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Intervalles de sauvegarde
    const progressInterval = setInterval(saveProgressCallback, 30000); // Toutes les 30 secondes
    const quickSaveInterval = setInterval(() => {
      if (video.currentTime > 0 && !video.paused) {
        saveProgressCallback();
      }
    }, 10000); // Sauvegarde rapide toutes les 10 secondes pendant la lecture

    // Événements de visibilité
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Événements vidéo
    const handleLoadedMetadata = () => {
      setIsVideoLoaded(true);
    };

    const handlePlay = () => {
      setHasStarted(true);
    };

    const handleTimeUpdate = () => {
      if (video.currentTime > 0) {
        setHasStarted(true);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleVideoEnd);

    // Cleanup
    return () => {
      clearInterval(progressInterval);
      clearInterval(quickSaveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleVideoEnd);
      }

      // Sauvegarde finale avant le démontage
      if (video && user && hasStarted && video.currentTime > 0) {
        saveProgress(src, movieTitle, video.currentTime, video.duration);
        
        const sessionEnd = new Date();
        const sessionDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000;
        addToHistory(src, movieTitle, sessionDuration, video.duration, sessionStart, sessionEnd);
      }
    };
  }, [saveProgressCallback, handleVideoEnd, handleVisibilityChange, src, movieTitle, saveProgress, addToHistory, sessionStart, user, hasStarted]);

  // Gestionnaire de touches pour fermer avec Echap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={src}
        controls
        className="w-full h-full"
        preload="metadata"
        style={{ backgroundColor: 'black' }}
      >
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
      
      {/* Overlay pour fermer la vidéo */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
          title="Fermer (Echap)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
};

export default VideoPlayerWithProgress;