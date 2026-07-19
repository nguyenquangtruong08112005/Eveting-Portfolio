import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  /** Optional leading icon */
  icon?: LucideIcon;
  /** Optional right-aligned node (e.g. "See more" link) */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Section heading inside a page body — pairs an icon + title with an optional
 * trailing action (like a "See more" link). Use above grid sections.
 */
export function SectionHeading({ title, icon: Icon, action, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <h2 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
        {Icon && <Icon className="size-5 text-[var(--primary)]" />}
        {title}
      </h2>
      {action}
    </div>
  );
}
