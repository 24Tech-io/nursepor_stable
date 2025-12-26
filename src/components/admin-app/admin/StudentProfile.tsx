import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, CheckCircle, X, BookOpen, Shield, User, BarChart3 } from 'lucide-react';

interface StudentProfileProps {
  studentId: number;
  back: () => void;
  onEnrollmentChange?: () => void;
}

export default function StudentProfile({ studentId, back, onEnrollmentChange }: StudentProfileProps) {
    const [student, setStudent] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [quizHistory, setQuizHistory] = useState<any[]>([]);
    const [isLoadingQuizHistory, setIsLoadingQuizHistory] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
        fetchQuizHistory();
    }, [studentId]);

    const fetchQuizHistory = async () => {
        setIsLoadingQuizHistory(true);
        try {
            // Use unified analysis API
            const response = await fetch(`/api/analysis/quiz-history?studentId=${studentId}`, {
                credentials: 'include',
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                setQuizHistory(data.attempts || []);
            }
        } catch (error) {
            console.error('Error fetching quiz history:', error);
        } finally {
            setIsLoadingQuizHistory(false);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        setStudent(null);
        try {
            console.log('🔍 Fetching student data for ID:', studentId, 'Type:', typeof studentId);

            // Add timeout to prevent infinite loading
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        // Fetch student basic info
        const url = `/api/students/${studentId}`;
        console.log('🌐 Fetching from URL:', url);
        const studentRes = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('📡 Student response status:', studentRes.status);

        if (studentRes.ok) {
          const data = await studentRes.json();
          console.log('✅ Student data received:', data);
          if (data.student) {
            const studentData = data.student;

            // Fetch enrollment status using new unified API
            try {
                // Fetch student basic info
                const url = `/api/students/${studentId}`;
                console.log('🌐 Fetching from URL:', url);
                const studentRes = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                console.log('📡 Student response status:', studentRes.status);

                if (studentRes.ok) {
                    const data = await studentRes.json();
                    console.log('✅ Student data received:', data);
                    if (data.student) {
                        const studentData = data.student;

                        // Fetch enrollment status using new unified API
                        try {
                            const enrollmentRes = await fetch(`/api/admin/enrollment?studentId=${studentId}`, {
                                credentials: 'include',
                                cache: 'no-store',
                                headers: {
                                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                                },
                            });

                            if (enrollmentRes.ok) {
                                const enrollmentData = await enrollmentRes.json();
                                console.log('✅ Enrollment data received:', enrollmentData);

                                // Merge enrollment data with student data
                                setStudent({
                                    ...studentData,
                                    enrollmentData: enrollmentData.enrollments,
                                    enrollmentSummary: enrollmentData.summary,
                                });
                            } else {
                                // Set student without enrollment data if fetch fails
                                setStudent(studentData);
                            }
                        } catch (enrollmentError) {
                            console.error('Error fetching enrollment data:', enrollmentError);
                            // Set student without enrollment data if fetch fails
                            setStudent(studentData);
                        }
                    } else {
                        console.error('❌ No student data in response:', data);
                        setStudent(null);
                    }
                } else {
                    let errorData;
                    try {
                        const text = await studentRes.text();
                        console.error('❌ Error response text:', text);
                        errorData = JSON.parse(text);
                    } catch (e) {
                        errorData = {
                            message: `HTTP ${studentRes.status}: ${studentRes.statusText}`,
                            status: studentRes.status,
                            statusText: studentRes.statusText
                        };
                    }
                    console.error('❌ Error fetching student:', errorData);
                    const errorMessage = errorData.message || errorData.error || `HTTP ${studentRes.status} Error`;
                    alert(`Failed to load student: ${errorMessage}`);
                    setStudent(null);
                }
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    console.error('⏱️ Request timeout');
                    alert('Request timed out. Please try again.');
                } else {
                    throw fetchError;
                }
            }

            // Fetch courses separately
            try {
                const coursesRes = await fetch('/api/courses', {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                    },
                });
                if (coursesRes.ok) {
                    const data = await coursesRes.json();
                    setCourses(data.courses || []);
                }
            } catch (courseError) {
                console.error('Error fetching courses:', courseError);
                // Don't fail the whole request if courses fail
            }
        } catch (error: any) {
            console.error('❌ Error fetching student data:', error);
            alert(`Error loading student: ${error.message || 'Unknown error'}`);
            setStudent(null);
          }
        } else {
          let errorData;
          try {
            const text = await studentRes.text();
            console.error('❌ Error response text:', text);
            errorData = JSON.parse(text);
          } catch (e) {
            errorData = {
              message: `HTTP ${studentRes.status}: ${studentRes.statusText}`,
              status: studentRes.status,
              statusText: studentRes.statusText,
            };
          }
          console.error('❌ Error fetching student:', errorData);
          const errorMessage =
            errorData.message || errorData.error || `HTTP ${studentRes.status} Error`;
          alert(`Failed to load student: ${errorMessage}`);
          setStudent(null);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('⏱️ Request timeout');
          alert('Request timed out. Please try again.');
        } else {
          throw fetchError;
        }
      }

        setIsSaving(true);
        try {
            if (isEnrolled) {
                // Unenroll - DELETE using unified API
                const response = await fetch(`/api/admin/enrollment?studentId=${studentId}&courseId=${courseId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });

                if (response.ok) {
                    console.log('✅ Student unenrolled successfully, refreshing data...');
                    // Notify parent immediately to refresh student list
                    if (onEnrollmentChange) {
                        onEnrollmentChange();
                    }
                    // Force a full refresh to ensure data consistency
                    await fetchData();
                } else {
                    const data = await response.json();
                    alert(data.message || 'Failed to unenroll student from course');
                    await fetchData();
                }
            } else {
                // Enroll - POST using unified API
                const response = await fetch('/api/admin/enrollment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ studentId, courseId }),
                });

                if (response.ok) {
                    console.log('✅ Student enrolled successfully, refreshing data...');
                    // Notify parent immediately to refresh student list
                    if (onEnrollmentChange) {
                        onEnrollmentChange();
                    }
                    // Force a full refresh to ensure data consistency
                    await fetchData();
                } else {
                    const data = await response.json();
                    alert(data.message || 'Failed to enroll student in course');
                    await fetchData();
                }
            }
        } catch (error) {
            console.error('Error updating enrollment:', error);
            alert('Failed to update course enrollment');
            await fetchData();
        } finally {
            setIsSaving(false);
        }
      } catch (courseError) {
        console.error('Error fetching courses:', courseError);
        // Don't fail the whole request if courses fail
      }
    } catch (error: any) {
      console.error('❌ Error fetching student data:', error);
      alert(`Error loading student: ${error.message || 'Unknown error'}`);
      setStudent(null);
    } finally {
      setIsLoading(false);
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


    if (isLoading) {
        // Return null for silent loading - content appears when ready
        return null;
    }

    if (!student) {
        return (
            <div className="p-8 text-center">
                <div className="mb-4">
                    <p className="text-slate-400 text-lg mb-2">Student not found</p>
                    <p className="text-slate-500 text-sm">Student ID: {studentId}</p>
                </div>
                <button
                    onClick={back}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
                >
                    Go Back to Students
                </button>
            </div>
        );

        if (response.ok) {
          console.log('✅ Student unenrolled successfully, refreshing data...');
          // Notify parent immediately to refresh student list
          if (onEnrollmentChange) {
            onEnrollmentChange();
          }
          // Force a full refresh to ensure data consistency
          await fetchData();
        } else {
          const data = await response.json();
          alert(data.message || 'Failed to unenroll student from course');
          await fetchData();
        }
      } else {
        // Enroll - POST using unified API
        const response = await fetch('/api/enrollment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ studentId, courseId }),
        });

        if (response.ok) {
          console.log('✅ Student enrolled successfully, refreshing data...');
          // Notify parent immediately to refresh student list
          if (onEnrollmentChange) {
            onEnrollmentChange();
          }
          // Force a full refresh to ensure data consistency
          await fetchData();
        } else {
          const data = await response.json();
          alert(data.message || 'Failed to enroll student in course');
          await fetchData();
        }
      }
    } catch (error) {
      console.error('Error updating enrollment:', error);
      alert('Failed to update course enrollment');
      await fetchData();
    } finally {
      setIsSaving(false);
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
    if (!confirm('Are you sure you want to reset Face ID? The student will need to re-enroll.'))
      return;

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
                                <p className="text-slate-300">
                                    {(() => {
                                        try {
                                            const dateValue = student.joinedDate;
                                            if (!dateValue) {
                                                return 'Date unavailable';
                                            }

                                            const date = new Date(dateValue);

                                            if (isNaN(date.getTime())) {
                                                return 'Invalid date';
                                            }

                                            return date.toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            });
                                        } catch (e) {
                                            return 'Date unavailable';
                                        }
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Course Enrollment */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Enrolled Courses */}
                    <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen size={18} className="text-blue-400" />
                            Enrolled Courses ({(() => {
                                const enrollmentData = student.enrollmentData || [];
                                return enrollmentData.filter((e: any) => e.enrollmentStatus === 'enrolled').length;
                            })()})
                        </h3>

                        {(() => {
                            // Get enrolled courses from enrollmentData
                            const enrollmentData = student.enrollmentData || [];
                            const enrolledList = enrollmentData
                                .filter((e: any) => e.enrollmentStatus === 'enrolled')
                                .map((e: any) => ({
                                    courseId: e.courseId,
                                    progress: e.progress || 0,
                                    totalProgress: e.progress || 0,
                                    lastAccessed: e.lastAccessed,
                                    course: e.course || courses.find((c: any) => c.id === e.courseId),
                                }));

                            return enrolledList.length > 0 ? (
                                <div className="space-y-3">
                                    {enrolledList.map((enrollment: any) => (
                                        <div key={enrollment.courseId} className="p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-white mb-1">{enrollment.course?.title || 'Unknown Course'}</h4>
                                                    <p className="text-xs text-slate-500 mb-2">{enrollment.course?.description?.substring(0, 80) || ''}...</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div>
                                                            <span className="text-xs text-slate-500">Progress: </span>
                                                            <span className="text-xs font-bold text-purple-400">{enrollment.progress || enrollment.totalProgress || 0}%</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-slate-500">Last Accessed: </span>
                                                            <span className="text-xs text-slate-400">
                                                                {enrollment.lastAccessed ? new Date(enrollment.lastAccessed).toLocaleDateString() : 'Never'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleCourse(enrollment.courseId, true)}
                                                    className="ml-4 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg font-bold text-xs transition-colors border border-red-500/30"
                                                >
                                                    Unenroll
                                                </button>
                                            </div>
                                            {(enrollment.progress || enrollment.totalProgress || 0) > 0 && (
                                                <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all"
                                                        style={{ width: `${enrollment.progress || enrollment.totalProgress || 0}%` }}
                                                    ></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 text-center py-8">No enrolled courses</p>
                            );
                        })()}
                    </div>

                    {/* Requested Courses */}
                    <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen size={18} className="text-yellow-400" />
                            Requested Courses ({(() => {
                                const enrollmentData = student.enrollmentData || [];
                                return enrollmentData.filter((e: any) => e.enrollmentStatus === 'requested').length;
                            })()})
                        </h3>

                        {(() => {
                            const enrollmentData = student.enrollmentData || [];
                            const requestedList = enrollmentData
                                .filter((e: any) => e.enrollmentStatus === 'requested')
                                .map((e: any) => ({
                                    courseId: e.courseId,
                                    requestedAt: e.requestedAt,
                                    course: e.course || courses.find((c: any) => c.id === e.courseId),
                                }));

                            return requestedList.length > 0 ? (
                                <div className="space-y-3">
                                    {requestedList.map((request: any) => (
                                        <div key={request.courseId} className="p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-white mb-1">{request.course?.title || 'Unknown Course'}</h4>
                                                    <p className="text-xs text-slate-500 mb-2">{request.course?.description?.substring(0, 80) || ''}...</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div>
                                                            <span className="text-xs text-slate-500">Requested: </span>
                                                            <span className="text-xs text-slate-400">
                                                                {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleCourse(request.courseId, false)}
                                                    disabled={isSaving}
                                                    className="ml-4 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg font-bold text-xs transition-colors border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSaving ? 'Processing...' : 'Approve & Enroll'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 text-center py-8">No pending course requests</p>
                            );
                        })()}
                    </div>

                    {/* Available Courses */}
                    <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen size={18} className="text-emerald-400" />
                            Available Courses ({(() => {
                                const enrollmentData = student.enrollmentData || [];
                                return enrollmentData.filter((e: any) => e.enrollmentStatus === 'available').length;
                            })()})
                        </h3>

                        <div className="space-y-3">
                            {(() => {
                                const enrollmentData = student.enrollmentData || [];
                                const availableList = enrollmentData
                                    .filter((e: any) => e.enrollmentStatus === 'available')
                                    .map((e: any) => ({
                                        courseId: e.courseId,
                                        course: e.course || courses.find((c: any) => c.id === e.courseId),
                                    }));

                                return availableList.length > 0 ? (
                                    availableList.map((item: any) => {
                                        const courseId = Number(item.courseId);
                                        return (
                                            <div key={item.courseId} className="flex items-center justify-between p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-white">{item.course?.title || 'Unknown Course'}</h4>
                                                    <p className="text-xs text-slate-500 mt-1">{item.course?.description?.substring(0, 80) || ''}...</p>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleCourse(courseId, false)}
                                                    disabled={isSaving}
                                                    className="ml-4 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg font-bold text-xs transition-colors border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSaving ? 'Processing...' : 'Enroll'}
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-slate-400 text-center py-8">All courses are either enrolled or requested</p>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Quiz Analysis Section */}
                    <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <BarChart3 size={18} className="text-purple-400" />
                            Quiz & Test Analysis ({quizHistory.length})
                        </h3>

                        {isLoadingQuizHistory ? (
                            <div className="text-center py-8">
                                <p className="text-slate-400 text-sm animate-pulse">Loading quiz history...</p>
                            </div>
                        ) : quizHistory.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No quiz or test attempts yet</p>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {quizHistory.map((attempt: any) => (
                                    <div key={attempt.id} className="p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${attempt.type === 'qbank'
                                                        ? 'bg-purple-500/20 text-purple-400'
                                                        : 'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                        {attempt.type === 'qbank' ? 'Q-Bank' : 'Course Quiz'}
                                                    </span>
                                                    <h4 className="font-bold text-white">{attempt.title}</h4>
                                                </div>
                                                {attempt.courseTitle && (
                                                    <p className="text-xs text-slate-500 mb-2">Course: {attempt.courseTitle}</p>
                                                )}
                                                {attempt.testMode && (
                                                    <p className="text-xs text-slate-500 mb-2">Mode: {attempt.testMode}</p>
                                                )}
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg text-sm font-bold ${attempt.isPassed || (attempt.passed !== false && (attempt.percentage || attempt.score || 0) >= 70)
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {attempt.percentage !== undefined
                                                    ? `${attempt.percentage.toFixed(1)}%`
                                                    : attempt.score !== undefined
                                                        ? `${attempt.score}%`
                                                        : 'N/A'
                                                }
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                                            {attempt.correctCount !== undefined && (
                                                <div>
                                                    <span className="text-slate-500">Correct: </span>
                                                    <span className="text-green-400 font-bold">{attempt.correctCount}</span>
                                                </div>
                                            )}
                                            {attempt.correctAnswers !== undefined && (
                                                <div>
                                                    <span className="text-slate-500">Correct: </span>
                                                    <span className="text-green-400 font-bold">{attempt.correctAnswers}</span>
                                                </div>
                                            )}
                                            {attempt.incorrectCount !== undefined && (
                                                <div>
                                                    <span className="text-slate-500">Incorrect: </span>
                                                    <span className="text-red-400 font-bold">{attempt.incorrectCount}</span>
                                                </div>
                                            )}
                                            {attempt.questionCount !== undefined && (
                                                <div>
                                                    <span className="text-slate-500">Total: </span>
                                                    <span className="text-white font-bold">{attempt.questionCount}</span>
                                                </div>
                                            )}
                                            {attempt.totalQuestions !== undefined && (
                                                <div>
                                                    <span className="text-slate-500">Total: </span>
                                                    <span className="text-white font-bold">{attempt.totalQuestions}</span>
                                                </div>
                                            )}
                                            {attempt.timeSpentMinutes !== undefined && (
                                                <div>
                                                    <span className="text-slate-500">Time: </span>
                                                    <span className="text-slate-300 font-bold">{attempt.timeSpentMinutes} min</span>
                                                </div>
                                            )}
                                            {attempt.timeTakenSeconds !== undefined && (
                                                <div>
                                                    <span className="text-slate-500">Time: </span>
                                                    <span className="text-slate-300 font-bold">{Math.round(attempt.timeTakenSeconds / 60)} min</span>
                                                </div>
                                            )}
                                        </div>
                                        {attempt.completedAt && (
                                            <p className="text-xs text-slate-500 mt-2">
                                                Completed: {new Date(attempt.completedAt).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 text-center">
        <div className="mb-4">
          <p className="text-slate-400 text-lg mb-2">Student not found</p>
          <p className="text-slate-500 text-sm">Student ID: {studentId}</p>
        </div>
        <button
          onClick={back}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
        >
          Go Back to Students
        </button>
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
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              student.isActive
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
                <p className="text-slate-300">
                  {new Date(student.joinedDate).toLocaleDateString()}
                </p>
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
        <div className="lg:col-span-2 space-y-6">
          {/* Enrolled Courses */}
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" />
              Enrolled Courses (
              {(() => {
                const enrollmentData = student.enrollmentData || [];
                return enrollmentData.filter((e: any) => e.enrollmentStatus === 'enrolled').length;
              })()}
              )
            </h3>

            {(() => {
              // Get enrolled courses from enrollmentData
              const enrollmentData = student.enrollmentData || [];
              const enrolledList = enrollmentData
                .filter((e: any) => e.enrollmentStatus === 'enrolled')
                .map((e: any) => ({
                  courseId: e.courseId,
                  progress: e.progress || 0,
                  totalProgress: e.progress || 0,
                  lastAccessed: e.lastAccessed,
                  course: e.course || courses.find((c: any) => c.id === e.courseId),
                }));

              return enrolledList.length > 0 ? (
                <div className="space-y-3">
                  {enrolledList.map((enrollment: any) => (
                    <div
                      key={enrollment.courseId}
                      className="p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-white mb-1">
                            {enrollment.course?.title || 'Unknown Course'}
                          </h4>
                          <p className="text-xs text-slate-500 mb-2">
                            {enrollment.course?.description?.substring(0, 80) || ''}...
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div>
                              <span className="text-xs text-slate-500">Progress: </span>
                              <span className="text-xs font-bold text-purple-400">
                                {enrollment.progress || enrollment.totalProgress || 0}%
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500">Last Accessed: </span>
                              <span className="text-xs text-slate-400">
                                {enrollment.lastAccessed
                                  ? new Date(enrollment.lastAccessed).toLocaleDateString()
                                  : 'Never'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleCourse(enrollment.courseId, true)}
                          className="ml-4 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg font-bold text-xs transition-colors border border-red-500/30"
                        >
                          Unenroll
                        </button>
                      </div>
                      {(enrollment.progress || enrollment.totalProgress || 0) > 0 && (
                        <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all"
                            style={{
                              width: `${enrollment.progress || enrollment.totalProgress || 0}%`,
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No enrolled courses</p>
              );
            })()}
          </div>

          {/* Requested Courses */}
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-yellow-400" />
              Requested Courses (
              {(() => {
                const enrollmentData = student.enrollmentData || [];
                return enrollmentData.filter((e: any) => e.enrollmentStatus === 'requested').length;
              })()}
              )
            </h3>

            {(() => {
              const enrollmentData = student.enrollmentData || [];
              const requestedList = enrollmentData
                .filter((e: any) => e.enrollmentStatus === 'requested')
                .map((e: any) => ({
                  courseId: e.courseId,
                  requestedAt: e.requestedAt,
                  course: e.course || courses.find((c: any) => c.id === e.courseId),
                }));

              return requestedList.length > 0 ? (
                <div className="space-y-3">
                  {requestedList.map((request: any) => (
                    <div
                      key={request.courseId}
                      className="p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-white mb-1">
                            {request.course?.title || 'Unknown Course'}
                          </h4>
                          <p className="text-xs text-slate-500 mb-2">
                            {request.course?.description?.substring(0, 80) || ''}...
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div>
                              <span className="text-xs text-slate-500">Requested: </span>
                              <span className="text-xs text-slate-400">
                                {request.requestedAt
                                  ? new Date(request.requestedAt).toLocaleDateString()
                                  : 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleCourse(request.courseId, false)}
                          disabled={isSaving}
                          className="ml-4 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg font-bold text-xs transition-colors border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'Processing...' : 'Approve & Enroll'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No pending course requests</p>
              );
            })()}
          </div>

          {/* Available Courses */}
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-400" />
              Available Courses (
              {(() => {
                const enrollmentData = student.enrollmentData || [];
                return enrollmentData.filter((e: any) => e.enrollmentStatus === 'available').length;
              })()}
              )
            </h3>

            <div className="space-y-3">
              {(() => {
                const enrollmentData = student.enrollmentData || [];
                const availableList = enrollmentData
                  .filter((e: any) => e.enrollmentStatus === 'available')
                  .map((e: any) => ({
                    courseId: e.courseId,
                    course: e.course || courses.find((c: any) => c.id === e.courseId),
                  }));

                return availableList.length > 0 ? (
                  availableList.map((item: any) => {
                    const courseId = Number(item.courseId);
                    return (
                      <div
                        key={item.courseId}
                        className="flex items-center justify-between p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40"
                      >
                        <div className="flex-1">
                          <h4 className="font-bold text-white">
                            {item.course?.title || 'Unknown Course'}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.course?.description?.substring(0, 80) || ''}...
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleCourse(courseId, false)}
                          disabled={isSaving}
                          className="ml-4 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg font-bold text-xs transition-colors border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'Processing...' : 'Enroll'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-400 text-center py-8">
                    All courses are either enrolled or requested
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
