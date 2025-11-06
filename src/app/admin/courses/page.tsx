"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getCourses } from '@/lib/data';

type Course = ReturnType<typeof getCourses>[number];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>(getCourses());
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructor: '',
    thumbnail: '',
    pricing: 0,
    status: 'draft' as 'draft' | 'published',
    isRequestable: true,
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return courses.filter(c => [c.title, c.description, c.instructor].some(v => v?.toLowerCase().includes(q)));
  }, [courses, query]);

  function openCreate() {
    setEditing(null);
    setForm({ title: '', description: '', instructor: '', thumbnail: '', pricing: 0, status: 'draft', isRequestable: true });
    setShowModal(true);
  }

  function openEdit(c: Course) {
    setEditing(c);
    setForm({ title: c.title, description: c.description, instructor: c.instructor, thumbnail: c.thumbnail, pricing: c.pricing || 0, status: c.status as any, isRequestable: !!c.isRequestable });
    setShowModal(true);
  }

  function saveCourse() {
    if (!form.title) return;
    if (editing) {
      setCourses(courses.map(c => c.id === editing.id ? { ...c, ...form } as any : c));
    } else {
      const id = `course-${Date.now()}`;
      setCourses([{ id, modules: [], createdAt: new Date(), updatedAt: new Date(), ...form } as any, ...courses]);
    }
    setShowModal(false);
  }

  function removeCourse(id: string) {
    if (confirm('Delete this course?')) setCourses(courses.filter(c => c.id !== id));
  }

  function toggleStatus(id: string) {
    setCourses(courses.map(c => c.id === id ? { ...c, status: c.status === 'published' ? 'draft' : 'published' } : c));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
          <p className="mt-2 text-gray-600">Create, edit and manage courses</p>
        </div>
        <button onClick={openCreate} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg">Create Course</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex items-center gap-3">
        <div className="relative flex-1">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search courses by title, instructor or description" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌘K</span>
        </div>
        <div className="px-4 py-2 text-sm text-gray-600">{filtered.length} results</div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(course => (
          <div key={course.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
            <img src={course.thumbnail} alt={course.title} className="w-full h-40 object-cover" />
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 line-clamp-1">{course.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{course.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">By {course.instructor}</span>
                <span className="font-semibold">₹{course.pricing}</span>
              </div>
              <div className="flex items-center justify-between">
                <Link href={`/admin/courses/${course.id}`} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700">Edit Curriculum</Link>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleStatus(course.id)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">{course.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                  <button onClick={() => openEdit(course)} className="text-gray-700 hover:text-gray-900 text-sm font-medium">Edit</button>
                  <button onClick={() => removeCourse(course.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{editing ? 'Edit Course' : 'Create Course'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructor *</label>
                <input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
                <input value={form.thumbnail} onChange={e => setForm({ ...form, thumbnail: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing (₹)</label>
                  <input type="number" value={form.pricing} onChange={e => setForm({ ...form, pricing: Number(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
                </div>
                <label className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl">
                  <input type="checkbox" checked={form.isRequestable} onChange={e => setForm({ ...form, isRequestable: e.target.checked })} className="w-5 h-5 text-purple-600 rounded" />
                  <span className="text-sm text-gray-700">Requestable</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm({ ...form, status: 'draft' })} className={`px-4 py-2 rounded-xl text-sm font-semibold ${form.status === 'draft' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Save as Draft</button>
                <button type="button" onClick={() => setForm({ ...form, status: 'published' })} className={`px-4 py-2 rounded-xl text-sm font-semibold ${form.status === 'published' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Publish</button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300">Cancel</button>
              <button onClick={saveCourse} disabled={!form.title || !form.instructor} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50">{editing ? 'Save Changes' : 'Create Course'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
