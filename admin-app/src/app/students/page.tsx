'use client';

import { useEffect, useState } from 'react';

interface Student {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const response = await fetch('/api/students', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Not authenticated. Please log in.');
                } else {
                    throw new Error(`Failed to fetch students: ${response.statusText}`);
                }
                setLoading(false);
                return;
            }

            const data = await response.json();
            setStudents(data.students || data.data || []);
            setLoading(false);
        } catch (err: any) {
            console.error('Error fetching students:', err);
            setError(err.message || 'Failed to fetch students');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <div className="text-white text-xl">Loading students...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <div className="text-red-500 text-xl">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Students</h1>
                        <p className="text-slate-400">Manage all registered students</p>
                    </div>
                    <div className="text-slate-400">
                        Total: <span className="text-white font-bold">{students.length}</span> students
                    </div>
                </div>

                {students.length === 0 ? (
                    <div className="bg-slate-800 rounded-2xl p-12 text-center">
                        <div className="text-slate-400 text-lg">No students found</div>
                        <p className="text-slate-500 mt-2">Students will appear here once they register</p>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-700">
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            ID
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            Registered
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {students.map((student) => (
                                        <tr key={student.id} className="hover:bg-slate-750 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                #{student.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-white">{student.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-300">{student.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {student.isActive ? (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-300">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-900 text-red-300">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                                {new Date(student.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button 
                                                    onClick={async () => {
                                                        try {
                                                            const response = await fetch(`/api/students/${student.id}/toggle-active`, {
                                                                method: 'PATCH',
                                                                credentials: 'include',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                }
                                                            });
                                                            
                                                            if (response.ok) {
                                                                const data = await response.json();
                                                                setStudents(students.map(s => 
                                                                    s.id === student.id ? { ...s, isActive: data.isActive } : s
                                                                ));
                                                            } else {
                                                                const error = await response.json();
                                                                alert(`Failed to toggle student status: ${error.message || 'Unknown error'}`);
                                                            }
                                                        } catch (error: any) {
                                                            console.error('Error toggling student status:', error);
                                                            alert(`Failed to toggle student status: ${error.message || 'Network error'}`);
                                                        }
                                                    }}
                                                    className="text-blue-400 hover:text-blue-300 mr-4 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors font-medium"
                                                >
                                                    {student.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        // View student details - can be implemented later
                                                        alert(`View student ${student.name} details`);
                                                    }}
                                                    className="text-yellow-400 hover:text-yellow-300 mr-4 px-3 py-1.5 rounded-lg hover:bg-yellow-500/10 transition-colors font-medium"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
