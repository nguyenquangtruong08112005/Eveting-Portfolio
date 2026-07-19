import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  /** label announced to assistive tech */
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <Loader2
      className={cn('size-5 animate-spin text-[var(--primary)]', className)}
      role="status"
      aria-label={label}
    />
  );
}
