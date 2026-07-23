'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ExternalLink, Loader2, Maximize2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ADMIN_NAV } from '@/features/admin/nav';
import { cn } from '@/lib/utils';

type StackStatus = 'checking' | 'up' | 'down';

const DEFAULT_GRAFANA = 'http://localhost:3301';
/** kiosk=tv hides chrome; theme=dark for ops console look */
const DEFAULT_DASHBOARD =
  '/d/eventing-backend/eventing-platform-sre?orgId=1&kiosk=tv&theme=dark&refresh=10s';

function grafanaBase(): string {
  return process.env.NEXT_PUBLIC_GRAFANA_URL?.replace(/\/$/, '') || DEFAULT_GRAFANA;
}

function dashboardPath(): string {
  return process.env.NEXT_PUBLIC_GRAFANA_DASHBOARD_PATH || DEFAULT_DASHBOARD;
}

export function ObservabilityView() {
  const t = useTranslations('observability');
  const tCommon = useTranslations('common');
  const base = useMemo(() => grafanaBase(), []);
  const path = useMemo(() => dashboardPath(), []);
  const iframeSrc = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const [status, setStatus] = useState<StackStatus>('checking');
  const [iframeKey, setIframeKey] = useState(0);

  const checkHealth = useCallback(async () => {
    setStatus('checking');
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      await fetch(`${base}/api/health`, {
        mode: 'no-cors',
        signal: ctrl.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      setStatus('up');
    } catch {
      setStatus('down');
    }
  }, [base]);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  return (
    <AppShell variant="admin" items={ADMIN_NAV} heading={tCommon('admin_badge')}>
      {/* Full-bleed ops console — no demo banners / install instructions */}
      <div className="flex flex-col h-[calc(100vh-0px)] min-h-[640px] w-full">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--surface-border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
              <Activity className="size-4 text-[var(--primary)]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-[var(--text-primary)] tracking-tight truncate">
                {t('title')}
              </h1>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{t('subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={status} t={t} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg h-8 text-[10px] gap-1.5"
              onClick={() => {
                void checkHealth();
                setIframeKey((k) => k + 1);
              }}
            >
              <RefreshCw className="size-3" />
              {t('refresh')}
            </Button>
            <a
              href={iframeSrc.replace('kiosk=tv', 'kiosk')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-2.5 text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              <Maximize2 className="size-3" />
              {t('open_grafana')}
            </a>
            <a
              href={base}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-2.5 text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              title={t('open_grafana')}
            >
              <ExternalLink className="size-3" />
            </a>
          </div>
        </header>

        <div className="flex-1 relative min-h-0 bg-[var(--background)]">
          {status === 'down' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="size-14 rounded-2xl bg-[var(--error)]/10 flex items-center justify-center">
                <Activity className="size-7 text-[var(--error)] opacity-80" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{t('offline_title')}</p>
              <p className="text-xs text-[var(--text-muted)] max-w-md leading-relaxed">
                {t('offline_hint')}
              </p>
              <Button
                type="button"
                className="rounded-xl btn-primary-gradient text-[var(--on-primary)] border-none mt-2"
                onClick={() => {
                  void checkHealth();
                  setIframeKey((k) => k + 1);
                }}
              >
                {t('retry')}
              </Button>
            </div>
          ) : (
            <>
              {status === 'checking' && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]/80">
                  <Loader2 className="size-8 text-[var(--primary)] animate-spin" />
                </div>
              )}
              <iframe
                key={iframeKey}
                title={t('iframe_title')}
                src={iframeSrc}
                className="absolute inset-0 w-full h-full border-0"
                allow="fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: StackStatus;
  t: (key: string) => string;
}) {
  return (
    <Badge
      className={cn(
        'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gap-1.5',
        status === 'up' &&
          'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
        status === 'down' &&
          'bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/30',
        status === 'checking' &&
          'bg-[var(--surface-hover)] text-[var(--text-muted)] border-[var(--surface-border)]'
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          status === 'up' && 'bg-[var(--success)] animate-pulse',
          status === 'down' && 'bg-[var(--error)]',
          status === 'checking' && 'bg-[var(--text-muted)]'
        )}
      />
      {status === 'up' ? t('status_up') : status === 'down' ? t('status_down') : t('status_checking')}
    </Badge>
  );
}
