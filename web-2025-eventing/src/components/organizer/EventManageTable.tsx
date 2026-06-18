'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/constants';
import type { OrganizerEvent } from '@/types';

interface EventManageTableProps {
  events: OrganizerEvent[];
}

const statusStyles: Record<string, string> = {
  active: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
  draft: 'bg-[var(--secondary-yellow)]/10 text-[var(--secondary-yellow)] border-[var(--secondary-yellow)]/30',
  published: 'bg-[var(--primary-dark)]/10 text-[var(--primary-dark)] border-[var(--primary-dark)]/30',
  cancelled: 'bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/30',
};

export function EventManageTable({ events }: EventManageTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--surface-border)]">
            <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Sự kiện
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Trạng thái
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Đã bán
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Giá vé
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              className="border-b border-[var(--surface-border)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <td className="py-3 px-4 text-[var(--text-primary)] font-medium">{event.name}</td>
              <td className="py-3 px-4">
                <Badge
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    statusStyles[event.status] || statusStyles.draft
                  }`}
                >
                  {event.status}
                </Badge>
              </td>
              <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                <span className="text-[var(--text-primary)] font-semibold">{event.sold}</span>
                <span className="text-[var(--text-muted)]"> / {event.capacity}</span>
              </td>
              <td className="py-3 px-4 text-right text-[var(--primary-dark)] font-semibold">
                {formatPrice(event.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
