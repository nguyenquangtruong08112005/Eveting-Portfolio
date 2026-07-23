'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Spinner } from './Spinner';
import { cn } from '@/lib/utils';

interface AsyncBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback; defaults to a centered spinner + "Loading" label */
  fallback?: React.ReactNode;
  minHeight?: string;
  className?: string;
}

/**
 * Suspense wrapper with a consistent loading fallback. Drop it around any
 * client subtree that suspends (useSearchParams, lazy data, etc.) to keep
 * loading UX uniform across the app.
 */
export function AsyncBoundary({
  children,
  fallback,
  minHeight = 'min-h-[300px]',
  className,
}: AsyncBoundaryProps) {
  const t = useTranslations('common');
  return (
    <Suspense
      fallback={
        fallback ?? (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-3 w-full',
              minHeight,
              className
            )}
          >
            <Spinner className="size-8" label={t('loading')} />
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-muted)]">
              {t('loading')}
            </span>
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}
