'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TicketQrProps {
  /** Raw QR payload from server (JWT) or any string content */
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Renders a real scannable QR for ticket check-in.
 * Prefers the `qrcode` package when available; falls back to a public QR image API.
 */
export function TicketQr({ value, size = 160, className, alt = 'Ticket QR code' }: TicketQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setDataUrl(null);
      return;
    }

    setFailed(false);

    (async () => {
      try {
        // Dynamic import so builds still work if the package is mid-install
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#0C0A09', light: '#FFFFFF' },
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        // Fallback: remote QR generator (no local dep required)
        if (!cancelled) {
          setDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!value) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[10px] text-[var(--text-muted)]',
          className
        )}
        style={{ width: size, height: size }}
      >
        No QR
      </div>
    );
  }

  if (!dataUrl || failed) {
    return (
      <div
        className={cn('rounded-lg bg-white animate-pulse', className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-lg bg-white', className)}
      onError={() => setFailed(true)}
    />
  );
}

/** Build a stable display payload when server JWT is missing. */
export function buildClientTicketQrValue(parts: {
  ticketId: string;
  eventId?: string;
  qrCode?: string | null;
}): string {
  if (parts.qrCode && parts.qrCode.trim()) return parts.qrCode.trim();
  return JSON.stringify({
    v: 1,
    ticketId: parts.ticketId,
    eventId: parts.eventId || undefined,
  });
}
