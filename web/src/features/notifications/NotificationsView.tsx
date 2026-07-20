'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Ticket, Calendar, Info, Tag, Clock, CheckCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Spinner } from '@/components/shared/Spinner';
import { Button } from '@/components/ui/button';
import { NotificationService } from '@/services/notification.service';
import { useAuth } from '@/hooks/useAuth';
import type { AppNotification, NotificationType } from '@/types';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  order: Ticket,
  event: Calendar,
  system: Info,
  promotion: Tag,
  reminder: Clock,
};

function timeAgo(createdAt: string | number, fmt: (key: string, params?: any) => string): string {
  const ts = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt;
  if (!ts || isNaN(ts)) return '';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return fmt('just_now');
  if (mins < 60) return fmt('minutes_ago', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return fmt('hours_ago', { n: hours });
  const days = Math.floor(hours / 24);
  return fmt('days_ago', { n: days });
}

export function NotificationsView() {
  const t = useTranslations('notifications');
  const { token } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await NotificationService.list();
      setItems(data.notifications || []);
    } catch (err) {
      console.error('Notifications load error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRowClick = async (item: AppNotification) => {
    if (item.read) return;
    // Optimistic update
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    try {
      await NotificationService.markRead(item.id);
    } catch {
      // Revert on error
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: false } : n)));
    }
  };

  const handleMarkAll = async () => {
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    // Optimistic
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await Promise.all(unreadIds.map((id) => NotificationService.markRead(id)));
    } catch {
      // Best-effort; reload to sync
      load();
    } finally {
      setMarkingAll(false);
    }
  };

  // Sort unread first, then by date desc
  const sorted = [...items].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    const aT = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
    const bT = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
    return (bT || 0) - (aT || 0);
  });
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full flex-grow">
        <PageHeader
          title={t('title')}
          description={t('subtitle')}
          icon={<Bell className="size-5" />}
          actions={
            unreadCount > 0 && (
              <Button
                onClick={handleMarkAll}
                disabled={markingAll}
                variant="outline"
                size="sm"
                className="rounded-full text-xs btn-tactile"
              >
                <CheckCheck className="size-3.5" />
                {t('mark_all_read')}
              </Button>
            )
          }
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner className="size-8" />
            <p className="text-[var(--text-muted)] text-sm">{t('loading')}</p>
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState icon={BellOff} title={t('empty')} description={t('empty_desc')} />
        ) : (
          <ul className="space-y-2">
            {sorted.map((item) => {
              const Icon = TYPE_ICON[item.type] || Bell;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleRowClick(item)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all',
                      item.read
                        ? 'bg-[var(--surface)]/50 border-[var(--surface-border)]'
                        : 'bg-[var(--surface)] border-[var(--primary)]/20 hover:border-[var(--primary)]/40'
                    )}
                  >
                    <div
                      className={cn(
                        'size-9 rounded-full flex items-center justify-center shrink-0',
                        item.read
                          ? 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                          : 'bg-[var(--primary)]/15 text-[var(--primary)]'
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{item.title}</p>
                        {!item.read && (
                          <span
                            className="size-2 rounded-full bg-[var(--primary)] shrink-0"
                            aria-label="unread"
                          />
                        )}
                      </div>
                      {item.body && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                          {item.body}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                        {timeAgo(item.createdAt, t)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
