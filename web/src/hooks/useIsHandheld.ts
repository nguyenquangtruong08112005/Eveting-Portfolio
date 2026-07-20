'use client';

import { useEffect, useState } from 'react';

/**
 * Phone / tablet only (including iPadOS desktop UA).
 * Used to gate camera check-in away from desktop.
 */
export function isHandheldDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || '';
  const mobileUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(
      ua
    );

  // iPadOS 13+ often reports as Macintosh
  const iPadOsDesktopUa =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  // Coarse pointer (finger) on a phone/tablet-sized surface
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const notHugeDesktop = window.matchMedia('(max-width: 1366px)').matches;

  return mobileUa || iPadOsDesktopUa || (coarse && notHugeDesktop);
}

export function useIsHandheld(): boolean | null {
  const [handheld, setHandheld] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setHandheld(isHandheldDevice());
    update();
    window.addEventListener('resize', update);
    const mq = window.matchMedia('(pointer: coarse)');
    mq.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mq.removeEventListener?.('change', update);
    };
  }, []);

  return handheld;
}
