'use client';

import React from 'react';
import { RouteGuard } from '@/components/shared/RouteGuard';
import { OrganizerWorkspaceProvider } from '@/features/organizer/OrganizerWorkspace';

export default function OrganizerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RouteGuard allowedRoles={['organizer']}>
      <OrganizerWorkspaceProvider>{children}</OrganizerWorkspaceProvider>
    </RouteGuard>
  );
}
