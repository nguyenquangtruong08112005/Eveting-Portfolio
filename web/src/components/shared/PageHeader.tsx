import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional icon shown in a brand chip to the left of the title */
  icon?: React.ReactNode;
  /** Right-aligned actions (buttons, links) */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard page header. Title + optional description, optional leading icon,
 * optional trailing actions. Use at the top of every page / tab view.
 */
export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="size-10 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center shrink-0">
            <span className="text-[var(--primary)]">{icon}</span>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
