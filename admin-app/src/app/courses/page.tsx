'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../admin-layout';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  status: string;
  createdAt: string;
  price?: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      const response = await fetch('/api/courses', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(courseId: string) {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    console.log('🗑️ Attempting to delete course with ID:', courseId);
    setDeletingId(courseId);
    
    try {
      const url = `/api/courses/${courseId}`;
      console.log('📡 Making DELETE request to:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('📥 Response status:', response.status, response.statusText);

      let data;
      try {
        data = await response.json();
        console.log('📦 Response data:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        const text = await response.text();
        console.error('📄 Response text:', text);
        alert(`Failed to delete course: Invalid response from server (Status: ${response.status})`);
        setDeletingId(null);
        return;
      }

      if (response.ok) {
        // Remove the course from the list
        console.log('✅ Course deleted successfully, updating UI...');
        setCourses(prevCourses => {
          const filtered = prevCourses.filter(c => c.id !== courseId);
          console.log(`📊 Updated courses list: ${prevCourses.length} -> ${filtered.length}`);
          return filtered;
        });
      } else {
        // Show the actual error message from the server
        const errorMsg = data.message || data.error || `Server returned status ${response.status}`;
        console.error('❌ Delete failed:', { status: response.status, statusText: response.statusText, data });
        alert(`Failed to delete course: ${errorMsg}\n\nCheck the browser console for more details.`);
      }
    } catch (error: any) {
      console.error('❌ Network error deleting course:', error);
      alert(`Error deleting course: ${error.message || 'Network error. Please check your connection and try again.'}\n\nCheck the browser console for more details.`);
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading courses...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">All Courses</h1>
                <p className="mt-2 text-gray-600">Manage all courses - Full team access enabled</p>
              </div>
              <Link
                href="/courses/create"
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                + Create Course
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Courses</h1>
          <p className="text-gray-600">Manage all courses and Q-Banks - Full team access</p>
        </div>

          {courses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-16 text-center border border-gray-200">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl mb-6">
                <span className="text-5xl">📚</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No courses yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Get started by creating your first course with integrated NGN Q-Bank support</p>
              <Link
                href="/courses/create"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="text-xl mr-2">➕</span>
                Create Your First Course
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-2xl hover:border-emerald-300 transition-all transform hover:scale-105">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2 flex-1">{course.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      course.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {course.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description}</p>
                  {course.price !== undefined && (
                    <p className="text-emerald-600 font-bold text-lg mb-4">${course.price}</p>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-sm text-gray-500 font-medium">By {course.instructor}</span>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/courses/create?id=${course.id}`}
                        className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition px-3 py-1 rounded-lg hover:bg-emerald-50"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(course.id)}
                        disabled={deletingId === course.id}
                        className="text-sm font-bold text-red-600 hover:text-red-700 transition px-3 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === course.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
