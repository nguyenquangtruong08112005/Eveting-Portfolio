'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RefreshCw, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ORG_NAV } from '@/features/organizer/nav';
import { useOrganizerWorkspace } from '@/features/organizer/OrganizerWorkspace';
import { cn } from '@/lib/utils';

const suiteLinks = [
  { href: '/organizer/team', label: 'Team', icon: Users },
  { href: '/organizer/artists', label: 'Artist studio', icon: Sparkles },
];

export function OrganizerShell({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const {
    teams,
    activeTeam,
    activeTeamId,
    teamRole,
    loading,
    endpointAvailable,
    selectTeam,
    refreshTeams,
  } = useOrganizerWorkspace();

  return (
    <AppShell variant="organizer" items={ORG_NAV} heading={tCommon('org_badge')}>
      <div className="border-b border-[var(--surface-border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ShieldCheck className="size-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
            <select
              aria-label="Organizer team"
              value={activeTeamId || ''}
              onChange={(event) => selectTeam(event.target.value)}
              disabled={loading || teams.length < 2}
              className="h-9 min-w-48 max-w-full rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 text-xs font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {teams.length > 0 ? (
                teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))
              ) : (
                <option value="">Current organizer</option>
              )}
            </select>
            <Badge className="border border-[var(--surface-border)] bg-[var(--background)] text-[10px] text-[var(--text-secondary)]">
              {activeTeam?.role || teamRole}
            </Badge>
            {!endpointAvailable && (
              <span className="text-[11px] text-[var(--warning)]">
                Multi-team service unavailable
              </span>
            )}
            {!endpointAvailable && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={() => void refreshTeams()}
                aria-label="Retry team service"
                title="Retry team service"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            )}
          </div>

          <nav aria-label="Organizer business suite" className="flex items-center gap-1 overflow-x-auto">
            {suiteLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors',
                    active
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </AppShell>
  );
}
