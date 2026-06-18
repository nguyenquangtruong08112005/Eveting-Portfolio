'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, User, Shield, LayoutDashboard, LogIn, Menu } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavbarProps {
  userToken?: string | null;
  userRole?: string | null;
  onLogout?: () => void;
  isAdminPage?: boolean;
  isOrganizerPage?: boolean;
}

export function Navbar({
  userToken,
  userRole,
  onLogout,
  isAdminPage = false,
  isOrganizerPage = false,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--surface-border)] bg-[var(--background)]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-[var(--text-primary)] hover:opacity-90 transition-opacity"
        >
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#F76B10] to-[#FF9C5B] flex items-center justify-center">
            <Flame className="size-4 text-[var(--on-primary)]" />
          </div>
          <span>
            Aura<span className="text-[var(--primary-dark)]">Events</span>
          </span>
          {isAdminPage && (
            <Badge className="ml-1 uppercase text-[9px] font-bold tracking-widest px-2 py-0.5 bg-[var(--error)]/15 text-[var(--error)] border-[var(--error)]/30">
              Admin
            </Badge>
          )}
          {isOrganizerPage && (
            <Badge className="ml-1 uppercase text-[9px] font-bold tracking-widest px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary-dark)] border-[var(--primary)]/30">
              Organizer
            </Badge>
          )}
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/60 rounded-lg transition-all"
          >
            Trang chủ
          </Link>
          {userRole === 'organizer' && (
            <Link
              href="/organizer/dashboard"
              className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary-dark)] hover:bg-[var(--primary)]/5 rounded-lg transition-all flex items-center gap-1.5"
            >
              <LayoutDashboard className="size-3.5" />
              Dashboard
            </Link>
          )}
          {userRole === 'admin' && (
            <Link
              href="/admin/moderation"
              className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error)]/5 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Shield className="size-3.5" />
              Kiểm duyệt
            </Link>
          )}
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-3">
          {userToken ? (
            <>
              <Badge className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--surface-border)] text-xs text-[var(--text-secondary)] font-medium capitalize">
                <User className="size-3.5 text-[var(--primary-dark)]" />
                <span>{userRole || 'Attendee'}</span>
              </Badge>
              {onLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="rounded-lg font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] border-[var(--surface-border)] cursor-pointer btn-tactile"
                >
                  Đăng xuất
                </Button>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "btn-primary-gradient rounded-lg font-semibold cursor-pointer flex items-center gap-1.5 btn-tactile px-4 border-none"
              )}
            >
              <LogIn className="size-3.5" />
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
