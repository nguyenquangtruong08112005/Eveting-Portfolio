'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  QrCode,
  Pencil,
  Send,
  Ticket,
  Eye,
  UserCheck,
  Banknote,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsSeries } from '@/components/organizer/AnalyticsSeries';
import { AttendeeTable } from '@/components/organizer/AttendeeTable';
import { ORG_NAV } from '@/features/organizer/nav';
import { OrganizerService } from '@/features/organizer/api';
import { EventService } from '@/features/events/api';
import { formatPrice } from '@/lib/constants';
import type { Event, EventAnalytics, OrganizerAttendeeRow } from '@/types';

export function OrganizerEventDetailView() {
  const t = useTranslations('organizer');
  const tCommon = useTranslations('common');
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventAnalytics | null>(null);
  const [attendees, setAttendees] = useState<OrganizerAttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [evRes, stRes, atRes] = await Promise.allSettled([
        EventService.getById(eventId),
        OrganizerService.getEventStats(eventId),
        OrganizerService.getAttendees(eventId),
      ]);
      if (evRes.status === 'fulfilled') setEvent(evRes.value);
      else setEvent(null);
      if (stRes.status === 'fulfilled') setStats(stRes.value || {});
      else setStats({});
      if (atRes.status === 'fulfilled') setAttendees(atRes.value.attendees || []);
      else setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitDraft = async () => {
    setActionLoading(true);
    try {
      await EventService.submitDraft(eventId);
      toast.success(t('submit_ok'));
      await load();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || t('submit_draft_error'));
    } finally {
      setActionLoading(false);
    }
  };

  const status = (event?.lifecycleStatus || event?.status || '').toLowerCase();
  const ticketsSold =
    typeof stats?.ticketsSold === 'number'
      ? stats.ticketsSold
      : stats?.ticketsSold && typeof stats.ticketsSold === 'object'
        ? Object.values(stats.ticketsSold).reduce((s, n) => s + (Number(n) || 0), 0)
        : 0;

  return (
    <AppShell variant="organizer" items={ORG_NAV} heading={tCommon('org_badge')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full space-y-6">
        <Link
          href="/organizer/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="size-3.5" />
          {t('back_to_dashboard')}
        </Link>

        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="size-10 text-[var(--primary)] animate-spin" />
            <p className="text-sm text-[var(--text-muted)]">{t('loading_event')}</p>
          </div>
        ) : !event ? (
          <EmptyState
            icon={BarChart3}
            title={t('event_not_found')}
            description={t('event_not_found_desc')}
          />
        ) : (
          <>
            <PageHeader
              title={event.name}
              description={status || t('manage_events')}
              icon={<BarChart3 className="size-5" />}
              actions={
                <div className="flex flex-wrap gap-2">
                  <Badge className="capitalize text-[10px] font-bold">{status || '—'}</Badge>
                  {(status === 'draft' || status === 'rejected') && (
                    <>
                      <Link
                        href={`/organizer/events/${eventId}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <Pencil className="size-3.5" />
                        {t('edit_event')}
                      </Link>
                      {status === 'draft' && (
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          onClick={handleSubmitDraft}
                          className="rounded-xl text-xs font-bold btn-primary-gradient text-[var(--on-primary)] border-none"
                        >
                          {actionLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Send className="size-3.5" />
                          )}
                          {t('submit_review')}
                        </Button>
                      )}
                    </>
                  )}
                  <Link
                    href={`/organizer/check-in?eventId=${encodeURIComponent(eventId)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <QrCode className="size-3.5 text-[var(--primary)]" />
                    {t('open_check_in')}
                  </Link>
                </div>
              }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi
                icon={Banknote}
                label={t('kpi_revenue')}
                value={formatPrice(stats?.totalRevenue ?? 0)}
              />
              <Kpi icon={Ticket} label={t('kpi_tickets')} value={String(ticketsSold)} />
              <Kpi
                icon={UserCheck}
                label={t('kpi_checkins')}
                value={String(stats?.checkIns ?? 0)}
              />
              <Kpi icon={Eye} label={t('kpi_views')} value={String(stats?.views ?? 0)} />
            </div>

            {stats?.ticketsSold && typeof stats.ticketsSold === 'object' && (
              <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
                  {t('tickets_by_type')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.ticketsSold).map(([type, count]) => (
                    <Badge
                      key={type}
                      className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 text-xs font-bold"
                    >
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">
                {t('daily_sales')}
              </h3>
              <AnalyticsSeries data={stats?.dailySales} emptyLabel={t('no_series')} />
            </section>

            <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">
                {t('attendees_title')} ({attendees.length})
              </h3>
              <AttendeeTable attendees={attendees} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
        <Icon className="size-4 text-[var(--primary)]" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-black text-[var(--text-primary)] tabular-nums">{value}</p>
    </div>
  );
}
