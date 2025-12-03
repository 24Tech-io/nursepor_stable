'use client';

import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function RequestsPage() {
  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="requests" />
    </NotificationProvider>
  );
}
