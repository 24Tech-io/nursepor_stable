'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, BookOpen, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Recommendation {
  courseId: number;
  courseTitle: string;
  courseThumbnail: string | null;
  progress: number;
  nextChapter: {
    id: number;
    title: string;
    type: string;
    moduleTitle: string;
  };
  lastAccessed: string;
}

export default function ContinueLearningWidget() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/student/continue-learning', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChapterIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play size={16} className="text-purple-600" />;
      case 'textbook':
        return <BookOpen size={16} className="text-blue-600" />;
      default:
        return <ChevronRight size={16} />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ChevronRight className="text-purple-600" size={24} />
          Continue Learning
        </h2>
        <p className="text-sm text-gray-600 mt-1">Pick up where you left off</p>
      </div>

      <div className="divide-y divide-gray-100">
        {recommendations.slice(0, 5).map((rec) => (
          <div
            key={rec.courseId}
            onClick={() =>
              router.push(`/student/courses/${rec.courseId}/chapters/${rec.nextChapter.id}`)
            }
            className="p-6 hover:bg-purple-50 transition cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              {/* Course Thumbnail */}
              {rec.courseThumbnail ? (
                <img
                  src={rec.courseThumbnail}
                  alt={rec.courseTitle}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                  <BookOpen className="text-white" size={24} />
                </div>
              )}

              {/* Content */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition">
                  {rec.courseTitle}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  {getChapterIcon(rec.nextChapter.type)}
                  <span>
                    {rec.nextChapter.moduleTitle}: {rec.nextChapter.title}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{rec.progress}% complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${rec.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight
                className="text-gray-400 group-hover:text-purple-600 transition"
                size={24}
              />
            </div>
          </div>
        ))}
      </div>

      {recommendations.length > 5 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={() => router.push('/student/courses')}
            className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
          >
            View all courses →
          </button>
        </div>
      )}
    </div>
  );
}
