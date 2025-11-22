import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, CheckCircle, X, BookOpen, Shield, User } from 'lucide-react';

interface StudentProfileProps {
    studentId: number;
    back: () => void;
}

export default function StudentProfile({ studentId, back }: StudentProfileProps) {
    const [student, setStudent] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [studentId]);

    const fetchData = async () => {
        try {
            const [studentRes, coursesRes] = await Promise.all([
                fetch(`/api/students/${studentId}`, { credentials: 'include' }),
                fetch('/api/courses', { credentials: 'include' })
            ]);

            if (studentRes.ok) {
                const data = await studentRes.json();
                setStudent(data.student);
            }

            if (coursesRes.ok) {
                const data = await coursesRes.json();
                setCourses(data.courses || []);
            }
        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleCourse = async (courseId: number, isEnrolled: boolean) => {
        try {
            const method = isEnrolled ? 'DELETE' : 'POST';
            const response = await fetch(`/api/students/${studentId}/courses`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ courseId }),
            });

            if (response.ok) {
                // Refresh student data
                const studentRes = await fetch(`/api/students/${studentId}`, { credentials: 'include' });
                if (studentRes.ok) {
                    const data = await studentRes.json();
                    setStudent(data.student);
                }
            } else {
                alert('Failed to update course enrollment');
            }
        } catch (error) {
            console.error('Error updating enrollment:', error);
            alert('Failed to update course enrollment');
        }
    };

    const handleToggleActive = async () => {
        try {
            const response = await fetch(`/api/students/${studentId}/toggle-active`, {
                method: 'PATCH',
                credentials: 'include',
            });

            if (response.ok) {
                setStudent({ ...student, isActive: !student.isActive });
            } else {
                alert('Failed to toggle status');
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleResetFaceId = async () => {
        if (!confirm('Are you sure you want to reset Face ID? The student will need to re-enroll.')) return;

        try {
            const response = await fetch(`/api/students/${studentId}/reset-face`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                setStudent({ ...student, faceIdEnrolled: false });
                alert('Face ID reset successfully');
            } else {
                alert('Failed to reset Face ID');
            }
        } catch (error) {
            console.error('Error resetting Face ID:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="p-8 text-center">
                <p className="text-slate-400">Student not found</p>
                <button onClick={back} className="mt-4 text-purple-400 hover:text-purple-300">Go Back</button>
            </div>
        );
    }

    return (
        <div className="p-8 overflow-y-auto h-full">
            {/* Header */}
            <header className="mb-8 flex items-center gap-4">
                <button
                    onClick={back}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">{student.name}</h2>
                    <p className="text-slate-400 text-sm">{student.email}</p>
                </div>
                <div className="ml-auto flex gap-3">
                    <button
                        onClick={handleToggleActive}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${student.isActive
                                ? 'bg-green-500/10 text-green-400 border border-green-500/50'
                                : 'bg-red-500/10 text-red-400 border border-red-500/50'
                            }`}
                    >
                        {student.isActive ? 'Active Account' : 'Inactive Account'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <User size={18} className="text-purple-400" />
                            Personal Details
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Phone</label>
                                <p className="text-slate-300">{student.phone || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Joined</label>
                                <p className="text-slate-300">{new Date(student.joinedDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Face ID</label>
                                <div className="flex items-center justify-between mt-1">
                                    <span className={student.faceIdEnrolled ? 'text-green-400' : 'text-slate-500'}>
                                        {student.faceIdEnrolled ? 'Enrolled' : 'Not Enrolled'}
                                    </span>
                                    {student.faceIdEnrolled && (
                                        <button
                                            onClick={handleResetFaceId}
                                            className="text-xs text-orange-400 hover:text-orange-300 underline"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Course Enrollment */}
                <div className="lg:col-span-2">
                    <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen size={18} className="text-blue-400" />
                            Course Enrollments
                        </h3>

                        <div className="space-y-3">
                            {courses.map(course => {
                                const isEnrolled = student.enrollments?.some((e: any) => e.courseId === course.id);
                                return (
                                    <div key={course.id} className="flex items-center justify-between p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40">
                                        <div>
                                            <h4 className="font-bold text-white">{course.title}</h4>
                                            <p className="text-xs text-slate-500">{course.description?.substring(0, 60)}...</p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleCourse(course.id, isEnrolled)}
                                            className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isEnrolled
                                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                }`}
                                        >
                                            {isEnrolled ? 'Revoke Access' : 'Grant Access'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
