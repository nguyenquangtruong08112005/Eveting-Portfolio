/**
 * Prevent open-redirect via untrusted payment / external URLs.
 * Only allow http(s) absolute URLs whose host is allowlisted or same-origin.
 */

const DEFAULT_ALLOWED_HOST_SUFFIXES = [
  'zalopay.vn',
  'zalopay.com.vn',
  'sbh.portal.zalopay.vn',
  'sandbox.zalopay.vn',
];

export function isSafeExternalUrl(
  raw: string | null | undefined,
  options?: { allowedHostSuffixes?: string[]; allowSameOrigin?: boolean }
): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return false;
  }

  // Block obvious credential / JS schemes already excluded by protocol check
  const host = url.hostname.toLowerCase();
  if (!host) return false;

  if (options?.allowSameOrigin !== false && typeof window !== 'undefined') {
    try {
      if (host === window.location.hostname.toLowerCase()) {
        return true;
      }
    } catch {
      /* ignore */
    }
  }

  const suffixes = options?.allowedHostSuffixes ?? DEFAULT_ALLOWED_HOST_SUFFIXES;
  return suffixes.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

/**
 * Navigate only if URL is safe; otherwise throw.
 */
export function navigateToSafeExternalUrl(raw: string): void {
  if (!isSafeExternalUrl(raw)) {
    throw new Error('Unsafe or disallowed payment redirect URL');
  }
  window.location.href = raw.trim();
}
