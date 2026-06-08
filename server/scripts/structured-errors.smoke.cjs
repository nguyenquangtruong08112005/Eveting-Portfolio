// scripts/structured-errors.smoke.cjs
// O5-S9 structured error contract smoke checks
// Starts the application on a configurable port and verifies error shapes
// using Node core http (no axios). Generates an organizer JWT using
// the backend auth provider's signAccessToken.
//
// Usage:
//   npm run db:smoke:structured-errors
//   # or directly:
//   DATABASE_URL=postgres://... node scripts/structured-errors.smoke.cjs

const http = require('http');
const { spawn } = require('child_process');

const TEST_PORT = process.env.TEST_PORT || '35433';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const ORG_UID = 'w6ZEeGefVWUBmx418EqTmyQcN503';

// ---------------------------------------------------------------------------
// Redaction helpers (mirror smoke.auth.js)
// ---------------------------------------------------------------------------
const originalLog = console.log;
const originalError = console.error;
const tokensToRedact = new Set();

function redactDatabaseUrl(url) {
  if (typeof url !== 'string') return url;
  return url.replace(/(postgres(?:ql)?:\/\/[^/:]+:)([^@/]+)(@.*)/g, '$1[REDACTED]$3');
}

function redactString(str) {
  if (typeof str !== 'string') return str;
  let result = redactDatabaseUrl(str);
  for (const token of tokensToRedact) {
    if (token && token.length > 5) result = result.split(token).join('[REDACTED]');
  }
  result = result.replace(/\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]*\b/g, '[REDACTED_JWT]');
  return result;
}

function redactSensitive(obj) {
  if (typeof obj === 'string') return redactString(obj);
  if (typeof obj !== 'object' || obj === null) return obj;
  const redacted = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase().includes('token') || key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
      if (typeof value === 'string') tokensToRedact.add(value);
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function processArg(arg) {
  if (typeof arg === 'string') return redactString(arg);
  if (typeof arg === 'object' && arg !== null) return redactSensitive(arg);
  return arg;
}

console.log = function (...args) { originalLog.apply(console, args.map(processArg)); };
console.error = function (...args) { originalError.apply(console, args.map(processArg)); };

// ---------------------------------------------------------------------------
// Bootstrap environment & load auth provider for JWT generation
// ---------------------------------------------------------------------------

// Set runtime defaults before dotenv loads (mirrors smoke.auth.js)
process.env.AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'backend';
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'super_secret_key_at_least_256_bits_for_backend_auth_smoke_testing_1234567890';
process.env.DATABASE_PROVIDER = process.env.DATABASE_PROVIDER || 'postgres';

// Load .env if present (quiet in CI without .env), then alias-bootstrap
require('dotenv').config({ quiet: true });
require('../src/alias-bootstrap');

const { signAccessToken } = require('../src/providers/auth/backend.auth.provider');

const organizerToken = signAccessToken({ uid: ORG_UID, roles: ['organizer'] });

// ---------------------------------------------------------------------------
// Server environment
// ---------------------------------------------------------------------------
const env = {
  ...process.env,
  PORT: TEST_PORT,
  AUTH_PROVIDER: 'backend',
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN: '5m',
  DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
};

let serverProcess = null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// HTTP helper using only Node core http module
// ---------------------------------------------------------------------------
function httpRequest(method, urlPath, opts) {
  if (!opts) opts = {};
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const headers = { ...opts.headers };
    let body = null;
    if (opts.body !== undefined) {
      body = JSON.stringify(opts.body);
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body, 'utf-8');
    }
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, body: data });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function check(label, fn) {
  try {
    await fn();
    console.log(`[PASS] ${label}`);
  } catch (err) {
    console.error(`[FAIL] ${label}: ${err.message}`);
    throw err;
  }
}

