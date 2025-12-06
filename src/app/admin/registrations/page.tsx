'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRegistrationsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard registrations route
    router.replace('/admin/dashboard/registrations');
  }, [router]);

  return null;
}

