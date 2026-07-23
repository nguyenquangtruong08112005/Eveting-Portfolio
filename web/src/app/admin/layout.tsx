'use client';

import React from 'react';
import { RouteGuard } from '@/components/shared/RouteGuard';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RouteGuard allowedRoles={['admin']}>{children}</RouteGuard>;
}
