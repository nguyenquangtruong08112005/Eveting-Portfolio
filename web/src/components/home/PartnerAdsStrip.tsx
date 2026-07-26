'use client';

import { Gift, Sparkles, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PromoBanner } from '@/components/home/PromoBanner';
import { cn } from '@/lib/utils';

export type PartnerId = 'vib' | 'shopee' | 'hdbank';

interface PartnerAdsStripProps {
  className?: string;
  /** Single partner card to render */
  singlePartner?: PartnerId;
  /** Array of partner ids (renders the first partner as single card) */
  partners?: PartnerId[];
}

/**
 * Landing-style single partner advertise banner: ShopeePay, HDBank, or VIB.
 * Always visible (not dependent on promotions API).
 * Heading is removed entirely for clean inline category insertion.
 */
export function PartnerAdsStrip({
  className,
  singlePartner,
  partners,
}: PartnerAdsStripProps) {
  const t = useTranslations('home');

  const partnerToRender: PartnerId = singlePartner || (partners && partners[0]) || 'shopee';

  return (
    <div className={cn('w-full', className)}>
      {partnerToRender === 'vib' && (
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
      {partnerToRender === 'shopee' && (
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
      {partnerToRender === 'hdbank' && (
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
