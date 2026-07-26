// scripts/smoke.auth.js
// Smoke test for Phase C4 backend auth route wiring
// Usage:
//   DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev node scripts/smoke.auth.js

const { spawn } = require('child_process');
const axios = require('axios');

const TEST_PORT = process.env.TEST_PORT || '35432';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev';

const originalLog = console.log;
const originalError = console.error;
const tokensToRedact = new Set();

// Extract password from DATABASE_URL and add to redact set
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
  // Match standard JWT signatures/structures
  result = result.replace(/\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]*\b/g, '[REDACTED_JWT]');
  return result;
}

function redactSensitive(obj) {
  if (typeof obj === 'string') {
    return redactString(obj);
  }
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  const redacted = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase().includes('token') || key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
      if (typeof value === 'string') {
        tokensToRedact.add(value);
      }
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
  if (typeof arg === 'string') {
    return redactString(arg);
  } else if (typeof arg === 'object' && arg !== null) {
    return redactSensitive(arg);
  }
  return arg;
}

console.log = function(...args) {
  originalLog.apply(console, args.map(processArg));
};

console.error = function(...args) {
  originalError.apply(console, args.map(processArg));
};

// Axios response interceptor to capture and redact response data tokens
axios.interceptors.response.use((response) => {
  if (response && response.data) {
    redactSensitive(response.data);
  }
  return response;
}, (error) => {
  if (error && error.response && error.response.data) {
    redactSensitive(error.response.data);
  }
  return Promise.reject(error);
});

console.log('--- Starting Auth Smoke Test ---');
console.log('Database URL:', DATABASE_URL);
console.log('Test Port:', TEST_PORT);

// Set required environment variables for the app server
const env = {
  ...process.env,
  PORT: TEST_PORT,
  DATABASE_URL: DATABASE_URL,
  AUTH_PROVIDER: 'backend',
  ACCESS_TOKEN_SECRET: 'super_secret_key_at_least_256_bits_for_backend_auth_smoke_testing_1234567890',
  ACCESS_TOKEN_EXPIRES_IN: '5m',
  REFRESH_TOKEN_EXPIRES_IN: '1d',
  DATABASE_PROVIDER: 'postgres',
  AUTH_SOCIAL_DEV_BYPASS: 'true',
  AUTH_MOCK_EMAIL: 'true',
  NODE_ENV: 'test',
};

let serverProcess = null;
let lastCapturedToken = null;

