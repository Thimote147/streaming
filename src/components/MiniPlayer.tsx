import React, { useRef, useEffect, useState } from "react";
import { Play, Pause, Volume2, VolumeX, X, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MediaItem } from "../services/api";
import { streamingAPI } from "../services/api";

interface MiniPlayerProps {
  media: MediaItem;
  isVisible: boolean;
  onClose: () => void;
  onMaximize: () => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  media,
  isVisible,
  onClose,
  onMaximize,
  onTimeUpdate,
  onPlayStateChange,
}) => {
  const [showControls, setShowControls] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const miniPlayerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Initialize media element
  useEffect(() => {
    if (!media || !mediaRef.current) return;

    const mediaElement = mediaRef.current;
    const streamUrl = streamingAPI.getStreamUrl(media.path);
    mediaElement.src = streamUrl;
    mediaElement.volume = volume;
    mediaElement.muted = isMuted;

    const handleLoadedMetadata = () => {
      setDuration(mediaElement.duration || 0);
      onTimeUpdate(0, mediaElement.duration || 0);
      // Auto-play when media is loaded
      mediaElement.play().catch(console.error);
    };

    const handleTimeUpdate = () => {
      const current = mediaElement.currentTime;
      const total = mediaElement.duration || 0;
      setCurrentTime(current);
      onTimeUpdate(current, total);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange(false);
    };

    const handleError = (e: Event) => {
      console.error('Media playback error:', e);
    };

    mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    mediaElement.addEventListener('timeupdate', handleTimeUpdate);
    mediaElement.addEventListener('play', handlePlay);
    mediaElement.addEventListener('pause', handlePause);
    mediaElement.addEventListener('ended', handleEnded);
    mediaElement.addEventListener('error', handleError);

    return () => {
      mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
      mediaElement.removeEventListener('play', handlePlay);
      mediaElement.removeEventListener('pause', handlePause);
      mediaElement.removeEventListener('ended', handleEnded);
      mediaElement.removeEventListener('error', handleError);
    };
  }, [media, volume, isMuted, onTimeUpdate, onPlayStateChange]);

  const handlePlayPause = () => {
    if (!mediaRef.current) return;
    
    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play().catch(console.error);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!mediaRef.current) return;
    
    setVolume(newVolume);
    mediaRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
    mediaRef.current.muted = newVolume === 0;
  };

  const handleSeek = (time: number) => {
    if (!mediaRef.current) return;
    
    mediaRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleToggleMute = () => {
    if (!mediaRef.current) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    mediaRef.current.muted = newMuted;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (miniPlayerRef.current) {
      const rect = miniPlayerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragOffset]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={miniPlayerRef}
        className="fixed z-50 bg-black/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 overflow-hidden cursor-move select-none"
        style={{
          left: position.x,
          top: position.y,
          width: "320px",
          height: media.type === "music" ? "120px" : "200px",
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Hidden Media Element */}
        {media.type === 'music' ? (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            style={{ display: 'none' }}
            preload="auto"
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            style={{ display: 'none' }}
            preload="auto"
          />
        )}

        {/* Video/Music Content */}
        {media.type === "music" ? (
          <div className="flex items-center h-full p-3">
            {/* Album Art */}
            {media.poster && (
              <img
                src={media.poster}
                alt={media.title}
                className="w-16 h-16 rounded-md object-cover mr-3"
              />
            )}

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-white text-sm font-medium truncate">
                {media.title}
              </h4>
              {media.artist && (
                <p className="text-gray-400 text-xs truncate">{media.artist}</p>
              )}

              {/* Progress Bar for Music */}
              <div className="mt-1">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mini-slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative h-full">
            {/* Video Thumbnail */}
            {media.poster && (
              <img
                src={media.poster}
                alt={media.title}
                className="w-full h-32 object-cover"
              />
            )}

            {/* Video Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <h4 className="text-white text-sm font-medium truncate">
                {media.frenchTitle || media.title}
              </h4>

              {/* Progress Bar for Video */}
              <div className="mt-2">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mini-slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              className="absolute inset-0 bg-black/50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-3">
                {/* Play/Pause */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause();
                  }}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={20} />
                  ) : (
                    <Play size={20} fill="currentColor" />
                  )}
                </button>

                {/* Volume */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMute();
                    }}
                    className="text-white hover:text-gray-300 transition-colors"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-12 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mini-slider"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Maximize */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMaximize();
                  }}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <Maximize2 size={16} />
                </button>

                {/* Close */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="text-white hover:text-gray-300 transition-colors ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Custom CSS for mini sliders */}
      <style>{`
        .mini-slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
        }
        
        .mini-slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </AnimatePresence>
  );
};

export default MiniPlayer;
