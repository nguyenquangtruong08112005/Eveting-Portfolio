// scripts/smoke/smoke.csrf-session.js
// Focused smoke test for Phase 01-T3 (Session Management, Rotating Refresh, CSRF Defense & Email Verification Guard)

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');
const { Client } = require('pg');

const TEST_PORT = process.env.TEST_PORT || '35433';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev';

console.log('--- Starting Phase 01-T3 CSRF & Session Hardening Test ---');

const env = {
  ...process.env,
  PORT: TEST_PORT,
  DATABASE_URL: DATABASE_URL,
  AUTH_PROVIDER: 'backend',
  ACCESS_TOKEN_SECRET: 'super_secret_key_at_least_256_bits_for_backend_auth_smoke_testing_1234567890',
  ACCESS_TOKEN_EXPIRES_IN: '5m',
  REFRESH_TOKEN_EXPIRES_IN: '1d',
  DATABASE_PROVIDER: 'postgres',
  COOKIE_SECURE: 'false',
  NODE_ENV: 'test',
};

let serverProcess = null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseCookies(response) {
  const setCookieHeaders = response.headers['set-cookie'] || [];
  const cookies = {};
  setCookieHeaders.forEach((header) => {
    const parts = header.split(';');
    const [pair] = parts;
    const eqIdx = pair.indexOf('=');
    if (eqIdx !== -1) {
      const key = pair.substring(0, eqIdx).trim();
      const value = pair.substring(eqIdx + 1).trim();
      const isHttpOnly = parts.some((p) => p.trim().toLowerCase() === 'httponly');
      const sameSiteMatch = parts.find((p) => p.trim().toLowerCase().startsWith('samesite='));
      const sameSite = sameSiteMatch ? sameSiteMatch.split('=')[1].trim() : null;
      cookies[key] = { value, httpOnly: isHttpOnly, sameSite, raw: header };
    }
  });
  return cookies;
}

function buildCookieHeader(cookieObj) {
  return Object.entries(cookieObj)
    .map(([k, v]) => `${k}=${v.value}`)
    .join('; ');
}

