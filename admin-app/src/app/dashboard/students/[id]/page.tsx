'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.id ? parseInt(params.id as string) : null;

  return (
    <NotificationProvider>
      <NurseProAdminUltimate initialModule="student_profile" initialStudentId={studentId || undefined} />
    </NotificationProvider>
  );
}











