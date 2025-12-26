'use client';

import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <div className="gradient-mesh min-h-screen">{children}</div>;
}
