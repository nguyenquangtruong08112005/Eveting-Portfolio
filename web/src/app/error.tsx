'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen items-center justify-center p-6">
      <div className="max-w-md glass-card rounded-2xl p-8 border border-white/5 bg-[#1E212B] text-center">
        <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-zinc-200 text-lg font-bold mb-2">Something went wrong</h2>
        <p className="text-zinc-500 text-sm mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-xl btn-primary-gradient text-xs font-bold text-[#12141A] border-none cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
