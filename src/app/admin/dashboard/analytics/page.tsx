'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NurseProAdminUltimate from '@/components/admin/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/admin/NotificationProvider';
import { getQueryClient } from '@/lib/query-client';

export default function AnalyticsPage() {
  const [queryClient] = useState(() => getQueryClient());
  const router = useRouter();

  useEffect(() => {
    // This page is handled by the UnifiedAdminSuite component
    // The component will read the URL and show the correct module
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <NurseProAdminUltimate initialModule="analytics" />
      </NotificationProvider>
    </QueryClientProvider>
  );
}


