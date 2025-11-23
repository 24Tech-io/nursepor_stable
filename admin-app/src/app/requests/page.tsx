'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard with module parameter - client-side only
    router.replace('/dashboard?module=requests');
  }, [router]);

  return null;
}
