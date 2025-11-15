'use client';

import { useMemo, useState, useEffect } from 'react';
import CourseCard from '@/components/student/CourseCard';

type Course = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string | null;
  pricing: number;
  status: string;
  isRequestable: boolean;
  isEnrolled: boolean;
  modules?: any[];
};

// Deterministic function to generate consistent values based on course ID
function getDeterministicProgress(courseId: string): number {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    const char = courseId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 70 + 10; // Returns value between 10-80
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch courses and enrolled courses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all available courses
        const coursesResponse = await fetch('/api/student/courses', {
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          setCourses(coursesData.courses || []);
          
          // Extract enrolled course IDs
          const enrolledIds = (coursesData.courses || [])
            .filter((c: Course) => c.isEnrolled)
            .map((c: Course) => c.id);
          setEnrolledCourseIds(enrolledIds);
        } else {
          console.error('Failed to fetch courses:', coursesResponse.status);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return courses.filter(c => [c.title, c.description, c.instructor].some(v => v?.toLowerCase().includes(q)));
  }, [courses, query]);

  const enrolled = filtered.filter(c => c.isEnrolled && c.status === 'published');
  const locked = filtered.filter(c => !c.isEnrolled && c.status === 'published');

  function requestAccess(courseId: string) {
    setRequestingId(courseId);
  }

  async function submitRequest() {
    if (!requestingId) {
      return;
    }

    try {
      const response = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId: requestingId,
          reason: note || 'Requesting access to this course',
        }),
      });

      if (response.ok) {
        alert('Access request submitted successfully!');
        setRequestingId(null);
        setNote('');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="mt-2 text-gray-600">Continue where you left off, or explore more.</p>
        </div>
        <div className="w-full max-w-md">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search courses" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Enrolled</h2>
        {enrolled.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolled.map(c => (
              <CourseCard key={c.id} course={{...c, modules: c.modules || [], status: c.status as 'draft' | 'published'}} isLocked={false} progress={getDeterministicProgress(c.id)} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">No enrolled courses yet.</div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Available</h2>
        {locked.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locked.map(c => (
              <CourseCard 
                key={c.id} 
                course={{...c, modules: c.modules || [], status: c.status as 'draft' | 'published'}} 
                isLocked 
                userId={user?.id || undefined} 
                onRequestAccess={() => requestAccess(c.id)} 
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">No more courses found.</div>
        )}
      </div>

      {requestingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Access</h3>
            <p className="text-gray-600 mb-4">Optionally add a note for the admin.</p>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" placeholder="I'd like to join this course because..." />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={()=>{setRequestingId(null); setNote('');}} className="px-5 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300">Cancel</button>
              <button onClick={submitRequest} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
