#!/usr/bin/env node
/**
 * smoke.rate-limit-cors.js
 * Executable smoke test for Phase 02-T2 & Phase 02-T3:
 * - Redis/In-memory Rate Limiting (HTTP 429 & Retry-After)
 * - Strict CORS (Allowed origins vs rejected unauthorized origins)
 * - Private container compose topology static audit
 * - Mobile Attestation Nonce & Attestation endpoints
 */

require('dotenv').config({ quiet: true });
require('../../src/alias-bootstrap');

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const TEST_PORT = process.env.TEST_PORT || '35440';
const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess = null;
const PASS = [];
const FAIL = [];

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    PASS.push(label);
  } else {
    console.log(`  ✗ ${label}`);
    FAIL.push(label);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('');
  console.log('smoke.rate-limit-cors.js');
  console.log('──────────────────────────────────────────────────');

  // 1. Audit Compose Topology Static File
  console.log('\n  [1. Container Compose Topology Audit]');
  const composePath = path.join(__dirname, '../../infra/ansible/roles/app/templates/docker-compose.app.yml.j2');
  if (fs.existsSync(composePath)) {
    const composeContent = fs.readFileSync(composePath, 'utf8');
    const hasPublicPostgres = /postgres:[\s\S]*?ports:\s*-\s*["']?5432/i.test(composeContent);
    const hasPublicRedis = /redis:[\s\S]*?ports:\s*-\s*["']?6379/i.test(composeContent);
    const hasPublicES = /elasticsearch:[\s\S]*?ports:\s*-\s*["']?9200/i.test(composeContent);

    assert('Postgres has zero host port exposure in production compose template', !hasPublicPostgres);
    assert('Redis has zero host port exposure in production compose template', !hasPublicRedis);
    assert('Elasticsearch has zero host port exposure in production compose template', !hasPublicES);
  } else {
    assert(`Production compose template found at ${composePath}`, false);
  }

  // 2. Spawn Application Server
  console.log('\n  [2. Spawning Application Server for Integration Checks]');
  const env = {
    ...process.env,
    PORT: TEST_PORT,
    NODE_ENV: 'development',
    AUTH_PROVIDER: 'backend',
    SKIP_RATE_LIMIT: 'false',
    AUTH_RATE_LIMIT_MAX: '5', // Tightened for quick smoke verification
    MOBILE_ATTESTATION_MOCK: 'true',
  };

  serverProcess = spawn('node', ['src/server.js'], { cwd: path.join(__dirname, '../..'), env, stdio: ['ignore', 'pipe', 'pipe'] });

  let serverStarted = false;
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Server address') || output.includes('localhost:')) {
      serverStarted = true;
    }
  });

  for (let i = 0; i < 20; i++) {
    if (serverStarted) break;
    try {
      const res = await axios.get(`${BASE_URL}/health`);
      if (res.status === 200) {
        serverStarted = true;
        break;
      }
    } catch (_) {}
    await sleep(400);
  }

  if (!serverStarted) {
    throw new Error('Server failed to start or did not respond on health check');
  }
  console.log('  Server is responsive at:', BASE_URL);

  // 3. Test CORS Whitelist & Unauthorized Origin Rejection
  console.log('\n  [3. CORS Whitelist & Origin Rejection]');
  try {
    const allowedCorsRes = await axios.options(`${BASE_URL}/auth/login`, {
      headers: {
        Origin: 'https://eventing.moteo.fun',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'X-CSRF-Token, Content-Type',
      },
    });

    assert('OPTIONS preflight for allowed origin returned 204/200', allowedCorsRes.status === 204 || allowedCorsRes.status === 200);
    assert('Access-Control-Allow-Origin matches allowed origin', allowedCorsRes.headers['access-control-allow-origin'] === 'https://eventing.moteo.fun');
    assert('Access-Control-Allow-Credentials is true', allowedCorsRes.headers['access-control-allow-credentials'] === 'true');
    const allowHeaders = allowedCorsRes.headers['access-control-allow-headers'] || '';
    assert('Access-Control-Allow-Headers includes X-CSRF-Token', allowHeaders.toLowerCase().includes('x-csrf-token'));
    assert('Access-Control-Allow-Headers includes X-App-Integrity-Token', allowHeaders.toLowerCase().includes('x-app-integrity-token'));
    assert('Access-Control-Allow-Headers includes X-Idempotency-Key', allowHeaders.toLowerCase().includes('x-idempotency-key'));
  } catch (err) {
    assert(`Allowed origin OPTIONS request failed: ${err.message}`, false);
  }

  try {
    await axios.options(`${BASE_URL}/auth/login`, {
      headers: {
        Origin: 'https://malicious-attacker.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert('Unauthorized origin OPTIONS should have been rejected', false);
  } catch (err) {
    assert('Unauthorized origin OPTIONS preflight rejected with 403', err.response && err.response.status === 403);
    const reflectedOrigin = err.response && err.response.headers && err.response.headers['access-control-allow-origin'];
    assert('Unauthorized origin is NOT reflected in Access-Control-Allow-Origin header', reflectedOrigin !== 'https://malicious-attacker.com');
  }

  try {
    await axios.get(`${BASE_URL}/health`, {
      headers: {
        Origin: 'https://malicious-attacker.com',
      },
    });
    assert('Unauthorized origin non-preflight GET should have been rejected', false);
  } catch (err) {
    assert('Unauthorized origin non-preflight request rejected with 403', err.response && err.response.status === 403);
    assert('Rejected non-preflight error code matches CORS_ORIGIN_NOT_ALLOWED', err.response && err.response.data && err.response.data.error === 'CORS_ORIGIN_NOT_ALLOWED');
  }

  // 4. Test Rate Limiting (HTTP 429 & Retry-After Header)
  console.log('\n  [4. Rate Limiting 429 & Retry-After]');
  let rateLimited = false;
  let retryAfterHeader = null;

  for (let j = 0; j < 10; j++) {
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'rate_test@example.com',
        password: 'wrong_password',
      });
    } catch (err) {
      if (err.response && err.response.status === 429) {
        rateLimited = true;
        retryAfterHeader = err.response.headers['retry-after'] || err.response.headers['ratelimit-reset'];
        break;
      }
    }
    await sleep(20);
  }

  assert('Excessive auth attempts returned HTTP 429 Too Many Requests', rateLimited);
  assert('HTTP 429 response contains Retry-After or RateLimit-Reset header', !!retryAfterHeader);

  // 5. Test Mobile Attestation Nonce & Verification API
  console.log('\n  [5. Mobile Attestation Endpoints]');
  try {
    const nonceRes = await axios.get(`${BASE_URL}/auth/mobile/nonce`);
    assert('GET /auth/mobile/nonce returned HTTP 200', nonceRes.status === 200);
    assert('Nonce response contains valid nonce string', typeof nonceRes.data.nonce === 'string' && nonceRes.data.nonce.length >= 32);
    assert('Nonce response contains expiresAt timestamp', !!nonceRes.data.expiresAt);

    const nonce = nonceRes.data.nonce;

    // Attest with valid nonce
    const attestRes = await axios.post(`${BASE_URL}/auth/mobile/attest`, {
      nonce,
      integrityToken: 'mock_integrity_token_valid',
      packageName: 'com.eventing.attendee',
    });

    assert('POST /auth/mobile/attest with valid nonce returned HTTP 200', attestRes.status === 200);
    assert('Attestation response indicates success: true', attestRes.data.success === true && attestRes.data.attested === true);

    // Attempt replay attack with same nonce
    try {
      await axios.post(`${BASE_URL}/auth/mobile/attest`, {
        nonce,
        integrityToken: 'mock_integrity_token_replay',
      });
      assert('Reusing single-use nonce should have failed', false);
    } catch (replayErr) {
      assert('Reusing single-use nonce returned HTTP 400', replayErr.response && replayErr.response.status === 400);
      assert('Replay failure code matches INVALID_NONCE', replayErr.response && replayErr.response.data.code === 'INVALID_NONCE');
    }
  } catch (err) {
    assert(`Mobile attestation check failed: ${err.message}`, false);
  }

  // Teardown
  if (serverProcess) {
    serverProcess.kill();
    console.log('\n  Server stopped.');
  }

  console.log('');
  console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
  console.log('');

  process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Unhandled test failure:', err);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
