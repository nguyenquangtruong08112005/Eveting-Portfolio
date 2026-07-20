'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, SwitchCamera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QrCameraScannerProps {
  onScan: (text: string) => void;
  className?: string;
}

type Facing = 'environment' | 'user';
type Engine = 'BarcodeDetector' | 'ZXing-WASM';

const DEBOUNCE_MS = 1000;
/** Target decode cadence (~15 fps). */
const TICK_MS = 66;
/** Downscale long edge for ZXing WASM (faster, still sharp enough for QR). */
const ZXING_MAX_EDGE = 720;

/**
 * Continuous QR scanner for phone/tablet check-in.
 *
 * Engine order:
 * 1) Native BarcodeDetector (Chrome/Edge/Android — closest to ML Kit)
 * 2) ZXing WASM fallback (Safari / browsers without BarcodeDetector)
 *
 * Owns getUserMedia + decode loop (no html5-qrcode).
 */
export function QrCameraScanner({ onScan, className }: QrCameraScannerProps) {
  const t = useTranslations('organizer');
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const decodingRef = useRef(false);
  const lastScan = useRef('');
  const lastAt = useRef(0);
  const facingRef = useRef<Facing>('environment');
  const devicesRef = useRef<MediaDeviceInfo[]>([]);
  const deviceIndexRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const barcodeDetectorRef = useRef<any>(null);
  const zxingReadyRef = useRef(false);
  const engineRef = useRef<Engine | null>(null);

  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugDetail, setDebugDetail] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(false);
  const [facing, setFacing] = useState<Facing>('environment');
  const [engine, setEngine] = useState<Engine | null>(null);

  const emitScan = useCallback((raw: string) => {
    const text = (raw || '').trim();
    if (!text) return;
    const now = Date.now();
    if (now - lastAt.current < DEBOUNCE_MS) return;
    lastScan.current = text;
    lastAt.current = now;
    onScanRef.current(text);
  }, []);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  const stopLoop = () => {
    runningRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (tickTimerRef.current != null) {
      clearTimeout(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  };

  const stop = useCallback(async () => {
    stopLoop();
    stopTracks();
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    setRunning(false);
  }, []);

  const listVideoDevices = async (): Promise<MediaDeviceInfo[]> => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      return all.filter((d) => d.kind === 'videoinput');
    } catch {
      return [];
    }
  };

  const openStream = async (preferred: Facing, deviceId?: string): Promise<MediaStream> => {
    const tries: MediaStreamConstraints[] = [];

    if (deviceId) {
      tries.push({
        audio: false,
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    }

    tries.push(
      {
        audio: false,
        video: {
          facingMode: { ideal: preferred },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      {
        audio: false,
        video: { facingMode: preferred },
      },
      {
        audio: false,
        video: true,
      }
    );

    let lastErr: unknown;
    for (const c of tries) {
      try {
        return await navigator.mediaDevices.getUserMedia(c);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error('getUserMedia failed');
  };

  const ensureEngine = async (): Promise<Engine> => {
    // 1) Native BarcodeDetector
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const BD = (window as Window & { BarcodeDetector: typeof BarcodeDetector }).BarcodeDetector;
        let formats: string[] = ['qr_code'];
        try {
          const supported = await BD.getSupportedFormats();
          if (supported.includes('qr_code')) formats = ['qr_code'];
        } catch {
          /* use default */
        }
        barcodeDetectorRef.current = new BD({ formats });
        engineRef.current = 'BarcodeDetector';
        setEngine('BarcodeDetector');
        return 'BarcodeDetector';
      } catch (e) {
        console.warn('[QrCameraScanner] BarcodeDetector init failed', e);
        barcodeDetectorRef.current = null;
      }
    }

    // 2) ZXing WASM
    const { prepareZXingModule, readBarcodes } = await import('zxing-wasm/reader');
    if (!zxingReadyRef.current) {
      await prepareZXingModule({
        fireImmediately: true,
        overrides: {
          locateFile: (path: string, prefix: string) => {
            if (path.endsWith('.wasm')) {
              return '/zxing_reader.wasm';
            }
            return `${prefix}${path}`;
          },
        },
      });
      zxingReadyRef.current = true;
    }
    // Keep readBarcodes imported for type side-effect of module ready; decode uses dynamic import cache
    void readBarcodes;
    engineRef.current = 'ZXing-WASM';
    setEngine('ZXing-WASM');
    return 'ZXing-WASM';
  };

  const decodeFrame = async (): Promise<string | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const eng = engineRef.current;

    if (eng === 'BarcodeDetector' && barcodeDetectorRef.current) {
      try {
        const codes = await barcodeDetectorRef.current.detect(video);
        const first = codes?.[0]?.rawValue;
        return first ? String(first) : null;
      } catch {
        return null;
      }
    }

    // ZXing WASM via canvas ImageData
    const canvas = canvasRef.current;
    if (!canvas) return null;

    let w = video.videoWidth;
    let h = video.videoHeight;
    if (!w || !h) return null;

    const long = Math.max(w, h);
    if (long > ZXING_MAX_EDGE) {
      const scale = ZXING_MAX_EDGE / long;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    try {
      const { readBarcodes } = await import('zxing-wasm/reader');
      const results = await readBarcodes(imageData, {
        tryHarder: false,
        formats: ['QRCode'],
        maxNumberOfSymbols: 1,
      });
      const text = results?.[0]?.text;
      return text ? String(text) : null;
    } catch {
      return null;
    }
  };

  const loop = () => {
    if (!runningRef.current) return;

    const run = async () => {
      if (!runningRef.current || decodingRef.current) {
        scheduleNext();
        return;
      }
      decodingRef.current = true;
      try {
        const text = await decodeFrame();
        if (text) emitScan(text);
      } finally {
        decodingRef.current = false;
        scheduleNext();
      }
    };

    void run();
  };

  const scheduleNext = () => {
    if (!runningRef.current) return;
    tickTimerRef.current = setTimeout(() => {
      rafRef.current = requestAnimationFrame(loop);
    }, TICK_MS);
  };

  const attachStream = async (stream: MediaStream, preferred: Facing) => {
    stopTracks();
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) throw new Error('video element missing');

    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    await video.play();

    facingRef.current = preferred;
    setFacing(preferred);

    const devices = await listVideoDevices();
    devicesRef.current = devices;
    setCanSwitch(devices.length >= 2 || preferred === 'environment' || preferred === 'user');

    // Track current device index if possible
    const track = stream.getVideoTracks()[0];
    const settings = track?.getSettings?.();
    if (settings?.deviceId && devices.length) {
      const idx = devices.findIndex((d) => d.deviceId === settings.deviceId);
      if (idx >= 0) deviceIndexRef.current = idx;
    }
    if (settings?.facingMode === 'user' || settings?.facingMode === 'environment') {
      facingRef.current = settings.facingMode;
      setFacing(settings.facingMode);
    }

    const label =
      track?.label ||
      devices[deviceIndexRef.current]?.label ||
      preferred;
    setDebugDetail(
      t('checkin_cam_using', {
        cam: `${label} · ${engineRef.current ?? '?'}`,
      })
    );
  };

  const start = async (preferred: Facing = 'environment') => {
    if (starting || runningRef.current) return;
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

      await ensureEngine();
      await stop();

      const stream = await openStream(preferred);
      await attachStream(stream, preferred);

      runningRef.current = true;
      setRunning(true);
      scheduleNext();
    } catch (e: unknown) {
      console.error('[QrCameraScanner]', e);
      applyStartError(e, setError, setDebugDetail, t);
      await stop();
    } finally {
      setStarting(false);
    }
  };

  const switchCamera = async () => {
    if (!running || starting) return;
    setStarting(true);
    setError(null);

    try {
      const nextFacing: Facing = facingRef.current === 'environment' ? 'user' : 'environment';
      const devices = devicesRef.current.length
        ? devicesRef.current
        : await listVideoDevices();
      devicesRef.current = devices;

      let nextId: string | undefined;
      if (devices.length >= 2) {
        const nextIndex = (deviceIndexRef.current + 1) % devices.length;
        deviceIndexRef.current = nextIndex;
        nextId = devices[nextIndex]?.deviceId;
      }

      stopLoop();
      const stream = await openStream(nextFacing, nextId);
      await attachStream(stream, nextFacing);

      runningRef.current = true;
      setRunning(true);
      scheduleNext();
    } catch (e: unknown) {
      console.error('[QrCameraScanner] switch', e);
      applyStartError(e, setError, setDebugDetail, t);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
          <Camera className="size-3.5 text-[var(--primary)]" />
          {t('checkin_cam_title')}
          {engine && (
            <span className="font-mono font-normal text-[10px] text-[var(--text-muted)]">
              ({engine === 'BarcodeDetector' ? t('checkin_cam_engine_native') : t('checkin_cam_engine_wasm')})
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {running && canSwitch && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg text-[10px] h-8"
              disabled={starting}
              onClick={() => void switchCamera()}
              title={t('checkin_cam_switch')}
            >
              {starting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <SwitchCamera className="size-3" />
              )}
              {facing === 'environment' ? t('checkin_cam_front') : t('checkin_cam_back')}
            </Button>
          )}
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
              onClick={() => void start('environment')}
            >
              {starting ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
              {t('checkin_cam_start')}
            </Button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        {t('checkin_cam_browser_note')}
      </p>

      <div className="relative w-full min-h-[240px] rounded-xl overflow-hidden border border-[var(--surface-border)] bg-black/90 aspect-[4/3]">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* Viewfinder frame */}
        {running && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="size-[min(70%,240px)] rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {!running && !starting && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="text-[11px] text-white/70 text-center">{t('checkin_cam_idle')}</p>
          </div>
        )}
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Hidden canvas for ZXing WASM frame grab */}
      <canvas ref={canvasRef} className="hidden" aria-hidden />

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

function applyStartError(
  e: unknown,
  setError: (s: string) => void,
  setDebugDetail: (s: string | null) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
) {
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
