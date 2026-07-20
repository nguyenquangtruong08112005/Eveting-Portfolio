'use client';

import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PromoBanner } from '@/components/home/PromoBanner';
import { cn } from '@/lib/utils';

interface EventAdBannerProps {
  eventId?: string;
  className?: string;
}

/**
 * Single partner advertise banner on event detail (no section title).
 * Same style as landing ShopeePay promo.
 */
export function EventAdBanner({ className }: EventAdBannerProps) {
  const t = useTranslations('home');

  return (
    <div className={cn('w-full', className)}>
      <PromoBanner
        variant="shopee"
        icon={<Gift className="size-7 text-[var(--primary)]" />}
        badge="ShopeePay"
        title={t('promo_shopee_title')}
        highlight="40.000Đ"
        body={t('promo_shopee_body')}
        cta={t('promo_shopee_cta')}
      />
    </div>
  );
}
