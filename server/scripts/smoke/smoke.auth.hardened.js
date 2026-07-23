// scripts/smoke.auth.hardened.js
// Focused smoke test for password reset, email verification, social logins, and fail-closed security.
// Usage:
//   DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev node scripts/smoke.auth.hardened.js

const { spawn } = require('child_process');
const axios = require('axios');

const TEST_PORT = process.env.TEST_PORT || '35433';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev';

const tokensToRedact = new Set();
const dbPassMatch = DATABASE_URL.match(/postgres(?:ql)?:\/\/[^:]+:([^@]+)@/);
if (dbPassMatch && dbPassMatch[1]) {
  tokensToRedact.add(dbPassMatch[1]);
}

function redactDatabaseUrl(url) {
  if (typeof url !== 'string') return url;
  return url.replace(/(postgres(?:ql)?:\/\/[^/:]+:)([^@/]+)(@.*)/g, '$1[REDACTED]$3');
}

function redactString(str) {
  if (typeof str !== 'string') return str;
  let result = str;
  result = redactDatabaseUrl(result);
  for (const token of tokensToRedact) {
    if (token && token.length > 5) {
      result = result.split(token).join('[REDACTED]');
    }
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

const originalLog = console.log;
const originalError = console.error;
console.log = function(...args) {
  originalLog.apply(console, args.map(processArg));
};
console.error = function(...args) {
  originalError.apply(console, args.map(processArg));
};

axios.interceptors.response.use((response) => {
  if (response && response.data) redactSensitive(response.data);
  return response;
}, (error) => {
  if (error && error.response && error.response.data) redactSensitive(error.response.data);
  return Promise.reject(error);
});

console.log('--- Starting Hardened Auth Smoke Test ---');

const envBase = {
  ...process.env,
  PORT: TEST_PORT,
  DATABASE_URL: DATABASE_URL,
  AUTH_PROVIDER: 'backend',
  ACCESS_TOKEN_SECRET: 'super_secret_key_at_least_256_bits_for_backend_auth_smoke_testing_1234567890',
  ACCESS_TOKEN_EXPIRES_IN: '5m',
  REFRESH_TOKEN_EXPIRES_IN: '1d',
  DATABASE_PROVIDER: 'postgres',
  AUTH_MOCK_EMAIL: 'true',
};

let serverProcess = null;
let lastResetToken = null;
let lastVerifyToken = null;
let stdoutBuffer = '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startServer(additionalEnv = {}) {
  const env = { ...envBase, ...additionalEnv };
  console.log(`\n[Test] Spawning application server on port ${TEST_PORT}...`);

  stdoutBuffer = '';
  lastResetToken = null;
  lastVerifyToken = null;

  serverProcess = spawn('node', ['src/server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

  serverProcess.stdout.on('data', (data) => {
    stdoutBuffer += data.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.includes('Use this token to reset your password:')) {
        const match = line.match(/Use this token to reset your password:\s*([a-f0-9]+)/i);
        if (match) {
          lastResetToken = match[1];
          tokensToRedact.add(lastResetToken);
          console.log(`[Test] Intercepted password reset token: ${lastResetToken.substring(0, 8)}...[REDACTED]`);
        }
      }
      if (line.includes('Use this token to verify your email:')) {
        const match = line.match(/Use this token to verify your email:\s*([a-f0-9]+)/i);
        if (match) {
          lastVerifyToken = match[1];
          tokensToRedact.add(lastVerifyToken);
          console.log(`[Test] Intercepted email verification token: ${lastVerifyToken.substring(0, 8)}...[REDACTED]`);
        }
      }
    }
  });

  serverProcess.stderr.on('data', () => {});
}

function stopServer() {
  if (serverProcess) {
    console.log('[Test] Stopping application server...');
    serverProcess.kill();
    serverProcess = null;
    stdoutBuffer = '';
  }
}

async function waitForServer() {
  console.log('[Test] Waiting for server to become responsive...');
  for (let i = 0; i < 30; i++) {
    try {
      const res = await axios.get(BASE_URL, { timeout: 3000 });
      if (res.status === 200) {
        console.log('[Test] Server is responsive.');
        return;
      }
    } catch (err) {
      // server not ready yet
    }
    await sleep(1000);
  }
  throw new Error('Server did not become responsive within 30 seconds.');
}

async function run() {
  // -----------------------------------------------------------------------
  // PHASE 1: NODE_ENV=development + AUTH_SOCIAL_DEV_BYPASS=true
  // -----------------------------------------------------------------------
  startServer({
    NODE_ENV: 'development',
    AUTH_SOCIAL_DEV_BYPASS: 'true',
  });
  await waitForServer();

  const email = `test_hardened_${Date.now()}@example.com`;
  const password = 'OldPassword123!';
  const newPassword = 'NewPassword456!';

  // 1. Register user
  console.log('\n[Test] Registering synthetic user...');
  const regRes = await axios.post(`${BASE_URL}/auth/register`, {
    email,
    password,
    name: 'Hardened User',
  });
  if (regRes.status !== 201) throw new Error('Failed to register user');
  console.log('[OK] Registered successfully.');

  // 2. Request email verification
  console.log('\n[Test] Requesting email verification...');
  lastVerifyToken = null;
  const verifyReqRes = await axios.post(`${BASE_URL}/auth/email-verification/request`, { email });
  if (verifyReqRes.status !== 200) throw new Error('Email verification request failed');
  await sleep(2000);
  if (!lastVerifyToken) throw new Error('Failed to intercept email verification token');
  console.log('[OK] Intercepted email verification token.');

  // 3. Confirm email verification
  console.log('\n[Test] Confirming email verification...');
  const verifyConfirmRes = await axios.post(`${BASE_URL}/auth/email-verification/confirm`, { token: lastVerifyToken });
  if (verifyConfirmRes.status !== 200 || !verifyConfirmRes.data.success) {
    throw new Error('Email verification confirmation failed');
  }
  console.log('[OK] Email verified.');

  // 4. Email verification token single-use
  console.log('\n[Test] Reusing email verification token (should fail 400)...');
  try {
    await axios.post(`${BASE_URL}/auth/email-verification/confirm`, { token: lastVerifyToken });
    throw new Error('Email verification token reuse should have been rejected');
  } catch (err) {
    if (!err.response || err.response.status !== 400) {
      throw new Error(`Expected 400 for reused email token, got ${err.response ? err.response.status : 'no response'}`);
    }
    console.log('[OK] Email verification token is single-use (got 400).');
  }

  // 5. Create two active sessions
  console.log('\n[Test] Logging in (Session A)...');
  const loginARes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  const refreshA = loginARes.data.refreshToken;

  console.log('\n[Test] Logging in (Session B)...');
  const loginBRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  const refreshB = loginBRes.data.refreshToken;

  // 6. Request password reset
  console.log('\n[Test] Requesting password reset...');
  lastResetToken = null;
  const resetReqRes = await axios.post(`${BASE_URL}/auth/password-reset/request`, { email });
  if (resetReqRes.status !== 200) throw new Error('Password reset request failed');
  await sleep(2000);
  if (!lastResetToken) throw new Error('Failed to intercept password reset token');
  console.log('[OK] Intercepted password reset token.');

  // 7. Confirm password reset (revokes Session A and B)
  console.log('\n[Test] Confirming password reset...');
  const resetConfirmRes = await axios.post(`${BASE_URL}/auth/password-reset/confirm`, {
    token: lastResetToken,
    newPassword,
  });
  if (resetConfirmRes.status !== 200 || !resetConfirmRes.data.success) {
    throw new Error('Password reset confirmation failed');
  }
  console.log('[OK] Password reset confirmed.');

  // 8. Password reset token single-use
  console.log('\n[Test] Reusing password reset token (should fail 400)...');
  try {
    await axios.post(`${BASE_URL}/auth/password-reset/confirm`, {
      token: lastResetToken,
      newPassword: 'AnotherPass789!',
    });
    throw new Error('Password reset token reuse should have been rejected');
  } catch (err) {
    if (!err.response || err.response.status !== 400) {
      throw new Error(`Expected 400 for reused reset token, got ${err.response ? err.response.status : 'no response'}`);
    }
    console.log('[OK] Password reset token is single-use (got 400).');
  }

  // 9. Session A refresh must fail (revoked by password reset)
  console.log('\n[Test] Session A refresh (should fail 401)...');
  try {
    await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refreshA });
    throw new Error('Session A refresh should have been revoked');
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      throw new Error(`Expected 401 for revoked session A, got ${err.response ? err.response.status : 'no response'}`);
    }
    console.log('[OK] Session A refresh revoked (401).');
  }

  // 10. Session B refresh must fail (revoked by password reset)
  console.log('\n[Test] Session B refresh (should fail 401)...');
  try {
    await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refreshB });
    throw new Error('Session B refresh should have been revoked');
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      throw new Error(`Expected 401 for revoked session B, got ${err.response ? err.response.status : 'no response'}`);
    }
    console.log('[OK] Session B refresh revoked (401).');
  }

  // 11. Old password must fail
  console.log('\n[Test] Old password login (should fail 401)...');
  try {
    await axios.post(`${BASE_URL}/auth/login`, { email, password });
    throw new Error('Old password login should have been rejected');
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      throw new Error(`Expected 401 for old password, got ${err.response ? err.response.status : 'no response'}`);
    }
    console.log('[OK] Old password rejected (401).');
  }

  // 12. New password must succeed
  console.log('\n[Test] New password login (should succeed)...');
  const newLoginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password: newPassword });
  if (newLoginRes.status !== 200 || !newLoginRes.data.accessToken) {
    throw new Error('New password login failed');
  }
  console.log('[OK] New password login succeeded.');

  // 13. Google login bypass in development
  console.log('\n[Test] Google login bypass in development...');
  const googleRes = await axios.post(`${BASE_URL}/auth/google-login`, {
    idToken: 'mock_google_token_harden_google',
    role: 'user',
  });
  if (googleRes.status !== 200 || !googleRes.data.accessToken) {
    throw new Error('Google login bypass failed');
  }
  console.log('[OK] Google login bypass successful.');

  // 14. Facebook login bypass in development
  console.log('\n[Test] Facebook login bypass in development...');
  const facebookRes = await axios.post(`${BASE_URL}/auth/facebook-login`, {
    accessToken: 'mock_facebook_token_harden_fb',
    role: 'user',
  });
  if (facebookRes.status !== 200 || !facebookRes.data.accessToken) {
    throw new Error('Facebook login bypass failed');
  }
  console.log('[OK] Facebook login bypass successful.');

  stopServer();

  // -----------------------------------------------------------------------
  // PHASE 2: NODE_ENV=production + AUTH_SOCIAL_DEV_BYPASS=true (no provider configs)
  //   - bypass condition requires NODE_ENV === 'development', so in production
  //     the bypass is inactive even when AUTH_SOCIAL_DEV_BYPASS=true.
  //   - No GOOGLE_ALLOWED_CLIENT_IDS / FACEBOOK_APP_ID / FACEBOOK_APP_SECRET
  //     tests the deterministic fail-closed path.
  // -----------------------------------------------------------------------
  startServer({
    NODE_ENV: 'production',
    AUTH_SOCIAL_DEV_BYPASS: 'true',
    // Intentionally omit GOOGLE_ALLOWED_CLIENT_IDS, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET
  });
  await waitForServer();

  // 15. Google login must fail in production (bypass inactive, token invalid, or config missing)
  console.log('\n[Test] Google login in production with bypass=true (should fail 401)...');
  try {
    await axios.post(`${BASE_URL}/auth/google-login`, {
      idToken: 'mock_google_token_harden_google',
      role: 'user',
    });
    throw new Error('Google login succeeded in production');
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      throw new Error(`Expected 401 for Google production login, got ${err.response ? err.response.status : 'no response'}`);
    }
    console.log('[OK] Google login rejected in production (401).');
  }

  // 16. Facebook login must fail in production (bypass inactive, no config → fail-closed)
  console.log('\n[Test] Facebook login in production with bypass=true (no config, should fail 401)...');
  try {
    await axios.post(`${BASE_URL}/auth/facebook-login`, {
      accessToken: 'mock_facebook_token_harden_fb',
      role: 'user',
    });
    throw new Error('Facebook login succeeded in production');
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      throw new Error(`Expected 401 for Facebook production login, got ${err.response ? err.response.status : 'no response'}`);
    }
    console.log('[OK] Facebook login rejected in production (401) - fail-closed.');
  }

  console.log('\n--- All Hardened Auth Smoke Tests Passed Successfully! ---');
}

run()
  .then(() => {
    stopServer();
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Error] Test failed:', err.message);
    if (err.response) {
      console.error('[Error] Response details:', JSON.stringify(err.response.data, null, 2));
    }
    stopServer();
    process.exit(1);
  });
