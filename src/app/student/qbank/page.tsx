'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, TrendingUp, Clock, ArrowRight, Target, Award } from 'lucide-react';

interface QBankCourse {
  courseId: number;
  course: {
    id: number;
    title: string;
    description: string;
    thumbnail: string | null;
    instructor: string;
  };
  totalQuestions: number;
  questionBankId: number | null;
  totalTests: number;
  completedTests: number;
  avgScore: number;
  lastTestDate: string | null;
  progress: number;
  lastAccessed: string | null;
}

export default function QBankCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<QBankCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQBankCourses();
  }, []);

  const fetchQBankCourses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/student/qbank-courses', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching Q-Bank courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenQBank = (courseId: number) => {
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

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-purple-100 flex items-center justify-center">
              <BookOpen size={40} className="text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">No Q-Bank Access Yet</h2>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
              Enroll in a course with Q-Bank practice questions to start preparing for your exams!
            </p>
            <button
              onClick={() => router.push('/student/courses')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition inline-flex items-center gap-2 shadow-lg"
            >
              Browse Courses
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = courses.reduce((sum, c) => sum + c.totalQuestions, 0);
  const totalTests = courses.reduce((sum, c) => sum + c.totalTests, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header Section - Match student portal style */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-10 text-white relative overflow-hidden border border-blue-400/20 mb-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full blur-3xl -ml-40 -mb-40" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                <BookOpen size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-white drop-shadow-lg">Q-Bank Practice</h1>
                <p className="text-blue-100 mt-1">
                  Master your subjects with targeted practice questions
                </p>
              </div>
            </div>

            {/* Summary Cards - Light theme */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white drop-shadow-lg">{courses.length}</div>
                <div className="text-sm text-white font-semibold drop-shadow-md mt-1">
                  Courses Available
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white drop-shadow-lg">{totalQuestions}</div>
                <div className="text-sm text-white font-semibold drop-shadow-md mt-1">
                  Total Questions
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white drop-shadow-lg">{totalTests}</div>
                <div className="text-sm text-white font-semibold drop-shadow-md mt-1">Tests Taken</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Practice Course Folders</h2>
          <p className="text-gray-600 mt-1">Select a course to access practice questions and track your performance</p>
        </div>

        {/* Course Folders Grid - Light theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.courseId}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-purple-500 hover:shadow-xl transition-all group cursor-pointer"
              onClick={() => handleOpenQBank(course.courseId)}
            >
              {/* Course Thumbnail */}
              {course.course.thumbnail ? (
                <img
                  src={course.course.thumbnail}
                  alt={course.course.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <BookOpen size={64} className="text-white opacity-90" />
                </div>
              )}

              {/* Course Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition line-clamp-2">
                  {course.course.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {course.course.description}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-600">{course.totalQuestions}</div>
                    <div className="text-xs text-gray-600">Questions</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{course.completedTests}</div>
                    <div className="text-xs text-gray-600">Tests Done</div>
                  </div>
                </div>

                {/* Performance Badge */}
                {course.completedTests > 0 && (
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Average Score:</span>
                    <span
                      className={`text-lg font-bold ${
                        course.avgScore >= 70
                          ? 'text-green-600'
                          : course.avgScore >= 50
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {course.avgScore}%
                    </span>
                  </div>
                )}

                {/* Last Activity */}
                {course.lastTestDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock size={16} />
                    <span>
                      Last practice:{' '}
                      {new Date(course.lastTestDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenQBank(course.courseId);
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-md group-hover:shadow-lg"
                >
                  Open Q-Bank
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA - Light theme */}
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
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
