'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import NurseProAdminUltimate from '@/components/admin/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/admin/NotificationProvider';

export default function DailyVideosPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <NurseProAdminUltimate initialModule="daily_videos" />
      </NotificationProvider>
    </QueryClientProvider>
  );
}

