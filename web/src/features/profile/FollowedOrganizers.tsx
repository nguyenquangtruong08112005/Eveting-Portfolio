'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SectionHeading } from '@/components/shared/SectionHeading';
import type { FeaturedProfile } from '@/types';
import { cn } from '@/lib/utils';

interface FollowedOrganizersProps {
  organizers: FeaturedProfile[];
  followedIds: Set<string>;
  onToggleFollow: (org: FeaturedProfile) => void;
}

export function FollowedOrganizers({
  organizers,
  followedIds,
  onToggleFollow,
}: FollowedOrganizersProps) {
  const t = useTranslations('profile');

  if (organizers.length === 0) return null;

  return (
    <section>
      <SectionHeading title={t('organizers_title')} icon={Users} />
      <p className="text-xs text-[var(--text-muted)] -mt-4 mb-5">{t('organizers_subtitle')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizers.map((org) => {
          const isFollowed = followedIds.has(org.id);
          const initials = (org.name || '?')
            .split(' ')
            .map((s) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
          return (
            <div
              key={org.id}
              className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl p-4 flex items-center gap-3"
            >
              <Avatar size="lg" className="size-12 shrink-0">
                {org.imageUrl ? <AvatarImage src={org.imageUrl} alt={org.name} /> : null}
                <AvatarFallback className="bg-[var(--accent-brand)]/15 text-[var(--accent-brand)] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{org.name}</p>
                {org.followerCount !== undefined && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {org.followerCount.toLocaleString()} followers
                  </p>
                )}
                {org.genres && org.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {org.genres.slice(0, 2).map((g) => (
                      <Badge key={g} variant="secondary" className="text-[9px] px-1.5 py-0">
                        {g}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={() => onToggleFollow(org)}
                variant={isFollowed ? 'secondary' : 'default'}
                size="sm"
                className={cn(
                  'rounded-full text-xs font-bold shrink-0 btn-tactile',
                  !isFollowed && 'btn-primary-gradient text-[var(--on-primary)] border-none'
                )}
              >
                {isFollowed ? t('following') : t('follow')}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
