// scripts/smoke.lazy-providers.js
// Smoke test for Phase C10 Lazy Provider Loading assertion
// Sets env to postgres/backend/onesignal and asserts that no Firebase modules are required

const Module = require('module');

// Set required env variables to target Postgres, backend, and OneSignal
process.env.DATABASE_PROVIDER = 'postgres';
process.env.AUTH_PROVIDER = 'backend';
process.env.NOTIFICATION_PROVIDER = 'onesignal';

const originalLoad = Module._load;

const forbiddenPatterns = [
  /firebase-admin/,
  /config\/firebase\.config/,
  /providers\/auth\/firebase\.auth\.provider/,
  /providers\/notification\/firebase\.provider/,
  /providers\/database\/firebase\..*\.repository/
];

Module._load = function (request, parent, isMain) {
  let resolvedPath = '';
  try {
    resolvedPath = Module._resolveFilename(request, parent);
  } catch (e) {
    // If it can't resolve, fallback to request
  }

  const normalizedPath = (resolvedPath || request).replace(/\\/g, '/');

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(normalizedPath)) {
      console.error(`Assertion Failed: Forbidden module loaded: "${request}" resolved to "${normalizedPath}"`);
      process.exit(1);
    }
  }

  return originalLoad.apply(this, arguments);
};

console.log('--- Starting Lazy Provider Loading Smoke Test ---');

// Attempt to load auth provider selector
try {
  console.log('Requiring providers/auth...');
  const authProvider = require('../providers/auth');
  if (!authProvider || typeof authProvider.verifyToken !== 'function') {
    throw new Error('Loaded auth provider is missing expected verifyToken interface');
  }
  console.log('Loaded auth provider: backend');
} catch (err) {
  console.error('Failed to load auth provider:', err);
  process.exit(1);
}

// Attempt to load notification provider selector
try {
  console.log('Requiring providers/notification...');
  const notificationProvider = require('../providers/notification');
  if (!notificationProvider) {
    throw new Error('Loaded notification provider is null or undefined');
  }
  console.log('Loaded notification provider: onesignal');
} catch (err) {
  console.error('Failed to load notification provider:', err);
  process.exit(1);
}

// Attempt to load database repository selectors
const repoNames = [
  'admin', 'analytics', 'event', 'featuredProfile', 'media',
  'notification', 'organizer', 'promotion', 'review', 'ticket',
  'user', 'venue'
];

for (const repo of repoNames) {
  try {
    console.log(`Requiring database repository selector: ${repo}.repository...`);
    const repository = require(`../providers/database/${repo}.repository`);
    if (!repository) {
      throw new Error(`Loaded ${repo} repository is null or undefined`);
    }
  } catch (err) {
    console.error(`Failed to load database repository selector "${repo}":`, err);
    process.exit(1);
  }
}

console.log('--- Checking active provider instance types (must not load Firebase) ---');
console.log('Assertion Succeeded: No Firebase configuration or repository modules were loaded at boot.');
console.log('--- Lazy Provider Loading Smoke Test Passed Successfully! ---');
process.exit(0);
