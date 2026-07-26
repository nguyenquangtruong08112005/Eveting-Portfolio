'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  Ticket,
  PlusCircle,
  LogOut,
  Menu,
  User as UserIcon,
  Shield,
  LayoutDashboard,
  Bell,
} from 'lucide-react';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { BrandMark } from '@/components/shared/BrandMark';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/user.service';
import { CATEGORY_KEYS } from '@/lib/constants';
import { SearchBarDropdown } from '@/components/search/SearchBarDropdown';

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
  const auth = useAuth();
  const t = useTranslations('common');
  const navT = useTranslations('navbar');

  const isAuthenticated = userToken !== undefined ? !!userToken : auth.isAuthenticated;
  const role = userRole !== undefined ? userRole : auth.role;
  const handleLogout = onLogout !== undefined ? onLogout : auth.logout;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  // Load user avatar for top-right account dropdown
  useEffect(() => {
    if (!isAuthenticated) {
      setAvatarUrl(null);
      setDisplayName('');
      return;
    }
    let cancelled = false;
    UserService.getMe()
      .then((me) => {
        if (cancelled) return;
        setAvatarUrl(me.profilePicUrl || null);
        setDisplayName(me.name || me.email || '');
      })
      .catch(() => {
        if (!cancelled) {
          setAvatarUrl(null);
          setDisplayName('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const roleLabel =
    role === 'organizer'
      ? t('org_badge')
      : role === 'admin'
        ? t('admin_badge')
        : t('attendee_badge');

  const initials =
    displayName
      .split(' ')
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || (role === 'admin' ? 'AD' : role === 'organizer' ? 'OR' : 'U');

  const categoryTabs = CATEGORY_KEYS.map((key) => ({
    label: navT(`categories.${key}`),
    category: key,
  }));

  const handleCategoryClick = (category: string) => {
    router.push(`/search?category=${encodeURIComponent(category)}`);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--surface-border)] bg-[var(--background)]/85 backdrop-blur-xl">
      {/* ── Top Row ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand + role badges */}
        <div className="flex items-center gap-2">
          <BrandMark asLink href="/" size="md" />
          {isAdminPage && (
            <Badge className="uppercase text-[9px] font-bold tracking-widest px-2 py-0.5 bg-[var(--error)]/15 text-[var(--error)] border-[var(--error)]/30">
              {t('admin_badge')}
            </Badge>
          )}
          {isOrganizerPage && (
            <Badge className="uppercase text-[9px] font-bold tracking-widest px-2 py-0.5 bg-[var(--accent-brand)]/15 text-[var(--accent-brand)] border-[var(--accent-brand)]/30">
              {t('org_badge')}
            </Badge>
          )}
        </div>

        {/* Search bar + suggest dropdown (desktop) */}
        <div className="flex-1 max-w-lg relative hidden md:flex items-center">
          <SearchBarDropdown />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Create Event Link (desktop) */}
          <Link
            href={role === 'organizer' ? '/organizer/dashboard' : '/register?role=organizer'}
            className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--surface-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all"
          >
            <PlusCircle className="size-3.5 text-[var(--primary)]" />
            {t('create_event')}
          </Link>

          {/* Tickets Link */}
          {isAuthenticated && (
            <Link
              href="/my-tickets"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
            >
              <Ticket className="size-3.5 text-[var(--primary)]" />
              {t('my_tickets')}
            </Link>
          )}

          {/* Admin moderation shortcut */}
          {role === 'admin' && (
            <Link
              href="/admin/moderation"
              className="hidden lg:flex items-center gap-1 px-3 py-2 rounded-full bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/25 text-xs font-bold hover:bg-[var(--error)]/20 transition-all"
            >
              <Shield className="size-3.5" />
              {t('moderation')}
            </Link>
          )}

          {/* Notification bell */}
          {isAuthenticated && (
            <div className="hidden sm:block">
              <NotificationBell />
            </div>
          )}

          <ThemeToggle />
          <LanguageSwitcher />

          {/* Auth */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'p-1.5 rounded-full border border-[var(--surface-border)]',
                  'hover:bg-[var(--surface-hover)] transition-all cursor-pointer select-none flex items-center gap-2 pl-2.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]'
                )}
                aria-label={t('account')}
              >
                <span className="hidden sm:inline text-xs font-bold text-[var(--text-secondary)] capitalize select-none">
                  {roleLabel}
                </span>
                <Avatar className="size-7 border border-[var(--primary)]/25 pointer-events-none">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={displayName || roleLabel} />
                  ) : null}
                  <AvatarFallback className="bg-[var(--primary)]/15 text-[var(--primary)] text-[10px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Base UI requires GroupLabel inside Menu.Group */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="select-none">
                    <div className="flex items-center gap-2.5 py-0.5">
                      <Avatar className="size-8 shrink-0">
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} alt={displayName || roleLabel} />
                        ) : null}
                        <AvatarFallback className="bg-[var(--primary)]/15 text-[var(--primary)] text-[10px] font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {displayName || roleLabel}
                        </p>
                        <p className="text-[10px] font-semibold text-[var(--text-muted)] capitalize">
                          {roleLabel}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/my-tickets')}
                  >
                    <Ticket className="size-4" />
                    {t('my_tickets')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/profile')}
                  >
                    <UserIcon className="size-4" />
                    {t('my_profile')}
                  </DropdownMenuItem>
                  {role === 'organizer' && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => router.push('/organizer/dashboard')}
                    >
                      <LayoutDashboard className="size-4" />
                      {t('org_dashboard')}
                    </DropdownMenuItem>
                  )}
                  {role === 'admin' && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => router.push('/admin/moderation')}
                    >
                      <Shield className="size-4" />
                      {t('moderation')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-[var(--error)] focus:text-[var(--error)]"
                  >
                    <LogOut className="size-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'btn-primary-gradient rounded-xl font-bold cursor-pointer flex items-center gap-1.5 btn-tactile px-4 py-2 border-none text-xs'
              )}
            >
              {t('login_register')}
            </Link>
          )}

          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="md:hidden p-2 rounded-lg border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-all cursor-pointer"
              aria-label={t('open_menu')}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0">
              <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--surface-border)]">
                <SheetTitle className="flex items-center justify-between">
                  <BrandMark size="sm" />
                </SheetTitle>
              </SheetHeader>

              {/* Mobile search dropdown */}
              <div className="px-5 py-4 border-b border-[var(--surface-border)]">
                <SearchBarDropdown compact onNavigate={() => setMobileOpen(false)} />
              </div>

              {/* Mobile nav */}
              <nav className="px-5 py-4 flex flex-col gap-1">
                {isAuthenticated && (
                  <>
                    <Link
                      href="/my-tickets"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
                    >
                      <Ticket className="size-4 text-[var(--primary)]" />
                      {t('my_tickets')}
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
                    >
                      <UserIcon className="size-4 text-[var(--primary)]" />
                      {t('my_profile')}
                    </Link>
                    <Link
                      href="/notifications"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
                    >
                      <Bell className="size-4 text-[var(--primary)]" />
                      {t('notifications')}
                    </Link>
                  </>
                )}
                <Link
                  href={role === 'organizer' ? '/organizer/dashboard' : '/register?role=organizer'}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
                >
                  <PlusCircle className="size-4 text-[var(--primary)]" />
                  {t('create_event')}
                </Link>
                {role === 'admin' && (
                  <Link
                    href="/admin/moderation"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--error)] hover:bg-[var(--error)]/10 transition-all"
                  >
                    <Shield className="size-4" />
                    {t('moderation')}
                  </Link>
                )}

                <div className="mt-2 pt-3 border-t border-[var(--surface-border)]">
                  <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t('categories_label')}
                  </p>
                  {categoryTabs.map((tab) => (
                    <button
                      key={tab.category}
                      onClick={() => handleCategoryClick(tab.category)}
                      className="w-full text-left flex items-center px-3 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                    className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--error)] hover:bg-[var(--error)]/10 transition-all"
                  >
                    <LogOut className="size-4" />
                    {t('logout')}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      buttonVariants({ variant: 'default', size: 'sm' }),
                      'btn-primary-gradient rounded-xl font-bold cursor-pointer flex items-center justify-center gap-1.5 btn-tactile mt-3 py-2.5 border-none text-sm'
                    )}
                  >
                    {t('login_register')}
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Bottom Row (Category Links) ── */}
      <div className="w-full border-t border-[var(--surface-border)] bg-[var(--surface)]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-5 overflow-x-auto scrollbar-hide text-xs font-semibold text-[var(--text-muted)] h-10">
          {categoryTabs.map((tab) => (
            <Link
              key={tab.category}
              href={`/search?category=${encodeURIComponent(tab.category)}`}
              className="hover:text-[var(--primary)] transition-colors whitespace-nowrap"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export function Navbar(props: NavbarProps) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 w-full border-b border-[var(--surface-border)] bg-[var(--background)] h-16 flex items-center justify-between px-4 sm:px-6">
          <BrandMark size="md" />
        </header>
      }
    >
      <NavbarContent {...props} />
    </Suspense>
  );
}
