'use client';

import { Toaster } from '@/components/ui/sonner';

/**
 * App-wide toast host. Mount once near the root (in Providers). Toasts are
 * triggered anywhere via `import { toast } from 'sonner'`.
 *
 * Position is bottom-right on desktop, top-center on mobile.
 */
export function ToastHost() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'font-sans',
        },
      }}
    />
  );
}
