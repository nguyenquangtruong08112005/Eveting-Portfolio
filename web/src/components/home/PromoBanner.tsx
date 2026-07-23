'use client';

import { cn } from '@/lib/utils';

export type PromoBannerVariant = 'vib' | 'shopee' | 'hdbank';

export interface PromoBannerProps {
  variant: PromoBannerVariant;
  icon: React.ReactNode;
  badge: string;
  title: string;
  highlight?: string;
  body: string;
  cta: string;
  className?: string;
  onCtaClick?: () => void;
}

const GRADIENTS: Record<PromoBannerVariant, string> = {
  vib: 'from-[#0C1938] to-[#122A5E]',
  shopee: 'from-[#2B1B0E] to-[#42220D]',
  hdbank: 'from-[#200A0A] to-[#3B1212]',
};

const BADGE_COLORS: Record<PromoBannerVariant, string> = {
  vib: 'bg-[var(--primary)] text-white',
  shopee: 'bg-[#FF7043] text-white',
  hdbank: 'bg-[#E31A1A] text-white',
};

/**
 * Partner advertise banner (VIB / ShopeePay / HDBank) — same look as landing page.
 */
export function PromoBanner({
  variant,
  icon,
  badge,
  title,
  highlight,
  body,
  cta,
  className,
  onCtaClick,
}: PromoBannerProps) {
  return (
    <section className={cn('max-w-7xl mx-auto px-4 sm:px-6 py-4 w-full', className)}>
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden bg-gradient-to-r border border-white/10 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl',
          GRADIENTS[variant]
        )}
      >
        <div className="flex items-center gap-5">
          <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={cn(
                  'text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase',
                  BADGE_COLORS[variant]
                )}
              >
                {badge}
              </span>
              <span className="text-white/60 text-xs font-semibold">| Eventing</span>
            </div>
            <h3 className="text-xl font-black text-white leading-tight">
              {title}{' '}
              {highlight ? <span className="text-[var(--primary)]">{highlight}</span> : null}
            </h3>
            <p className="text-white/70 text-xs mt-1">{body}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCtaClick}
          className="bg-[var(--primary)] text-[var(--on-primary)] font-black px-6 py-3 rounded-xl hover:bg-[var(--primary-dark)] active:scale-95 transition-all text-xs whitespace-nowrap btn-tactile cursor-pointer"
        >
          {cta}
        </button>
      </div>
    </section>
  );
}
