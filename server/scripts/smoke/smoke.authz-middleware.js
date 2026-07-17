require('dotenv').config();

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

function makeReq(user) {
  return { user: user || null };
}

function makeRes() {
  const state = { statusCode: 200, body: null };
  function res() { return res; }
  res.status = function(code) { state.statusCode = code; return res; };
  res.send = function(body) { state.body = body; return res; };
  res.json = function(body) { state.body = body; return res; };
  res._state = state;
  return res;
}

function run() {
  console.log('--- Phase P1.1-B Authz Middleware Smoke Test ---');
  console.log('');

  process.env.ADMIN_UID = 'test-admin-uid-12345';

  require('../../src/alias-bootstrap');

  const { isAdmin } = require('../../src/shared/middleware/admin.middleware');
  const authMiddleware = require('../../src/shared/middleware/auth.middleware');
  const { requireRole, userHasRole } = require('../../src/shared/middleware/authz.middleware');

  const { isOrganizer } = authMiddleware;

  console.log('--- Test 1: isAdmin ADMIN_UID fallback ---');
  (function() {
    const req = makeReq({ uid: 'test-admin-uid-12345', roles: [] });
    const res = makeRes();
    let calledNext = false;
    isAdmin(req, res, function() { calledNext = true; });
    assert(calledNext === true, 'isAdmin passes with ADMIN_UID match');
    assert(res._state.body === null, 'isAdmin does not send a response on pass');
  })();

  console.log('--- Test 2: isAdmin with admin role (no ADMIN_UID) ---');
  (function() {
    const req = makeReq({ uid: 'some-other-uid', roles: ['admin'] });
    const res = makeRes();
    let calledNext = false;
    isAdmin(req, res, function() { calledNext = true; });
    assert(calledNext === true, 'isAdmin passes with admin role');
  })();

  console.log('--- Test 3: isAdmin without admin role or ADMIN_UID ---');
  (function() {
    const req = makeReq({ uid: 'regular-user', roles: ['user'] });
    const res = makeRes();
    let calledNext = false;
    isAdmin(req, res, function() { calledNext = true; });
    assert(calledNext === false, 'isAdmin does not call next for non-admin');
    assert(res._state.statusCode === 403, 'isAdmin returns 403 for non-admin');
    assert(res._state.body && res._state.body.error === 'Forbidden: Require Admin Privileges.', 'isAdmin preserves admin forbidden message');
  })();

  console.log('--- Test 4: isOrganizer with organizer role ---');
  (function() {
    const req = makeReq({ uid: 'org-user', roles: ['organizer'] });
    const res = makeRes();
    let calledNext = false;
    isOrganizer(req, res, function() { calledNext = true; });
    assert(calledNext === true, 'isOrganizer passes with organizer role');
  })();

  console.log('--- Test 5: isOrganizer with legacy req.user.role (string) ---');
  (function() {
    const req = makeReq({ uid: 'legacy-org', roles: [], role: 'organizer' });
    const res = makeRes();
    let calledNext = false;
    isOrganizer(req, res, function() { calledNext = true; });
    assert(calledNext === true, 'isOrganizer passes with legacy req.user.role string');
  })();

  console.log('--- Test 6: isOrganizer with legacy req.user.role (array) ---');
  (function() {
    const req = makeReq({ uid: 'legacy-org-arr', roles: [], role: ['organizer'] });
    const res = makeRes();
    let calledNext = false;
    isOrganizer(req, res, function() { calledNext = true; });
    assert(calledNext === true, 'isOrganizer passes with legacy req.user.role array');
  })();

  console.log('--- Test 7: isOrganizer with non-organizer role ---');
  (function() {
    const req = makeReq({ uid: 'regular-user', roles: ['user'] });
    const res = makeRes();
    let calledNext = false;
    isOrganizer(req, res, function() { calledNext = true; });
    assert(calledNext === false, 'isOrganizer does not call next for non-organizer');
    assert(res._state.statusCode === 403, 'isOrganizer returns 403 for non-organizer');
    assert(res._state.body && res._state.body.error === 'Forbidden: User does not have organizer privileges.', 'isOrganizer preserves old organizer forbidden message');
  })();

  console.log('--- Test 8: isOrganizer with no authenticated user ---');
  (function() {
    const req = makeReq(null);
    const res = makeRes();
    let calledNext = false;
    isOrganizer(req, res, function() { calledNext = true; });
    assert(calledNext === false, 'isOrganizer does not call next with no user');
    assert(res._state.statusCode === 401, 'isOrganizer returns 401 for no user');
    assert(res._state.body && res._state.body.error === 'Unauthorized: No authenticated user.', 'isOrganizer returns expected 401 message');
  })();

  console.log('--- Test 9: requireRole with admin role ---');
  (function() {
    const req = makeReq({ uid: 'admin-user', roles: ['admin'] });
    const res = makeRes();
    let calledNext = false;
    const mw = requireRole('admin');
    mw(req, res, function() { calledNext = true; });
    assert(calledNext === true, 'requireRole admin passes with admin role');
  })();

  console.log('--- Test 10: requireRole with organizer role ---');
  (function() {
    const req = makeReq({ uid: 'org-user', roles: ['organizer'] });
    const res = makeRes();
    let calledNext = false;
    const mw = requireRole('organizer');
    mw(req, res, function() { calledNext = true; });
    assert(calledNext === true, 'requireRole organizer passes with organizer role');
  })();

  console.log('--- Test 11: requireRole forbidden ---');
  (function() {
    const req = makeReq({ uid: 'regular-user', roles: ['user'] });
    const res = makeRes();
    let calledNext = false;
    const mw = requireRole('admin', 'organizer');
    mw(req, res, function() { calledNext = true; });
    assert(calledNext === false, 'requireRole forbids without required role');
    assert(res._state.statusCode === 403, 'requireRole returns 403');
  })();

  console.log('--- Test 12: userHasRole helper ---');
  (function() {
    const reqWithAdmin = makeReq({ uid: 'u1', roles: ['admin'] });
    assert(userHasRole(reqWithAdmin, 'admin') === true, 'userHasRole finds admin role');
    assert(userHasRole(reqWithAdmin, 'organizer') === false, 'userHasRole does not find organizer');
    const reqWithNullUser = makeReq(null);
    assert(userHasRole(reqWithNullUser, 'admin') === false, 'userHasRole returns false with no user');
    const reqNoRoles = makeReq({ uid: 'u2' });
    assert(userHasRole(reqNoRoles, 'admin') === false, 'userHasRole returns false when no roles property');
  })();

  console.log('');
  console.log('=== Results ===');
  console.log('  PASS: ' + PASS.length);
  console.log('  FAIL: ' + FAIL.length);

  if (FAIL.length > 0) {
    console.error('FAILURES:');
    for (const f of FAIL) {
      console.error('  - ' + f);
    }
    process.exit(1);
  } else {
    console.log('All authz middleware smoke tests passed.');
  }
}

run();
