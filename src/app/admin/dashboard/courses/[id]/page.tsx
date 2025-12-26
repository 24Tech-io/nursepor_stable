'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import NurseProAdminUltimate from '@/components/admin/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/admin/NotificationProvider';
import { getQueryClient } from '@/lib/query-client';

export default function CourseEditorPage() {
  const params = useParams();
  const courseId = params?.id ? parseInt(params.id as string) : null;
  const [course, setCourse] = useState<any>(null);
  const [queryClient] = useState(() => getQueryClient());

  useEffect(() => {
    if (courseId) {
      fetch(`/api/courses/${courseId}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.course) {
            setCourse(data.course);
          }
        })
        .catch(console.error);
    }
  }, [courseId]);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <NurseProAdminUltimate initialModule="course_editor" initialCourse={course} />
      </NotificationProvider>
    </QueryClientProvider>
  );
}

