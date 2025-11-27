'use client';

import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function CoursesPage() {
  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="courses" />
    </NotificationProvider>
  );
}







