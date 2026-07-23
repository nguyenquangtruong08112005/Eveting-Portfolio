'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useLocaleState } from './Providers';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const locales = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { setLocale: setLocaleState } = useLocaleState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = locales.find((l) => l.code === locale) || locales[0];

  const switchLocale = (next: string) => {
    setLocaleState(next);
    router.replace(pathname, { locale: next });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-full cursor-pointer hover:border-[var(--primary)]/40 transition-all select-none"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <ChevronDown className={`size-3 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl shadow-xl overflow-hidden z-50">
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                l.code === locale
                  ? 'text-[var(--primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="text-base leading-none">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
