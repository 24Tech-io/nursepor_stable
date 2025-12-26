'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QBankPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard with module parameter - client-side only
    router.replace('/dashboard?module=qbank');
  }, [router]);

  return null;
}
