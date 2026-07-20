'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AnalyticsSeriesProps {
  data?: Record<string, number> | null;
  className?: string;
  emptyLabel?: string;
}

/** Simple CSS bar chart for dailySales / viewsOverTime maps. */
export function AnalyticsSeries({
  data,
  className,
  emptyLabel = 'No series data',
}: AnalyticsSeriesProps) {
  const bars = useMemo(() => {
    if (!data || typeof data !== 'object') return [];
    return Object.entries(data)
      .map(([key, value]) => ({
        key,
        value: Number(value) || 0,
        label: formatKey(key),
      }))
      .filter((b) => b.value > 0)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-14);
  }, [data]);

  const max = Math.max(1, ...bars.map((b) => b.value));

  if (bars.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] py-6 text-center">{emptyLabel}</p>
    );
  }

  return (
    <div className={cn('flex items-end gap-1.5 h-32', className)}>
      {bars.map((b) => (
        <div key={b.key} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end">
          <span className="text-[9px] font-bold text-[var(--text-muted)] tabular-nums">
            {b.value}
          </span>
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-[var(--primary)] to-[var(--accent-brand)] min-h-[4px] transition-all"
            style={{ height: `${Math.max(8, (b.value / max) * 100)}%` }}
            title={`${b.label}: ${b.value}`}
          />
          <span className="text-[8px] text-[var(--text-muted)] truncate w-full text-center">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatKey(key: string): string {
  const n = Number(key);
  if (!Number.isNaN(n) && n > 1e11) {
    try {
      return new Date(n).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return key.slice(0, 6);
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(key)) {
    return key.slice(5, 10);
  }
  return key.length > 8 ? key.slice(0, 6) : key;
}
