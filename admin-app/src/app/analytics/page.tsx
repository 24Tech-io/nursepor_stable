'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard with module parameter - client-side only
    router.replace('/dashboard?module=analytics');
  }, [router]);

  return null;
}

