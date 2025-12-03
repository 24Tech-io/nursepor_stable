'use client';

import { useState, useEffect } from 'react';

interface DailyVideo {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  videoProvider: string;
  videoDuration: number | null;
  day: number;
}

export default function DailyVideoPage() {
  const [video, setVideo] = useState<DailyVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchDailyVideo();
  }, []);

  const fetchDailyVideo = async () => {
    try {
      const response = await fetch('/api/student/daily-video', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setVideo(data.video);
        setCompleted(data.video?.completed || false);
      }
    } catch (error) {
      console.error('Error fetching daily video:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoEmbedUrl = (url: string, provider: string) => {
    if (provider === 'youtube') {
      // Extract video ID from various YouTube URL formats
      const match = url.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      );
      return match ? `https://www.youtube.com/embed/${match[1]}` : url;
    } else if (provider === 'vimeo') {
      // Extract video ID from Vimeo URL
      const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : url;
    }
    return url;
  };

  const renderVideoPlayer = () => {
    if (!video || !video.videoUrl) return null;

    const provider = video.videoProvider || 'youtube';

    if (provider === 'uploaded' || provider === 'direct') {
      // Direct video file or uploaded video - use HTML5 video player
      return (
        <video className="w-full h-full" controls controlsList="nodownload" preload="metadata">
          <source src={video.videoUrl} type="video/mp4" />
          <source src={video.videoUrl} type="video/webm" />
          <source src={video.videoUrl} type="video/ogg" />
          Your browser does not support the video tag.
        </video>
      );
    } else {
      // YouTube, Vimeo, or other embeddable sources
      const embedUrl = getVideoEmbedUrl(video.videoUrl, provider);
      return (
        <iframe
          className="w-full h-full"
          src={embedUrl}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading daily video...</p>
      </div>
    );
  }

  if (!video) {
    return <div className="bg-white rounded-2xl p-8">No daily videos configured.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
            <p className="text-gray-600">
              Available for 24 hours
              {video.videoDuration && ` · ${video.videoDuration} min`}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
          >
            {completed ? 'Completed' : 'In Progress'}
          </span>
        </div>
        <div className="aspect-video w-full bg-black">{renderVideoPlayer()}</div>
        <div className="p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Provider: {video.videoProvider?.toUpperCase() || 'UNKNOWN'}
          </div>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/student/daily-video', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ chapterId: video.id }),
                });
                if (response.ok) {
                  setCompleted(true);
                }
              } catch (error) {
                console.error('Error marking video complete:', error);
              }
            }}
            disabled={completed}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {completed ? 'Completed' : 'Mark as Complete'}
          </button>
        </div>
      </div>

      {video.description && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Description</h2>
          <p className="text-gray-600">{video.description}</p>
        </div>
      )}
    </div>
  );
}
