'use client';

import { useMemo, useState } from 'react';
import { getCourses } from '@/lib/data';
import CourseCard from '@/components/student/CourseCard';

export default function CoursesPage() {
  const [courses] = useState(getCourses());
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const student = { id: '1', name: 'John Doe', enrolledCourses: ['course-1'], isActive: true };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return courses.filter(c => [c.title, c.description, c.instructor].some(v => v?.toLowerCase().includes(q)));
  }, [courses, query]);

  const enrolled = filtered.filter(c => student.enrolledCourses.includes(c.id) && c.status === 'published');
  const locked = filtered.filter(c => !student.enrolledCourses.includes(c.id) && c.status === 'published');

  function requestAccess(courseId: string) {
    setRequestingId(courseId);
  }

  function submitRequest() {
    alert(`Requested access to ${requestingId}\nNote: ${note || '-'}\nStatus: pending`);
    setRequestingId(null);
    setNote('');
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
              <CourseCard key={c.id} course={c} isLocked={false} progress={Math.floor(Math.random()*70)+10} />
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
              <CourseCard key={c.id} course={c} isLocked onRequestAccess={() => requestAccess(c.id)} />
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
