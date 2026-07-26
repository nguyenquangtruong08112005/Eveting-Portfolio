'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { Bell, Ticket, Calendar, Info, Tag, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
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

function timeAgoShort(createdAt: string | number): string {
  const ts = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt;
  if (!ts || isNaN(ts)) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Navbar notification bell. Polls every 60s. Shows unread badge + a dropdown
 * of the 5 most recent items with a "View all" link.
 */
export function NotificationBell() {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await NotificationService.list();
        // API may return array or { notifications: [] }
        const list = Array.isArray(data)
          ? data
          : (data as { notifications?: AppNotification[] })?.notifications || [];
        if (!cancelled) setItems(list);
      } catch {
        /* silent — bell shouldn't error in the user's face */
      }
    };

    // Poll rarely — public API rate limit is strict; list is cached on the client too
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      poll();
    }
    const id = setInterval(poll, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const unreadCount = items.filter((n) => !n.read).length;
  const recent = [...items]
    .sort((a, b) => {
      const aT = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
      const bT = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
      return (bT || 0) - (aT || 0);
    })
    .slice(0, 5);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="p-2 rounded-full border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-label={tCommon('notifications')}
      >
        <Bell className="size-4 pointer-events-none" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[var(--error)] text-white text-[9px] font-bold flex items-center justify-center pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Base UI requires GroupLabel inside Menu.Group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-4 py-3 flex items-center justify-between select-none">
            <span>{t('title')}</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold text-[var(--primary)]">
                {unreadCount} new
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="m-0" />
          {recent.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[var(--text-muted)]">{t('empty')}</p>
              <button
                type="button"
                onClick={() => go('/notifications')}
                className="mt-3 text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
              >
                {t('view_all')}
              </button>
            </div>
          ) : (
            <>
              {recent.map((item) => {
                const Icon = TYPE_ICON[item.type] || Bell;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    className="px-4 py-3 items-start gap-2.5 cursor-pointer"
                    onClick={() => go(item.linkUrl || '/notifications')}
                  >
                    <div
                      className={cn(
                        'size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        item.read
                          ? 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                          : 'bg-[var(--primary)]/15 text-[var(--primary)]'
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {item.title}
                      </p>
                      {item.body && (
                        <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                          {item.body}
                        </p>
                      )}
                      <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                        {timeAgoShort(item.createdAt)}
                      </p>
                    </div>
                    {!item.read && (
                      <span className="size-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator className="m-0" />
              <DropdownMenuItem
                className="px-4 py-2.5 justify-center text-xs font-bold text-[var(--primary)] cursor-pointer"
                onClick={() => go('/notifications')}
              >
                {t('view_all')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
