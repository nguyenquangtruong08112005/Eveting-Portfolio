'use client';

import React from 'react';
import { RouteGuard } from '@/components/shared/RouteGuard';

export default function OrganizerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RouteGuard allowedRoles={['organizer']}>{children}</RouteGuard>;
}
