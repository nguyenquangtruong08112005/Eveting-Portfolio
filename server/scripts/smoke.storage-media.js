// scripts/smoke.storage-media.js
// Bounded smoke script to validate local storage upload/read and media item building.
// No external dependencies on AWS/R2 or Firebase/Postgres needed.
// Run with: node scripts/smoke.storage-media.js

// Force local storage provider and bypass database requirements
process.env.STORAGE_PROVIDER = 'local';

const assert = require('assert');
const path = require('path');
require('../src/alias-bootstrap');
const storageProvider = require('../src/providers/storage');
const mediaService = require('../src/modules/media/media.service');
const mediaRepository = require('../src/providers/database/media.repository');
const mediaController = require('../src/modules/media/media.controller');

// Stub repository method to avoid hitting real database (Postgres/Firebase)
let databaseSavedItems = [];
mediaRepository.createEventMediaBatch = async (items) => {
  databaseSavedItems = items;
  return items;
};

async function runTests() {
  console.log('--- Phase C5 Storage & Media Smoke Test ---');
  console.log('Active storage provider:', process.env.STORAGE_PROVIDER);

  // Test 1: Verify Storage Provider Interface & Read/Write/URL logic
  console.log('\n[Test 1] Testing Local Storage Provider directly...');
  
  const testKey = 'event-media/test-event-123/sample-file.png';
  const testBuffer = Buffer.from('Antigravity local storage test content');
  const testMimetype = 'image/png';

  console.log('Uploading sample buffer to:', testKey);
  await storageProvider.uploadBuffer(testKey, testBuffer, testMimetype);

  const publicUrl = await storageProvider.getPublicUrl(testKey);
  console.log('Generated Public URL:', publicUrl);
  assert.ok(publicUrl, 'Public URL should not be null or undefined');
  assert.ok(publicUrl.includes(testKey), 'Public URL should contain the storage key');

  console.log('Retrieving buffer from local storage...');
  const retrievedBuffer = await storageProvider.getObjectBuffer(testKey);
  assert.strictEqual(retrievedBuffer.toString(), testBuffer.toString(), 'Retrieved buffer content must match uploaded content');
  console.log('Buffer successfully read and verified!');

  // Test 2: Verify Media Service file processing, inference, and persistence
  console.log('\n[Test 2] Testing Media Service upload & metadata building...');
  
  const userId = 'user_smoke_test_999';
  const eventId = 'event_smoke_test_888';
  
  const filesData = [
    {
      buffer: Buffer.from('fake-image-bytes'),
      originalname: 'scenery.jpg',
      mimetype: 'image/jpeg',
      caption: 'Beautiful Mountain View'
    },
    {
      buffer: Buffer.from('fake-video-bytes'),
      originalname: 'recording.mp4',
      mimetype: 'video/mp4',
      caption: 'Event Highlights'
    }
  ];

  console.log(`Processing and uploading ${filesData.length} mock files via Media Service...`);
  const result = await mediaService.addEventMediaFiles(userId, eventId, filesData);

  assert.strictEqual(result.length, 2, 'Should return exactly 2 created media records');
  
  // Verify first item (image)
  const item1 = result[0];
  console.log('\nVerifying record 1 (Image):', JSON.stringify(item1, null, 2));
  assert.strictEqual(item1.userId, userId);
  assert.strictEqual(item1.eventId, eventId);
  assert.strictEqual(item1.type, 'image', 'Should infer "image" type from image/jpeg');
  assert.strictEqual(item1.caption, 'Beautiful Mountain View', 'Caption should be preserved');
  assert.ok(item1.url.endsWith('.jpg'), 'URL should preserve original file extension .jpg');

  // Verify second item (video)
  const item2 = result[1];
  console.log('Verifying record 2 (Video):', JSON.stringify(item2, null, 2));
  assert.strictEqual(item2.userId, userId);
  assert.strictEqual(item2.eventId, eventId);
  assert.strictEqual(item2.type, 'video', 'Should infer "video" type from video/mp4');
  assert.strictEqual(item2.caption, 'Event Highlights', 'Caption should be preserved');
  assert.ok(item2.url.endsWith('.mp4'), 'URL should preserve original file extension .mp4');

  // Verify DB batch save was invoked with correct items
  assert.strictEqual(databaseSavedItems.length, 2, 'Should call createEventMediaBatch with 2 items');
  assert.strictEqual(databaseSavedItems[0].media.id, item1.id);
  assert.strictEqual(databaseSavedItems[1].media.id, item2.id);
  console.log('Database batch save verified!');

  // Verify that the files were indeed stored in the storage provider and can be read back
  console.log('\nVerifying files are readable from storage...');
  for (const item of result) {
    // Parse key from url (everything after /public/ or similar)
    const keyMatch = item.url.match(/public\/(event-media\/.*)$/);
    assert.ok(keyMatch && keyMatch[1], 'Should be able to extract storage key from URL');
    const storageKey = keyMatch[1];
    
    const buffer = await storageProvider.getObjectBuffer(storageKey);
    assert.ok(buffer, `Buffer should exist in storage for key: ${storageKey}`);
    console.log(`Key "${storageKey}" successfully retrieved from storage, length: ${buffer.length}`);
  }

  // Cleanup
  await storageProvider.deleteObject(testKey);
  for (const item of result) {
    const keyMatch = item.url.match(/public\/(event-media\/.*)$/);
    await storageProvider.deleteObject(keyMatch[1]);
  }

  // Test 3: Verify Controller Mimetype Validation
  console.log('\n[Test 3] Testing Media Controller uploadMedia mimetype validation...');
  const originalCanUpload = mediaService.canUploadEventMedia;
  mediaService.canUploadEventMedia = async () => true;

  try {
    let responseStatus = null;
    let responseData = null;

    const mockReq = {
      user: { uid: 'user_smoke_test_999' },
      params: { eventId: 'event_smoke_test_888' },
      files: [
        {
          buffer: Buffer.from('fake-text-bytes'),
          originalname: 'document.txt',
          mimetype: 'text/plain',
          caption: 'Unsupported doc'
        }
      ],
      body: {}
    };

    const mockRes = {
      status(code) {
        responseStatus = code;
        return this;
      },
      send(data) {
        responseData = data;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await mediaController.uploadMedia(mockReq, mockRes);

    assert.strictEqual(responseStatus, 400, 'Should return status 400 for unsupported mimetype');
    assert.ok(responseData && responseData.error, 'Response should contain error object/message');
    assert.ok(responseData.error.includes('Only image/* and video/* are allowed'), 'Error message should match validation message');
    console.log('Successfully asserted invalid mimetype rejection with 400:', responseData);
  } finally {
    mediaService.canUploadEventMedia = originalCanUpload;
  }

  console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('\nTest execution failed:');
  console.error(err);
  process.exit(1);
});
