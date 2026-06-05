// scripts/smoke.legacy-migration.js
// Focused smoke test for legacy-profile auth migration (N3-S5).
// Asserts that synthetic user_profiles (without auth_users) are provisioned
// via password-reset and dev-social bypass, register is blocked, and
// blank-email profiles are skipped.

const { spawn } = require('child_process');
const axios = require('axios');

const TEST_PORT = process.env.TEST_PORT || '35434';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev';

process.env.DATABASE_URL = DATABASE_URL;

const { query } = require('../src/providers/database/postgres.client');

const tokensToRedact = new Set();
const dbPassMatch = DATABASE_URL.match(/postgres(?:ql)?:\/\/[^:]+:([^@]+)@/);
if (dbPassMatch && dbPassMatch[1]) tokensToRedact.add(dbPassMatch[1]);

function redactString(str) {
  if (typeof str !== 'string') return str;
  let result = str;
  for (const token of tokensToRedact) { if (token && token.length > 5) result = result.split(token).join('[REDACTED]'); }
  result = result.replace(/\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]*\b/g, '[REDACTED_JWT]');
  return result;
}

const originalLog = console.log;
console.log = function () {
  originalLog.apply(console, Array.prototype.map.call(arguments, function (a) {
    return typeof a === 'string' ? redactString(a) : a;
  }));
};

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

const TS = Date.now();
const UID_PW_RESET = 'legacy_migrate_pw_' + TS;
const UID_SOCIAL   = 'legacy_migrate_social_' + TS;
const UID_GUARD    = 'legacy_migrate_guard_' + TS;
const UID_BLANK    = 'legacy_migrate_blank_' + TS;
// Social bypass constructs email as: idToken.replace('mock_google_token_','') + '@example.com'
const EMAIL_PW_RESET = UID_PW_RESET + '@example.com';
const EMAIL_SOCIAL   = UID_SOCIAL + '@example.com';
const EMAIL_GUARD    = UID_GUARD + '@example.com';
const PW = 'NewPassFromReset789!';

let serverProcess = null;
let resetToken = null;
let stdoutBuf = '';

