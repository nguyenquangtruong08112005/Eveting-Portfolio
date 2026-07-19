'use client';

import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Optional heading override; defaults to a translated "nothing here" */
  title?: string;
  /** Supporting copy */
  description?: string;
  /** Lucide icon to show; defaults to an inbox */
  icon?: LucideIcon;
  /** Action slot (usually a button / link) */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standard empty-state. Always renders an icon, a heading, optional copy,
 * and an optional primary action. Use across lists, tables, search results.
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  const t = useTranslations('common');
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        'rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface)]/40',
        className
      )}
    >
      <div className="size-12 rounded-full bg-[var(--surface-hover)] flex items-center justify-center mb-4">
        <Icon className="size-6 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-[var(--text-primary)] text-base font-bold">
        {title ?? t('empty_title')}
      </h3>
      {description && (
        <p className="text-[var(--text-muted)] text-sm mt-1.5 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
