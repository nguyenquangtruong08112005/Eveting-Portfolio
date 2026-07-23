'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  /** Override the heading */
  title?: string;
  /** The error message to display */
  message?: string;
  /** Called when the user clicks "Try again". If omitted, the button reloads the page. */
  onRetry?: () => void;
  className?: string;
}

/**
 * Standard error-state. Renders an inline-style or full-card error depending
 * on the container. Use for failed data fetches and caught render errors.
 */
export function ErrorState({ title, message, onRetry, className }: ErrorStateProps) {
  const t = useTranslations('common');
  const handleRetry = () => {
    if (onRetry) onRetry();
    else if (typeof window !== 'undefined') window.location.reload();
  };
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        'rounded-2xl border border-[var(--error)]/25 bg-[var(--error)]/5',
        className
      )}
    >
      <div className="size-12 rounded-full bg-[var(--error)]/15 flex items-center justify-center mb-4">
        <AlertCircle className="size-6 text-[var(--error)]" />
      </div>
      <h3 className="text-[var(--text-primary)] text-base font-bold">
        {title ?? t('error_title')}
      </h3>
      <p className="text-[var(--text-secondary)] text-sm mt-1.5 max-w-sm">
        {message ?? t('error_generic')}
      </p>
      <Button variant="outline" size="sm" onClick={handleRetry} className="mt-5 btn-tactile">
        <RefreshCw className="size-3.5" />
        {t('try_again')}
      </Button>
    </div>
  );
}
