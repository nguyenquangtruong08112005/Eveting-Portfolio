// scripts/smoke.storage.js
// Bounded smoke script to validate generic backend storage upload.
// No external dependencies on AWS/R2 or Firebase/Postgres needed.
// Run with: node scripts/smoke.storage.js

// Force local storage provider and bypass database/auth network calls
process.env.STORAGE_PROVIDER = 'local';

const assert = require('assert');
const axios = require('axios');
require('../../src/alias-bootstrap');
const storageProvider = require('../../src/providers/storage');
const storageService = require('../../src/modules/storage/application/service');
const storageController = require('../../src/modules/storage/api/controller');

async function runTests() {
  console.log('--- Phase C5 Generic Storage Upload Smoke Test ---');
  console.log('Active storage provider:', process.env.STORAGE_PROVIDER);

  const userId = 'user_test/special#char@123';
  const testBuffer = Buffer.from('Antigravity storage slice content');
  const testMimetype = 'image/jpeg';
  const originalname = 'profile.picture.jpg';

  const mockFile = {
    buffer: testBuffer,
    originalname,
    mimetype: testMimetype,
    size: testBuffer.length
  };

  // Test 1: Verify direct Service upload, formatting, and sanitization
  console.log('\n[Test 1] Testing Storage Service upload...');
  const result = await storageService.uploadFile(userId, mockFile, 'profile');

  console.log('Upload Result:', JSON.stringify(result, null, 2));

  assert.ok(result.key, 'Result should contain a key');
  assert.ok(result.url, 'Result should contain a public URL');
  assert.strictEqual(result.contentType, testMimetype, 'ContentType should match input mimetype');
  assert.strictEqual(result.originalName, originalname, 'OriginalName should match input');
  assert.strictEqual(result.size, testBuffer.length, 'Size should match input size');

  // Verify paths are sanitized and namespaced correctly: purpose/userId/timestamp_uuid.ext
  // Sanitized userId should not contain '/' or '@' or '#'
  const parts = result.key.split('/');
  assert.strictEqual(parts.length, 3, 'Key structure should have 3 segments: purpose/userId/file');
  assert.strictEqual(parts[0], 'profile', 'First segment should be sanitized/mapped purpose');
  assert.strictEqual(parts[1], 'user_testspecialchar123', 'Second segment should be sanitized userId');
  assert.ok(parts[2].includes('_'), 'Third segment should contain timestamp and uuid separator');
  assert.ok(parts[2].endsWith('.jpg'), 'Third segment should end with safe file extension');

  // Read buffer back from storage to confirm it uploaded successfully
  console.log('Retrieving buffer from local storage to verify integrity...');
  const retrievedBuffer = await storageProvider.getObjectBuffer(result.key);
  assert.strictEqual(retrievedBuffer.toString(), testBuffer.toString(), 'Retrieved buffer content must match uploaded content');
  console.log('Integrity check passed!');

  // Test 2: Verify custom/unsafe purpose mapping and default fallbacks
  console.log('\n[Test 2] Testing Unsafe/Invalid Purpose Handling...');
  
  const resultUnsafe = await storageService.uploadFile(userId, mockFile, 'invalid_purpose/../etc');
  console.log('Key with unsafe purpose:', resultUnsafe.key);
  assert.ok(resultUnsafe.key.startsWith('misc/'), 'Unsafe/unknown purpose should fall back to "misc"');

  const resultEmpty = await storageService.uploadFile(userId, mockFile, '');
  console.log('Key with empty purpose:', resultEmpty.key);
  assert.ok(resultEmpty.key.startsWith('misc/'), 'Empty purpose should fall back to "misc"');

  // Test 3: Verify Controller validation logic (Mock Express request/response)
  console.log('\n[Test 3] Testing Storage Controller validation...');

  // Case A: Missing file
  let statusResult = null;
  let jsonResult = null;

  const mockRes = {
    status(code) {
      statusResult = code;
      return this;
    },
    json(data) {
      jsonResult = data;
      return this;
    }
  };

  await storageController.uploadFile({ user: { uid: 'user123' }, file: null, body: {} }, mockRes);
  assert.strictEqual(statusResult, 400);
  assert.strictEqual(jsonResult.error, 'No file uploaded.');
  console.log('Successfully validated missing file rejection (400)');

  // Case B: Unsupported mime type
  statusResult = null;
  jsonResult = null;
  const invalidFile = {
    buffer: Buffer.from('some text'),
    originalname: 'document.txt',
    mimetype: 'text/plain',
    size: 9
  };

  await storageController.uploadFile({ user: { uid: 'user123' }, file: invalidFile, body: {} }, mockRes);
  assert.strictEqual(statusResult, 400);
  assert.ok(jsonResult.error.includes('Only image/* and video/* are allowed'));
  console.log('Successfully validated unsupported mime type rejection (400)');

  // Case C: File too large (> 10MB)
  statusResult = null;
  jsonResult = null;
  const hugeFile = {
    buffer: Buffer.from('large'),
    originalname: 'image.jpg',
    mimetype: 'image/jpeg',
    size: 11 * 1024 * 1024 // 11MB
  };

  await storageController.uploadFile({ user: { uid: 'user123' }, file: hugeFile, body: {} }, mockRes);
  assert.strictEqual(statusResult, 400);
  assert.ok(jsonResult.error.includes('File size limit exceeded'));
  console.log('Successfully validated oversized file rejection (400)');

  // Case D: Successful path through controller
  statusResult = null;
  jsonResult = null;
  const validFile = {
    buffer: Buffer.from('valid jpeg bytes'),
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    size: 16
  };

  await storageController.uploadFile({ user: { uid: 'user_controller_test' }, file: validFile, body: { purpose: 'event' } }, mockRes);
  assert.strictEqual(statusResult, 201);
  assert.strictEqual(jsonResult.originalName, 'photo.jpg');
  assert.ok(jsonResult.key.startsWith('event/user_controller_test/'));
  console.log('Successfully validated successful upload path (201)');

  // Test 4: Verify mounted BFF route (/api/web/storage/upload) middleware & mounting
  console.log('\n[Test 4] Testing BFF route (/api/web/storage/upload) mounting & CSRF/auth rules...');
  const express = require('express');
  const cookieParser = require('cookie-parser');
  const { csrfProtection } = require('../../src/shared/middleware/csrf.middleware');
  const storageRouter = require('../../src/modules/storage/api/routes');

  const testApp = express();
  testApp.use(cookieParser());
  testApp.use(csrfProtection);
  testApp.use('/api/web/storage', storageRouter);

  const server = testApp.listen(0);
  const port = server.address().port;

  try {
    // 4a. Missing CSRF header on state-changing request -> 403
    const resCsrfMissing = await axios.post(`http://localhost:${port}/api/web/storage/upload`, {}, {
      validateStatus: () => true
    });
    assert.strictEqual(resCsrfMissing.status, 403, 'Missing CSRF header on web storage upload must return 403');
    console.log('Successfully verified 403 on missing CSRF header for /api/web/storage/upload');

    // 4b. Valid CSRF cookie/header but missing auth token -> 401
    const resUnauth = await axios.post(`http://localhost:${port}/api/web/storage/upload`, {}, {
      headers: {
        Cookie: 'csrfToken=test_csrf_token_123',
        'X-CSRF-Token': 'test_csrf_token_123'
      },
      validateStatus: () => true
    });
    assert.strictEqual(resUnauth.status, 401, 'Unauthenticated request to BFF upload route must return 401');
    console.log('Successfully verified 401 on missing auth token for /api/web/storage/upload');
  } finally {
    server.close();
  }

  // Clean up uploaded files in local storage mock Map
  await storageProvider.deleteObject(result.key);
  await storageProvider.deleteObject(resultUnsafe.key);
  await storageProvider.deleteObject(resultEmpty.key);
  await storageProvider.deleteObject(jsonResult.key);

  console.log('\n--- ALL STORAGE SMOKE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('\nTest execution failed:');
  console.error(err);
  process.exit(1);
});
