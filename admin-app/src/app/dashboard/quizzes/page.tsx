'use client';

import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function QuizzesPage() {
  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="quizzes" />
    </NotificationProvider>
  );
}


