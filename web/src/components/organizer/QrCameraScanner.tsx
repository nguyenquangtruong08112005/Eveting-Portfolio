'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QrCameraScannerProps {
  onScan: (text: string) => void;
  className?: string;
  /** Pause after successful scan until reopened */
  active?: boolean;
}

/**
 * Camera QR scanner using html5-qrcode (works on HTTPS / localhost).
 */
export function QrCameraScanner({ onScan, className, active = true }: QrCameraScannerProps) {
  const t = useTranslations('organizer');
  const reactId = useId().replace(/:/g, '');
  const regionId = `qr-reader-${reactId}`;
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => Promise<void>;
    isScanning: boolean;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScan = useRef('');
  const lastAt = useRef(0);

  const stop = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s?.isScanning) {
      try {
        await s.stop();
        await s.clear();
      } catch {
        /* already stopped */
      }
    }
    setRunning(false);
  };

  const start = async () => {
    if (starting || running) return;
    setStarting(true);
    setError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await stop();
      const scanner = new Html5Qrcode(regionId);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decoded) => {
          const text = (decoded || '').trim();
          if (!text) return;
          // Debounce same code within 2.5s
          const now = Date.now();
          if (text === lastScan.current && now - lastAt.current < 2500) return;
          lastScan.current = text;
          lastAt.current = now;
          onScan(text);
        },
        () => {
          /* frame miss — ignore */
        }
      );
      scannerRef.current = scanner as unknown as {
        stop: () => Promise<void>;
        clear: () => Promise<void>;
        isScanning: boolean;
      };
      setRunning(true);
    } catch (e: unknown) {
      console.error(e);
      setError(
        e instanceof Error && /Permission|NotAllowed/i.test(e.message)
          ? t('checkin_cam_permission')
          : t('checkin_cam_error')
      );
      setRunning(false);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!active && running) {
      void stop();
    }
    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
          <Camera className="size-3.5 text-[var(--primary)]" />
          {t('checkin_cam_title')}
        </p>
        {running ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg text-[10px] h-8"
            onClick={() => void stop()}
          >
            <CameraOff className="size-3" />
            {t('checkin_cam_stop')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="rounded-lg text-[10px] h-8 btn-primary-gradient text-[var(--on-primary)] border-none"
            disabled={starting || !active}
            onClick={() => void start()}
          >
            {starting ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
            {t('checkin_cam_start')}
          </Button>
        )}
      </div>

      <div
        id={regionId}
        className={cn(
          'w-full min-h-[220px] rounded-xl overflow-hidden border border-[var(--surface-border)] bg-black/80',
          !running && 'flex items-center justify-center'
        )}
      >
        {!running && (
          <p className="text-[11px] text-white/70 px-4 text-center py-16">
            {t('checkin_cam_idle')}
          </p>
        )}
      </div>

      {error && <p className="text-[11px] text-[var(--error)]">{error}</p>}
      <p className="text-[10px] text-[var(--text-muted)]">{t('checkin_cam_hint')}</p>
    </div>
  );
}
