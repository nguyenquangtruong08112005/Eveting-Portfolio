import { cn } from '@/lib/utils';

interface SkeletonGridProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Tailwind grid classes, e.g. "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" */
  className?: string;
  /** Aspect ratio of the media placeholder; defaults to event card 16/10 */
  mediaAspect?: string;
}

/**
 * Skeleton loading grid for card lists. Mirrors the EventCard shape so loading
 * feels stable (no layout jump) across discovery / search / category grids.
 */
export function SkeletonGrid({
  count = 4,
  className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  mediaAspect = 'aspect-[16/10]',
}: SkeletonGridProps) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aura-card overflow-hidden">
          <div className={cn(mediaAspect, 'w-full skeleton-shimmer')} />
          <div className="p-5 space-y-2.5">
            <div className="h-4 w-3/4 rounded bg-[var(--surface-hover)]" />
            <div className="h-3 w-full rounded bg-[var(--surface-hover)]" />
            <div className="h-3 w-2/3 rounded bg-[var(--surface-hover)]" />
            <div className="h-9 w-full mt-3 rounded-xl bg-[var(--surface-hover)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
