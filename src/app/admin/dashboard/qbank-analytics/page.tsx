'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import NurseProAdminUltimate from '@/components/admin/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/admin/NotificationProvider';
import { getQueryClient } from '@/lib/query-client';

export default function QBankAnalyticsPage() {
    const [queryClient] = useState(() => getQueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <NotificationProvider>
                <NurseProAdminUltimate initialModule="qbank_analytics" />
            </NotificationProvider>
        </QueryClientProvider>
    );
}
