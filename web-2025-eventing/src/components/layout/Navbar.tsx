'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, User, Shield, Compass, LogIn } from 'lucide-react';
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
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white hover:opacity-90 transition-all">
          <Sparkles className="h-6 w-6 text-purple-400 glow-text" />
          <span>
            Aura<span className="text-purple-400">Events</span>
          </span>
          {isAdminPage && (
            <Badge variant="destructive" className="ml-2 uppercase text-[9px] font-bold tracking-widest px-2.5">
              Admin
            </Badge>
          )}
          {isOrganizerPage && (
            <Badge variant="secondary" className="ml-2 uppercase text-[9px] font-bold tracking-widest px-2.5 border-purple-500/30 bg-purple-500/5 text-purple-300">
              Organizer
            </Badge>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          <Link href="/" className="text-zinc-300 hover:text-white transition-colors">
            Home
          </Link>
          {userRole === 'organizer' && (
            <Link href="/organizer/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-purple-400" /> Organizer Dashboard
            </Link>
          )}
          {userRole === 'admin' && (
            <Link href="/admin/moderation" className="hover:text-white transition-colors flex items-center gap-1.5 text-purple-300">
              <Shield className="h-4 w-4" /> Admin Moderation
            </Link>
          )}
          {userToken && userRole !== 'admin' && userRole !== 'organizer' && (
            <Link href="/attendee/events/evt_1" className="hover:text-white transition-colors flex items-center gap-1.5 text-cyan-400">
              <Compass className="h-4 w-4" /> Seat Holds Pilot
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {userToken ? (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-purple-500/30 bg-purple-500/5 text-xs text-purple-300 font-normal capitalize">
                <User className="h-3.5 w-3.5" />
                <span>{userRole || 'Attendee'}</span>
              </Badge>
              {onLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="rounded-xl font-semibold text-zinc-300 hover:text-white cursor-pointer"
                >
                  Log out
                </Button>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "bg-white text-black hover:bg-zinc-200 border-none rounded-xl font-semibold cursor-pointer flex items-center gap-1.5"
              )}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
