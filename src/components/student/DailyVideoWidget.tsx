'use client';

import { useEffect, useState } from 'react';
import { Play, Clock, CheckCircle } from 'lucide-react';

interface DailyVideo {
    id: number;
    title: string;
    description: string;
    chapterId: number;
    videoUrl: string;
    videoProvider: string;
    completed: boolean;
    watchedPercentage: number;
    availableUntil: string;
    hoursRemaining: number;
}

export default function DailyVideoWidget() {
    const [dailyVideo, setDailyVideo] = useState<DailyVideo | null>(null);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDailyVideo();
    }, []);

    useEffect(() => {
        if (dailyVideo?.availableUntil) {
            const interval = setInterval(() => {
                updateTimeRemaining();
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [dailyVideo]);

    const fetchDailyVideo = async () => {
        try {
            const response = await fetch('/api/student/daily-video', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setDailyVideo(data.video);
            }
        } catch (error) {
            console.error('Error fetching daily video:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateTimeRemaining = () => {
        if (!dailyVideo?.availableUntil) return;

        const now = new Date().getTime();
        const end = new Date(dailyVideo.availableUntil).getTime();
        const diff = end - now;

        if (diff <= 0) {
            setTimeRemaining('Expired');
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    const markAsComplete = async () => {
        if (!dailyVideo) return;

        try {
            const response = await fetch('/api/student/daily-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ chapterId: dailyVideo.chapterId })
            });

            if (response.ok) {
                setDailyVideo({ ...dailyVideo, completed: true });
            }
        } catch (error) {
            console.error('Error marking video complete:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl shadow-xl p-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-white/20 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    if (!dailyVideo) {
        return (
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-2xl shadow-xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-2">No Daily Video Today</h2>
                <p className="text-gray-200">Check back tomorrow for new content!</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wide">
                                Today's Video
                            </span>

                            {/* Countdown Timer */}
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                                <Clock size={14} />
                                <span className="text-xs font-bold">{timeRemaining}</span>
                            </div>

                            {dailyVideo.completed && (
                                <div className="flex items-center gap-1 px-3 py-1 bg-green-500/30 backdrop-blur-sm rounded-full">
                                    <CheckCircle size={14} />
                                    <span className="text-xs font-bold">Completed</span>
                                </div>
                            )}
                        </div>

                        <h2 className="text-3xl font-bold mb-2">{dailyVideo.title}</h2>
                        <p className="text-pink-100 mb-4">{dailyVideo.description}</p>

                        {/* Progress Bar */}
                        {dailyVideo.watchedPercentage > 0 && (
                            <div className="mb-4">
                                <div className="w-full bg-white/20 rounded-full h-2">
                                    <div
                                        className="bg-white h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${dailyVideo.watchedPercentage}%` }}
                                    />
                                </div>
                                <p className="text-xs text-pink-100 mt-1">{dailyVideo.watchedPercentage.toFixed(0)}% watched</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <a
                                href={`/student/courses/chapter/${dailyVideo.chapterId}`}
                                className="bg-white text-pink-600 px-6 py-3 rounded-xl font-semibold hover:bg-pink-50 transition shadow-lg flex items-center gap-2"
                            >
                                <Play size={20} fill="currentColor" />
                                <span>Watch Now</span>
                            </a>

                            {!dailyVideo.completed && dailyVideo.watchedPercentage >= 90 && (
                                <button
                                    onClick={markAsComplete}
                                    className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition shadow-lg flex items-center gap-2"
                                >
                                    <CheckCircle size={20} />
                                    <span>Mark Complete</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Video Icon */}
                    <div className="hidden md:block">
                        <div className="w-32 h-32 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <Play size={48} fill="white" className="text-white" />
                        </div>
                    </div>
                </div>

                {/* Timer Warning */}
                {dailyVideo.hoursRemaining <= 3 && (
                    <div className="mt-4 p-4 bg-yellow-500/20 backdrop-blur-sm rounded-xl border border-yellow-400/30">
                        <p className="text-sm font-semibold flex items-center gap-2">
                            <Clock size={16} />
                            Hurry! Only {dailyVideo.hoursRemaining} hours remaining
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
