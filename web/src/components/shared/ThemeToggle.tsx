'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-full border border-white/10 text-zinc-400 cursor-default" disabled>
        <div className="size-4" />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-full border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
      title={isDark ? t('theme_light') : t('theme_dark')}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
