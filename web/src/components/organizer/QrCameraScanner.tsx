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

type CameraInfo = { id: string; label: string };

/**
 * Camera QR scanner (html5-qrcode).
 *
 * Flow (matches browser permission model):
 * 1) getUserMedia({ video: true }) → browser shows Allow/Block
 * 2) release that stream
 * 3) start scanner with device fallbacks
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
  const [debugDetail, setDebugDetail] = useState<string | null>(null);
  const lastScan = useRef('');
  const lastAt = useRef(0);

  const stop = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        const state = typeof scanner.getState === 'function' ? scanner.getState() : null;
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
    const el = document.getElementById(regionId);
    if (el) el.innerHTML = '';
    setRunning(false);
  };

  const onDecoded = (decoded: string) => {
    const text = (decoded || '').trim();
    if (!text) return;
    const now = Date.now();
    if (text === lastScan.current && now - lastAt.current < 2500) return;
    lastScan.current = text;
    lastAt.current = now;
    onScanRef.current(text);
  };

  const config = {
    fps: 10,
    qrbox: (viewW: number, viewH: number) => {
      const size = Math.min(viewW, viewH, 280) * 0.8;
      return { width: Math.max(160, size), height: Math.max(160, size) };
    },
    aspectRatio: 1.333,
  };

  /**
   * After permission is granted, start html5-qrcode with device fallbacks.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startWithFallbacks = async (scanner: any, cameras: CameraInfo[]) => {
    const errors: string[] = [];

    const ordered = [...cameras].sort((a, b) => {
      const score = (c: CameraInfo) =>
        /back|rear|environment|world/i.test(c.label)
          ? 0
          : /front|user|face/i.test(c.label)
            ? 2
            : 1;
      return score(a) - score(b);
    });

    for (const cam of ordered) {
      try {
        await scanner.start(cam.id, config, onDecoded, () => {});
        return cam.label || cam.id;
      } catch (e) {
        errors.push(`${cam.label || cam.id}: ${formatErr(e)}`);
      }
    }

    // Simple constraints — permission already granted via getUserMedia({ video: true })
    const constraints: Array<MediaTrackConstraints | boolean> = [
      true,
      { facingMode: 'user' },
      { facingMode: 'environment' },
    ];
    for (const c of constraints) {
      try {
        await scanner.start(c as MediaTrackConstraints, config, onDecoded, () => {});
        return typeof c === 'object' && c && 'facingMode' in c
          ? String(c.facingMode)
          : 'default';
      } catch (e) {
        errors.push(`${JSON.stringify(c)}: ${formatErr(e)}`);
      }
    }

    throw new Error(errors.join(' | ') || 'No camera strategy worked');
  };

  const start = async () => {
    if (starting || running) return;
    setStarting(true);
    setError(null);
    setDebugDetail(null);

    try {
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

      // 1) Explicitly request permission first — browser shows Allow/Block
      //    Use simple { video: true } so desktop webcams work (no rear-cam constraint).
      let permissionStream: MediaStream | null = null;
      try {
        permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err: unknown) {
        const name = err instanceof DOMException ? err.name : '';
        const msg = formatErr(err);
        setDebugDetail(msg);
        if (
          name === 'NotAllowedError' ||
          name === 'PermissionDeniedError' ||
          /NotAllowed|Permission denied|denied/i.test(msg)
        ) {
          setError(t('checkin_cam_permission_help'));
        } else if (name === 'NotFoundError' || /not found|no (camera|device)/i.test(msg)) {
          setError(t('checkin_cam_no_device'));
        } else if (name === 'NotReadableError' || /in use|TrackStart|video source/i.test(msg)) {
          setError(t('checkin_cam_in_use'));
        } else {
          setError(t('checkin_cam_error'));
        }
        return;
      } finally {
        // Release probe stream so html5-qrcode can open the camera cleanly
        permissionStream?.getTracks().forEach((track) => track.stop());
      }

      const { Html5Qrcode } = await import('html5-qrcode');
      await stop();

      const host = document.getElementById(regionId);
      if (!host) {
        setError(t('checkin_cam_error'));
        return;
      }
      host.innerHTML = '';

      // After permission, labels are usually available
      let cameras: CameraInfo[] = [];
      try {
        cameras = (await Html5Qrcode.getCameras()) as CameraInfo[];
      } catch (e) {
        console.warn('[QrCameraScanner] getCameras failed', e);
      }

      // 2) Start scanner with valid config + fallbacks
      const scanner = new Html5Qrcode(regionId);
      try {
        const used = await startWithFallbacks(scanner, cameras);
        scannerRef.current = scanner;
        setRunning(true);
        setDebugDetail(t('checkin_cam_using', { cam: used }));
      } catch (e) {
        try {
          await scanner.clear();
        } catch {
          /* ignore */
        }
        throw e;
      }
    } catch (e: unknown) {
      console.error('[QrCameraScanner]', e);
      const name = e instanceof DOMException ? e.name : '';
      const msg = formatErr(e);
      setDebugDetail(msg);

      if (
        name === 'NotAllowedError' ||
        name === 'PermissionDeniedError' ||
        /NotAllowed|Permission denied|PermissionDenied|not allowed/i.test(msg)
      ) {
        setError(t('checkin_cam_permission_help'));
      } else if (
        name === 'NotFoundError' ||
        /not found|no (camera|device)|Requested device not found/i.test(msg)
      ) {
        setError(t('checkin_cam_no_device'));
      } else if (
        name === 'NotReadableError' ||
        /in use|TrackStart|Could not start video source/i.test(msg)
      ) {
        setError(t('checkin_cam_in_use'));
      } else if (
        name === 'OverconstrainedError' ||
        /Overconstrained|could not satisfy|constraint/i.test(msg)
      ) {
        setError(t('checkin_cam_overconstrained'));
      } else {
        setError(t('checkin_cam_error'));
      }
      setRunning(false);
      scannerRef.current = null;
    } finally {
      setStarting(false);
    }
  };

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
      {debugDetail && (
        <p className="text-[10px] font-mono text-[var(--text-muted)] break-all">
          {debugDetail}
        </p>
      )}
      <p className="text-[10px] text-[var(--text-muted)]">{t('checkin_cam_hint')}</p>
    </div>
  );
}

function formatErr(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
