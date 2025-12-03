'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function StudentsPage() {
  const router = useRouter();

  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="students" />
    </NotificationProvider>
  );
}
