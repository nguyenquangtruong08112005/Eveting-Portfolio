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
