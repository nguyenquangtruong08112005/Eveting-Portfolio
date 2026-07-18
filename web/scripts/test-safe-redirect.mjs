/**
 * Structural + behavioral tests for safe-redirect (shipped module).
 * Runs via: node --experimental-strip-types scripts/test-safe-redirect.mjs
 * or: npx tsx scripts/test-safe-redirect.ts (if available)
 *
 * This file imports the TypeScript source through a minimal transpile path:
 * we re-require by compiling inline with Node strip-types when possible.
 */

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '../src/lib/safe-redirect.ts');

// Prefer node --experimental-strip-types for direct TS execution of a runner
const runner = `
import { isSafeExternalUrl } from ${JSON.stringify(pathToFileURL(srcPath).href)};

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Same-origin: mock window
globalThis.window = { location: { hostname: 'localhost' } };

assert(isSafeExternalUrl('https://sbh.portal.zalopay.vn/pay/abc') === true, 'zalopay sandbox host allowed');
assert(isSafeExternalUrl('https://social.zalopay.vn/x') === true, 'zalopay suffix allowed');
assert(isSafeExternalUrl('https://evil.com/phish') === false, 'evil host blocked');
assert(isSafeExternalUrl('javascript:alert(1)') === false, 'javascript blocked');
assert(isSafeExternalUrl('//evil.com') === false, 'protocol-relative blocked');
assert(isSafeExternalUrl('https://localhost/checkout/success') === true, 'same origin allowed');
assert(isSafeExternalUrl('') === false, 'empty blocked');
assert(isSafeExternalUrl(null) === false, 'null blocked');

console.log('safe-redirect: all assertions passed');
`;

const tmp = path.join(process.env.TEMP || '/tmp', 'safe-redirect-runner-' + Date.now() + '.mts');
fs.writeFileSync(tmp, runner, 'utf8');

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', tmp],
  { encoding: 'utf8', env: process.env }
);

fs.unlinkSync(tmp);

if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(result.status || 1);
}
console.log(result.stdout.trim());
