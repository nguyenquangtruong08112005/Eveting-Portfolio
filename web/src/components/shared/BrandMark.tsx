import Link from 'next/link';
import { Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { box: 'size-7', icon: 'size-3.5', text: 'text-sm' },
  md: { box: 'size-8', icon: 'size-4', text: 'text-xl' },
  lg: { box: 'size-9', icon: 'size-4.5', text: 'text-2xl' },
} as const;

/**
 * Eventing brand lockup: orange→teal gradient tile + wordmark.
 * Used in navbar, footer, auth screens, sidebar header.
 */
export function BrandMark({ size = 'md', asLink = false, href = '/', className }: BrandMarkProps) {
  const t = useTranslations('common');
  const s = sizeMap[size];
  const inner = (
    <span
      className={cn(
        'flex items-center gap-2.5 font-extrabold tracking-tight text-[var(--text-primary)] hover:opacity-90 transition-opacity',
        s.text,
        className
      )}
    >
      <span
        className={cn(
          s.box,
          'rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/15',
          'bg-gradient-to-br from-[var(--primary)] to-[var(--accent-brand)]'
        )}
        aria-hidden="true"
      >
        <Flame className={cn(s.icon, 'text-white')} />
      </span>
      <span className="select-none">
        {t('app_name')}
        {t('app_tagline') ? (
          <span className="text-[var(--primary)]">{t('app_tagline')}</span>
        ) : null}
      </span>
    </span>
  );

  if (asLink) {
    return (
      <Link href={href} className="shrink-0">
        {inner}
      </Link>
    );
  }
  return inner;
}
