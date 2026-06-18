// scripts/smoke.rbac.js
// Phase P1.1-A RBAC smoke test.
// Applies migration 017, seeds defaults, then verifies role/permission resolution,
// organization/membership flows, audit logging, and legacy auth_users.roles compatibility.
//
// Usage:
//   DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev node scripts/smoke.rbac.js

require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.RBAC_DATABASE_PROVIDER = 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
const TEST_USER_EMAIL = `rbac_smoke_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
const TEST_USER_PASSWORD = 'SmokeTestPass123!';
const TEST_ORG_SLUG = `rbac_org_${Date.now()}`;

const originalLog = console.log;
const originalError = console.error;
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
  let result = redactDatabaseUrl(str);
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
    if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
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

console.log = function(...args) { originalLog.apply(console, args.map(processArg)); };
console.error = function(...args) { originalError.apply(console, args.map(processArg)); };

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

async function check(label, fn) {
  try {
    await fn();
    PASS.push(label);
    console.log('  [PASS] ' + label);
  } catch (err) {
    FAIL.push(label + ': ' + err.message);
    console.error('  [FAIL] ' + label + ': ' + err.message);
  }
}

async function applyMigration(pool) {
  const migrationFile = path.join(__dirname, '..', 'db', 'migrations', '017_create_rbac_tables.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const { rows: applied } = await client.query('SELECT filename FROM schema_migrations WHERE filename = $1', ['017_create_rbac_tables.sql']);
    if (applied.length === 0) {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', ['017_create_rbac_tables.sql']);
      console.log('Applied migration 017_create_rbac_tables.sql');
    } else {
      console.log('Migration 017 already applied');
    }
  } finally {
    client.release();
  }
}

async function run() {
  console.log('--- Phase P1.1-A RBAC Smoke Test ---');
  console.log('');

  const pool = new Pool({ connectionString: DATABASE_URL });
  let userId;
  let orgId;

  try {
    // 1. Apply migration
    console.log('--- Step 1: Apply migration 017 ---');
    await applyMigration(pool);

    // 2. Load the RBAC repository
    console.log('--- Step 2: Seed defaults ---');
    require(path.join(__dirname, '..', 'src', 'alias-bootstrap'));
    const rbacRepo = require(path.join(__dirname, '..', 'src', 'providers', 'database', 'rbac.repository'));

    // Seed default roles/permissions (safe to call multiple times)
    await rbacRepo.seedDefaults();
    assert(true, 'seedDefaults completed without error');

    // 3. Verify roles and permissions exist
    console.log('--- Step 3: Verify roles & permissions ---');
    await check('Roles table has admin role', async function() {
      const role = await rbacRepo.findRoleByName('admin');
      if (!role) throw new Error('admin role not found');
      if (!role.is_system) throw new Error('admin role should be system');
    });

    await check('Roles table has organizer role', async function() {
      const role = await rbacRepo.findRoleByName('organizer');
      if (!role) throw new Error('organizer role not found');
    });

    await check('Roles table has user role', async function() {
      const role = await rbacRepo.findRoleByName('user');
      if (!role) throw new Error('user role not found');
    });

    await check('Permissions table has event:create', async function() {
      const perm = await rbacRepo.findPermissionByName('event:create');
      if (!perm) throw new Error('event:create permission not found');
    });

    await check('Permissions table has event:read', async function() {
      const perm = await rbacRepo.findPermissionByName('event:read');
      if (!perm) throw new Error('event:read permission not found');
    });

    await check('Permissions table has event:cancel', async function() {
      const perm = await rbacRepo.findPermissionByName('event:cancel');
      if (!perm) throw new Error('event:cancel permission not found');
    });

    await check('Admin role has event:create permission', async function() {
      const adminRole = await rbacRepo.findRoleByName('admin');
      const perms = await rbacRepo.getPermissionsForRole(adminRole.id);
      const names = perms.map(function(p) { return p.name; });
      if (!names.includes('event:create')) throw new Error('admin missing event:create');
    });

    await check('Organizer role has event:create permission', async function() {
      const orgRole = await rbacRepo.findRoleByName('organizer');
      const perms = await rbacRepo.getPermissionsForRole(orgRole.id);
      const names = perms.map(function(p) { return p.name; });
      if (!names.includes('event:create')) throw new Error('organizer missing event:create');
    });

    await check('Admin role has event:cancel permission', async function() {
      const adminRole = await rbacRepo.findRoleByName('admin');
      const perms = await rbacRepo.getPermissionsForRole(adminRole.id);
      const names = perms.map(function(p) { return p.name; });
      if (!names.includes('event:cancel')) throw new Error('admin missing event:cancel');
    });

    await check('Organizer role has event:cancel permission', async function() {
      const orgRole = await rbacRepo.findRoleByName('organizer');
      const perms = await rbacRepo.getPermissionsForRole(orgRole.id);
      const names = perms.map(function(p) { return p.name; });
      if (!names.includes('event:cancel')) throw new Error('organizer missing event:cancel');
    });

    await check('User role does NOT have event:create permission', async function() {
      const userRole = await rbacRepo.findRoleByName('user');
      const perms = await rbacRepo.getPermissionsForRole(userRole.id);
      const names = perms.map(function(p) { return p.name; });
      if (names.includes('event:create')) throw new Error('user should NOT have event:create');
    });

    // 4. Create a synthetic user via postgres.auth.repository
    console.log('--- Step 4: Create synthetic user ---');
    const crypto = require('crypto');
    const { promisify } = require('util');
    const scryptAsync = promisify(crypto.scrypt);

    let authRepo;
    try {
      authRepo = require(path.join(__dirname, '..', 'src', 'providers', 'database', 'postgres.auth.repository'));
    } catch (e) {
      authRepo = null;
    }

    if (authRepo && authRepo.createUser) {
      const salt = crypto.randomBytes(16).toString('hex');
      const derivedKey = await scryptAsync(TEST_USER_PASSWORD, salt, 64);
      const passwordHash = 'scrypt:' + salt + ':' + derivedKey.toString('hex');
      userId = await authRepo.createUser({
        email: TEST_USER_EMAIL,
        name: 'RBAC Smoke User',
        passwordHash: passwordHash,
        roles: ['user'],
      });
      if (!userId) throw new Error('User already exists (unlikely with unique email)');
    } else {
      userId = crypto.randomUUID();
      const salt = crypto.randomBytes(16).toString('hex');
      const derivedKey = await scryptAsync(TEST_USER_PASSWORD, salt, 64);
      const passwordHash = 'scrypt:' + salt + ':' + derivedKey.toString('hex');
      await pool.query(
        'INSERT INTO auth_users (id, email, name, password_hash, roles) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
        [userId, TEST_USER_EMAIL, 'RBAC Smoke User', passwordHash, ['user']]
      );
    }
    assert(!!userId, 'Synthetic user created with id: ' + userId);

    // 5. Verify legacy auth_users.roles still works
    console.log('--- Step 5: Verify legacy auth_users.roles compatibility ---');
    await check('auth_users.roles TEXT[] returns array from findUserById', async function() {
      if (authRepo && authRepo.findUserById) {
        const user = await authRepo.findUserById(userId);
        if (!user) throw new Error('User not found');
        if (!Array.isArray(user.roles)) throw new Error('roles is not an array: ' + JSON.stringify(user.roles));
        if (!user.roles.includes('user')) throw new Error('roles does not include "user": ' + JSON.stringify(user.roles));
      } else {
        const result = await pool.query('SELECT roles FROM auth_users WHERE id = $1', [userId]);
        if (!Array.isArray(result.rows[0].roles)) throw new Error('roles is not an array');
        if (!result.rows[0].roles.includes('user')) throw new Error('roles does not include "user"');
      }
    });

    await check('appendRoleToUser adds organizer role', async function() {
      if (authRepo && authRepo.appendRoleToUser) {
        await authRepo.appendRoleToUser(userId, 'organizer');
        const user = await authRepo.findUserById(userId);
        if (!user.roles.includes('organizer')) throw new Error('organizer role not added');
      } else {
        await pool.query(
          `UPDATE auth_users SET roles = CASE WHEN $2 = ANY(roles) THEN roles ELSE array_append(roles, $2) END, updated_at = NOW() WHERE id = $1`,
          [userId, 'organizer']
        );
        const result = await pool.query('SELECT roles FROM auth_users WHERE id = $1', [userId]);
        if (!result.rows[0].roles.includes('organizer')) throw new Error('organizer role not added');
      }
    });

    // 6. Resolve permissions for user with 'user' + 'organizer' roles
    console.log('--- Step 6: Permission resolution ---');
    await check('resolveUserPermissions returns event:create for organizer user', async function() {
      const perms = await rbacRepo.resolveUserPermissionNames(userId);
      if (!perms.includes('event:create')) throw new Error('Expected event:create permission, got: ' + JSON.stringify(perms));
      if (!perms.includes('event:read')) throw new Error('Expected event:read permission, got: ' + JSON.stringify(perms));
    });

    // 7. Create organization and membership
    console.log('--- Step 7: Organization & membership ---');
    await check('createOrganization succeeds', async function() {
      orgId = await rbacRepo.createOrganization({
        name: 'RBAC Test Org',
        slug: TEST_ORG_SLUG,
        description: 'Test organization for RBAC smoke',
      });
      if (!orgId) throw new Error('Organization not created');
    });

    await check('findOrganizationBySlug returns the org', async function() {
      const org = await rbacRepo.findOrganizationBySlug(TEST_ORG_SLUG);
      if (!org) throw new Error('Organization not found by slug');
      if (org.name !== 'RBAC Test Org') throw new Error('Organization name mismatch');
    });

    let membershipId;
    await check('addOrganizationMember succeeds', async function() {
      membershipId = await rbacRepo.addOrganizationMember({
        organizationId: orgId,
        userId: userId,
        role: 'manager',
      });
      if (!membershipId) throw new Error('Membership not created');
    });

    await check('getOrganizationMembers returns the member', async function() {
      const members = await rbacRepo.getOrganizationMembers(orgId);
      if (members.length === 0) throw new Error('No members found');
      const found = members.some(function(m) { return m.user_id === userId; });
      if (!found) throw new Error('Member not found in organization');
    });

    await check('getOrganizationMember returns correct role', async function() {
      const member = await rbacRepo.getOrganizationMember(orgId, userId);
      if (!member) throw new Error('Member not found');
      if (member.role !== 'manager') throw new Error('Expected role manager, got: ' + member.role);
    });

    await check('getUserOrganizationMemberships returns org', async function() {
      const memberships = await rbacRepo.getUserOrganizationMemberships(userId);
      if (memberships.length === 0) throw new Error('No memberships found');
      if (memberships[0].organization_slug !== TEST_ORG_SLUG) throw new Error('Org slug mismatch');
    });

    // 8. Audit logs
    console.log('--- Step 8: Audit logs ---');
    let auditLogId;
    await check('createAuditLog succeeds', async function() {
      auditLogId = await rbacRepo.createAuditLog({
        actorId: userId,
        action: 'test:smoke',
        resourceType: 'organization',
        resourceId: orgId,
        metadata: { smoke: true },
        ipAddress: '127.0.0.1',
      });
      if (!auditLogId) throw new Error('Audit log not created');
    });

    await check('findAuditLogsByActor returns the log', async function() {
      const logs = await rbacRepo.findAuditLogsByActor(userId, 10, 0);
      if (logs.length === 0) throw new Error('No audit logs found');
      const found = logs.some(function(l) { return l.id === auditLogId; });
      if (!found) throw new Error('Audit log not found by actor');
    });

    await check('findAuditLogsByResource returns the log', async function() {
      const logs = await rbacRepo.findAuditLogsByResource('organization', orgId, 10, 0);
      if (logs.length === 0) throw new Error('No audit logs found for resource');
    });

    // 9. Verify authz middleware helpers load and execute correctly
    console.log('--- Step 9: Authz middleware helpers ---');
    let authzMiddleware;
    try {
      authzMiddleware = require(path.join(__dirname, '..', 'src', 'shared', 'middleware', 'authz.middleware'));
      assert(typeof authzMiddleware.requireRole === 'function', 'requireRole is a function');
      assert(typeof authzMiddleware.requirePermission === 'function', 'requirePermission is a function');
      assert(typeof authzMiddleware.requireOrganizationRole === 'function', 'requireOrganizationRole is a function');
      assert(typeof authzMiddleware.auditLog === 'function', 'auditLog is a function');

      // Test auditLog execution
      await check('auditLog middleware writes log with custom idParamName', async function() {
        const mockReq = {
          user: { uid: userId },
          method: 'POST',
          originalUrl: '/test-events/evt_123',
          params: { eventId: 'evt_123' },
          ip: '127.0.0.1'
        };

        let sendCalled = false;
        const mockRes = {
          statusCode: 200,
          json: function(body) {
            sendCalled = true;
            return body;
          }
        };

        // Wrap res.json using the middleware
        const middleware = authzMiddleware.auditLog('test:action', 'test-resource', 'eventId');

        let nextCalled = false;
        await middleware(mockReq, mockRes, () => { nextCalled = true; });

        if (!nextCalled) throw new Error('next() was not called by middleware');

        // Trigger res.json to invoke the audit logger hook
        const testBody = { success: true };
        const result = mockRes.json(testBody);

        if (!sendCalled) throw new Error('res.json original send was not called');

        // Wait a small bit for the async log promise to resolve
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify the audit log was written to the DB
        const logs = await rbacRepo.findAuditLogsByActor(userId, 10, 0);
        const testLog = logs.find(l => l.action === 'test:action');
        if (!testLog) throw new Error('Audit log entry not found in database');
        if (testLog.resource_id !== 'evt_123') throw new Error(`Incorrect resource ID logged: expected 'evt_123', got '${testLog.resource_id}'`);
        if (testLog.resource_type !== 'test-resource') throw new Error(`Incorrect resource type: expected 'test-resource', got '${testLog.resource_type}'`);
      });

    } catch (e) {
      assert(false, 'authz middleware loads/executes: ' + e.message);
    }

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
      console.log('All RBAC smoke tests passed.');
    }
  } finally {
    // Cleanup: drop smoke user and org
    try {
      await pool.query('DELETE FROM audit_logs WHERE actor_id = $1', [userId]);
      await pool.query('DELETE FROM organization_memberships WHERE organization_id = $1', [orgId]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [orgId]);
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM auth_tokens WHERE email = $1', [TEST_USER_EMAIL]);
      await pool.query('DELETE FROM auth_users WHERE id = $1', [userId]);
    } catch (e) {
      console.error('Cleanup error (non-fatal): ' + e.message);
    }
    await pool.end();
  }
}

run().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
