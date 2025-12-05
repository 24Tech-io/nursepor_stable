'use client';

import QBankDashboard from '@/components/qbank/Dashboard';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
    <QBankDashboard
      courseId={courseId}
      courseName={courseName}
      onBack={() => router.push('/student/courses')}
    />
  );
}

