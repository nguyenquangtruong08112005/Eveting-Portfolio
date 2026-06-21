'use client';

import React from 'react';
import { RouteGuard } from '@/components/shared/RouteGuard';

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RouteGuard>{children}</RouteGuard>;
}
