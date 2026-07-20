'use client';

import { Crown, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Membership, MembershipTier } from '@/types';

interface MembershipCardProps {
  membership: Membership | null;
}

const TIER_COLORS: Record<MembershipTier, string> = {
  none: 'text-[var(--text-muted)]',
  bronze: 'text-[#CD7F32]',
  silver: 'text-[var(--text-secondary)]',
  gold: 'text-[var(--warning)]',
  platinum: 'text-[var(--accent-brand)]',
};

export function MembershipCard({ membership }: MembershipCardProps) {
  const t = useTranslations('profile');
  const tier = membership?.tier || 'none';
  const points = membership?.points || 0;
  const toNext = membership?.pointsToNextTier || 0;
  const pct = toNext > 0 ? Math.min(100, Math.round((points / toNext) * 100)) : 100;

  if (tier === 'none' || !membership) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl p-6 h-full flex flex-col items-center text-center justify-center">
        <div className="size-12 rounded-full bg-[var(--surface-hover)] flex items-center justify-center mb-3">
          <Crown className="size-6 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">{t('membership_title')}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-2 max-w-[220px]">{t('membership_no_tier')}</p>
        <p className="text-[11px] text-[var(--text-secondary)] mt-3 max-w-[220px] leading-relaxed">
          {t('membership_upgrade')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className={`size-5 ${TIER_COLORS[tier]}`} />
          <h3 className="text-base font-bold text-[var(--text-primary)]">{t('membership_title')}</h3>
        </div>
        <Badge className={`uppercase text-[9px] font-bold tracking-widest px-2 py-0.5 bg-[var(--surface-hover)] ${TIER_COLORS[tier]}`}>
          {tier}
        </Badge>
      </div>

      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-2xl font-black text-[var(--text-primary)]">{points.toLocaleString()}</span>
        <span className="text-xs text-[var(--text-muted)]">{t('membership_points')}</span>
      </div>

      {toNext > 0 && (
        <div className="mt-3 mb-4">
          <Progress value={pct} className="h-2" />
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
            {toNext - points < 0 ? 0 : (toNext - points).toLocaleString()} → next tier
          </p>
        </div>
      )}

      {membership.benefits && membership.benefits.length > 0 && (
        <div className="pt-4 border-t border-[var(--surface-border)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            {t('membership_benefits')}
          </p>
          <ul className="space-y-1.5">
            {membership.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <Sparkles className="size-3 text-[var(--primary)] shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
