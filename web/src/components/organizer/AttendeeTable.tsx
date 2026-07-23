'use client';

import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users } from 'lucide-react';
import type { OrganizerAttendeeRow } from '@/types';

interface AttendeeTableProps {
  attendees: OrganizerAttendeeRow[];
}

export function AttendeeTable({ attendees }: AttendeeTableProps) {
  const t = useTranslations('organizer');

  if (!attendees.length) {
    return (
      <EmptyState
        icon={Users}
        title={t('attendees_empty')}
        description={t('attendees_empty_desc')}
        className="border border-dashed py-10"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--surface-border)] text-[var(--text-muted)]">
            <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider">
              {t('attendee_name')}
            </th>
            <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider">
              {t('attendee_email')}
            </th>
            <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider">
              {t('attendee_ticket')}
            </th>
            <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider">
              {t('attendee_status')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--surface-border)]">
          {attendees.map((row, i) => (
            <tr key={row.ticket?.id || i} className="hover:bg-[var(--surface-hover)]/40">
              <td className="py-3 px-3 font-medium text-[var(--text-primary)]">
                {row.user?.name || '—'}
              </td>
              <td className="py-3 px-3 text-[var(--text-secondary)] text-xs">
                {row.user?.email || '—'}
              </td>
              <td className="py-3 px-3 text-[var(--text-secondary)] text-xs">
                {row.ticket?.type || '—'}
                {row.ticket?.seat && row.ticket.seat !== 'N/A'
                  ? ` · ${row.ticket.seat}`
                  : ''}
              </td>
              <td className="py-3 px-3 text-xs font-bold capitalize text-[var(--text-muted)]">
                {row.ticket?.status || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
