'use client';

import { useState, useEffect } from 'react';
import { parseVideoUrl } from '@/lib/video-utils';

interface VideoPlayerProps {
  url: string;
  provider?: 'youtube' | 'vimeo' | 'direct' | 'unknown';
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
  const [embedUrl, setEmbedUrl] = useState<string>(url);

  useEffect(() => {
    // Parse URL and convert to embed format if needed
    if (url) {
      const parsed = parseVideoUrl(url);
      setEmbedUrl(parsed.embedUrl);
    }
  }, [url]);

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

  // Check if it's a direct video file (not embeddable)
  const isDirectVideo = embedUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);

  return (
    <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
      {/* Video Embed or Direct Video */}
      <div className="relative pt-[56.25%]">
        {isDirectVideo ? (
          <video
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => {
              const currentTime = Math.floor(e.currentTarget.currentTime);
              setWatchTime(currentTime);
              if (onProgressUpdate) {
                onProgressUpdate(currentTime);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              if (onComplete) {
                onComplete();
              }
            }}
          />
        ) : (
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            frameBorder="0"
            style={{ border: 'none' }}
          />
        )}
      </div>

      {/* Controls Info - Hidden provider branding */}
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
          {/* Provider branding removed - no longer showing provider name */}
        </div>
      </div>
    </div>
  );
}
