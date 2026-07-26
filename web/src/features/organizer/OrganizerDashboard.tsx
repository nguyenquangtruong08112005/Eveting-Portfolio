'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  LayoutDashboard,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsGrid } from '@/components/organizer/StatsGrid';
import { EventManageTable } from '@/components/organizer/EventManageTable';
import { LedgerEntries } from '@/components/organizer/LedgerEntries';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { OrganizerService } from '@/features/organizer/api';
import { EventService } from '@/features/events/api';
import { ORG_NAV } from '@/features/organizer/nav';
import { Badge } from '@/components/ui/badge';
import type { OrganizerStats, OrganizerEvent, LedgerEntry } from '@/types';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function OrganizerDashboardView() {
  const t = useTranslations('organizer');
  const tCommon = useTranslations('common');
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<OrganizerStats>({
    totalSales: 0,
    grossRevenue: 0,
    platformFees: 0,
    netRevenue: 0,
  });
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [statsRes, eventsRes, ledgerRes] = await Promise.allSettled([
        OrganizerService.getStats(),
        OrganizerService.getEvents(),
        OrganizerService.getLedger(),
      ]);

      // API returns { totalRevenue, totalTicketsSold, totalEvents, upcomingEvents }
      // UI expects { totalSales, grossRevenue, platformFees, netRevenue }
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const raw = statsRes.value as OrganizerStats & {
          totalRevenue?: number;
          totalTicketsSold?: number;
        };
        setStats({
          totalSales: Number(raw.totalSales ?? raw.totalTicketsSold ?? 0) || 0,
          grossRevenue: Number(raw.grossRevenue ?? raw.totalRevenue ?? 0) || 0,
          platformFees: Number(raw.platformFees ?? 0) || 0,
          netRevenue:
            Number(
              raw.netRevenue ??
                (raw.grossRevenue ?? raw.totalRevenue ?? 0) - (raw.platformFees ?? 0)
            ) || 0,
        });
      }
      if (eventsRes.status === 'fulfilled' && eventsRes.value?.data) setEvents(eventsRes.value.data);
      if (ledgerRes.status === 'fulfilled' && ledgerRes.value?.entries)
        setLedgerEntries(ledgerRes.value.entries);
    } catch (error) {
      console.error('Error loading organizer dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [isAuthenticated, loadData]);

  const handleSubmitDraft = async (id: string) => {
    setActionLoadingId(id);
    setErrorMsg('');
    try {
      await EventService.submitDraft(id);
      toast.success(t('submit_draft_ok'));
      await loadData();
    } catch (err: any) {
      const msg = err.message || t('submit_draft_error');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelEvent = async (id: string) => {
    if (!confirm(t('cancel_confirm'))) return;
    setActionLoadingId(id);
    setErrorMsg('');
    try {
      await EventService.cancel(id);
      toast.success(t('cancel_ok'));
      await loadData();
    } catch (err: any) {
      const msg = err.message || t('cancel_error');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const body = (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full flex-grow">
      <PageHeader
        title={t('dashboard_title')}
        description={t('dashboard_subtitle')}
        icon={<LayoutDashboard className="size-5" />}
        actions={
          <Link
            href="/organizer/events/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl btn-primary-gradient font-bold text-xs btn-tactile text-[var(--on-primary)] border-none shrink-0"
          >
            <Plus className="size-4" />
            {t('create_event')}
          </Link>
        }
      />

      {errorMsg && (
        <div
          role="alert"
          className="mb-6 p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-2xl flex items-start gap-2.5 text-[var(--error)] text-sm"
        >
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-10 text-[var(--primary)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">{t('loading')}</p>
        </div>
      ) : (
        <>
          <StatsGrid stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2 bg-[var(--surface)] border border-[var(--surface-border)] p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  {t('manage_events')}
                </h3>
                <Badge className="border border-[var(--surface-border)] font-semibold text-[var(--text-secondary)] text-[10px] px-2 py-0.5">
                  {t('active_count', {
                    count: events.filter((e) => {
                      const s = (e.lifecycleStatus || e.status || '').toLowerCase();
                      return s === 'active' || s === 'approved' || s === 'published';
                    }).length,
                  })}
                </Badge>
              </div>
              <EventManageTable
                events={events}
                onSubmitDraft={handleSubmitDraft}
                onCancel={handleCancelEvent}
                actionLoadingId={actionLoadingId}
              />
            </section>

            <section>
              <LedgerEntries entries={ledgerEntries} />
            </section>
          </div>
        </>
      )}
    </main>
  );

  return (
    <AppShell variant="organizer" items={ORG_NAV} heading={tCommon('org_badge')}>
      {body}
    </AppShell>
  );
}
