'use client';

import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function BlogManagerPage() {
  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="blog" />
    </NotificationProvider>
  );
}
