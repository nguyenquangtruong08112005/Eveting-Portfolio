require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';
process.env.EVENT_DATABASE_PROVIDER = 'postgres';
process.env.ADMIN_DATABASE_PROVIDER = 'postgres';
process.env.FEATURED_PROFILE_DATABASE_PROVIDER = 'postgres';

const http = require('http');
const { spawn } = require('child_process');

require('../../src/alias-bootstrap');

const { query, getPool } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');
const eventService = require('@/modules/events/application/service');
const { STATUS, VISIBILITY, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');
const { signAccessToken } = require('@/providers/auth/backend.auth.provider');

const ORG_UID = 'smoke_org_submit_draft';
const NON_ORG_UID = 'smoke_other_user';

const TEST_PORT = process.env.TEST_PORT || '35435';
const BASE_URL = `http://localhost:${TEST_PORT}`;

const PASS = [];
const FAIL = [];

function assert(condition, msg) {
  if (!condition) {
    FAIL.push(msg);
    console.error('  [FAIL] ' + msg);
  } else {
    PASS.push(msg);
    console.log('  [PASS] ' + msg);
  }
}

const syntheticIds = [];
let serverProcess = null;

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

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  let dbRoundTrips = 0;
  const originalQuery = query;

  console.log('--- Phase P1.2-S5 Draft Submit Smoke Test ---');
  console.log('');

  // ===================================================================
  // Setup: Start Express server
  // ===================================================================
  console.log('--- Setup: Start Express server ---');

  const env = {
    ...process.env,
    PORT: TEST_PORT,
    AUTH_PROVIDER: 'backend',
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'super_secret_key_at_least_256_bits_for_backend_auth_smoke_testing_1234567890',
    ACCESS_TOKEN_EXPIRES_IN: '5m',
    DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
  };

  serverProcess = spawn('node', ['src/server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

  serverProcess.stdout.on('data', (data) => {
    // suppress noisy server output, only show errors
  });
  serverProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg && !msg.includes('info:') && !msg.includes('debug:') && !msg.includes('ERROR:')) {
      console.error(`[Server] ${msg}`);
    }
  });
  serverProcess.on('close', (code) => {
    if (code !== null && code !== 0) {
      console.error(`Server exited with code ${code}`);
    }
  });

  let serverStarted = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await httpRequest('GET', '/');
      if (res.status === 200) { serverStarted = true; break; }
    } catch { /* server not ready yet */ }
    await sleep(500);
  }
  if (!serverStarted) {
    throw new Error('Server failed to become responsive within 10 s.');
  }
  console.log('  [PASS] Express server responsive');
  PASS.push('server: Express server started');

  // ===================================================================
  // Section 1: Owner creates a draft via service, then submits via HTTP
  // ===================================================================
  console.log('');
  console.log('--- Section 1: Owner creates draft, submits via HTTP ---');

  // DB round trip 1: createEvent
  const draft = await eventService.createEvent({
    name: 'Submit Draft HTTP Test',
    description: 'Created as draft then submitted via HTTP endpoint',
    date: Date.now() + 86400000,
    eventType: 'online',
    onlineUrl: 'https://example.com/submitdrafthttp',
    ticketTypes: { general: { name: 'General', price: 50, available: 100 } },
    saveAsDraft: true,
  }, ORG_UID);
  const draftId = draft.id;
  syntheticIds.push(draftId);
  // DB round trips: createEvent (1 insert + 1 read = 2)
  dbRoundTrips += 2;

  assert(draft.status === STATUS.PENDING, 'pre: legacy status is pending');
  assert(draft.visibility === VISIBILITY.PRIVATE, 'pre: legacy visibility is private');
  assert(draft.lifecycleStatus === undefined, 'pre: lifecycleStatus NOT exposed');

  // DB round trip 3: verify lifecycle_status column
  const dbPre = await query(
    'SELECT lifecycle_status, status, visibility FROM events WHERE id = $1',
    [draftId]
  );
  dbRoundTrips++;
  assert(dbPre.rows[0].lifecycle_status === LIFECYCLE.DRAFT, 'pre: lifecycle_status column is draft');
  assert(dbPre.rows[0].status === STATUS.PENDING, 'pre: legacy status column is pending');

  // Generate JWT for the owner
  const ownerToken = signAccessToken({ uid: ORG_UID, roles: ['organizer'] });

  // HTTP POST /events/:eventId/submit-draft with owner token
  const submitResp = await httpRequest('POST', `/events/${draftId}/submit-draft`, {
    headers: authHeaders(ownerToken),
  });
  // DB round trips: service.submitDraft: getEventLifecycleOwnership (1) + updateEvent (1) + getEventById (1) = 3
  // controller delegates fully to service; no separate getEventById
  dbRoundTrips += 3;

  assert(submitResp.status === 200, 'submit: HTTP status 200');
  assert(submitResp.data.lifecycleStatus === undefined, 'submit: lifecycleStatus NOT in HTTP response');
  assert(submitResp.data.status === STATUS.PENDING, 'submit: legacy status in response is pending');
  assert(submitResp.data.visibility === VISIBILITY.PRIVATE, 'submit: legacy visibility in response is private');

  // DB round trip: verify column after submit
  const dbPost = await query(
    'SELECT lifecycle_status, status, visibility FROM events WHERE id = $1',
    [draftId]
  );
  dbRoundTrips++;
  assert(dbPost.rows[0].lifecycle_status === LIFECYCLE.SUBMITTED, 'submit: lifecycle_status column is submitted');
  assert(dbPost.rows[0].status === STATUS.PENDING, 'submit: legacy status column remains pending');

  // Verify via eventRepository (rowToFirebaseDoc strips lifecycleStatus)
  const repoData = await eventRepository.getEventDataById(draftId);
  dbRoundTrips++;
  assert(repoData.lifecycleStatus === undefined, 'submit: repo data does NOT expose lifecycleStatus');

  // raw_data should not contain lifecycleStatus
  const rawPost = await query(
    "SELECT raw_data->>'lifecycleStatus' AS raw_ls FROM events WHERE id = $1",
    [draftId]
  );
  dbRoundTrips++;
  assert(rawPost.rows[0].raw_ls === null, 'submit: raw_data has no lifecycleStatus');

  // ===================================================================
  // Section 2: Non-owner receives ForbiddenError
  // ===================================================================
  console.log('');
  console.log('--- Section 2: Non-owner receives ForbiddenError ---');

  // Create a draft as ORG_UID, non-owner (NON_ORG_UID) tries to submit
  const draftForbidden = await eventService.createEvent({
    name: 'Forbidden Draft Test',
    date: Date.now() + 86400000,
    eventType: 'online',
    onlineUrl: 'https://example.com/forbidden',
    ticketTypes: {},
    saveAsDraft: true,
  }, ORG_UID);
  const forbiddenId = draftForbidden.id;
  syntheticIds.push(forbiddenId);
  dbRoundTrips += 2;

  const nonOwnerToken = signAccessToken({ uid: NON_ORG_UID, roles: ['organizer'] });

  const forbiddenResp = await httpRequest('POST', `/events/${forbiddenId}/submit-draft`, {
    headers: authHeaders(nonOwnerToken),
  });
  // service.submitDraft: getEventLifecycleOwnership (1) returns row, ownership check fails → ForbiddenError
  // update/read never reached
  dbRoundTrips += 1;

  const allowedStatuses = [403, 404];
  assert(allowedStatuses.includes(forbiddenResp.status),
    `non-owner: HTTP status ${forbiddenResp.status} (expected 403 or 404)`);
  assert(forbiddenResp.data.lifecycleStatus === undefined,
    'non-owner: lifecycleStatus NOT in error response');
  if (forbiddenResp.status === 403) {
    const fErrBody = forbiddenResp.data.error || {};
    const fErrMsg = fErrBody.message || '';
    assert(fErrMsg.toLowerCase().includes('permission'),
      'non-owner: error message mentions permission');
  }

  // Verify the draft was NOT submitted
  const dbForbiddenPost = await query(
    'SELECT lifecycle_status FROM events WHERE id = $1',
    [forbiddenId]
  );
  dbRoundTrips++;
  assert(dbForbiddenPost.rows[0].lifecycle_status === LIFECYCLE.DRAFT,
    'non-owner: lifecycle_status remains draft (not submitted)');

  // ===================================================================
  // Section 3: Submitting a non-draft event via HTTP fails
  // ===================================================================
  console.log('');
  console.log('--- Section 3: Submitting a non-draft event via HTTP fails ---');

  const alreadySubmitted = await eventService.createEvent({
    name: 'Already Submitted HTTP Test',
    date: Date.now() + 86400000,
    eventType: 'online',
    onlineUrl: 'https://example.com/alreadysubmittedhttp',
    ticketTypes: {},
  }, ORG_UID);
  const alreadyId = alreadySubmitted.id;
  syntheticIds.push(alreadyId);
  dbRoundTrips += 2;

  const alreadyResp = await httpRequest('POST', `/events/${alreadyId}/submit-draft`, {
    headers: authHeaders(ownerToken),
  });
  // DB round trips: submitDraft: getEventLifecycleOwnership (1) reads row, transition check fails → BadRequestError
  dbRoundTrips += 1;

  assert(alreadyResp.status === 400, 'non-draft: HTTP status 400');
  assert(alreadyResp.data.lifecycleStatus === undefined, 'non-draft: lifecycleStatus NOT in error response');
  const errBody = alreadyResp.data.error || {};
  const errMsg = errBody.message || '';
  assert(errMsg.toLowerCase().includes('cannot transition'),
    'non-draft: error message mentions cannot transition');

  // ===================================================================
  // Section 4: Submitting a missing event via HTTP fails
  // ===================================================================
  console.log('');
  console.log('--- Section 4: Submitting a missing event via HTTP fails ---');

  const missingResp = await httpRequest('POST', `/events/nonexistent_evt_id/submit-draft`, {
    headers: authHeaders(ownerToken),
  });
  // DB round trips: submitDraft: getEventLifecycleOwnership (1) returns null → NotFoundError
  dbRoundTrips += 1;

  assert(missingResp.status === 404, 'missing: HTTP status 404');
  assert(missingResp.data.lifecycleStatus === undefined, 'missing: lifecycleStatus NOT in error response');

  // ===================================================================
  // Section 5: Submitted draft still invisible in public listing
  // ===================================================================
  console.log('');
  console.log('--- Section 5: Submitted draft invisible in public listing ---');

  const listing = await eventRepository.getPublicEventsPage(1, 50);
  dbRoundTrips++;
  const submittedInListing = listing.entries.some(e => e.id === draftId);
  assert(submittedInListing === false, 'listing: submitted draft not in public listing');

  // ===================================================================
  // Results
  // ===================================================================
  console.log('');
  console.log('=== Results ===');
  console.log('  PASS: ' + PASS.length);
  console.log('  FAIL: ' + FAIL.length);
  console.log('  Estimated DB round trips: ' + dbRoundTrips);

  if (FAIL.length > 0) {
    console.error('FAILURES:');
    for (const f of FAIL) {
      console.error('  - ' + f);
    }
    process.exit(1);
  } else {
    console.log('All draft submit tests passed.');
  }
}

run().catch(err => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
}).finally(async () => {
  console.log('Cleaning up synthetic rows...');
  try {
    for (const id of syntheticIds) {
      await query('DELETE FROM events WHERE id = $1', [id]).catch(() => {});
    }
    console.log('Cleanup finished.');
  } catch (e) {
    console.error('Cleanup error:', e.message);
  }

  if (serverProcess) {
    serverProcess.kill();
  }

  try {
    await getPool().end();
  } catch { /* ignore */ }
});
