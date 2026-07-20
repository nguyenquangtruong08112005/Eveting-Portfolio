'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QrCameraScannerProps {
  onScan: (text: string) => void;
  className?: string;
}

/**
 * Camera QR scanner. The Allow/Block dialog is owned by the **browser** —
 * our button only calls the camera API so the browser can show that prompt.
 *
 * Requires HTTPS or localhost.
 */
export function QrCameraScanner({ onScan, className }: QrCameraScannerProps) {
  const t = useTranslations('organizer');
  const reactId = useId().replace(/:/g, '');
  const regionId = `qr-reader-${reactId}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScan = useRef('');
  const lastAt = useRef(0);

  const stop = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        const state = typeof scanner.getState === 'function' ? scanner.getState() : null;
        // Html5QrcodeScannerState.SCANNING === 2
        if (state === 2 || scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        /* already stopped */
      }
      try {
        await scanner.clear();
      } catch {
        /* ignore */
      }
    }
    // Clear host so next start is clean (no React children inside)
    const el = document.getElementById(regionId);
    if (el) el.innerHTML = '';
    setRunning(false);
  };

  const start = async () => {
    if (starting || running) return;
    setStarting(true);
    setError(null);

    try {
      // Browser will only show camera permission on secure context
      if (
        typeof window !== 'undefined' &&
        !window.isSecureContext &&
        location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1'
      ) {
        setError(t('checkin_cam_https'));
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t('checkin_cam_unsupported'));
        return;
      }

      const { Html5Qrcode } = await import('html5-qrcode');
      await stop();

      const host = document.getElementById(regionId);
      if (!host) {
        setError(t('checkin_cam_error'));
        return;
      }
      host.innerHTML = '';

      const scanner = new Html5Qrcode(regionId);
      // This call triggers the browser's native Allow/Block permission UI
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewW: number, viewH: number) => {
            const size = Math.min(viewW, viewH, 260) * 0.85;
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        },
        (decoded) => {
          const text = (decoded || '').trim();
          if (!text) return;
          const now = Date.now();
          // Debounce duplicate scans
          if (text === lastScan.current && now - lastAt.current < 2500) return;
          lastScan.current = text;
          lastAt.current = now;
          onScanRef.current(text);
        },
        () => {
          /* ignore non-decode frames */
        }
      );

      scannerRef.current = scanner;
      setRunning(true);
    } catch (e: unknown) {
      console.error('[QrCameraScanner]', e);
      const name = e instanceof DOMException ? e.name : '';
      const msg = e instanceof Error ? e.message : String(e);

      if (
        name === 'NotAllowedError' ||
        name === 'PermissionDeniedError' ||
        /Permission|NotAllowed|denied/i.test(msg)
      ) {
        setError(t('checkin_cam_permission_help'));
      } else if (name === 'NotFoundError' || /not found|no camera/i.test(msg)) {
        setError(t('checkin_cam_no_device'));
      } else if (name === 'NotReadableError' || /in use|TrackStart/i.test(msg)) {
        setError(t('checkin_cam_in_use'));
      } else {
        setError(t('checkin_cam_error'));
      }
      setRunning(false);
      scannerRef.current = null;
    } finally {
      setStarting(false);
    }
  };

  // Cleanup on unmount only — do NOT stop when parent is "busy" checking in
  useEffect(() => {
    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            disabled={starting}
            onClick={() => void start()}
          >
            {starting ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
            {t('checkin_cam_start')}
          </Button>
        )}
      </div>

      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        {t('checkin_cam_browser_note')}
      </p>

      {/* Empty host — Html5Qrcode owns children; never put React nodes inside */}
      <div
        id={regionId}
        className="w-full min-h-[240px] rounded-xl overflow-hidden border border-[var(--surface-border)] bg-black/90"
      />
      {!running && !starting && (
        <p className="text-[11px] text-[var(--text-muted)] -mt-1 text-center">
          {t('checkin_cam_idle')}
        </p>
      )}

      {error && (
        <p className="text-[11px] text-[var(--error)] whitespace-pre-line">{error}</p>
      )}
      <p className="text-[10px] text-[var(--text-muted)]">{t('checkin_cam_hint')}</p>
    </div>
  );
}
