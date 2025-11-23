'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CoursesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard with module parameter - client-side only
    router.replace('/dashboard?module=courses');
  }, [router]);

  return null;
}
