'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Dynamic import to prevent webpack chunk loading issues
const QBankDashboard = dynamic(() => import('@/components/qbank/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Loading Q-Bank Dashboard...</p>
      </div>
    </div>
  ),
});

export default function CourseQBankDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const [courseName, setCourseName] = useState<string>('');

  useEffect(() => {
    // Optionally fetch course name
    fetchCourseName();
  }, [courseId]);

  const fetchCourseName = async () => {
    try {
      const response = await fetch(`/api/student/courses/${courseId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCourseName(data.course?.title || '');
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  };

  return (
    <ErrorBoundary>
      <QBankDashboard
        courseId={courseId}
        courseName={courseName}
        onBack={() => router.push('/student/courses')}
      />
    </ErrorBoundary>
  );
}

