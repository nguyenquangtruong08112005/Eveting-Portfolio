'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QrCameraScannerProps {
  onScan: (text: string) => void;
  className?: string;
  active?: boolean;
}

type PermState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

/**
 * Camera QR scanner using html5-qrcode.
 * Explicitly requests camera permission via getUserMedia before scanning.
 * Requires HTTPS or localhost.
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
  const [perm, setPerm] = useState<PermState>('unknown');
  const lastScan = useRef('');
  const lastAt = useRef(0);

  // Track permission state (Chrome/Edge support Permissions API for camera)
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setPerm('unsupported');
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const perms = (navigator as any).permissions;
        if (perms?.query) {
          const status = await perms.query({ name: 'camera' as PermissionName });
          if (cancelled) return;
          setPerm(status.state as PermState);
          status.onchange = () => {
            setPerm(status.state as PermState);
          };
          return;
        }
      } catch {
        /* Firefox may throw for camera query */
      }
      if (!cancelled) setPerm('prompt');
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

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

  /** Explicit browser permission prompt before Html5Qrcode owns the stream */
  const requestCameraPermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPerm('unsupported');
      setError(t('checkin_cam_unsupported'));
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      // Release immediately — html5-qrcode will open its own stream
      stream.getTracks().forEach((track) => track.stop());
      setPerm('granted');
      setError(null);
      return true;
    } catch (e: unknown) {
      const name = e instanceof DOMException ? e.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPerm('denied');
        setError(t('checkin_cam_permission'));
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError(t('checkin_cam_no_device'));
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError(t('checkin_cam_in_use'));
      } else {
        setError(t('checkin_cam_error'));
      }
      return false;
    }
  };

  const start = async () => {
    if (starting || running) return;
    setStarting(true);
    setError(null);
    try {
      // Secure context check
      if (
        typeof window !== 'undefined' &&
        !window.isSecureContext &&
        location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1'
      ) {
        setError(t('checkin_cam_https'));
        return;
      }

      const allowed = await requestCameraPermission();
      if (!allowed) return;

      const { Html5Qrcode } = await import('html5-qrcode');
      await stop();
      const scanner = new Html5Qrcode(regionId);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decoded) => {
          const text = (decoded || '').trim();
          if (!text) return;
          const now = Date.now();
          if (text === lastScan.current && now - lastAt.current < 2500) return;
          lastScan.current = text;
          lastAt.current = now;
          onScan(text);
        },
        () => {
          /* ignore scan misses */
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
      const msg = e instanceof Error ? e.message : '';
      if (/Permission|NotAllowed|NotAllowedError/i.test(msg)) {
        setPerm('denied');
        setError(t('checkin_cam_permission'));
      } else {
        setError(t('checkin_cam_error'));
      }
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
            disabled={starting || !active || perm === 'unsupported'}
            onClick={() => void start()}
          >
            {starting ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
            {perm === 'denied' ? t('checkin_cam_retry') : t('checkin_cam_start')}
          </Button>
        )}
      </div>

      {perm === 'prompt' && !running && (
        <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/5 px-3 py-2 text-[11px] text-[var(--text-secondary)] flex gap-2">
          <ShieldAlert className="size-4 text-[var(--primary)] shrink-0 mt-0.5" />
          <span>{t('checkin_cam_permission_prompt')}</span>
        </div>
      )}

      {perm === 'denied' && (
        <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/5 px-3 py-2 text-[11px] text-[var(--error)] flex gap-2">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span>{t('checkin_cam_permission_help')}</span>
        </div>
      )}

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
