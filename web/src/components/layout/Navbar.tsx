'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Flame, User, Shield, LogIn, Search, Ticket, PlusCircle, LogOut } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

import { useAuth } from '@/hooks/useAuth';

interface NavbarProps {
  userToken?: string | null;
  userRole?: string | null;
  onLogout?: () => void;
  isAdminPage?: boolean;
  isOrganizerPage?: boolean;
}

function NavbarContent({
  userToken,
  userRole,
  onLogout,
  isAdminPage = false,
  isOrganizerPage = false,
}: NavbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const t = useTranslations('common');
  const navT = useTranslations('navbar');

  const token = userToken !== undefined ? userToken : auth.token;
  const role = userRole !== undefined ? userRole : auth.role;
  const handleLogout = onLogout !== undefined ? onLogout : auth.logout;

  const [searchVal, setSearchVal] = useState('');

  const categoryTabs: { label: string; category: string }[] = [
    { label: navT('categories.music'), category: 'Âm nhạc' },
    { label: navT('categories.arts'), category: 'Nghệ thuật' },
    { label: navT('categories.sports'), category: 'Thể thao' },
    { label: navT('categories.workshop'), category: 'Nightlife' },
    { label: navT('categories.tours'), category: 'Tất cả' },
    { label: navT('categories.other'), category: 'Công nghệ' },
  ];

  useEffect(() => {
    if (searchParams) {
      setSearchVal(searchParams.get('q') || '');
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/?q=${encodeURIComponent(searchVal)}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--surface-border)] bg-[var(--background)]/90 backdrop-blur-xl">
      {/* ── Top Row ── */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-[var(--text-primary)] hover:opacity-90 transition-opacity shrink-0"
        >
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#FF8F66] to-[#FF7043] flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="size-4 text-[#12141A]" />
          </div>
          <span>
            {t('app_name')}<span className="text-[var(--primary)]">{t('app_tagline')}</span>
          </span>
          {isAdminPage && (
            <Badge className="ml-1 uppercase text-[9px] font-bold tracking-widest px-2 py-0.5 bg-[var(--error)]/15 text-[var(--error)] border-[var(--error)]/30">
              {t('admin_badge')}
            </Badge>
          )}
          {isOrganizerPage && (
            <Badge className="ml-1 uppercase text-[9px] font-bold tracking-widest px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30">
              {t('org_badge')}
            </Badge>
          )}
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg relative hidden md:flex items-center">
          <div className="relative w-full flex items-center bg-[var(--surface)] border border-[var(--surface-border)] rounded-full overflow-hidden focus-within:border-[var(--primary)] transition-all">
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-5 pr-28 py-2 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none border-none"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Search className="size-3" />
              {t('search_button')}
            </button>
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Create Event Link */}
          <Link
            href={role === 'organizer' ? '/organizer/dashboard' : '/register?role=organizer'}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--surface-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all"
          >
            <PlusCircleIcon />
            {t('create_event')}
          </Link>

          {/* Tickets Link */}
          {token && (
            <Link
              href="/my-tickets"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
            >
              <Ticket className="size-3.5 text-[var(--primary)]" />
              {t('my_tickets')}
            </Link>
          )}

          {/* Dashboards for specific roles */}
          {role === 'admin' && (
            <Link
              href="/admin/moderation"
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/25 text-xs font-bold hover:bg-[var(--error)]/20 transition-all"
            >
              <Shield className="size-3.5" />
              {t('moderation')}
            </Link>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Auth Button */}
          {token ? (
            <div className="flex items-center gap-2">
              <Badge className="hidden lg:flex items-center gap-1 px-3 py-1 bg-[var(--surface)] border border-[var(--surface-border)] text-xs text-[var(--text-secondary)] font-medium capitalize">
                <User className="size-3 text-[var(--primary)]" />
                <span>{role || 'Attendee'}</span>
              </Badge>
              {handleLogout && (
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  title={t('logout')}
                >
                  <LogOut className="size-4" />
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'btn-primary-gradient rounded-xl font-bold cursor-pointer flex items-center gap-1.5 btn-tactile px-4 py-1.5 border-none text-xs'
              )}
            >
              <LogIn className="size-3.5" />
              {t('login_register')}
            </Link>
          )}
        </div>
      </div>

      {/* ── Bottom Row (Category Links) ── */}
      <div className="w-full border-t border-[var(--surface-border)] bg-[var(--background)]/95 py-2">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 overflow-x-auto scrollbar-hide text-xs font-semibold text-[var(--text-muted)]">
          {categoryTabs.map((tab, idx) => {
            const href = `/?category=${encodeURIComponent(tab.category || '')}`;
            return (
              <Link
                key={idx}
                href={href}
                className="hover:text-[var(--primary)] transition-colors whitespace-nowrap"
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function PlusCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-[var(--primary)]">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function Navbar(props: NavbarProps) {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 w-full border-b border-[var(--surface-border)] bg-[var(--background)] h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-[var(--text-primary)]">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#FF8F66] to-[#FF7043] flex items-center justify-center">
            <Flame className="size-4 text-[#12141A]" />
          </div>
          <span>Event<span className="text-[var(--primary)]">ing</span></span>
        </div>
      </header>
    }>
      <NavbarContent {...props} />
    </Suspense>
  );
}
