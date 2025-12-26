'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import NurseProAdminUltimate from '@/components/admin-app/UnifiedAdminSuite';

export default function AdminDashboard() {
    const [module, setModule] = useState<string>('dashboard');
    const params = useParams();

    // Extract module from URL params (no auth check - handled in layout)
    useEffect(() => {
        const slugArray = params?.slug as string[] | undefined;
        if (slugArray && slugArray.length > 0) {
            if (slugArray[0] === 'profile') {
                setModule('admin_profile');
            } else {
                setModule(slugArray[0]);
            }
        } else {
            setModule('dashboard');
        }
    }, [params]);

    // No loading/auth states here - layout handles it
    return <NurseProAdminUltimate initialModule={module} />;
}
