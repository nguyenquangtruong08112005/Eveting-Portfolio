'use client';

import { useEffect, useState } from 'react';
import { Building2, Globe, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileService } from '@/services/profile.service';
import type { FeaturedProfile } from '@/types';
import { cn } from '@/lib/utils';

interface OrganizerCardProps {
  organizerId?: string;
  className?: string;
}

export function OrganizerCard({ organizerId, className }: OrganizerCardProps) {
  const t = useTranslations('event_detail');
  const [profile, setProfile] = useState<FeaturedProfile | null>(null);
  const [loading, setLoading] = useState(!!organizerId);

  useEffect(() => {
    if (!organizerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    ProfileService.getById(organizerId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizerId]);

  if (!organizerId) return null;

  const name = profile?.name || t('organizer_fallback');
  const initials = name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 space-y-3',
        className
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
        <Building2 className="size-3.5 text-[var(--primary)]" />
        {t('organizer_title')}
      </p>

      {loading ? (
        <div className="h-14 rounded-xl skeleton-shimmer" />
      ) : (
        <div className="flex items-start gap-3">
          <Avatar className="size-12 shrink-0">
            {profile?.imageUrl ? (
              <AvatarImage src={profile.imageUrl} alt={name} />
            ) : null}
            <AvatarFallback className="bg-[var(--primary)]/15 text-[var(--primary)] font-bold text-sm">
              {initials || 'OR'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{name}</h4>
            {profile?.bio ? (
              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-3">{profile.bio}</p>
            ) : (
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('organizer_no_bio')}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
              {profile?.followerCount != null && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" />
                  {t('followers', { count: profile.followerCount })}
                </span>
              )}
              {profile?.profileType && (
                <span className="inline-flex items-center gap-1 capitalize">
                  <Globe className="size-3" />
                  {profile.profileType}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