async function run() {
  serverProcess = spawn('node', ['src/server.js'], {
    cwd: path.resolve(__dirname, '../..'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverStarted = false;
  serverProcess.stdout.on('data', (data) => {
    if (data.toString().includes('Server address') || data.toString().includes('localhost:')) {
      serverStarted = true;
    }
  });

  for (let i = 0; i < 20; i++) {
    if (serverStarted) break;
    try {
      const res = await axios.get(BASE_URL);
      if (res.status === 200) {
        serverStarted = true;
        break;
      }
    } catch (e) {
      /* ignore */
    }
    await sleep(500);
  }

  if (!serverStarted) {
    throw new Error('Server failed to start within 10 seconds.');
  }

  const pgClient = new Client({ connectionString: DATABASE_URL });
  await pgClient.connect();

  const userEmail = `csrf_test_${Date.now()}@moteo.fun`;
  const userPassword = 'TestPassword123!';
  const userName = 'CSRF Tester';

  // 1. Register user via /api/web/auth/register (unverified)
  console.log('\nStep 1: Register unverified web user');
  const regRes = await axios.post(`${BASE_URL}/api/web/auth/register`, {
    email: userEmail,
    password: userPassword,
    name: userName,
  });

  if (regRes.status !== 201 || !regRes.data.pendingVerification) {
    throw new Error('Expected 201 and pendingVerification for web registration');
  }

  // Get user ID from DB
  const dbUser = await pgClient.query('SELECT id, email_verified FROM auth_users WHERE email = $1', [userEmail]);
  if (!dbUser.rows.length) {
    throw new Error('Registered user not found in DB');
  }
  const userId = dbUser.rows[0].id;
  console.log('[OK] Registration successful for user ID:', userId);

  // 2. Web Login
  console.log('\nStep 2: Web Login (/api/web/auth/login)');
  const loginRes = await axios.post(`${BASE_URL}/api/web/auth/login`, {
    email: userEmail,
    password: userPassword,
  });

  if (loginRes.status !== 200) {
    throw new Error(`Expected 200 from web login, got ${loginRes.status}`);
  }

  // Assert ZERO auth tokens in web response JSON body
  if (loginRes.data.accessToken || loginRes.data.refreshToken) {
    throw new Error('Security Violation: Auth tokens leaked in web JSON response body!');
  }
  if (!loginRes.data.user || loginRes.data.user.id !== userId) {
    throw new Error('Web login response user mismatch');
  }
  console.log('[OK] Zero auth tokens in web login JSON response body.');

  // Assert Cookie Flags
  const webCookies = parseCookies(loginRes);
  if (!webCookies.accessToken || !webCookies.accessToken.httpOnly) {
    throw new Error('accessToken cookie must be present and HttpOnly!');
  }
  if (!webCookies.refreshToken || !webCookies.refreshToken.httpOnly) {
    throw new Error('refreshToken cookie must be present and HttpOnly!');
  }
  if (!webCookies.csrfToken || webCookies.csrfToken.httpOnly) {
    throw new Error('csrfToken cookie must be present and non-HttpOnly!');
  }
  console.log('[OK] Web cookie flags verified (accessToken HttpOnly, refreshToken HttpOnly, csrfToken non-HttpOnly).');

  // 3. CSRF Protection Check
  console.log('\nStep 3: CSRF Protection on Protected Web Mutation');
  const cookieHeaderStr = buildCookieHeader(webCookies);

  // 3a. Missing X-CSRF-Token header -> 403 Forbidden
  try {
    await axios.post(
      `${BASE_URL}/api/web/tickets/book`,
      { eventId: 'dummy-event', ticketType: 'standard', quantity: 1 },
      { headers: { Cookie: cookieHeaderStr } }
    );
    throw new Error('Expected 403 Forbidden when X-CSRF-Token is missing, but request succeeded');
  } catch (err) {
    if (!err.response || err.response.status !== 403) {
      throw new Error(`Expected 403 Forbidden for missing CSRF header, got ${err.response ? err.response.status : 'no response'}`);
    }
  }
  console.log('[OK] Missing X-CSRF-Token header rejected with 403 Forbidden.');

  // 3b. Invalid X-CSRF-Token header -> 403 Forbidden
  try {
    await axios.post(
      `${BASE_URL}/api/web/tickets/book`,
      { eventId: 'dummy-event', ticketType: 'standard', quantity: 1 },
      {
        headers: {
          Cookie: cookieHeaderStr,
          'X-CSRF-Token': 'invalid_csrf_token_value_123',
        },
      }
    );
    throw new Error('Expected 403 Forbidden when X-CSRF-Token is invalid, but request succeeded');
  } catch (err) {
    if (!err.response || err.response.status !== 403) {
      throw new Error(`Expected 403 Forbidden for invalid CSRF header, got ${err.response ? err.response.status : 'no response'}`);
    }
  }
  console.log('[OK] Invalid X-CSRF-Token header rejected with 403 Forbidden.');

  // 3c. Valid X-CSRF-Token header passes CSRF middleware check (reaches email verification guard -> 403 Email Verification Required)
  try {
    await axios.post(
      `${BASE_URL}/api/web/tickets/book`,
      { eventId: 'dummy-event', ticketType: 'standard', quantity: 1 },
      {
        headers: {
          Cookie: cookieHeaderStr,
          'X-CSRF-Token': webCookies.csrfToken.value,
        },
      }
    );
    throw new Error('Expected 403 Email Verification Required, but request succeeded');
  } catch (err) {
    if (!err.response || err.response.status !== 403) {
      throw new Error(`Expected 403 for unverified user booking, got ${err.response ? err.response.status : 'no response'}`);
    }
    if (!err.response.data || err.response.data.code !== 'EMAIL_VERIFICATION_REQUIRED') {
      throw new Error(`Expected EMAIL_VERIFICATION_REQUIRED error code, got ${JSON.stringify(err.response.data)}`);
    }
  }
  console.log('[OK] Valid X-CSRF-Token header passed CSRF check and triggered verified-email guard as expected.');

  // 4. Mobile Login & Bearer Token Verification
  console.log('\nStep 4: Mobile Login & Bearer Tokens (/api/mobile/auth/login)');
  const mobileLoginRes = await axios.post(`${BASE_URL}/api/mobile/auth/login`, {
    email: userEmail,
    password: userPassword,
  });

  if (mobileLoginRes.status !== 200) {
    throw new Error(`Expected 200 from mobile login, got ${mobileLoginRes.status}`);
  }
  const { accessToken: mobileAccess, refreshToken: mobileRefresh } = mobileLoginRes.data;
  if (!mobileAccess || !mobileRefresh) {
    throw new Error('Mobile login response must return accessToken and refreshToken in JSON body');
  }
  console.log('[OK] Mobile login returns bearer tokens in JSON body.');

  // 5. Web Refresh & Rotating Refresh Token
  console.log('\nStep 5: Web Token Refresh & Rotation (/api/web/auth/refresh)');
  const refreshRes = await axios.post(
    `${BASE_URL}/api/web/auth/refresh`,
    {},
    { headers: { Cookie: cookieHeaderStr } }
  );

  if (refreshRes.status !== 200) {
    throw new Error(`Expected 200 from web refresh, got ${refreshRes.status}`);
  }
  if (refreshRes.data.accessToken || refreshRes.data.refreshToken) {
    throw new Error('Security Violation: Tokens returned in web refresh JSON body!');
  }

  const rotatedCookies = parseCookies(refreshRes);
  if (!rotatedCookies.accessToken || !rotatedCookies.refreshToken) {
    throw new Error('Rotated cookies not set in web refresh response!');
  }
  console.log('[OK] Refresh rotated cookies successfully and returned zero auth tokens in JSON body.');

  // 6. Token Reuse Detection & Revocation
  console.log('\nStep 6: Token Reuse Detection & Automatic Session Revocation');
  // Attempt to reuse the OLD (now revoked) refresh token
  try {
    await axios.post(
      `${BASE_URL}/api/web/auth/refresh`,
      {},
      { headers: { Cookie: cookieHeaderStr } } // Old cookies
    );
    throw new Error('Expected 401 Unauthorized for reused refresh token, but request succeeded');
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for reused refresh token, got ${err.response ? err.response.status : 'no response'}`);
    }
  }
  console.log('[OK] Reusing old refresh token rejected with 401 Unauthorized.');

  // Verify that all user sessions are now revoked due to reuse detection
  const activeSessions = await pgClient.query(
    'SELECT id FROM sessions WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
  if (activeSessions.rows.length !== 0) {
    throw new Error(`Reuse detection failure: Expected 0 active sessions, found ${activeSessions.rows.length}`);
  }
  console.log('[OK] Reuse detection successfully revoked all active sessions for user.');

  // 7. Verified Email Guard Testing
  console.log('\nStep 7: Verified Email Guard Testing');
  // Verify user's email in DB
  await pgClient.query('UPDATE auth_users SET email_verified = true WHERE id = $1', [userId]);

  // Log in again to get fresh valid tokens
  const freshLogin = await axios.post(`${BASE_URL}/api/web/auth/login`, {
    email: userEmail,
    password: userPassword,
  });
  const freshCookies = parseCookies(freshLogin);
  const freshCookieStr = buildCookieHeader(freshCookies);

  // Protected mutation (e.g. POST /api/web/tickets/book) with verified email + valid CSRF
  const verifiedMutationRes = await axios.post(
    `${BASE_URL}/api/web/tickets/book`,
    { eventId: 'non-existent-event', ticketType: 'standard', quantity: 1 },
    {
      headers: {
        Cookie: freshCookieStr,
        'X-CSRF-Token': freshCookies.csrfToken.value,
      },
      validateStatus: () => true, // Accept 404/400 from ticket service business logic
    }
  );

  // Should NOT be 403 Forbidden (email verified & CSRF valid)
  if (verifiedMutationRes.status === 403) {
    throw new Error(`Verified user request was unexpectedly blocked with 403: ${JSON.stringify(verifiedMutationRes.data)}`);
  }
  console.log('[OK] Verified user request passed email verification guard (received business logic status:', verifiedMutationRes.status, ').');

  await pgClient.end();
  console.log('\n--- ALL PHASE 01-T3 CSRF & SESSION HARDENING TESTS PASSED! ---');
}

function cleanup() {
  if (serverProcess) {
    serverProcess.kill();
  }
}

run()
  .then(() => {
    cleanup();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nTest Failed:', err.message);
    if (err.response) {
      console.error('Response details:', JSON.stringify(err.response.data, null, 2));
    }
    cleanup();
    process.exit(1);
  });
