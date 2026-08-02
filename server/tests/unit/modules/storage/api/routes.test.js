'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, storageController, verifyAuthToken;

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/storage/api/controller', () => ({ uploadFile: jest.fn() }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));
  jest.mock('multer', () => {
    const m = jest.fn(() => ({
      memoryStorage: () => ({}),
      single: () => jest.fn(),
    }));
    m.memoryStorage = jest.fn(() => ({}));
    m.MulterError = class MulterError extends Error {
      constructor(message) { super(message); this.name = 'MulterError'; }
    };
    return m;
  });

  storageController = require('@/modules/storage/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
});

afterEach(() => {
  jest.resetModules();
});

test('storage api routes', () => {
  require('@/modules/storage/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(1);

  const [postUpload] = rs;

  expect(postUpload.method).toBe('POST');
  expect(postUpload.path).toBe('/upload');
  expect(postUpload.handlers[0]).toBe(verifyAuthToken);
  expect(postUpload.handlers[2]).toBe(storageController.uploadFile);
});
