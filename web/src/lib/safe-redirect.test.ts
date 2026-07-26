/**
 * Run: node --experimental-strip-types src/lib/safe-redirect.test.ts
 * from web-2025-eventing directory.
 */
import { isSafeExternalUrl } from './safe-redirect.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// Mock browser origin for same-host checks
(globalThis as unknown as { window: { location: { hostname: string } } }).window = {
  location: { hostname: 'localhost' },
};

assert(isSafeExternalUrl('https://sbh.portal.zalopay.vn/pay/abc') === true, 'zalopay sandbox host allowed');
assert(isSafeExternalUrl('https://social.zalopay.vn/x') === true, 'zalopay suffix allowed');
assert(isSafeExternalUrl('https://evil.com/phish') === false, 'evil host blocked');
assert(isSafeExternalUrl('javascript:alert(1)') === false, 'javascript blocked');
assert(isSafeExternalUrl('//evil.com') === false, 'protocol-relative blocked');
assert(isSafeExternalUrl('https://localhost/checkout/success') === true, 'same origin allowed');
assert(isSafeExternalUrl('') === false, 'empty blocked');
assert(isSafeExternalUrl(null) === false, 'null blocked');
assert(isSafeExternalUrl('http://scam.zalopay.vn.evil.com') === false, 'suffix spoof blocked');

console.log('safe-redirect.test.ts: all assertions passed');

// ─── apiClient allowAnonymous tests ──────────────────────────────────────────
import { request, requestCached, HttpError } from '../services/apiClient.ts';

async function testApiClientAllowAnonymous() {
  const originalFetch = globalThis.fetch;
  let redirectOccurred = false;
  let fetchUrls: string[] = [];

  const mockLocation = {
    hostname: 'localhost',
    href: 'http://localhost/',
  };

  Object.defineProperty(mockLocation, 'href', {
    get: () => 'http://localhost/',
    set: (val: string) => {
      if (val) redirectOccurred = true;
    },
  });

  (globalThis as unknown as { window: unknown }).window = {
    location: mockLocation,
  };

  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    removeItem: () => {},
    getItem: () => null,
    setItem: () => {},
  };

  try {
    // 1. allowAnonymous: true suppresses refresh and redirect on 401
    fetchUrls = [];
    redirectOccurred = false;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      fetchUrls.push(urlStr);
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    let caughtError: HttpError | null = null;
    try {
      await request('GET', '/api/web/users/me', { allowAnonymous: true });
    } catch (err) {
      if (err instanceof HttpError) caughtError = err;
    }

    assert(caughtError !== null, 'request with allowAnonymous should throw HttpError on 401');
    assert(caughtError?.status === 401, 'HttpError status should be 401');
    assert(fetchUrls.length === 1, 'Should only fetch once (no refresh call)');
    assert(fetchUrls[0].includes('/api/web/users/me'), 'Fetched URL should be /api/web/users/me');
    assert(redirectOccurred === false, 'No redirect should occur when allowAnonymous is true');

    // 2. Default (allowAnonymous: false/omitted) triggers refresh & redirect on 401
    fetchUrls = [];
    redirectOccurred = false;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      fetchUrls.push(urlStr);
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    let caughtProtectedError: Error | null = null;
    try {
      await request('GET', '/api/web/protected-resource');
    } catch (err) {
      if (err instanceof Error) caughtProtectedError = err;
    }

    assert(caughtProtectedError !== null, 'Protected request should throw Error on 401 when refresh fails');

    assert(fetchUrls.length === 2, 'Should attempt main request and refresh request');
    assert(fetchUrls[1].includes('/api/web/auth/refresh'), 'Second fetch should be refresh endpoint');
    assert(Boolean(redirectOccurred) === true, 'Redirect to /login should occur when refresh fails for protected route');

    // 3. requestCached with allowAnonymous: true (used by recommendations) suppresses refresh and redirect on 401
    fetchUrls = [];
    redirectOccurred = false;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      fetchUrls.push(urlStr);
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    let caughtRecError: HttpError | null = null;
    try {
      await requestCached('GET', '/api/web/events/recommendations?limit=8', { allowAnonymous: true });
    } catch (err) {
      if (err instanceof HttpError) caughtRecError = err;
    }

    assert(caughtRecError !== null, 'requestCached with allowAnonymous should throw HttpError on 401');
    assert(caughtRecError?.status === 401, 'HttpError status should be 401');
    assert(fetchUrls.length === 1, 'Should only fetch once (no refresh call)');
    assert(fetchUrls[0].includes('/api/web/events/recommendations?limit=8'), 'Fetched URL should be recommendations endpoint');
    assert(redirectOccurred === false, 'No redirect should occur when requestCached receives 401 with allowAnonymous');

    console.log('apiClient allowAnonymous: all assertions passed');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await testApiClientAllowAnonymous();



