'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, TrendingUp, Clock, ChevronRight, Lock } from 'lucide-react';

interface Module {
  id: number;
  name: string;
  moduleId: number;
  questionCount: number;
}

interface CourseFolder {
  id: number;
  name: string;
  courseName: string;
  courseDescription: string;
  courseId: number;
  questionCount: number;
  modules: Module[];
  icon?: string;
  color?: string;
}

export default function QBankFolderView() {
  const router = useRouter();
  const [folders, setFolders] = useState<CourseFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/student/qbank/folders', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching Q-Bank folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCourse = (courseId: number) => {
    router.push(`/student/qbank/${courseId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your Q-Bank courses...</p>
        </div>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-purple-100 flex items-center justify-center">
              <BookOpen size={40} className="text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">No Q-Bank Access Yet</h2>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
              Enroll in courses to access Q-Bank practice questions and prepare for your exams!
            </p>
            <button
              onClick={() => router.push('/student/courses')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition inline-flex items-center gap-2 shadow-lg"
            >
              Browse Courses
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = folders.reduce((sum, f) => sum + f.questionCount, 0);
  const totalModules = folders.reduce((sum, f) => sum + f.modules.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-10 text-white relative overflow-hidden border border-blue-400/20 mb-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full blur-3xl -ml-40 -mb-40" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                <BookOpen size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-white drop-shadow-lg">
                  My Q-Bank Practice
                </h1>
                <p className="text-blue-100 mt-1">
                  Practice questions from your enrolled courses
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white drop-shadow-lg">{folders.length}</div>
                <div className="text-sm text-white font-semibold drop-shadow-md mt-1">
                  Courses Available
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white drop-shadow-lg">
                  {totalQuestions}
                </div>
                <div className="text-sm text-white font-semibold drop-shadow-md mt-1">
                  Total Questions
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white drop-shadow-lg">{totalModules}</div>
                <div className="text-sm text-white font-semibold drop-shadow-md mt-1">
                  Practice Modules
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Folders */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Practice Courses</h2>
          <p className="text-gray-600 mb-6">
            Select a course to practice or create tests from multiple modules
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-purple-500 hover:shadow-xl transition-all group"
            >
              {/* Course Header */}
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 text-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{folder.icon || '📚'}</span>
                    <div>
                      <h3 className="text-xl font-bold">{folder.courseName}</h3>
                      <p className="text-sm text-purple-100 mt-1">
                        {folder.questionCount} practice questions
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modules List */}
              <div className="p-6">
                <div className="space-y-3 mb-4">
                  {folder.modules.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No modules available yet</p>
                  ) : (
                    folder.modules.slice(0, 3).map((module) => (
                      <div
                        key={module.id}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <span className="text-lg">{module.icon || '📂'}</span>
                        <span className="flex-1">{module.name}</span>
                        <span className="text-purple-600 font-medium">
                          {module.questionCount} Q
                        </span>
                      </div>
                    ))
                  )}
                  {folder.modules.length > 3 && (
                    <p className="text-sm text-gray-500 italic">
                      +{folder.modules.length - 3} more modules
                    </p>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleOpenCourse(folder.courseId)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-md group-hover:shadow-lg"
                >
                  Practice Course
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Need More Practice?</h3>
          <p className="text-gray-700 mb-4">
            Enroll in more courses to access additional practice questions
          </p>
          <button
            onClick={() => router.push('/student/courses')}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 px-6 py-3 rounded-xl font-semibold transition inline-flex items-center gap-2 shadow-sm"
          >
            Browse All Courses
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

