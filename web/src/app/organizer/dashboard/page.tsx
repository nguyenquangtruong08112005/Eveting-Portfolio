'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { StatsGrid } from '@/components/organizer/StatsGrid';
import { EventManageTable } from '@/components/organizer/EventManageTable';
import { LedgerEntries } from '@/components/organizer/LedgerEntries';
import { useAuth } from '@/hooks/useAuth';
import { OrganizerService } from '@/services/organizer.service';
import { EventService } from '@/services/event.service';
import { Badge } from '@/components/ui/badge';
import { Plus, LayoutDashboard, Loader2 } from 'lucide-react';
import type { OrganizerStats, OrganizerEvent, LedgerEntry } from '@/types';
import { useTranslations } from 'next-intl';

export default function OrganizerDashboard() {
  const t = useTranslations('organizer');
  const { token } = useAuth();
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

  const loadData = useCallback(async () => {
    try {
      const [statsRes, eventsRes, ledgerRes] = await Promise.allSettled([
        OrganizerService.getStats(),
        OrganizerService.getEvents(),
        OrganizerService.getLedger(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
      if (eventsRes.status === 'fulfilled' && eventsRes.value?.data) {
        setEvents(eventsRes.value.data);
      }
      if (ledgerRes.status === 'fulfilled' && ledgerRes.value?.entries) {
        setLedgerEntries(ledgerRes.value.entries);
      }
    } catch (error) {
      console.error('Error loading organizer dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, loadData]);

  const handleSubmitDraft = async (id: string) => {
    setActionLoadingId(id);
    try {
      await EventService.submitDraft(id);
      await loadData();
    } catch (err: any) {
      console.error('Failed to submit draft:', err);
      alert(err.message || t('submit_draft_error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelEvent = async (id: string) => {
    if (!confirm(t('cancel_confirm'))) {
      return;
    }
    setActionLoadingId(id);
    try {
      await EventService.cancel(id);
      await loadData();
    } catch (err: any) {
      console.error('Failed to cancel event:', err);
      alert(err.message || t('cancel_error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
        <Navbar isOrganizerPage />
        <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-10 text-[var(--primary)] animate-spin" />
            <p className="text-zinc-400 text-sm">{t('loading')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar isOrganizerPage />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-grow">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
              <LayoutDashboard className="size-7 text-[var(--primary)]" />
              {t('dashboard_title')}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {t('dashboard_subtitle')}
            </p>
          </div>
          
          <Link
            href="/organizer/events/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl btn-primary-gradient font-bold text-xs shadow-lg shadow-orange-500/10 btn-tactile text-[#12141A] border-none shrink-0 self-start sm:self-center hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Plus className="size-4" />
            {t('create_event')}
          </Link>
        </div>

        {/* Stats Grid */}
        <StatsGrid stats={stats} />

        {/* Tables section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Management */}
          <section className="lg:col-span-2 bg-[#1E212B] border border-white/5 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {t('manage_events')}
              </h3>
              <Badge className="bg-[#12141A] border border-white/5 font-semibold text-zinc-400 text-[10px] px-2 py-0.5">
                {t('active_count', { count: events.filter(e => e.status === 'active' || e.status === 'approved' || e.status === 'published').length })}
              </Badge>
            </div>
            <EventManageTable
              events={events}
              onSubmitDraft={handleSubmitDraft}
              onCancel={handleCancelEvent}
              actionLoadingId={actionLoadingId}
            />
          </section>

          {/* Ledger */}
          <section>
            <LedgerEntries entries={ledgerEntries} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
