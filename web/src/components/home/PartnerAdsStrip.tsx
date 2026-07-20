'use client';

import { Gift, Sparkles, Ticket, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PromoBanner } from '@/components/home/PromoBanner';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { cn } from '@/lib/utils';

interface PartnerAdsStripProps {
  className?: string;
  /** Which partner banners to show */
  partners?: Array<'vib' | 'shopee' | 'hdbank'>;
  showHeading?: boolean;
}

/**
 * Landing-style partner advertise badges: ShopeePay, HDBank, VIB.
 * Always visible (not dependent on promotions API).
 */
export function PartnerAdsStrip({
  className,
  partners = ['shopee', 'hdbank'],
  showHeading = true,
}: PartnerAdsStripProps) {
  const t = useTranslations('home');
  const tDetail = useTranslations('event_detail');

  return (
    <div className={cn('w-full', className)}>
      {showHeading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 w-full">
          <SectionHeading title={tDetail('advertise_title')} icon={Tag} />
        </div>
      ) : null}

      {partners.includes('vib') && (
        <PromoBanner
          variant="vib"
          icon={<Ticket className="size-7 text-[var(--primary)]" />}
          badge="VIB Partner"
          title={t('promo_vib_title')}
          highlight="500K"
          body={t('promo_vib_body')}
          cta={t('promo_vib_cta')}
        />
      )}
      {partners.includes('shopee') && (
        <PromoBanner
          variant="shopee"
          icon={<Gift className="size-7 text-[var(--primary)]" />}
          badge="ShopeePay"
          title={t('promo_shopee_title')}
          highlight="40.000Đ"
          body={t('promo_shopee_body')}
          cta={t('promo_shopee_cta')}
        />
      )}
      {partners.includes('hdbank') && (
        <PromoBanner
          variant="hdbank"
          icon={<Sparkles className="size-7 text-[var(--primary)]" />}
          badge="HDBank"
          title={t('promo_hd_title')}
          body={t('promo_hd_body')}
          cta={t('promo_hd_cta')}
        />
      )}
    </div>
  );
}
