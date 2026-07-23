'use client';

import { RouteGuard } from '@/components/shared/RouteGuard';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard>{children}</RouteGuard>;
}
