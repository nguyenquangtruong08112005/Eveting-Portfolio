'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const t = useTranslations('common');
  const router = useRouter();
  const { role, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = role || 'attendee';
      const hasAccess = allowedRoles.includes(userRole);
      if (!hasAccess) {
        router.push('/');
      }
    }
  }, [isAuthenticated, role, isLoading, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="bg-[var(--background)] min-h-screen text-[var(--text-secondary)] flex flex-col items-center justify-center gap-3">
        <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-muted)]">{t('loading')}</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (allowedRoles && role && !allowedRoles.includes(role)) return null;

  return <>{children}</>;
}
