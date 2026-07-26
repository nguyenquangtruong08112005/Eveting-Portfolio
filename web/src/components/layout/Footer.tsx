'use client';

import { useTranslations } from 'next-intl';
import { Phone, Mail, MapPin } from 'lucide-react';
import { BrandMark } from '@/components/shared/BrandMark';

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4 fill-current">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4 fill-current">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 448 512" className="size-4 fill-current">
    <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a72.55,72.55,0,1,0,50.21,69.58V0h90.76a117.84,117.84,0,0,0,14,53,117.2,117.2,0,0,0,45.8,40.85,116.89,116.89,0,0,0,62.23,12.75Z" />
  </svg>
);

const AppStoreButton = ({ store }: { store: 'google' | 'apple' }) => {
  const t = useTranslations('footer');
  const isGoogle = store === 'google';
  return (
    <div className="flex items-center gap-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] px-3.5 py-1.5 rounded-xl cursor-pointer transition-all w-[145px] select-none">
      {isGoogle ? (
        <svg viewBox="0 0 512 512" className="size-5 fill-current shrink-0">
          <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58 33.3-60.1-60.1L472.2 35c16.3 9.3 26.5 26.5 26.5 45.4v290.7c0 18.9-10.2 36.1-26.5 45.4zM325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z" />
        </svg>
      ) : (
        <svg viewBox="0 0 384 512" className="size-5 fill-current shrink-0">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-48.7-22.7-79.4-22.0-39.3.6-78.2 22.6-94.6 51.4C-19.5 248 1.6 371.8 32.5 410.6c15.2 19.8 34.4 42.4 57.6 41.1 22.2-1.2 31.8-14.8 58.7-14.8 27 0 35.8 14.8 58.7 14.3 23.3-.5 40.1-20.5 55.4-41.1 17.6-24.3 24.8-47.8 25.2-49-.8-.3-48.4-18.6-48.9-72.4zM249.9 89.5c24-29 39.9-69.8 35.4-110.5-35.3 1.4-78.2 23.5-103.3 53-21.2 24.4-39.7 65.7-34.7 105.8 39.3 3.1 79.5-19.4 102.6-48.3z" />
        </svg>
      )}
      <div className="flex flex-col items-start leading-none">
        <span className="text-[7px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
          {isGoogle ? t('download_from') : t('download_on')}
        </span>
        <span className="text-[10px] font-black text-[var(--text-primary)] mt-0.5 whitespace-nowrap">
          {isGoogle ? 'Google Play' : 'App Store'}
        </span>
      </div>
    </div>
  );
};

export function Footer() {
  const t = useTranslations('footer');
  const policies = t.raw('policies') as string[];

  return (
    <footer className="w-full border-t border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-secondary)] no-print">
      {/* ── Top Footer Row ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Hotline, Email, Address */}
        <div className="space-y-5">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('hotline')}</h4>
            <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
              <Phone className="size-3" /> {t('hotline_hours')}
            </p>
            <p className="text-xl font-black text-[var(--primary)] tracking-wide">{process.env.NEXT_PUBLIC_HOTLINE}</p>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('email')}</h4>
            <p className="text-xs text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors flex items-center gap-1.5">
              <Mail className="size-3" /> {process.env.NEXT_PUBLIC_EMAIL}
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('office')}</h4>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed flex items-start gap-1.5">
              <MapPin className="size-3 mt-0.5 shrink-0" />
              <span>{t('office_address')}</span>
            </p>
          </div>
        </div>

        {/* Center Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('for_customers')}</h4>
            <p className="text-xs text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors cursor-pointer select-none">
              {t('customer_terms')}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('for_organizers')}</h4>
            <p className="text-xs text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors cursor-pointer select-none">
              {t('organizer_terms')}
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">{t('about_company')}</h4>
          <ul className="space-y-2 text-xs text-[var(--text-primary)]">
            {policies.map((policy: string) => (
              <li
                key={policy}
                className="hover:text-[var(--primary)] transition-colors cursor-pointer select-none"
              >
                {policy}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Middle Footer Row ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-[var(--surface-border)] pt-8">
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('customer_app')}</h4>
          <div className="flex gap-2.5">
            <AppStoreButton store="google" />
            <AppStoreButton store="apple" />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('organizer_app')}</h4>
          <div className="flex gap-2.5">
            <AppStoreButton store="google" />
            <AppStoreButton store="apple" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">{t('follow_us')}</h4>
            <div className="flex gap-2.5 text-[var(--text-muted)]">
              <a href={process.env.NEXT_PUBLIC_FACEBOOK_URL || '#'} aria-label="Facebook" className="p-2.5 rounded-full bg-[var(--background)] hover:bg-[#1877F2] hover:text-white transition-all"><FacebookIcon /></a>
              <a href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#'} aria-label="Instagram" className="p-2.5 rounded-full bg-[var(--background)] hover:bg-[#E4405F] hover:text-white transition-all flex items-center justify-center"><InstagramIcon /></a>
              <a href={process.env.NEXT_PUBLIC_TIKTOK_URL || '#'} aria-label="TikTok" className="p-2.5 rounded-full bg-[var(--background)] hover:bg-black hover:text-white transition-all flex items-center justify-center"><TikTokIcon /></a>
              <a href={process.env.NEXT_PUBLIC_LINKEDIN_URL || '#'} aria-label="LinkedIn" className="p-2.5 rounded-full bg-[var(--background)] hover:bg-[#0A66C2] hover:text-white transition-all"><LinkedInIcon /></a>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">{t('language')}</h4>
            <div className="flex gap-2">
              <LanguageBadge locale="vi" active />
              <LanguageBadge locale="en" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Footer with Truthful Portfolio Demo Disclaimer ── */}
      <div className="w-full bg-[var(--background)] border-t border-[var(--surface-border)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-[var(--text-muted)] text-[10px]">
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
            <BrandMark asLink href="/" size="sm" />
            <p className="text-[var(--text-muted)] text-[10px]">
              {t('platform_tagline')}
            </p>
            <p className="text-[var(--text-muted)] text-[10px]">
              {t('copyright')}
            </p>
          </div>

          <div className="text-[var(--text-muted)] text-[10px] text-center md:text-left max-w-md leading-relaxed">
            <p className="font-bold text-[var(--text-secondary)] mb-0.5">{t('demo_notice_title')}</p>
            <p className="text-[var(--text-muted)]">{t('demo_notice_body')}</p>
          </div>

          <div className="shrink-0">
            <div className="inline-flex items-center gap-2 bg-[var(--surface)] border border-[var(--surface-border)] px-4 py-2 rounded-xl text-[var(--text-muted)] text-[10px] select-none shrink-0 shadow-sm">
              <div className="flex flex-col leading-tight text-left">
                <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[9px]">
                  {t('demo_notice_title')}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">
                  Portfolio Showcase
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LanguageBadge({ locale, active }: { locale: string; active?: boolean }) {
  const flags: Record<string, string> = { vi: '🇻🇳', en: '🇬🇧' };
  const labels: Record<string, string> = { vi: 'Tiếng Việt', en: 'English' };
  return (
    <button
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer select-none ${
        active
          ? 'bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--text-primary)]'
          : 'bg-[var(--background)]/40 border border-[var(--surface-border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
      }`}
    >
      <span className="text-base leading-none">{flags[locale]}</span>
      {labels[locale]}
    </button>
  );
}
