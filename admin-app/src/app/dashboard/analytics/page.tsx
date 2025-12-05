'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    // This page is handled by the UnifiedAdminSuite component
    // The component will read the URL and show the correct module
  }, []);

  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="analytics" />
    </NotificationProvider>
  );
}

