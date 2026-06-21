'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/constants';
import { Loader2, Send, XCircle } from 'lucide-react';
import type { OrganizerEvent } from '@/types';

interface EventManageTableProps {
  events: OrganizerEvent[];
  onSubmitDraft: (id: string) => void;
  onCancel: (id: string) => void;
  actionLoadingId: string | null;
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 border border-green-500/20',
  draft: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  pending: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  approved: 'bg-green-500/10 text-green-400 border border-green-500/20',
  published: 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
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

export function EventManageTable({ events, onSubmitDraft, onCancel, actionLoadingId }: EventManageTableProps) {
  const t = useTranslations('organizer_table');

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-500 text-sm border border-dashed border-white/5 rounded-xl">
        {t('empty')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-zinc-400">
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
        <tbody className="divide-y divide-white/5">
          {events.map((event) => {
            const pct = event.capacity > 0 ? Math.round((event.sold / event.capacity) * 100) : 0;
            const isLoading = actionLoadingId === event.id;

            return (
              <tr
                key={event.id}
                className="hover:bg-white/[0.02] transition-colors"
              >
                {/* Event Name */}
                <td className="py-4 px-4 text-white font-medium max-w-[200px] truncate" title={event.name}>
                  {event.name}
                </td>
                
                {/* Status Badge */}
                <td className="py-4 px-4">
                  <Badge
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      statusStyles[event.status] || statusStyles.draft
                    }`}
                  >
                    {t(statusKeyMap[event.status] || event.status)}
                  </Badge>
                </td>
                
                {/* Capacity Sold Progress Bar */}
                <td className="py-4 px-4 min-w-[150px]">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden relative shrink-0">
                      <div 
                        className="h-full bg-gradient-to-r from-[#FF8F66] to-[#FF7043] rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-zinc-300">{pct}%</span>
                    <span className="text-[10px] text-zinc-500">({event.sold}/{event.capacity})</span>
                  </div>
                </td>
                
                {/* Price */}
                <td className="py-4 px-4 text-right text-[var(--primary)] font-bold">
                  {formatPrice(event.price)}
                </td>

                {/* Actions */}
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    {event.status === 'draft' && (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={actionLoadingId !== null}
                        onClick={() => onSubmitDraft(event.id)}
                        className="bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 text-xs font-bold"
                      >
                        {isLoading ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Send className="size-3 mr-1" />
                        )}
                        {t('submit_review')}
                      </Button>
                    )}
                    
                    {(event.status === 'active' || event.status === 'approved' || event.status === 'published') && (
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
