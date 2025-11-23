'use client';

import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function DailyVideosPage() {
  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="daily_videos" />
    </NotificationProvider>
  );
}


