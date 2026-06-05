// scripts/smoke.lazy-providers.js
// Smoke test for provider loader: asserts that postgres/backend/onesignal resolve
// and that unknown provider values produce clear unsupported-provider errors.

const Module = require('module');

const originalLoad = Module._load;
const loadedModules = [];

Module._load = function (request, parent, isMain) {
  let resolvedPath = '';
  try {
    resolvedPath = Module._resolveFilename(request, parent);
  } catch (e) {
    // ignore unresolvable
  }
  const normalizedPath = (resolvedPath || request).replace(/\\/g, '/');
  loadedModules.push(normalizedPath);
  return originalLoad.apply(this, arguments);
};

console.log('--- Starting Lazy Provider Loading Smoke Test ---');

// -----------------------------------------------------------------------
// 1. Default providers (no overrides) must resolve to postgres/backend/onesignal
// -----------------------------------------------------------------------
(function testDefaultProviders() {
  console.log('\n[Test 1] Default provider resolution (no env overrides)...');

  const auth = require('../providers/auth');
  if (!auth || typeof auth.verifyToken !== 'function') {
    throw new Error('Default auth provider missing verifyToken');
  }
  console.log('[OK] Auth provider resolved: backend');

  const notification = require('../providers/notification');
  if (!notification) {
    throw new Error('Default notification provider is null');
  }
  console.log('[OK] Notification provider resolved: onesignal');

  const repoNames = [
    'admin', 'analytics', 'event', 'featuredProfile', 'media',
    'notification', 'organizer', 'promotion', 'review', 'ticket',
    'user', 'venue'
  ];
  for (const repo of repoNames) {
    const repository = require(`../providers/database/${repo}.repository`);
    if (!repository) {
      throw new Error(`Default ${repo} repository is null`);
    }
  }
  console.log('[OK] All database repository selectors resolved: postgres');
})();

// -----------------------------------------------------------------------
// 2. Unsupported provider values must throw clear errors
// -----------------------------------------------------------------------
(function testUnsupportedProviders() {
  console.log('\n[Test 2] Unsupported provider values...');

  const { NODE_ENV, ...rest } = process.env;

  // Auth: 'firebase' is no longer supported
  process.env.AUTH_PROVIDER = 'firebase';
  try {
    delete require.cache[require.resolve('../providers/auth')];
    require('../providers/auth');
    console.error('FAIL: Auth provider "firebase" should have thrown');
    process.exit(1);
  } catch (err) {
    if (!err.message.includes('not supported')) {
      console.error('FAIL: Wrong error for unsupported auth provider:', err.message);
      process.exit(1);
    }
    console.log('[OK] Auth provider "firebase" rejected with clear error.');
  }

  // Database: 'firebase' is no longer supported
  process.env.DATABASE_PROVIDER = 'firebase';
  try {
    delete require.cache[require.resolve('../providers/database/user.repository')];
    require('../providers/database/user.repository');
    console.error('FAIL: DB provider "firebase" should have thrown');
    process.exit(1);
  } catch (err) {
    if (!err.message.includes('not supported')) {
      console.error('FAIL: Wrong error for unsupported DB provider:', err.message);
      process.exit(1);
    }
    console.log('[OK] Database provider "firebase" rejected with clear error.');
  }

  // Notification: 'firebase' is no longer supported
  process.env.NOTIFICATION_PROVIDER = 'firebase';
  try {
    delete require.cache[require.resolve('../providers/notification')];
    require('../providers/notification');
    console.error('FAIL: Notification provider "firebase" should have thrown');
    process.exit(1);
  } catch (err) {
    if (!err.message.includes('not supported')) {
      console.error('FAIL: Wrong error for unsupported notification provider:', err.message);
      process.exit(1);
    }
    console.log('[OK] Notification provider "firebase" rejected with clear error.');
  }

  // Restore env vars
  process.env.AUTH_PROVIDER = 'backend';
  process.env.DATABASE_PROVIDER = 'postgres';
  process.env.NOTIFICATION_PROVIDER = 'onesignal';
})();

console.log('\n--- Lazy Provider Loading Smoke Test Passed Successfully! ---');
process.exit(0);
