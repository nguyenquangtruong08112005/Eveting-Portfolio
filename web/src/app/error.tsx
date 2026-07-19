'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen items-center justify-center p-6">
      <div className="max-w-md glass-card rounded-2xl p-8 text-center">
        <div className="size-12 rounded-full bg-[var(--error)]/15 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="size-6 text-[var(--error)]" />
        </div>
        <h2 className="text-[var(--text-primary)] text-lg font-bold mb-2">
          {t('error_title')}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          {t('error_generic')}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-xl btn-primary-gradient text-xs font-bold text-[var(--on-primary)] border-none cursor-pointer btn-tactile"
        >
          {t('try_again')}
        </button>
      </div>
    </div>
  );
}
