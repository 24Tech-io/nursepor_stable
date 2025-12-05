'use client';

import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function QBankPage() {
  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="qbank" />
    </NotificationProvider>
  );
}



