'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function CourseEditorPage() {
  const params = useParams();
  const courseId = params?.id ? parseInt(params.id as string) : null;
  const [course, setCourse] = useState<any>(null);

  useEffect(() => {
    if (courseId) {
      fetch(`/api/courses/${courseId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.course) {
            setCourse(data.course);
          }
        })
        .catch(console.error);
    }
  }, [courseId]);

  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="course_editor" initialCourse={course} />
    </NotificationProvider>
  );
}







