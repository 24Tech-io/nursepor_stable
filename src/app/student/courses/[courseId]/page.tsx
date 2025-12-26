'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/student/LoadingSpinner';
import { canAccessChapter } from '@/lib/prerequisites';
import { syncClient } from '@/lib/sync-client';
import { FileText, Download, FileDown, Eye, ExternalLink } from 'lucide-react';
import mammoth from 'mammoth';

// Component to render local documents (DOCX, PPTX, etc.)
const LocalDocumentViewer = ({ url, fileName }: { url: string; fileName?: string }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const extension = url.split('.').pop()?.toLowerCase() || '';
  const isDocx = extension === 'docx' || extension === 'doc';
  const isPptx = extension === 'pptx' || extension === 'ppt';

  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (isDocx) {
          // Fetch and convert DOCX to HTML using mammoth
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setHtmlContent(result.value);
        } else {
          // For PPTX and other files, just mark as loaded
          // They will be rendered via iframe or Google Docs viewer
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document. The file may be corrupted or in an unsupported format.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [url, isDocx]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800/50 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">Loading {isPptx ? 'presentation' : 'document'}...</p>
        </div>
      </div>
    );
  }

  // Error state with helpful message
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700/50">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Unable to Preview</h3>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all"
          >
            <Eye className="w-5 h-5" />
            Open in New Tab
          </a>
        </div>
      </div>
    );
  }

  // For DOCX files that were successfully converted to HTML
  if (isDocx && htmlContent) {
    return (
      <div className="w-full h-full bg-white rounded-xl overflow-auto shadow-lg">
        <div
          className="p-8 prose prose-sm max-w-none"
          style={{
            fontFamily: 'Calibri, Arial, sans-serif',
            color: '#333'
          }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    );
  }

  // For PPTX and other Office files - use Microsoft Office Online viewer
  // This works for files that are publicly accessible
  if (isPptx || extension === 'xlsx' || extension === 'xls') {
    // Try Microsoft Office Online viewer first (works with public URLs)
    const absoluteUrl = url.startsWith('http') ? url : window.location.origin + url;
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;

    return (
      <div className="w-full h-full bg-white rounded-xl overflow-hidden shadow-lg">
        <iframe
          src={officeViewerUrl}
          className="w-full h-full border-0"
          title={fileName || 'Presentation'}
          allowFullScreen
        />
      </div>
    );
  }

  // Fallback for other file types - show in iframe
  return (
    <div className="w-full h-full bg-slate-800 rounded-xl overflow-hidden">
      <iframe
        src={url}
        className="w-full h-full"
        title={fileName || 'Document'}
      />
    </div>
  );
};


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
  textbookFileUrl?: string;
  readingTime?: number;
  prerequisiteChapterId?: number;
}

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modulesLoadError, setModulesLoadError] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchCourseData();
    fetchProgress();

    // Start sync client for real-time updates
    syncClient.start();
    const handleSync = () => {
      fetchProgress();
      fetchCourseData();
    };
    syncClient.on('sync', handleSync);

    return () => {
      syncClient.off('sync', handleSync);
      syncClient.stop();
    };
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

      if (!modulesRes.ok) {
        setModulesLoadError(`Failed to load modules (${modulesRes.status})`);
        setModules([]);
      } else {
        const modulesData = await modulesRes.json();
        setModulesLoadError('');
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
          className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-2 mb-4"
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
          <div className="bg-[#161922] rounded-2xl shadow-lg p-8 border border-slate-800/60 transition-all hover:border-slate-700/80">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-3">{course.title}</h1>
                <p className="text-lg text-slate-300 mb-4">{course.description}</p>
                <div className="flex items-center gap-4 text-sm text-slate-400">
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
              <Link
                href={`/student/courses/${params.courseId}/qbank`}
                className="ml-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:shadow-purple-900/20 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Quiz Bank
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {modulesLoadError ? (
          <div className="bg-[#161922] rounded-2xl shadow-sm p-12 text-center border border-slate-800">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">Failed to load course content</h3>
            <p className="text-slate-400">{modulesLoadError}</p>
          </div>
        ) : modules.length === 0 ? (
          <div className="bg-[#161922] rounded-2xl shadow-sm p-12 text-center border border-slate-800">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No modules yet</h3>
            <p className="text-slate-400">This course content is being prepared. Check back soon!</p>
          </div>
        ) : (
          modules.map((module, index) => (
            <div
              key={module.id}
              className="bg-[#161922] rounded-2xl shadow-sm border border-slate-800/60 overflow-hidden"
            >
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:from-slate-800 hover:to-slate-900 transition-all border-b border-slate-800/40"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-xl flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{module.title}</h3>
                    {module.description && (
                      <p className="text-sm text-slate-400">{module.description}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {module.chapters.length} chapter{module.chapters.length !== 1 ? 's' : ''}
                      {module.duration > 0 && ` · ${module.duration} min`}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-6 h-6 text-slate-500 transition-transform ${expandedModules.has(module.id) ? 'rotate-180' : ''
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
                <div className="p-4 space-y-2 bg-[#0b0d12]/30">
                  {module.chapters.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No chapters in this module yet</p>
                  ) : (
                    module.chapters.map((chapter, chapterIndex) => {
                      // Ensure we compare numbers with numbers
                      const chapterIdNum = Number(chapter.id);
                      const isCompleted = completedChapters.has(chapterIdNum);

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
                          className={`w-full flex items-center gap-4 p-4 rounded-xl hover:shadow-lg transition-all border border-transparent ${isCompleted
                            ? 'bg-[#1a1d26]/80 hover:bg-[#1a1d26] border-slate-800'
                            : 'bg-[#161922] hover:bg-[#1a1d26] hover:border-purple-500/30'
                            }`}
                        >
                          <div className={`w-10 h-10 flex items-center justify-center rounded-lg relative ${isCompleted ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                            {getChapterIcon(chapter.type)}
                            {isCompleted && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#161922]">
                                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-semibold ${isCompleted ? 'text-slate-300' : 'text-white'}`}>
                                {chapter.title}
                              </h4>
                            </div>
                            {chapter.description && (
                              <p className="text-sm text-slate-500 line-clamp-1">{chapter.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${chapter.type === 'video' ? 'bg-blue-500/10 text-blue-400' :
                                chapter.type === 'mcq' ? 'bg-purple-500/10 text-purple-400' :
                                  chapter.type === 'document' ? 'bg-orange-500/10 text-orange-400' :
                                    'bg-slate-700/50 text-slate-400'
                                }`}>
                                {chapter.type}
                              </span>
                              {chapter.videoDuration && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  {chapter.videoDuration} min
                                </span>
                              )}
                              {chapter.readingTime && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                  {chapter.readingTime} min read
                                </span>
                              )}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161922] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#161922]/95 backdrop-blur border-b border-slate-700 px-6 py-4 flex items-center justify-between z-10 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider ${selectedChapter.type === 'video' ? 'bg-blue-500/20 text-blue-400' :
                    selectedChapter.type === 'mcq' ? 'bg-purple-500/20 text-purple-400' :
                      selectedChapter.type === 'document' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-slate-700/50 text-slate-400'
                    }`}>
                    {selectedChapter.type}
                  </span>
                  {selectedChapter.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedChapter(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {selectedChapter.type === 'video' && selectedChapter.videoUrl && (
                <div className="aspect-video bg-black rounded-xl overflow-hidden mb-6 border border-slate-700 shadow-lg relative">
                  {selectedChapter.videoProvider === 'youtube' || selectedChapter.videoUrl.includes('youtube.com') || selectedChapter.videoUrl.includes('youtu.be') ? (
                    <iframe
                      className="w-full h-full"
                      src={`${selectedChapter.videoUrl.replace('watch?v=', 'embed/').split('&')[0]}?autoplay=1`}
                      title={selectedChapter.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <iframe
                      className="w-full h-full"
                      src={selectedChapter.videoUrl}
                      title={selectedChapter.title}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              )}

              {selectedChapter.type === 'textbook' && selectedChapter.textbookContent && (
                <div className="prose prose-lg prose-invert max-w-none mb-6">
                  <div dangerouslySetInnerHTML={{ __html: selectedChapter.textbookContent }} />
                </div>
              )}

              {selectedChapter.type === 'document' && (
                <div className="flex flex-col h-[75vh]">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Document Viewer</h3>
                        <p className="text-xs text-slate-400">
                          {selectedChapter.description || 'View the attached document below.'}
                        </p>
                      </div>
                    </div>
                    {selectedChapter.textbookFileUrl && (
                      <a
                        href={selectedChapter.textbookFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    )}
                  </div>

                  {selectedChapter.textbookFileUrl ? (
                    <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 relative">
                      {/* Determine file type based on extension */}
                      {(() => {
                        const url = selectedChapter.textbookFileUrl || '';
                        const extension = url.split('.').pop()?.toLowerCase();
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
                        const isPdf = extension === 'pdf';

                        if (isImage) {
                          return (
                            <div className="w-full h-full flex items-center justify-center bg-black/50">
                              <img
                                src={url}
                                alt={selectedChapter.title}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          );
                        } else if (isPdf) {
                          return (
                            <object
                              data={url}
                              type="application/pdf"
                              className="w-full h-full"
                            >
                              <iframe
                                src={url}
                                className="w-full h-full"
                                title="Document Viewer"
                              >
                                <div className="flex items-center justify-center h-full text-slate-400">
                                  <p>This browser does not support inline PDFs. Please download the file to view it.</p>
                                </div>
                              </iframe>
                            </object>
                          );
                        } else {
                          // Check if URL is local (starts with / or has localhost)
                          const isLocal = url.startsWith('/') || url.includes('localhost') || url.includes('127.0.0.1');

                          if (isLocal) {
                            // Use LocalDocumentViewer for local files
                            return (
                              <LocalDocumentViewer
                                url={url}
                                fileName={selectedChapter.title}
                              />
                            );
                          }

                          return (
                            <iframe
                              src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
                              className="w-full h-full"
                              frameBorder="0"
                              title="Google Docs Viewer"
                            ></iframe>
                          );
                        }
                      })()}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/30 rounded-xl border border-slate-800 border-dashed text-slate-500">
                      <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No document file attached</p>
                    </div>
                  )}
                </div>
              )}

              {selectedChapter.type === 'mcq' && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-8 mb-6 text-center">
                  <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Quiz Available</h3>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    Test your knowledge! Complete this quiz to master the concepts in this chapter.
                  </p>
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
                          const errorText = await response.text();
                          console.error('Quiz fetch failed:', response.status, errorText);
                          alert('No quiz available for this chapter');
                        }
                      } catch (error) {
                        console.error('Error fetching quiz:', error);
                        alert('Failed to load quiz');
                      }
                    }}
                    className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
                  >
                    Start Quiz
                  </button>
                </div>
              )}

              {selectedChapter.description && selectedChapter.type !== 'document' && (
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800 text-slate-300 mb-6">
                  <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Chapter Description</h4>
                  <p>{selectedChapter.description}</p>
                </div>
              )}

              <div className="border-t border-slate-800 pt-6 mt-6">
                <button
                  onClick={async () => {
                    if (!selectedChapter || !course) return;

                    try {
                      const response = await fetch('/api/student/chapters/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          chapterId: selectedChapter.id, // Handled as number or string by schema now
                          courseId: course.id,
                        }),
                      });

                      if (response.ok) {
                        const result = await response.json();
                        console.log('✅ Chapter marked complete:', result);

                        // Update local state
                        const chapterIdNum = Number(selectedChapter.id);

                        setCompletedChapters(prev => {
                          const newSet = new Set(prev);
                          newSet.add(chapterIdNum);
                          return newSet;
                        });

                        setSelectedChapter(null);

                        // Refresh progress
                        setTimeout(async () => {
                          await fetchProgress();
                        }, 300);
                      } else {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('❌ Failed to complete chapter:', errorData);
                        alert(errorData.message || 'Failed to mark chapter as complete');
                      }
                    } catch (error) {
                      console.error('Error marking chapter complete:', error);
                      alert('Failed to mark chapter as complete. Please try again.');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold hover:from-purple-500 hover:to-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transform hover:scale-[1.01]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as Complete & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
