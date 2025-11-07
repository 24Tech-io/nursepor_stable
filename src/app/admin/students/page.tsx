"use client";

import { useMemo, useState, useEffect } from 'react';

type Student = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  faceIdEnrolled: boolean;
  fingerprintEnrolled: boolean;
  role: string;
  joinedDate?: string;
  lastLogin?: string;
  profilePicture?: string | null;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    isActive: true,
    faceIdEnrolled: false,
    role: 'student' as 'student' | 'admin',
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/students', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      } else {
        console.error('Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return students.filter(s => [s.name, s.email, s.phone].some(v => v?.toLowerCase().includes(q)));
  }, [students, query]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', isActive: true, faceIdEnrolled: false, role: 'student' });
    setShowModal(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({ name: s.name, email: s.email, phone: s.phone || '', isActive: s.isActive ?? true, faceIdEnrolled: s.faceIdEnrolled ?? false, role: s.role as any });
    setShowModal(true);
  }

  async function saveStudent() {
    if (!form.name || !form.email) {
      alert('Name and email are required');
      return;
    }

    // Note: Student creation should be done through registration
    // This is just for editing existing students
    if (!editing) {
      alert('Please use the registration page to create new students');
      setShowModal(false);
      return;
    }

    setSaving(true);
    try {
      // For now, we'll just show a message that student editing API needs to be implemented
      // In a real app, you'd have PUT /api/admin/students/[id]
      alert('Student editing API endpoint needs to be implemented');
      setShowModal(false);
      await fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Failed to save student');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string) {
    const student = students.find(s => s.id === id);
    if (!student) return;

    try {
      // Note: This would require a PUT endpoint for updating student status
      alert('Student status update API needs to be implemented');
      await fetchStudents();
    } catch (error) {
      console.error('Error updating student status:', error);
      alert('Failed to update student status');
    }
  }

  async function resetFace(id: string) {
    if (!confirm('Reset Face ID enrollment for this student?')) return;

    try {
      // Note: This would require an API endpoint to reset face ID
      alert('Face ID reset API needs to be implemented');
      await fetchStudents();
    } catch (error) {
      console.error('Error resetting face ID:', error);
      alert('Failed to reset Face ID');
    }
  }

  async function removeStudent(id: string) {
    if (!confirm('Remove this student? This action cannot be undone.')) return;

    try {
      // Note: This would require a DELETE endpoint
      alert('Student deletion API needs to be implemented');
      await fetchStudents();
    } catch (error) {
      console.error('Error removing student:', error);
      alert('Failed to remove student');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="mt-2 text-gray-600">Manage student accounts, status and Face ID</p>
        </div>
        <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
          Total: {students.length} | Active: {students.filter(s => s.isActive).length}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex items-center gap-3">
        <div className="relative flex-1">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email or phone" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌘K</span>
        </div>
        <div className="px-4 py-2 text-sm text-gray-600">{filtered.length} results</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Face ID</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-sm">{s.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-sm text-gray-600">{s.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{s.phone || '-'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleActive(s.id)} className={`px-3 py-1 rounded-full text-xs font-semibold ${s.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{s.isActive ? 'Active' : 'Inactive'}</button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.faceIdEnrolled ? 'bg-green-500' : 'bg-gray-300'}`} title={s.faceIdEnrolled ? 'Face ID Enrolled' : 'Not Enrolled'} />
                    {s.faceIdEnrolled && (
                      <button onClick={() => resetFace(s.id)} className="text-purple-600 hover:text-purple-700 text-sm font-medium">Reset</button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                  <button onClick={() => removeStudent(s.id)} className="text-red-600 hover:text-red-700 font-medium">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{editing ? 'Edit Student' : 'Add Student'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-5 h-5 text-purple-600 rounded" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl">
                  <input type="checkbox" checked={form.faceIdEnrolled} onChange={e => setForm({ ...form, faceIdEnrolled: e.target.checked })} className="w-5 h-5 text-purple-600 rounded" />
                  <span className="text-sm text-gray-700">Face ID Enrolled</span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-5 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-50">Cancel</button>
              <button onClick={saveStudent} disabled={!form.name || !form.email || saving} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Student')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
