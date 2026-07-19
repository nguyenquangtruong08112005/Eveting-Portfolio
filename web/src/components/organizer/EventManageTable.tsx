'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/constants';
import { Loader2, Send, XCircle } from 'lucide-react';
import type { OrganizerEvent } from '@/types';
import { EmptyState } from '@/components/shared/EmptyState';

interface EventManageTableProps {
  events: OrganizerEvent[];
  onSubmitDraft: (id: string) => void;
  onCancel: (id: string) => void;
  actionLoadingId: string | null;
}

const statusStyles: Record<string, string> = {
  active: 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20',
  draft: 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20',
  submitted: 'bg-[var(--info)]/10 text-[var(--info)] border border-[var(--info)]/20',
  pending: 'bg-[var(--info)]/10 text-[var(--info)] border border-[var(--info)]/20',
  approved: 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20',
  published: 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20',
  cancelled: 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20',
};

const statusKeyMap: Record<string, string> = {
  active: 'status_active',
  draft: 'status_draft',
  submitted: 'status_submitted',
  pending: 'status_pending',
  approved: 'status_approved',
  published: 'status_published',
  cancelled: 'status_cancelled',
};

export function EventManageTable({
  events,
  onSubmitDraft,
  onCancel,
  actionLoadingId,
}: EventManageTableProps) {
  const t = useTranslations('organizer_table');

  if (events.length === 0) {
    return <EmptyState title={t('empty')} className="border border-dashed" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--surface-border)] text-[var(--text-muted)]">
            <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider">
              {t('col_event')}
            </th>
            <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider">
              {t('col_status')}
            </th>
            <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider">
              {t('col_ticket_ratio')}
            </th>
            <th className="text-right py-3.5 px-4 text-xs font-bold uppercase tracking-wider">
              {t('col_price')}
            </th>
            <th className="text-right py-3.5 px-4 text-xs font-bold uppercase tracking-wider">
              {t('col_actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--surface-border)]">
          {events.map((event) => {
            const pct = event.capacity > 0 ? Math.round((event.sold / event.capacity) * 100) : 0;
            const isLoading = actionLoadingId === event.id;

            return (
              <tr key={event.id} className="hover:bg-[var(--surface-hover)]/50 transition-colors">
                <td
                  className="py-4 px-4 text-[var(--text-primary)] font-medium max-w-[200px] truncate"
                  title={event.name}
                >
                  {event.name}
                </td>

                <td className="py-4 px-4">
                  <Badge
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      statusStyles[event.status] || statusStyles.draft
                    }`}
                  >
                    {t(statusKeyMap[event.status] || event.status)}
                  </Badge>
                </td>

                <td className="py-4 px-4 min-w-[150px]">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-24 h-1.5 rounded-full bg-[var(--surface-hover)] overflow-hidden relative shrink-0"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary)] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-secondary)]">{pct}%</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      ({event.sold}/{event.capacity})
                    </span>
                  </div>
                </td>

                <td className="py-4 px-4 text-right text-[var(--primary)] font-bold">
                  {formatPrice(event.price)}
                </td>

                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    {event.status === 'draft' && (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={actionLoadingId !== null}
                        onClick={() => onSubmitDraft(event.id)}
                        className="bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/20 text-xs font-bold"
                      >
                        {isLoading ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Send className="size-3 mr-1" />
                        )}
                        {t('submit_review')}
                      </Button>
                    )}

                    {(event.status === 'active' ||
                      event.status === 'approved' ||
                      event.status === 'published') && (
                      <Button
                        size="xs"
                        variant="destructive"
                        disabled={actionLoadingId !== null}
                        onClick={() => onCancel(event.id)}
                        className="text-xs font-bold"
                      >
                        {isLoading ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <XCircle className="size-3 mr-1" />
                        )}
                        {t('cancel')}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
