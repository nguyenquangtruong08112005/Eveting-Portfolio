'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={cn(
          'p-2 rounded-full border border-[var(--surface-border)] text-[var(--text-muted)] cursor-default',
          className
        )}
        disabled
        aria-hidden="true"
      >
        <div className="size-4" />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'p-2 rounded-full border border-[var(--surface-border)]',
        'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        'transition-all cursor-pointer',
        className
      )}
      title={isDark ? t('theme_light') : t('theme_dark')}
      aria-label={isDark ? t('theme_light') : t('theme_dark')}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