// Helper function to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const path = require('path');
  serverProcess = spawn('node', ['src/server.js'], { cwd: path.resolve(__dirname, '../..'), env, stdio: ['ignore', 'pipe', 'pipe'] });

  let serverStarted = false;
  
  // Capture stdout to detect when the server has started
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Server stdout] ${output.trim()}`);
    if (output.includes('Server address') || output.includes('localhost:')) {
      serverStarted = true;
    }
    const tokenMatch = output.match(/token=([a-f0-9]{64})/);
    if (tokenMatch) {
      lastCapturedToken = tokenMatch[1];
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server stderr] ${data.toString().trim()}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  // Wait up to 10 seconds for the server to spin up
  console.log('Waiting for server to become responsive...');
  for (let i = 0; i < 20; i++) {
    if (serverStarted) break;
    try {
      const res = await axios.get(BASE_URL);
      if (res.status === 200) {
        serverStarted = true;
        break;
      }
    } catch (err) {
      // Ignored, server not ready yet
    }
    await sleep(500);
  }

  if (!serverStarted) {
    throw new Error('Server failed to start or did not become responsive within 10 seconds.');
  }
  console.log('Server is responsive at:', BASE_URL);

  // 2. Register a new user
  const email = `synthetic_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'StrongTestPassword123!';
  const name = 'Synthetic User';

  console.log('\nTesting: POST /auth/register');
  const regRes = await axios.post(`${BASE_URL}/auth/register`, { email, password, name });
  
  console.log('Register Response Status:', regRes.status);
  console.log('Register Response Data:', JSON.stringify(regRes.data, null, 2));

  // Validations for register response
  if (regRes.status !== 201) {
    throw new Error(`Expected 201 from register, got ${regRes.status}`);
  }
  if (!regRes.data.accessToken || !regRes.data.refreshToken || !regRes.data.user) {
    throw new Error('Register response missing tokens or user profile.');
  }
  if (regRes.data.user.email !== email || regRes.data.user.name !== name) {
    throw new Error('Register response user object mismatch.');
  }
  if (regRes.data.user.password_hash || regRes.data.user.password || regRes.data.password_hash) {
    throw new Error('Security violation: password hash leaked in register response.');
  }
  console.log('[OK] Register test passed.');

  // 2.1. GET /users/me after register
  console.log('\nTesting: GET /users/me (after register)');
  const regMeRes = await axios.get(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${regRes.data.accessToken}` }
  });
  if (regMeRes.status !== 200) {
    throw new Error(`Expected 200 from /users/me, got ${regMeRes.status}`);
  }
  if (regMeRes.data.id !== regRes.data.user.id) {
    throw new Error(`User id mismatch in /users/me after register`);
  }
  if (regMeRes.data.email !== email) {
    throw new Error(`User email mismatch in /users/me after register`);
  }
  console.log('[OK] GET /users/me after register test passed.');

  // 2.5. Test role-based registration
  const roleTestPassword = 'StrongTestPassword456!';

  console.log('\nTesting: POST /auth/register (default role)');
  const defaultRoleEmail = `synthetic_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  const defaultRoleRes = await axios.post(`${BASE_URL}/auth/register`, {
    email: defaultRoleEmail, password: roleTestPassword, name: 'Default Role User'
  });
  if (defaultRoleRes.status !== 201) {
    throw new Error(`Expected 201 for default role register, got ${defaultRoleRes.status}`);
  }
  if (!defaultRoleRes.data.user.roles || defaultRoleRes.data.user.roles[0] !== 'user') {
    throw new Error(`Expected default role 'user', got ${JSON.stringify(defaultRoleRes.data.user.roles)}`);
  }
  console.log('[OK] Default role registration test passed.');

  console.log('\nTesting: POST /auth/register (organizer role)');
  const organizerEmail = `synthetic_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  const organizerRes = await axios.post(`${BASE_URL}/auth/register`, {
    email: organizerEmail, password: roleTestPassword, name: 'Organizer User', role: 'organizer'
  });
  if (organizerRes.status !== 201) {
    throw new Error(`Expected 201 for organizer register, got ${organizerRes.status}`);
  }
  if (!organizerRes.data.user.roles || organizerRes.data.user.roles[0] !== 'organizer') {
    throw new Error(`Expected role 'organizer', got ${JSON.stringify(organizerRes.data.user.roles)}`);
  }
  console.log('[OK] Organizer role registration test passed.');

  // 2.5.1. GET /users/me after organizer register (check isOrganizer)
  console.log('\nTesting: GET /users/me (after organizer register)');
  const orgMeRes = await axios.get(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${organizerRes.data.accessToken}` }
  });
  if (orgMeRes.status !== 200) {
    throw new Error(`Expected 200 from /users/me for organizer, got ${orgMeRes.status}`);
  }
  if (orgMeRes.data.id !== organizerRes.data.user.id) {
    throw new Error(`Organizer id mismatch in /users/me`);
  }
  if (orgMeRes.data.isOrganizer !== true) {
    throw new Error(`Expected isOrganizer to be true for organizer profile`);
  }
  console.log('[OK] GET /users/me after organizer register (isOrganizer) test passed.');

  console.log('\nTesting: POST /auth/register (invalid role -> 400)');
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      email: `invalid_${Date.now()}@test.com`, password: roleTestPassword, name: 'Invalid Role', role: 'admin'
    });
    throw new Error('Expected 400 for invalid role, but request succeeded.');
  } catch (err) {
    if (!err.response || err.response.status !== 400) {
      throw new Error(`Expected 400 for invalid role, got ${err.response ? err.response.status : 'no response'}`);
    }
  }
  console.log('[OK] Invalid role (admin) rejected with 400 test passed.');

  // 3. Login
  console.log('\nTesting: POST /auth/login');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  
  console.log('Login Response Status:', loginRes.status);
  console.log('Login Response Data:', JSON.stringify(loginRes.data, null, 2));

  if (loginRes.status !== 200) {
    throw new Error(`Expected 200 from login, got ${loginRes.status}`);
  }
  const { accessToken, refreshToken, user } = loginRes.data;
  if (!accessToken || !refreshToken || !user) {
    throw new Error('Login response missing tokens or user profile.');
  }
  if (user.email !== email) {
    throw new Error('Login response user email mismatch.');
  }
  if (user.password_hash || user.password) {
    throw new Error('Security violation: password hash leaked in login response.');
  }
  console.log('[OK] Login test passed.');

  // 3.1. GET /users/me after login
  console.log('\nTesting: GET /users/me (after login)');
  const loginMeRes = await axios.get(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${loginRes.data.accessToken}` }
  });
  if (loginMeRes.status !== 200) {
    throw new Error(`Expected 200 from /users/me after login, got ${loginMeRes.status}`);
  }
  if (loginMeRes.data.id !== user.id) {
    throw new Error(`User id mismatch in /users/me after login`);
  }
  if (loginMeRes.data.email !== email) {
    throw new Error(`User email mismatch in /users/me after login`);
  }
  console.log('[OK] GET /users/me after login test passed.');

  // 4. Refresh
  console.log('\nTesting: POST /auth/refresh');
  const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
  
  console.log('Refresh Response Status:', refreshRes.status);
  console.log('Refresh Response Data:', JSON.stringify(refreshRes.data, null, 2));

  if (refreshRes.status !== 200) {
    throw new Error(`Expected 200 from refresh, got ${refreshRes.status}`);
  }
  const newAccessToken = refreshRes.data.accessToken;
  const newRefreshToken = refreshRes.data.refreshToken;
  if (!newAccessToken || !newRefreshToken) {
    throw new Error('Refresh response missing new tokens.');
  }
  console.log('[OK] Refresh test passed.');

  // 5. Logout
  console.log('\nTesting: POST /auth/logout');
  const logoutRes = await axios.post(`${BASE_URL}/auth/logout`, { refreshToken: newRefreshToken });
  
  console.log('Logout Response Status:', logoutRes.status);
  console.log('Logout Response Data:', JSON.stringify(logoutRes.data, null, 2));

  if (logoutRes.status !== 200) {
    throw new Error(`Expected 200 from logout, got ${logoutRes.status}`);
  }
  if (logoutRes.data.success !== true) {
    throw new Error('Expected success: true from logout.');
  }
  console.log('[OK] Logout test passed.');

  // 6. Verify revoked refresh fails
  console.log('\nTesting: POST /auth/refresh (with revoked token)');
  try {
    await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: newRefreshToken });
    throw new Error('Expected refresh with revoked token to fail, but it succeeded.');
  } catch (err) {
    if (!err.response) {
      throw err;
    }
    console.log('Revoked Refresh Response Status:', err.response.status);
    console.log('Revoked Refresh Response Data:', JSON.stringify(err.response.data, null, 2));
    if (err.response.status !== 401) {
      throw new Error(`Expected 401 for revoked refresh token, got ${err.response.status}`);
    }
  }
  console.log('[OK] Revoked refresh token check passed.');

  // 7. Test protected routes & logout-all
  // Let's first register another synthetic user or log in again to get fresh tokens
  console.log('\nTesting: POST /auth/login (getting tokens for logout-all test)');
  const login2Res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  const activeAccessToken = login2Res.data.accessToken;
  const activeRefreshToken = login2Res.data.refreshToken;

  console.log('\nTesting: POST /auth/logout-all (with invalid bearer token)');
  try {
    await axios.post(
      `${BASE_URL}/auth/logout-all`,
      {},
      {
        headers: {
          Authorization: 'Bearer invalid_bearer_token_value_here_that_is_malformed',
        },
      }
    );
    throw new Error('Expected invalid bearer token on /auth/logout-all to fail, but it succeeded.');
  } catch (err) {
    if (!err.response) {
      throw err;
    }
    console.log('Invalid Bearer Token Response Status:', err.response.status);
    console.log('Invalid Bearer Token Response Data:', JSON.stringify(err.response.data, null, 2));
    if (err.response.status !== 401) {
      throw new Error(`Expected 401 for invalid bearer token on /auth/logout-all, got ${err.response.status}`);
    }
  }
  console.log('[OK] Invalid bearer token on /auth/logout-all returns 401 check passed.');

  console.log('\nTesting: POST /auth/logout-all (protected route)');
  const logoutAllRes = await axios.post(
    `${BASE_URL}/auth/logout-all`,
    {},
    {
      headers: {
        Authorization: `Bearer ${activeAccessToken}`,
      },
    }
  );
  
  console.log('LogoutAll Response Status:', logoutAllRes.status);
  console.log('LogoutAll Response Data:', JSON.stringify(logoutAllRes.data, null, 2));

  if (logoutAllRes.status !== 200) {
    throw new Error(`Expected 200 from logout-all, got ${logoutAllRes.status}`);
  }
  if (logoutAllRes.data.success !== true) {
    throw new Error('Expected success: true from logout-all.');
  }

  // Verify that refreshing with the session's refresh token now fails (since all sessions are revoked)
  console.log('\nTesting: POST /auth/refresh (with token revoked via logout-all)');
  try {
    await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: activeRefreshToken });
    throw new Error('Expected refresh with logout-all revoked token to fail, but it succeeded.');
  } catch (err) {
    if (!err.response) {
      throw err;
    }
    console.log('Revoked (logout-all) Refresh Response Status:', err.response.status);
    console.log('Revoked (logout-all) Refresh Response Data:', JSON.stringify(err.response.data, null, 2));
    if (err.response.status !== 401) {
      throw new Error(`Expected 401 for revoked (logout-all) refresh token, got ${err.response.status}`);
    }
  }
  console.log('[OK] Logout-all test passed.');

  // 7.1. Route-based Transport Selection Verification (req.body.clientTransport IGNORED)
  console.log('\nTesting: POST /auth/register with clientTransport in body (Must derive mobile transport from route prefix)');
  const mobileLegacyEmail = `legacy_mobile_${Date.now()}@test.com`;
  const mobileLegacyRes = await axios.post(`${BASE_URL}/auth/register`, {
    email: mobileLegacyEmail,
    password: 'Password123!',
    name: 'Legacy Mobile User',
    clientTransport: 'web', // Intentionally untrusted body property
  });
  if (mobileLegacyRes.status !== 201) {
    throw new Error(`Expected 201 from legacy register, got ${mobileLegacyRes.status}`);
  }
  if (mobileLegacyRes.data.pendingVerification) {
    throw new Error('Failure: /auth route accepted clientTransport from req.body instead of deriving mobile transport from route prefix');
  }
  if (!mobileLegacyRes.data.accessToken || !mobileLegacyRes.data.refreshToken) {
    throw new Error('Failure: Legacy mobile transport did not issue session tokens');
  }
  console.log('[OK] Route-based transport selection test passed (untrusted body/header ignored).');

  // 8. Web Transport Registration & Pending Verification
  console.log('\nTesting: POST /api/web/auth/register (Web Transport Pending Verification)');
  const webRegEmail = `web_pending_${Date.now()}@test.com`;
  const webRegRes = await axios.post(`${BASE_URL}/api/web/auth/register`, {
    email: webRegEmail,
    password: 'Password123!',
    name: 'Web Pending User',
  });
  if (webRegRes.status !== 201) {
    throw new Error(`Expected 201 from web register, got ${webRegRes.status}`);
  }
  if (!webRegRes.data.pendingVerification) {
    throw new Error('Expected pendingVerification: true for web registration.');
  }
  if (webRegRes.data.accessToken || webRegRes.data.refreshToken) {
    throw new Error('Security violation: Issued tokens prior to email verification on web transport.');
  }
  console.log('[OK] Web transport pending verification test passed.');

  // 9. Resend Verification & Verification Flow
  console.log('\nTesting: POST /api/web/auth/resend-verification');
  const resendRes = await axios.post(`${BASE_URL}/api/web/auth/resend-verification`, { email: webRegEmail });
  if (resendRes.status !== 200) {
    throw new Error(`Expected 200 from resend-verification, got ${resendRes.status}`);
  }
  console.log('[OK] Resend verification endpoint test passed.');

  // Query DB directly to verify email_verifications record exists
  const { Client } = require('pg');
  const pgClient = new Client({ connectionString: DATABASE_URL });
  await pgClient.connect();
  const dbVerRes = await pgClient.query('SELECT token_hash FROM email_verifications WHERE email = $1 ORDER BY created_at DESC LIMIT 1', [webRegEmail]);
  if (!dbVerRes.rows.length) {
    await pgClient.end();
    throw new Error('Email verification record not found in database');
  }

  if (!lastCapturedToken) {
    await pgClient.end();
    throw new Error('Raw verification token was not captured from mock email log');
  }

  // Consume verification token via API
  console.log('\nTesting: POST /api/web/auth/verify-email (Token Consumption)');
  const verifyRes = await axios.post(`${BASE_URL}/api/web/auth/verify-email`, { token: lastCapturedToken });
  if (verifyRes.status !== 200 || !verifyRes.data.success) {
    await pgClient.end();
    throw new Error('Failed to verify email via API token consumption');
  }
  console.log('[OK] Email token verification test passed.');

  // 9.1. Verify Atomic Single-Use Token Consumption (Re-consumption MUST fail)
  console.log('\nTesting: Re-consuming already used email verification token (Atomic Single-Use Check)');
  try {
    await axios.post(`${BASE_URL}/api/web/auth/verify-email`, { token: lastCapturedToken });
    await pgClient.end();
    throw new Error('Failure: Token was consumed twice! Atomic single-use behavior broken.');
  } catch (err) {
    if (!err.response || err.response.status !== 400) {
      await pgClient.end();
      throw new Error(`Expected 400 when re-consuming used token, got ${err.response ? err.response.status : 'no response'}`);
    }
  }
  console.log('[OK] Atomic single-use token consumption test passed.');

  // 10. Safe GET Redirect on /verify-email
  console.log('\nTesting: GET /api/web/auth/verify-email (Safe Redirect)');
  try {
    await axios.get(`${BASE_URL}/api/web/auth/verify-email?token=${lastCapturedToken}`, {
      maxRedirects: 0,
      headers: { Accept: 'text/html' }
    });
  } catch (err) {
    if (err.response && [301, 302, 303, 307, 308].includes(err.response.status)) {
      console.log('Redirect Location:', err.response.headers.location);
      if (!err.response.headers.location || !err.response.headers.location.startsWith('http://localhost:3000/verify-email')) {
        await pgClient.end();
        throw new Error(`Invalid redirect location (open redirect vulnerability): ${err.response.headers.location}`);
      }
    } else {
      await pgClient.end();
      throw err;
    }
  }
  console.log('[OK] Safe redirect on GET /verify-email test passed.');

  // 10.1. Social Provider Invalid Tokens Map to 401
  console.log('\nTesting: Social provider invalid tokens map to 401');
  try {
    await axios.post(`${BASE_URL}/api/web/auth/google`, { idToken: 'invalid_google_token_999' });
    await pgClient.end();
    throw new Error('Expected 401 for invalid Google token, but request succeeded');
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      await pgClient.end();
      throw new Error(`Expected 401 for invalid Google token, got ${err.response ? err.response.status : 'no response'}`);
    }
  }
  try {
    await axios.post(`${BASE_URL}/api/web/auth/facebook`, { accessToken: 'invalid_facebook_token_999' });
    await pgClient.end();
    throw new Error('Expected 401 for invalid Facebook token, but request succeeded');
  } catch (err) {
    if (!err.response || err.response.status !== 401) {
      await pgClient.end();
      throw new Error(`Expected 401 for invalid Facebook token, got ${err.response ? err.response.status : 'no response'}`);
    }
  }
  console.log('[OK] Social provider invalid token 401 mapping test passed.');

  // 11. Google OAuth Dev Bypass & Identity Storage
  console.log('\nTesting: POST /api/web/auth/google (OAuth Dev Bypass & Identity Creation)');
  const googleRes = await axios.post(`${BASE_URL}/api/web/auth/google`, {
    idToken: 'mock_google_token_social_user_123',
    role: 'user',
  });
  if (googleRes.status !== 200 || !googleRes.data.user) {
    await pgClient.end();
    throw new Error('Google social login failed');
  }
  if (googleRes.data.accessToken) {
    await pgClient.end();
    throw new Error('Security violation: accessToken returned in web social login JSON response body');
  }
  const googleUserId = googleRes.data.user.id;
  const dbGoogleIdentity = await pgClient.query('SELECT * FROM auth_identities WHERE user_id = $1 AND provider = $2', [googleUserId, 'google']);
  if (!dbGoogleIdentity.rows.length) {
    await pgClient.end();
    throw new Error('Expected auth_identities record for Google user');
  }
  console.log('[OK] Google OAuth dev bypass and identity storage test passed.');

  // 12. Facebook OAuth Dev Bypass & Safe Account Linking
  console.log('\nTesting: POST /api/web/auth/facebook (OAuth Dev Bypass & Account Linking)');
  const facebookRes = await axios.post(`${BASE_URL}/api/web/auth/facebook`, {
    accessToken: 'mock_facebook_token_social_user_123',
    role: 'user',
  });
  if (facebookRes.status !== 200 || !facebookRes.data.user) {
    await pgClient.end();
    throw new Error('Facebook social login failed');
  }
  if (facebookRes.data.accessToken) {
    await pgClient.end();
    throw new Error('Security violation: accessToken returned in web social login JSON response body');
  }
  const facebookUserId = facebookRes.data.user.id;
  if (facebookUserId !== googleUserId) {
    await pgClient.end();
    throw new Error(`Expected safe account linking to same user ID (${googleUserId}), but got ${facebookUserId}`);
  }
  const dbFacebookIdentity = await pgClient.query('SELECT * FROM auth_identities WHERE user_id = $1 AND provider = $2', [googleUserId, 'facebook']);
  if (!dbFacebookIdentity.rows.length) {
    await pgClient.end();
    throw new Error('Expected auth_identities record for linked Facebook identity');
  }
  console.log('[OK] Safe account linking for social identities test passed.');

  // 13. Canonical Route Aliases (/api/mobile/auth)
  console.log('\nTesting: Canonical Route Alias POST /api/mobile/auth/google');
  const mobileAliasRes = await axios.post(`${BASE_URL}/api/mobile/auth/google`, {
    idToken: 'mock_google_token_mobile_alias_user',
  });
  if (mobileAliasRes.status !== 200 || !mobileAliasRes.data.accessToken) {
    await pgClient.end();
    throw new Error('Failed to authenticate via /api/mobile/auth/google alias');
  }
  console.log('[OK] Canonical route alias /api/mobile/auth/google test passed.');

  await pgClient.end();

  console.log('\n--- All Auth Smoke Tests Passed Successfully! ---');
}

// Clean shutdown function
function cleanup() {
  if (serverProcess) {
    console.log('Shutting down application server...');
    serverProcess.kill();
  }
}

run()
  .then(() => {
    cleanup();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Smoke test failed:', err.message);
    if (err.response) {
      console.error('Response details:', JSON.stringify(err.response.data, null, 2));
    }
    cleanup();
    process.exit(1);
  });
