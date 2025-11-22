'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      const response = await fetch('/api/student/progress', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCompletedChapters(new Set(data.completedChapters));
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
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
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course content...</p>
        </div>
      </div>
    );
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                  className={`w-6 h-6 text-gray-400 transition-transform ${expandedModules.has(module.id) ? 'rotate-180' : ''
                    }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Chapters List */}
              {expandedModules.has(module.id) && (
                <div className="p-6 space-y-2 bg-gray-50">
                  {module.chapters.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No chapters in this module yet</p>
                  ) : (
                    module.chapters.map((chapter, chapterIndex) => (
                      <button
                        key={chapter.id}
                        onClick={async () => {
                          // Check prerequisites before opening
                          if (chapter.prerequisiteChapterId) {
                            // Check if prerequisite is completed
                            const isCompleted = completedChapters.has(chapter.prerequisiteChapterId);

                            if (!isCompleted) {
                              alert('Please complete the previous chapter first');
                              return;
                            }
                          }
                          setSelectedChapter(chapter);
                        }}
                        className="w-full flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-shadow border border-gray-200 hover:border-purple-300"
                      >
                        <div className="w-8 h-8 flex items-center justify-center text-purple-600">
                          {getChapterIcon(chapter.type)}
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="font-semibold text-gray-900">{chapter.title}</h4>
                          {chapter.description && (
                            <p className="text-sm text-gray-600">{chapter.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium capitalize">
                              {chapter.type}
                            </span>
                            {chapter.videoDuration && (
                              <span className="text-xs text-gray-500">{chapter.videoDuration} min</span>
                            )}
                            {chapter.readingTime && (
                              <span className="text-xs text-gray-500">{chapter.readingTime} min read</span>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))
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
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {selectedChapter.type === 'video' && selectedChapter.videoUrl && (
                <div className="aspect-video bg-black rounded-xl overflow-hidden mb-6">
                  {selectedChapter.videoProvider === 'youtube' ? (
                    <iframe
                      className="w-full h-full"
                      src={selectedChapter.videoUrl}
                      title={selectedChapter.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : selectedChapter.videoProvider === 'vimeo' ? (
                    <iframe
                      className="w-full h-full"
                      src={selectedChapter.videoUrl}
                      title={selectedChapter.title}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-white">
                      <p>Unsupported video provider</p>
                    </div>
                  )}
                </div>
              )}

              {selectedChapter.type === 'textbook' && selectedChapter.textbookContent && (
                <div className="prose prose-lg max-w-none mb-6">
                  <div dangerouslySetInnerHTML={{ __html: selectedChapter.textbookContent }} />
                </div>
              )}

              {selectedChapter.type === 'mcq' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                  <p className="text-blue-900 font-medium mb-4">📝 Quiz Available</p>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/student/quizzes/chapter/${selectedChapter.id}`, {
                          credentials: 'include',
                        });
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
                onClick={() => setSelectedChapter(null)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Mark as Complete & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
