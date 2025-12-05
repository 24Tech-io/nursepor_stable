'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/student/LoadingSpinner';
import { canAccessChapter } from '@/lib/prerequisites';

interface Module {
  id: number;
  title: string;
  description: string;
  order: number;
  duration: number;
  chapters: Chapter[];
}

interface Chapter {
  id: number;
  title: string;
  description: string;
  type: string;
  order: number;
  videoUrl?: string;
  videoProvider?: string;
  videoDuration?: number;
  textbookContent?: string;
  readingTime?: number;
  prerequisiteChapterId?: number;
}

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchCourseData();
    fetchProgress();
  }, [params.courseId]);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/student/progress', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        // Convert array of chapter IDs to Set of numbers
        const chapterIds = Array.isArray(data.completedChapters)
          ? data.completedChapters.map((id: any) => Number(id))
          : [];

        // Merge with existing state to avoid overwriting recent updates
        setCompletedChapters((prev) => {
          const newSet = new Set(prev);
          chapterIds.forEach((id: number) => newSet.add(id));
          console.log('✅ Progress fetched and merged, completed chapters:', Array.from(newSet));
          return newSet;
        });
      } else {
        console.error('❌ Failed to fetch progress:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching progress:', error);
    }
  };

  const fetchCourseData = async () => {
    try {
      // Fetch course details
      const courseRes = await fetch(`/api/student/courses/${params.courseId}`, {
        credentials: 'include',
      });

      if (!courseRes.ok) {
        if (courseRes.status === 403) {
          alert('You do not have access to this course');
          router.push('/student/courses');
          return;
        }
        throw new Error('Failed to fetch course');
      }

      const courseData = await courseRes.json();
      setCourse(courseData.course);

      // Fetch modules with chapters
      const modulesRes = await fetch(`/api/student/courses/${params.courseId}/modules`, {
        credentials: 'include',
      });

      if (modulesRes.ok) {
        const modulesData = await modulesRes.json();
        setModules(modulesData.modules || []);
        // Expand first module by default
        if (modulesData.modules?.length > 0) {
          setExpandedModules(new Set([modulesData.modules[0].id]));
        }
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModule = (moduleId: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const getChapterIcon = (type: string) => {
    switch (type) {
      case 'video':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      case 'textbook':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        );
      case 'mcq':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading course content..." fullScreen />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Course Header */}
      <div className="mb-8">
        <Link
          href="/student/courses"
          className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Courses
        </Link>

        {course && (
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">{course.title}</h1>
            <p className="text-lg text-gray-600 mb-4">{course.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                {course.instructor}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
                {modules.length} Modules
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {modules.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No modules yet</h3>
            <p className="text-gray-600">This course content is being prepared. Check back soon!</p>
          </div>
        ) : (
          modules.map((module, index) => (
            <div
              key={module.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-colors"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{module.title}</h3>
                    {module.description && (
                      <p className="text-sm text-gray-600">{module.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {module.chapters.length} chapter{module.chapters.length !== 1 ? 's' : ''}
                      {module.duration > 0 && ` · ${module.duration} min`}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-6 h-6 text-gray-400 transition-transform ${
                    expandedModules.has(module.id) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Chapters List */}
              {expandedModules.has(module.id) && (
                <div className="p-6 space-y-2 bg-gray-50">
                  {module.chapters.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No chapters in this module yet</p>
                  ) : (
                    module.chapters.map((chapter, chapterIndex) => {
                      // Ensure we compare numbers with numbers
                      const chapterIdNum = Number(chapter.id);
                      const isCompleted = completedChapters.has(chapterIdNum);

                      // Debug logging
                      if (chapterIndex === 0) {
                        console.log('🔍 Chapter check:', {
                          chapterId: chapter.id,
                          chapterIdNum,
                          completedChapters: Array.from(completedChapters),
                          isCompleted,
                        });
                      }

                      return (
                        <button
                          key={chapter.id}
                          onClick={async () => {
                            // Check prerequisites before opening
                            if (chapter.prerequisiteChapterId) {
                              // Check if prerequisite is completed (ensure number comparison)
                              const prereqIdNum = Number(chapter.prerequisiteChapterId);
                              const isPrereqCompleted = completedChapters.has(prereqIdNum);

                              if (!isPrereqCompleted) {
                                alert('Please complete the previous chapter first');
                                return;
                              }
                            }
                            setSelectedChapter(chapter);
                          }}
                          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-shadow border border-gray-200 hover:border-purple-300"
                        >
                          <div className="w-8 h-8 flex items-center justify-center text-purple-600 relative">
                            {getChapterIcon(chapter.type)}
                            {isCompleted && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{chapter.title}</h4>
                              {isCompleted && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  Completed
                                </span>
                              )}
                            </div>
                            {chapter.description && (
                              <p className="text-sm text-gray-600">{chapter.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium capitalize">
                                {chapter.type}
                              </span>
                              {chapter.videoDuration && (
                                <span className="text-xs text-gray-500">
                                  {chapter.videoDuration} min
                                </span>
                              )}
                              {chapter.readingTime && (
                                <span className="text-xs text-gray-500">
                                  {chapter.readingTime} min read
                                </span>
                              )}
                            </div>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Chapter Viewer Modal */}
      {selectedChapter && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">{selectedChapter.title}</h2>
              <button
                onClick={() => setSelectedChapter(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {selectedChapter.type === 'video' && selectedChapter.videoUrl && (
                <div className="mb-6">
                  <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                    {(() => {
                      // Get the video URL
                      let videoUrl = selectedChapter.videoUrl;
                      const provider = selectedChapter.videoProvider || 'youtube';
                      
                      // Convert to proper embed URL with privacy settings
                      if (provider === 'youtube') {
                        // Extract video ID from various YouTube URL formats
                        const youtubePatterns = [
                          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
                          /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
                        ];
                        
                        let videoId = null;
                        for (const pattern of youtubePatterns) {
                          const match = videoUrl.match(pattern);
                          if (match && match[1]) {
                            videoId = match[1].split('&')[0].split('#')[0].split('?')[0];
                            break;
                          }
                        }
                        
                        if (videoId) {
                          // Use youtube-nocookie.com for extra privacy and add parameters to hide branding
                          videoUrl = `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=1&color=white&disablekb=0`;
                        }
                        
                        return (
                          <iframe
                            className="w-full h-full"
                            src={videoUrl}
                            title={selectedChapter.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                            frameBorder="0"
                          />
                        );
                      } else if (provider === 'vimeo') {
                        // Extract Vimeo video ID
                        const vimeoPatterns = [
                          /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/,
                          /vimeo\.com\/channels\/[^\/]+\/(\d+)/,
                          /vimeo\.com\/groups\/[^\/]+\/videos\/(\d+)/,
                        ];
                        
                        let videoId = null;
                        for (const pattern of vimeoPatterns) {
                          const match = videoUrl.match(pattern);
                          if (match && match[1]) {
                            videoId = match[1];
                            break;
                          }
                        }
                        
                        if (videoId) {
                          // Hide all Vimeo branding
                          videoUrl = `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&color=8b5cf6`;
                        }
                        
                        return (
                          <iframe
                            className="w-full h-full"
                            src={videoUrl}
                            title={selectedChapter.title}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            frameBorder="0"
                          />
                        );
                      } else {
                        return (
                          <div className="flex items-center justify-center h-full text-white">
                            <p>Unsupported video provider</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Video is now playing. Use the player controls to pause, adjust volume, or enable captions.
                  </p>
                </div>
              )}

              {selectedChapter.type === 'textbook' && selectedChapter.textbookContent && (
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-6">
                  <div 
                    className="prose prose-lg max-w-none [&_*]:!text-gray-900 [&_h1]:!text-gray-900 [&_h2]:!text-gray-900 [&_h3]:!text-gray-900 [&_h4]:!text-gray-900 [&_h5]:!text-gray-900 [&_h6]:!text-gray-900 [&_p]:!text-gray-900 [&_span]:!text-gray-900 [&_div]:!text-gray-900 [&_li]:!text-gray-900 [&_strong]:!text-gray-900 [&_b]:!text-gray-900 [&_a]:!text-blue-600 [&_a]:!underline"
                    style={{ color: '#111827' }}
                    dangerouslySetInnerHTML={{ __html: selectedChapter.textbookContent }} 
                  />
                </div>
              )}

              {selectedChapter.type === 'document' && (selectedChapter as any).textbookFileUrl && (
                <div className="mb-6">
                  <div className="bg-white rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
                    {/* Document Viewer - Coursera-style */}
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Document Viewer</span>
                      </div>
                      <a
                        href={(selectedChapter as any).textbookFileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                    <div className="bg-gray-50 p-4">
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent((selectedChapter as any).textbookFileUrl)}&embedded=true`}
                        className="w-full h-[700px] border-0 rounded-lg bg-white"
                        title={selectedChapter.title}
                        style={{ backgroundColor: '#ffffff' }}
                        allow="fullscreen"
                      />
                    </div>
                  </div>
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-900 flex items-start gap-2">
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>
                        <strong>Tip:</strong> If the document doesn't load, click the Download button to view it locally. The viewer works best with PDF files.
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {selectedChapter.type === 'mcq' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                  <p className="text-blue-900 font-medium mb-4">📝 Quiz Available</p>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `/api/student/quizzes/chapter/${selectedChapter.id}`,
                          {
                            credentials: 'include',
                          }
                        );
                        if (response.ok) {
                          const data = await response.json();
                          router.push(`/student/quizzes/${data.quiz.id}`);
                        } else {
                          alert('No quiz available for this chapter');
                        }
                      } catch (error) {
                        console.error('Error fetching quiz:', error);
                        alert('Failed to load quiz');
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Start Quiz
                  </button>
                </div>
              )}

              {selectedChapter.description && (
                <div className="text-gray-700 mb-6">
                  <p>{selectedChapter.description}</p>
                </div>
              )}

              <button
                onClick={async () => {
                  if (!selectedChapter || !course) return;

                  try {
                    const response = await fetch('/api/student/chapters/complete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        chapterId: selectedChapter.id,
                        courseId: course.id,
                      }),
                    });

                    if (response.ok) {
                      const result = await response.json();
                      console.log('✅ Chapter marked complete:', result);

                      // Update local state to show checkmark immediately
                      const chapterIdNum = Number(selectedChapter.id);
                      console.log('📝 Adding chapter ID to completed set:', chapterIdNum);

                      setCompletedChapters((prev) => {
                        const newSet = new Set(prev);
                        newSet.add(chapterIdNum);
                        console.log('✅ Updated completed chapters set:', Array.from(newSet));
                        return newSet;
                      });

                      // Close modal first so UI updates are visible
                      setSelectedChapter(null);

                      // Show success feedback
                      alert('Chapter marked as complete! ✓');

                      // Refresh progress data after a short delay to ensure sync
                      setTimeout(async () => {
                        console.log('🔄 Refreshing progress data...');
                        await fetchProgress();
                      }, 300);
                    } else {
                      const errorData = await response.json().catch(() => ({}));
                      alert(errorData.message || 'Failed to mark chapter as complete');
                    }
                  } catch (error) {
                    console.error('Error marking chapter complete:', error);
                    alert('Failed to mark chapter as complete. Please try again.');
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Mark as Complete & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
