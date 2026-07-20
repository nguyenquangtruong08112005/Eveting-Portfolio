'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  QrCode,
  XCircle,
  AlertTriangle,
  History,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AttendeeTable } from '@/components/organizer/AttendeeTable';
import { QrCameraScanner } from '@/components/organizer/QrCameraScanner';
import { ORG_NAV } from '@/features/organizer/nav';
import { OrganizerService } from '@/features/organizer/api';
import { cn } from '@/lib/utils';
import type { OrganizerAttendeeRow, OrganizerEvent } from '@/types';

interface ScanResult {
  ok: boolean;
  code?: string;
  message: string;
  ticketId?: string;
  at: number;
}

export function CheckInView() {
  const t = useTranslations('organizer');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const prefillEvent = searchParams?.get('eventId') || '';

  const [token, setToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [eventId, setEventId] = useState(prefillEvent);
  const [attendees, setAttendees] = useState<OrganizerAttendeeRow[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  useEffect(() => {
    OrganizerService.getEvents()
      .then((r) => setEvents(r.data || []))
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    if (prefillEvent) setEventId(prefillEvent);
  }, [prefillEvent]);

  const loadAttendees = useCallback(async (id: string) => {
    if (!id) {
      setAttendees([]);
      return;
    }
    setLoadingAttendees(true);
    try {
      const res = await OrganizerService.getAttendees(id);
      setAttendees(res.attendees || []);
    } catch {
      setAttendees([]);
    } finally {
      setLoadingAttendees(false);
    }
  }, []);

  useEffect(() => {
    loadAttendees(eventId);
  }, [eventId, loadAttendees]);

  const runCheckIn = async (raw: string) => {
    const qrToken = raw.trim();
    if (!qrToken) {
      toast.error(t('checkin_token_required'));
      return;
    }
    setToken(qrToken);
    setScanning(true);
    setResult(null);
    try {
      const res = await OrganizerService.checkInByQr(qrToken);
      const entry: ScanResult = {
        ok: !!res.valid,
        code: res.error,
        message: res.message || (res.valid ? t('checkin_success') : t('checkin_failed')),
        ticketId: res.ticketInfo?.ticketId,
        at: Date.now(),
      };
      setResult(entry);
      setHistory((prev) => [entry, ...prev].slice(0, 20));
      if (res.valid) {
        setToken('');
        if (eventId) loadAttendees(eventId);
      }
    } catch (err: unknown) {
      const anyErr = err as {
        message?: string;
        error?: string;
        response?: { data?: { error?: string; message?: string; valid?: boolean } };
      };
      const code =
        anyErr?.response?.data?.error || anyErr?.error || undefined;
      const message =
        anyErr?.response?.data?.message ||
        anyErr?.message ||
        t('checkin_failed');
      const entry: ScanResult = {
        ok: false,
        code,
        message,
        at: Date.now(),
      };
      setResult(entry);
      setHistory((prev) => [entry, ...prev].slice(0, 20));
    } finally {
      setScanning(false);
    }
  };

  const handleCheckIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await runCheckIn(token);
  };

  const handleCameraScan = (text: string) => {
    void runCheckIn(text);
  };

  return (
    <AppShell variant="organizer" items={ORG_NAV} heading={tCommon('org_badge')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full space-y-6">
        <PageHeader
          title={t('check_in_title')}
          description={t('check_in_subtitle')}
          icon={<QrCode className="size-5" />}
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 space-y-4">
            <QrCameraScanner onScan={handleCameraScan} active={!scanning} />

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-[var(--surface-border)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {t('checkin_or_paste')}
              </span>
              <div className="flex-1 h-px bg-[var(--surface-border)]" />
            </div>

            <form onSubmit={handleCheckIn} className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">
                  {t('checkin_token_label')}
                </Label>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t('checkin_token_placeholder')}
                  className="rounded-xl h-12 font-mono text-sm"
                  autoComplete="off"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                  {t('checkin_token_hint')}
                </p>
              </div>
              <Button
                type="submit"
                disabled={scanning}
                className="w-full h-12 rounded-xl btn-primary-gradient text-[var(--on-primary)] border-none font-bold text-sm"
              >
                {scanning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <QrCode className="size-4" />
                )}
                {scanning ? t('checkin_scanning') : t('checkin_submit')}
              </Button>
            </form>

            {result && (
              <div
                className={cn(
                  'rounded-2xl p-5 border flex items-start gap-3',
                  result.ok
                    ? 'bg-[var(--success)]/10 border-[var(--success)]/30'
                    : result.code === 'ALREADY_CHECKED_IN'
                      ? 'bg-[var(--warning)]/10 border-[var(--warning)]/30'
                      : 'bg-[var(--error)]/10 border-[var(--error)]/30'
                )}
              >
                {result.ok ? (
                  <CheckCircle2 className="size-8 text-[var(--success)] shrink-0" />
                ) : result.code === 'ALREADY_CHECKED_IN' ? (
                  <AlertTriangle className="size-8 text-[var(--warning)] shrink-0" />
                ) : (
                  <XCircle className="size-8 text-[var(--error)] shrink-0" />
                )}
                <div>
                  <p
                    className={cn(
                      'text-sm font-black',
                      result.ok
                        ? 'text-[var(--success)]'
                        : result.code === 'ALREADY_CHECKED_IN'
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--error)]'
                    )}
                  >
                    {result.ok
                      ? t('checkin_success')
                      : result.code === 'ALREADY_CHECKED_IN'
                        ? t('checkin_already')
                        : result.code === 'FORBIDDEN'
                          ? t('checkin_forbidden')
                          : t('checkin_invalid')}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{result.message}</p>
                  {result.ticketId && (
                    <p className="text-[10px] font-mono text-[var(--text-muted)] mt-2">
                      {result.ticketId}
                    </p>
                  )}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 mb-2">
                  <History className="size-3.5" />
                  {t('checkin_history')}
                </h4>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {history.map((h, i) => (
                    <li
                      key={`${h.at}-${i}`}
                      className="text-[11px] flex items-center gap-2 text-[var(--text-secondary)]"
                    >
                      <span
                        className={cn(
                          'size-1.5 rounded-full shrink-0',
                          h.ok ? 'bg-[var(--success)]' : 'bg-[var(--error)]'
                        )}
                      />
                      <span className="truncate flex-1">{h.message}</span>
                      <span className="text-[var(--text-muted)] tabular-nums">
                        {new Date(h.at).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="lg:col-span-2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 space-y-3">
            <div>
              <Label className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">
                {t('checkin_event_filter')}
              </Label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--background)] px-3 text-sm"
              >
                <option value="">{t('checkin_pick_event')}</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {t('attendees_title')}
            </h3>
            {loadingAttendees ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-6 text-[var(--primary)] animate-spin" />
              </div>
            ) : !eventId ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                {t('checkin_pick_event_hint')}
              </p>
            ) : (
              <AttendeeTable attendees={attendees} />
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
