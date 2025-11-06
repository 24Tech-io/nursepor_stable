'use client';

import { useState, useEffect } from 'react';

interface VideoPlayerProps {
  url: string;
  provider: 'youtube' | 'vimeo';
  onProgressUpdate?: (watchTime: number) => void;
  onComplete?: () => void;
}

export default function VideoPlayer({
  url,
  provider,
  onProgressUpdate,
  onComplete,
}: VideoPlayerProps) {
  const [watchTime, setWatchTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setWatchTime((prev) => {
          const newTime = prev + 1;
          if (onProgressUpdate) {
            onProgressUpdate(newTime);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, onProgressUpdate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
      {/* Video Embed */}
      <div className="relative pt-[56.25%]">
        <iframe
          src={url}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      {/* Controls Info */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition"
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="text-sm">
              <p className="font-semibold">Watch Time</p>
              <p className="text-gray-300">{formatTime(watchTime)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Provider</p>
            <p className="text-sm font-semibold capitalize">{provider}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
