'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/common/Toast';

interface EnhancedVideoPlayerProps {
  src: string;
  chapterId: number;
  title: string;
  onProgress?: (progress: { currentTime: number; duration: number; percentage: number }) => void;
  initialTime?: number;
}

export default function EnhancedVideoPlayer({
  src,
  chapterId,
  title,
  onProgress,
  initialTime = 0,
}: EnhancedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState('auto');
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const progressTimer = useRef<NodeJS.Timeout>();
  const { showSuccess } = useToast();

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const qualities = ['auto', '1080p', '720p', '480p', '360p'];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    // Set initial time
    if (initialTime > 0) {
      video.currentTime = initialTime;
    }

    // Update duration when loaded
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    // Update current time
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Save progress every 5 seconds
      if (!progressTimer.current) {
        progressTimer.current = setInterval(() => {
          if (onProgress && video.duration > 0) {
            const percentage = (video.currentTime / video.duration) * 100;
            onProgress({
              currentTime: video.currentTime,
              duration: video.duration,
              percentage,
            });
          }
        }, 5000);
      }
    };

    // Handle play/pause
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    };
  }, [initialTime, onProgress]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const vol = parseFloat(e.target.value);
    video.volume = vol / 100;
    setVolume(vol);
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    showSuccess(`Playback speed: ${speed}x`);
  };

  const changeQuality = (q: string) => {
    setQuality(q);
    setShowQualityMenu(false);
    showSuccess(`Quality: ${q}`);
    // In production, this would switch video sources
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!document.fullscreenElement) {
      video.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="relative bg-black rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(true)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onClick={togglePlay}
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 cursor-pointer" onClick={togglePlay}>
          <div className="bg-white bg-opacity-90 rounded-full p-6 hover:scale-110 transition-transform">
            <svg className="w-16 h-16 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mb-4"
          style={{
            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`,
          }}
        />

        <div className="flex items-center justify-between text-white">
          {/* Left Controls */}
          <div className="flex items-center space-x-4">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="hover:scale-110 transition-transform">
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Skip Buttons */}
            <button onClick={() => skip(-10)} className="hover:text-purple-400 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            <button onClick={() => skip(10)} className="hover:text-purple-400 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Time */}
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-4">
            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-sm"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg shadow-xl p-2 space-y-1">
                  {speeds.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`block w-full px-4 py-2 text-left rounded hover:bg-gray-700 transition-colors ${
                        speed === playbackSpeed ? 'bg-purple-600' : ''
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Control */}
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-sm"
              >
                {quality}
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg shadow-xl p-2 space-y-1">
                  {qualities.map((q) => (
                    <button
                      key={q}
                      onClick={() => changeQuality(q)}
                      className={`block w-full px-4 py-2 text-left rounded hover:bg-gray-700 transition-colors ${
                        q === quality ? 'bg-purple-600' : ''
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