function startServer() {
  console.log('\n[Test] Spawning server...');
  stdoutBuf = '';
  resetToken = null;
  serverProcess = spawn('node', ['app.js'], {
    env: Object.assign({}, envBase, { NODE_ENV: 'development', AUTH_SOCIAL_DEV_BYPASS: 'true' }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout.on('data', function (d) {
    stdoutBuf += d.toString();
    var lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop() || '';
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/Use this token to reset your password:\s*([a-f0-9]+)/i);
      if (m) { resetToken = m[1]; tokensToRedact.add(resetToken); }
    }
  });
  serverProcess.stderr.on('data', function () {});
}

function stopServer() {
  if (serverProcess) { console.log('[Test] Stopping server...'); serverProcess.kill(); serverProcess = null; }
}

async function waitForServer() {
  for (var i = 0; i < 30; i++) {
    try { var r = await axios.get(BASE_URL, { timeout: 3000 }); if (r.status === 200) return; } catch (e) {}
    await new Promise(function (r) { setTimeout(r, 1000); });
  }
  throw new Error('Server not responsive');
}

var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

async function insertLegacyProfile(uid, email, roles) {
  var ts = Date.now();
  await query(
    "INSERT INTO user_profiles (id, email, name, roles, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",
    [uid, email || '', 'Legacy ' + uid, roles || ['attendee'], ts]
  );
}

async function cleanupProfile(uid) {
  await query("DELETE FROM auth_users WHERE id = $1", [uid]);
  await query("DELETE FROM user_profiles WHERE id = $1", [uid]);
}

async function run() {
  console.log('--- Starting Legacy Migration Smoke Test ---');

  // Insert synthetic legacy profiles
  console.log('\n[Setup] Inserting synthetic legacy profiles...');
  await insertLegacyProfile(UID_PW_RESET, EMAIL_PW_RESET, ['attendee', 'organizer']);
  await insertLegacyProfile(UID_SOCIAL, EMAIL_SOCIAL, ['attendee']);
  await insertLegacyProfile(UID_GUARD, EMAIL_GUARD, ['attendee']);
  await insertLegacyProfile(UID_BLANK, '', ['attendee']);
  console.log('[OK] Legacy profiles inserted.');

  // Verify no auth_users rows exist for these UIDs yet
  var preCheck = await query("SELECT id FROM auth_users WHERE id = ANY($1)", [[UID_PW_RESET, UID_SOCIAL, UID_GUARD, UID_BLANK]]);
  if (preCheck.rows.length !== 0) throw new Error('Precondition failed: auth_users already exist');

  startServer();
  await waitForServer();

  // -----------------------------------------------------------------------
  // TEST 1: Password-reset provisions auth_user from legacy profile
  // -----------------------------------------------------------------------
  console.log('\n[Test 1] Password reset migrates legacy profile...');
  var reqRes = await axios.post(BASE_URL + '/auth/password-reset/request', { email: EMAIL_PW_RESET });
  if (reqRes.status !== 200) throw new Error('Password reset request failed');
  await sleep(2000);
  if (!resetToken) throw new Error('Failed to intercept reset token');
  console.log('[OK] Reset token intercepted.');

  var confirmRes = await axios.post(BASE_URL + '/auth/password-reset/confirm', { token: resetToken, newPassword: PW });
  if (confirmRes.status !== 200 || !confirmRes.data.success) throw new Error('Password reset confirm failed');

  // Verify auth_users now has a row with UID_PW_RESET
  var authUser = await query("SELECT id, email, roles FROM auth_users WHERE id = $1", [UID_PW_RESET]);
  if (authUser.rows.length === 0) throw new Error('auth_users row not created for password-reset migration');
  if (authUser.rows[0].id !== UID_PW_RESET) throw new Error('Password-reset migration ID mismatch');
  console.log('[OK] auth_users provisioned with profile ID:', authUser.rows[0].id);

  // Verify roles were mapped: attendee → user, keep organizer
  var roles = authUser.rows[0].roles;
  if (roles.indexOf('user') === -1 || roles.indexOf('organizer') === -1) {
    throw new Error('Password-reset migration roles incorrect: ' + JSON.stringify(roles));
  }
  console.log('[OK] Roles correctly mapped:', JSON.stringify(roles));

  // Login with the new password
  var loginRes = await axios.post(BASE_URL + '/auth/login', { email: EMAIL_PW_RESET, password: PW });
  if (loginRes.status !== 200 || !loginRes.data.accessToken) throw new Error('Login after migration failed');
  if (loginRes.data.user.id !== UID_PW_RESET) throw new Error('Login response ID mismatch');
  console.log('[OK] Login with new password succeeded, profile ID preserved.');

  // -----------------------------------------------------------------------
  // TEST 2: Register with unmigrated legacy profile email returns 409 + hint
  // -----------------------------------------------------------------------
  console.log('\n[Test 2] Register with unmigrated legacy profile rejected (409)...');
  try {
    await axios.post(BASE_URL + '/auth/register', {
      email: EMAIL_GUARD,
      password: 'SomePass123!',
      name: 'Should Fail',
    });
    throw new Error('Register should have been rejected');
  } catch (err) {
    if (!err.response || err.response.status !== 409) {
      throw new Error('Expected 409 for unmigrated profile register, got ' + (err.response ? err.response.status : 'no response'));
    }
    var msg = (err.response.data.error || '').toLowerCase();
    if (msg.indexOf('password reset') === -1 && msg.indexOf('social login') === -1) {
      throw new Error('409 error should mention password reset or social login: ' + err.response.data.error);
    }
    console.log('[OK] Register rejected with 409 and migration hint: "' + err.response.data.error + '"');
  }

  // Verify no auth_users was created for the guard email
  var guardCheck = await query("SELECT id FROM auth_users WHERE id = $1", [UID_GUARD]);
  if (guardCheck.rows.length !== 0) throw new Error('Register created auth_users for legacy profile');
  console.log('[OK] No auth_users created for legacy profile via register.');

  // -----------------------------------------------------------------------
  // TEST 3: Dev social bypass provisions auth_user from legacy profile
  // -----------------------------------------------------------------------
  console.log('\n[Test 3] Social login bypass migrates legacy profile...');
  var socialRes = await axios.post(BASE_URL + '/auth/google-login', {
    idToken: 'mock_google_token_' + EMAIL_SOCIAL.replace(/@.*/, ''),
    role: 'user',
  });
  if (socialRes.status !== 200 || !socialRes.data.accessToken) throw new Error('Social login migration failed');
  if (socialRes.data.user.id !== UID_SOCIAL) throw new Error('Social migration ID mismatch: expected ' + UID_SOCIAL + ' got ' + socialRes.data.user.id);
  console.log('[OK] Social login provisioned auth_users with profile ID:', socialRes.data.user.id);

  // -----------------------------------------------------------------------
  // TEST 4: Blank-email profiles are never migrated
  // -----------------------------------------------------------------------
  console.log('\n[Test 4] Blank-email profile NOT migrated via social login...');
  var randomEmail = 'unrelated_' + Date.now() + '@test.com';
  var unrelatedRes = await axios.post(BASE_URL + '/auth/google-login', {
    idToken: 'mock_google_token_' + randomEmail.replace(/@.*/, ''),
    role: 'user',
  });
  if (unrelatedRes.status !== 200) throw new Error('Unrelated social login failed');
  // The blank-email profile must not have been used
  var blankAuth = await query("SELECT id FROM auth_users WHERE id = $1", [UID_BLANK]);
  if (blankAuth.rows.length !== 0) throw new Error('Blank-email profile was wrongly migrated');
  console.log('[OK] Blank-email profile not migrated (no auth_users row).');

  // Verify that the unrelated login created a NEW user (not linked to blank profile)
  if (unrelatedRes.data.user.id === UID_BLANK) throw new Error('Unrelated login incorrectly used blank profile ID');
  // Clean up the unrelated user
  await cleanupProfile(unrelatedRes.data.user.id);

  // Clean up all synthetic data
  console.log('\n[Cleanup] Removing synthetic data...');
  await cleanupProfile(UID_PW_RESET);
  await cleanupProfile(UID_SOCIAL);
  await cleanupProfile(UID_GUARD);
  await cleanupProfile(UID_BLANK);
  console.log('[OK] Cleanup complete.');

  console.log('\n--- All Legacy Migration Smoke Tests Passed! ---');
}

async function cleanAll() {
  await cleanupProfile(UID_PW_RESET);
  await cleanupProfile(UID_SOCIAL);
  await cleanupProfile(UID_GUARD);
  await cleanupProfile(UID_BLANK);
}

run()
  .then(function () { stopServer(); cleanAll().then(function () { process.exit(0); }); })
  .catch(function (err) {
    console.error('[FAIL]', err.message);
    if (err.response) console.error('Response:', JSON.stringify(err.response.data, null, 2));
    stopServer();
    cleanAll().then(function () { process.exit(1); });
  });
