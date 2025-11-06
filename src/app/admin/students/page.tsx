"use client";

import { useMemo, useState } from 'react';
import { getStudents } from '@/lib/data';

type Student = ReturnType<typeof getStudents>[number];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(getStudents());
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    isActive: true,
    faceIdEnrolled: false,
    role: 'student' as 'student' | 'admin',
  });

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
    setForm({ name: s.name, email: s.email, phone: s.phone || '', isActive: s.isActive, faceIdEnrolled: !!s.faceIdEnrolled, role: s.role as any });
    setShowModal(true);
  }

  function saveStudent() {
    if (!form.name || !form.email) return;
    if (editing) {
      setStudents(students.map(s => s.id === editing.id ? { ...s, ...form } as any : s));
    } else {
      const id = String(Date.now());
      setStudents([{ id, joinedDate: new Date(), ...form } as any, ...students]);
    }
    setShowModal(false);
  }

  function toggleActive(id: string) {
    setStudents(students.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  }

  function resetFace(id: string) {
    setStudents(students.map(s => s.id === id ? { ...s, faceIdEnrolled: false } : s));
    alert('Face ID enrollment has been reset for this student.');
  }

  function removeStudent(id: string) {
    if (confirm('Remove this student?')) setStudents(students.filter(s => s.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="mt-2 text-gray-600">Manage student accounts, status and Face ID</p>
        </div>
        <button onClick={openCreate} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg">Add Student</button>
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
                    <span className={`w-2 h-2 rounded-full ${s.faceIdEnrolled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <button onClick={() => resetFace(s.id)} className="text-purple-600 hover:text-purple-700 text-sm font-medium">Reset</button>
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
              <button onClick={() => setShowModal(false)} className="px-5 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300">Cancel</button>
              <button onClick={saveStudent} disabled={!form.name || !form.email} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50">{editing ? 'Save Changes' : 'Create Student'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
