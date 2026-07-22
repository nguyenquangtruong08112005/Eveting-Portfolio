'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, LogOut, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { BrandMark } from '@/components/shared/BrandMark';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** Optional badge content (e.g. pending count) */
  badge?: number;
}

interface AppShellProps {
  /** Which role this shell is for — drives the brand label and home route */
  variant: 'organizer' | 'admin';
  /** Sidebar navigation items */
  items: NavItem[];
  /** Label for the shell / sidebar heading */
  heading: string;
  children: React.ReactNode;
}

/**
 * Sidebar application shell for organizer & admin surfaces.
 * Sticky sidebar on desktop (>= lg), Sheet drawer on mobile.
 * Uses --sidebar-* tokens so it themes correctly in light & dark.
 */
export function AppShell({ variant, items, heading, children }: AppShellProps) {
  const t = useTranslations('common');
  const pathname = usePathname();
  const { role, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const homeHref = variant === 'admin' ? '/admin/moderation' : '/organizer/dashboard';
  const roleBadgeClass =
    variant === 'admin'
      ? 'bg-[var(--error)]/15 text-[var(--error)] border-[var(--error)]/30'
      : 'bg-[var(--accent-brand)]/15 text-[var(--accent-brand)] border-[var(--accent-brand)]/30';

  const SidebarBody = (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="h-16 flex items-center px-5 border-b border-[var(--sidebar-border)] shrink-0">
        <Link href={homeHref} className="flex items-center gap-2">
          <BrandMark size="sm" />
          <Badge className={cn('uppercase text-[8px] font-bold tracking-widest px-1.5 py-0.5', roleBadgeClass)}>
            {variant === 'admin' ? t('admin_badge') : t('org_badge')}
          </Badge>
        </Link>
      </div>

      {/* Sidebar nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {heading}
        </p>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                active
                  ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-accent)]/50 hover:text-[var(--text-primary)]'
              )}
            >
              <Icon
                className={cn(
                  'size-4 shrink-0',
                  active ? 'text-[var(--sidebar-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                )}
              />
              <span className="flex-1 truncate">{t(item.labelKey)}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge className="bg-[var(--primary)] text-[var(--on-primary)] text-[9px] px-1.5 py-0">
                  {item.badge}
                </Badge>
              )}
              {active && <ChevronRight className="size-3.5 text-[var(--sidebar-primary)]" />}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar footer */}
      <div className="border-t border-[var(--sidebar-border)] p-3 space-y-2 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--text-primary)] transition-all"
        >
          <LogOut className="size-4 rotate-180" />
          {t('back_to_site')}
        </Link>
        <div className="flex items-center justify-between px-3 pt-1">
          <span className="text-[10px] text-[var(--text-muted)] capitalize">{role}</span>
          <button
            onClick={logout}
            className="text-[10px] text-[var(--error)] hover:underline font-semibold cursor-pointer"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] flex-col z-30">
        {SidebarBody}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 h-16 flex items-center justify-between px-4 bg-[var(--sidebar)] border-b border-[var(--sidebar-border)]">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="p-2 rounded-lg hover:bg-[var(--sidebar-accent)] text-[var(--text-secondary)] cursor-pointer"
            aria-label={t('open_menu')}
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-[var(--sidebar)]">
            <SheetHeader className="sr-only">
              <SheetTitle>{heading}</SheetTitle>
            </SheetHeader>
            {SidebarBody}
          </SheetContent>
        </Sheet>
        <BrandMark size="sm" />
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Desktop top utility bar */}
      <div className="hidden lg:flex sticky top-0 lg:ml-64 h-16 items-center justify-end px-6 gap-3 bg-[var(--background)]/85 backdrop-blur-xl border-b border-[var(--surface-border)] z-20">
        <NotificationBell />
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      {/* Main content */}
      <main className="lg:ml-64 flex-1">{children}</main>
    </div>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === pathname) return true;
  // Treat nested routes under a section as active (e.g. /organizer/events/123 → /organizer/events)
  return pathname.startsWith(href + '/');
}