async function run() {
  console.log('--- O5-S9 Structured Error Contract Smoke Checks ---');
  console.log('Test Port:', TEST_PORT);

  // -----------------------------------------------------------------------
  // Start server
  // -----------------------------------------------------------------------
  console.log('\nSpawning application server...');
  serverProcess = spawn('node', ['src/server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

  let serverStarted = false;

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Server stdout] ${output.trim()}`);
    if (output.includes('Server address') || output.includes('localhost:')) serverStarted = true;
  });
  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server stderr] ${data.toString().trim()}`);
  });
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  console.log('Waiting for server to become responsive...');
  for (let i = 0; i < 20; i++) {
    if (serverStarted) break;
    try {
      const res = await httpRequest('GET', '/');
      if (res.status === 200) { serverStarted = true; break; }
    } catch { /* server not ready yet */ }
    await sleep(500);
  }
  if (!serverStarted) throw new Error('Server failed to become responsive within 10 s.');
  console.log('Server is responsive at', BASE_URL);

  // -----------------------------------------------------------------------
  // Check 1: missing route → structured 404 with error.message / status / code / requestId
  // -----------------------------------------------------------------------
  await check('GET /nonexistent → structured 404', async () => {
    const r = await httpRequest('GET', '/nonexistent');
    if (r.status !== 404) throw new Error(`Expected 404, got ${r.status}`);
    const e = r.data && r.data.error;
    if (!e || !e.message || !e.status || !e.code || !e.requestId) {
      throw new Error(`Missing structured error fields: ${JSON.stringify(r.data)}`);
    }
    if (e.status !== 404) throw new Error(`Expected error.status 404, got ${e.status}`);
    if (e.code !== 'NOT_FOUND') throw new Error(`Expected error.code NOT_FOUND, got ${e.code}`);
    if (typeof e.message !== 'string' || !e.message.includes('/nonexistent')) {
      throw new Error(`Unexpected error.message: ${e.message}`);
    }
  });

  // -----------------------------------------------------------------------
  // Check 2: GET /events/nearby?lat=abc&lon=1 → structured 400 BAD_REQUEST
  // -----------------------------------------------------------------------
  await check('GET /events/nearby?lat=abc&lon=1 → structured 400 BAD_REQUEST', async () => {
    const r = await httpRequest('GET', '/events/nearby?lat=abc&lon=1');
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
    const e = r.data && r.data.error;
    if (!e || !e.message || !e.status || !e.code || !e.requestId) {
      throw new Error(`Missing structured error fields: ${JSON.stringify(r.data)}`);
    }
    if (e.status !== 400) throw new Error(`Expected error.status 400, got ${e.status}`);
    if (e.code !== 'BAD_REQUEST') throw new Error(`Expected error.code BAD_REQUEST, got ${e.code}`);
    if (typeof e.message !== 'string' || !e.message.includes('lat must be a valid number')) {
      throw new Error(`Unexpected error.message: ${e.message}`);
    }
  });

  // -----------------------------------------------------------------------
  // Check 3: POST /auth/login missing password → structured 400 BAD_REQUEST
  // -----------------------------------------------------------------------
  await check('POST /auth/login {email} → structured 400 BAD_REQUEST', async () => {
    const r = await httpRequest('POST', '/auth/login', { body: { email: 'test@test.com' } });
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
    const e = r.data && r.data.error;
    if (!e || !e.message || !e.status || !e.code || !e.requestId) {
      throw new Error(`Missing structured error fields: ${JSON.stringify(r.data)}`);
    }
    if (e.status !== 400) throw new Error(`Expected error.status 400, got ${e.status}`);
    if (e.code !== 'BAD_REQUEST') throw new Error(`Expected error.code BAD_REQUEST, got ${e.code}`);
    if (typeof e.message !== 'string' || !e.message.includes('Password is required')) {
      throw new Error(`Unexpected error.message: ${e.message}`);
    }
  });

  // -----------------------------------------------------------------------
  // Check 4: GET /users/me without token → 401, message present
  //   Auth middleware returns a flat envelope { error: "Unauthorized: ..." }
  //   which is pre-structured (not wrapped under error.*).  We accept either
  //   shape as long as status is 401 and an error / message string exists.
  // -----------------------------------------------------------------------
  await check('GET /users/me (no token) → 401 with message', async () => {
    const r = await httpRequest('GET', '/users/me');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
    const body = r.data;
    if (!body) throw new Error('Empty response body');
    // Accept flat { error: "..." } or structured { error: { message: "..." } }
    const msg = (body.error && typeof body.error === 'object') ? body.error.message : body.error;
    if (!msg || typeof msg !== 'string') {
      throw new Error(`Expected error/message string in response: ${JSON.stringify(body)}`);
    }
  });

  // -----------------------------------------------------------------------
  // Check 5: POST /organizer/check-in-qr with valid organizer JWT + {}
  //          → legacy 400 { valid: false, error: "INVALID_TICKET" }
  // -----------------------------------------------------------------------
  await check('POST /organizer/check-in-qr (org JWT, {}) → 400 {valid:false, error:INVALID_TICKET}', async () => {
    const r = await httpRequest('POST', '/organizer/check-in-qr', {
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {},
    });
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
    if (!r.data || r.data.valid !== false || r.data.error !== 'INVALID_TICKET') {
      throw new Error(`Expected {valid:false, error:"INVALID_TICKET"}, got ${JSON.stringify(r.data)}`);
    }
  });

  // -----------------------------------------------------------------------
  // Done
  // -----------------------------------------------------------------------
  console.log('\n--- All O5-S9 Structured Error Contract Smoke Checks Passed ---');
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
function cleanup() {
  if (serverProcess) {
    console.log('Shutting down application server...');
    serverProcess.kill();
  }
}

run()
  .then(() => { cleanup(); process.exit(0); })
  .catch((err) => {
    console.error('Smoke test failed:', err.message);
    if (err.response) console.error('Response details:', JSON.stringify(err.response.data, null, 2));
    cleanup();
    process.exit(1);
  });
