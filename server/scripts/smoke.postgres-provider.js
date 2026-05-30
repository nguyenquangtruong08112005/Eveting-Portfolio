// scripts/smoke.postgres-provider.js
// Smoke test for Phase C7 global Postgres provider smoke
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.postgres-provider.js

const { spawn } = require('child_process');
const axios = require('axios');

const TEST_PORT = process.env.TEST_PORT || '3001';
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

console.log('--- Starting Postgres Provider Smoke Test ---');
console.log('Database URL:', DATABASE_URL);
console.log('Test Port:', TEST_PORT);

// Set required environment variables for the app server
const env = {
  ...process.env,
  PORT: TEST_PORT,
  DATABASE_URL: DATABASE_URL,
  DATABASE_PROVIDER: 'postgres',
  AUTH_PROVIDER: 'backend',
  STORAGE_PROVIDER: 'local',
};

let serverProcess = null;

// Helper function to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Clean shutdown function
function cleanup() {
  if (serverProcess) {
    console.log('Shutting down application server...');
    try {
      serverProcess.kill();
    } catch (e) {
      console.error('Error killing server process:', e.message);
    }
    serverProcess = null;
  }
}

// Make sure server process is killed on any exit path
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  cleanup();
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  cleanup();
  process.exit(1);
});

async function run() {
  // 1. Start the server as a child process
  console.log('Spawning application server...');
  serverProcess = spawn('node', ['app.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

  let serverStarted = false;
  let exitError = null;

  // Capture stdout to detect when the server has started
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Server stdout] ${output.trim()}`);
    if (output.includes('Server address') || output.includes('localhost:')) {
      serverStarted = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error(`[Server stderr] ${output.trim()}`);
    if (output.includes('Error:') || output.includes('throw new Error') || output.includes('Database provider') || output.includes('is not supported')) {
      exitError = new Error(`Server logged boot error: ${output.trim()}`);
    }
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    if (code !== 0 && code !== null) {
      exitError = new Error(`Server process exited with code ${code}`);
    }
  });

  // Wait up to 10 seconds for the server to spin up
  console.log('Waiting for server to become responsive...');
  for (let i = 0; i < 20; i++) {
    if (exitError) {
      throw exitError;
    }
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

  if (exitError) {
    throw exitError;
  }

  if (!serverStarted) {
    throw new Error('Server failed to start or did not become responsive within 10 seconds.');
  }
  console.log('Server is responsive at:', BASE_URL);

  // 2. Call bounded routes
  console.log('\nTesting: GET /');
  const resHome = await axios.get(`${BASE_URL}/`);
  console.log('GET / Response Status:', resHome.status);
  console.log('GET / Response Data:', resHome.data);
  if (resHome.status !== 200) {
    throw new Error(`Expected 200 from GET /, got ${resHome.status}`);
  }
  if (typeof resHome.data !== 'string' || !resHome.data.includes('Welcome')) {
    throw new Error('GET / response shape or content invalid');
  }
  console.log('[OK] GET / check passed.');

  console.log('\nTesting: GET /events?page=1&limit=1');
  const resEvents = await axios.get(`${BASE_URL}/events?page=1&limit=1`);
  console.log('GET /events Response Status:', resEvents.status);
  if (resEvents.status !== 200) {
    throw new Error(`Expected 200 from GET /events, got ${resEvents.status}`);
  }
  if (!resEvents.data || !Array.isArray(resEvents.data.events)) {
    throw new Error('GET /events response missing events array or has incorrect shape.');
  }
  console.log('[OK] GET /events check passed.');

  console.log('\nTesting: GET /profiles?limit=1');
  const resProfiles = await axios.get(`${BASE_URL}/profiles?limit=1`);
  console.log('GET /profiles Response Status:', resProfiles.status);
  if (resProfiles.status !== 200) {
    throw new Error(`Expected 200 from GET /profiles, got ${resProfiles.status}`);
  }
  if (!resProfiles.data || !Array.isArray(resProfiles.data.profiles)) {
    throw new Error('GET /profiles response missing profiles array or has incorrect shape.');
  }
  console.log('[OK] GET /profiles check passed.');

  console.log('\nTesting: GET /admin/events/pending?page=1&limit=5');
  const resAdminPending = await axios.get(`${BASE_URL}/admin/events/pending?page=1&limit=5`);
  console.log('GET /admin/events/pending Response Status:', resAdminPending.status);
  if (resAdminPending.status !== 200) {
    throw new Error(`Expected 200 from GET /admin/events/pending, got ${resAdminPending.status}`);
  }
  if (!resAdminPending.data || !Array.isArray(resAdminPending.data)) {
    throw new Error('GET /admin/events/pending response is not an array.');
  }
  console.log('[OK] GET /admin/events/pending check passed.');

  console.log('\n--- All Postgres Provider Smoke Tests Passed Successfully! ---');
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
