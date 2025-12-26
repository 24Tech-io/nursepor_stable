'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Calendar, Clock, ChevronLeft, Play } from 'lucide-react';

interface DailyVideo {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  scheduledDate: string;
  isActive: boolean;
  createdAt: string;
}

export default function DailyVideosPage() {
  const router = useRouter();
  const [todayVideo, setTodayVideo] = useState<DailyVideo | null>(null);
  const [pastVideos, setPastVideos] = useState<DailyVideo[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<DailyVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPast, setIsLoadingPast] = useState(false);

  useEffect(() => {
    fetchTodayVideo();
    fetchPastVideos();
  }, []);

  const fetchTodayVideo = async () => {
    try {
      const response = await fetch('/api/student/daily-videos', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTodayVideo(data.video);
      }
    } catch (error) {
      console.error('Error fetching today\'s video:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPastVideos = async () => {
    setIsLoadingPast(true);
    try {
      const response = await fetch('/api/student/daily-videos?past=true', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPastVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Error fetching past videos:', error);
    } finally {
      setIsLoadingPast(false);
    }
  };

  const fetchVideoByDate = async (date: string) => {
    if (!date) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/student/daily-videos?date=${date}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedVideo(data.video);
      }
    } catch (error) {
      console.error('Error fetching video by date:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (date) {
      fetchVideoByDate(date);
    } else {
      setSelectedVideo(null);
    }
  };

  const getVideoEmbedUrl = (url: string) => {
    // Check if it's a YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    // Check if it's a Vimeo URL
    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }
    // Return as-is for direct video URLs
    return url;
  };

  const displayVideo = selectedVideo || todayVideo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Video className="text-purple-400" size={36} />
            Daily Videos
          </h1>
          <p className="text-slate-400">Watch today's featured video and explore past videos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Player */}
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-12 border border-white/10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            ) : displayVideo ? (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-2">{displayVideo.title}</h2>
                  {displayVideo.description && (
                    <p className="text-slate-300 mb-4">{displayVideo.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      {new Date(displayVideo.scheduledDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  {displayVideo.videoUrl.includes('youtube.com') || displayVideo.videoUrl.includes('youtu.be') || displayVideo.videoUrl.includes('vimeo.com') ? (
                    <iframe
                      src={getVideoEmbedUrl(displayVideo.videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={displayVideo.videoUrl}
                      controls
                      className="w-full h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-12 border border-white/10 text-center">
                <Video size={48} className="mx-auto mb-4 text-slate-500" />
                <h3 className="text-xl font-bold mb-2">No Video Available</h3>
                <p className="text-slate-400">
                  {selectedDate
                    ? 'No video is scheduled for the selected date.'
                    : 'No video is available for today. Check back tomorrow!'}
                </p>
              </div>
            )}

            {/* Date Selector */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Watch Video by Date
              </h3>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {selectedDate && (
                <button
                  onClick={() => {
                    setSelectedDate('');
                    setSelectedVideo(null);
                    setTodayVideo(todayVideo);
                  }}
                  className="mt-3 text-sm text-purple-400 hover:text-purple-300"
                >
                  View Today's Video
                </button>
              )}
            </div>
          </div>

          {/* Past Videos Sidebar */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clock size={20} />
                Past Videos
              </h3>
              {isLoadingPast ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-slate-800/50 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : pastVideos.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {pastVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        setSelectedVideo(video);
                        setSelectedDate(new Date(video.scheduledDate).toISOString().split('T')[0]);
                      }}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedVideo?.id === video.id
                          ? 'bg-purple-500/20 border-purple-500/50'
                          : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                          <Play size={20} className="text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white mb-1 truncate">{video.title}</h4>
                          <p className="text-xs text-slate-400">
                            {new Date(video.scheduledDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">
                  No past videos available yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


