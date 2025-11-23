'use client';

import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function BlogsPage() {
  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="blogs" />
    </NotificationProvider>
  );
}


