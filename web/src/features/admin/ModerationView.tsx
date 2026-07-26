'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  Clock,
  ShieldCheck,
  Ban,
  History,
} from 'lucide-react';
import Image from 'next/image';
import { AppShell } from '@/components/layout/AppShell';
import { PendingEventCard } from '@/components/admin/PendingEventCard';
import { useAuth } from '@/hooks/useAuth';
import { AdminService } from '@/features/admin/api';
import { ADMIN_NAV } from '@/features/admin/nav';
import { formatDate } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Spinner } from '@/components/shared/Spinner';
import type { Event } from '@/types';
import { cn } from '@/lib/utils';
import type { RejectedEvent } from '@/types';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

export function ModerationView() {
  const t = useTranslations('moderation');
  const tCommon = useTranslations('common');
  const { isAuthenticated } = useAuth();
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<Event[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<RejectedEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPending = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setErrorMessage(null);
      }
      try {
        const data = await AdminService.getPendingEvents(pageNum, PAGE_SIZE);
        const cleaned = (data.events || []).filter((e) => e && e.id && e.name);
        setPendingEvents((prev) => (append ? [...prev, ...cleaned] : cleaned));
        setPage(pageNum);
        // Server total is page length until full count exists; use page full as "maybe more"
        setHasMore(cleaned.length >= PAGE_SIZE);
      } catch (err: unknown) {
        console.error('Failed to load pending events:', err);
        const msg = err instanceof Error ? err.message : t('load_error');
        setErrorMessage(msg || t('load_error'));
        if (!append) setPendingEvents([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated, t]
  );

  useEffect(() => {
    void loadPending(1, false);
  }, [loadPending]);

  const handleApprove = async (eventId: string) => {
    setErrorMessage(null);
    const event = pendingEvents.find((e) => e.id === eventId);
    try {
      if (!isAuthenticated) throw new Error(t('auth_error'));
      await AdminService.approveEvent(eventId);
      toast.success(t('approve_success', { name: event?.name || '' }));
      if (event) setApprovedEvents((prev) => [event, ...prev]);
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t('approve_error', { name: event?.name || '' });
      setErrorMessage(msg);
      throw err;
    }
  };

  const handleReject = async (eventId: string, reason: string) => {
    setErrorMessage(null);
    const event = pendingEvents.find((e) => e.id === eventId);
    try {
      if (!isAuthenticated) throw new Error(t('auth_error'));
      await AdminService.rejectEvent(eventId, reason);
      toast.success(t('reject_success', { name: event?.name || '' }));
      if (event) setRejectedEvents((prev) => [{ ...event, reason }, ...prev]);
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t('reject_error', { name: event?.name || '' });
      setErrorMessage(msg);
      throw err;
    }
  };

  const body = (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full flex-grow">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        icon={<ShieldAlert className="size-5" />}
        actions={
          <Badge className="px-3 py-1 rounded-full bg-[var(--error)]/10 border border-[var(--error)]/30 text-xs font-bold text-[var(--error)] shrink-0">
            {t('admin_badge')}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Clock className="size-5 text-[var(--primary)]" />}
          iconBg="bg-[var(--primary)]/10"
          label={t('pending_label')}
          value={String(pendingEvents.length)}
          valueClass="text-[var(--text-primary)]"
        />
        <StatCard
          icon={<ShieldCheck className="size-5 text-[var(--success)]" />}
          iconBg="bg-[var(--success)]/10"
          label={t('approved_label')}
          value={String(approvedEvents.length)}
          valueClass="text-[var(--success)]"
        />
        <StatCard
          icon={<Ban className="size-5 text-[var(--error)]" />}
          iconBg="bg-[var(--error)]/10"
          label={t('rejected_label')}
          value={String(rejectedEvents.length)}
          valueClass="text-[var(--error)]"
        />
        <StatCard
          icon={<History className="size-5 text-[var(--info)]" />}
          iconBg="bg-[var(--info)]/10"
          label={t('session_note_label')}
          value={
            <span className="text-[10px] font-bold text-[var(--text-muted)] leading-tight">
              {t('session_note_short')}
            </span>
          }
        />
      </div>

      <p className="text-[11px] text-[var(--text-muted)] mb-4 -mt-4">
        {t('session_history_hint')}
      </p>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl flex items-start gap-2 text-[var(--error)] text-sm mb-6"
        >
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex gap-2 border-b border-[var(--surface-border)] pb-4 mb-6 flex-wrap">
        {(['pending', 'approved', 'rejected'] as const).map((tab) => {
          const count =
            tab === 'pending'
              ? pendingEvents.length
              : tab === 'approved'
                ? approvedEvents.length
                : rejectedEvents.length;
          const labelKey = `tab_${tab}` as const;
          const activeColor =
            tab === 'pending'
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : tab === 'approved'
                ? 'bg-[var(--success)] text-white'
                : 'bg-[var(--error)] text-white';
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer btn-tactile',
                activeTab === tab
                  ? activeColor
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {t(labelKey)} ({count})
            </button>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto rounded-xl text-[10px] h-8"
          disabled={loading}
          onClick={() => void loadPending(1, false)}
        >
          {tCommon('refresh')}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner className="size-8" />
          <p className="text-[var(--text-muted)] text-sm">{t('loading')}</p>
        </div>
      ) : activeTab === 'pending' ? (
        pendingEvents.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t('empty_queue')}
            description={t('empty_queue_desc')}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingEvents.map((event) => (
                <PendingEventCard
                  key={event.id}
                  event={event}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={loadingMore}
                  onClick={() => void loadPending(page + 1, true)}
                >
                  {loadingMore ? <Spinner className="size-4" /> : t('load_more')}
                </Button>
              </div>
            )}
          </>
        )
      ) : activeTab === 'approved' ? (
        approvedEvents.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title={t('empty_approved')}
            description={t('empty_session_desc')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {approvedEvents.map((event) => (
              <ReviewCard key={event.id} event={event} variant="approved" t={t} />
            ))}
          </div>
        )
      ) : rejectedEvents.length === 0 ? (
        <EmptyState
          icon={Ban}
          title={t('empty_rejected')}
          description={t('empty_session_desc')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rejectedEvents.map((event) => (
            <ReviewCard
              key={event.id}
              event={event}
              variant="rejected"
              reason={event.reason}
              t={t}
            />
          ))}
        </div>
      )}
    </main>
  );

  return (
    <AppShell variant="admin" items={ADMIN_NAV} heading={tCommon('admin_badge')}>
      {body}
    </AppShell>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--surface-border)] p-4 rounded-2xl flex items-center gap-4">
      <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">
          {label}
        </span>
        <span className={cn('text-xl font-black', valueClass || 'text-[var(--text-primary)]')}>
          {value}
        </span>
      </div>
    </div>
  );
}

function ReviewCard({
  event,
  variant,
  reason,
  t,
}: {
  event: Event;
  variant: 'approved' | 'rejected';
  reason?: string;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
}) {
  const isApproved = variant === 'approved';
  return (
    <div
      className={cn(
        'p-5 rounded-2xl flex gap-4 items-start border',
        isApproved
          ? 'bg-[var(--surface)] border-[var(--success)]/20'
          : 'bg-[var(--surface)] border-[var(--error)]/20'
      )}
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[var(--surface-hover)] relative">
        {event.imageUrl && (
          <Image src={event.imageUrl} alt={event.name} fill className="w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{event.name}</h4>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          {event.city} · {formatDate(event.date)}
        </p>
        {isApproved ? (
          <Badge className="bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 font-bold text-[9px] px-2 py-0.5 rounded mt-2.5">
            {t('approved_badge')}
          </Badge>
        ) : (
          reason && (
            <p className="text-[10px] text-[var(--error)] font-semibold mt-2.5 bg-[var(--error)]/10 border border-[var(--error)]/20 px-2 py-1 rounded inline-block">
              {t('reject_reason')} {reason}
            </p>
          )
        )}
      </div>
    </div>
  );
}
