'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, mediaController, verifyAuthToken, validateRequest;

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/media/api/controller', () => ({ getGallery: jest.fn(), uploadMedia: jest.fn() }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));
  jest.mock('multer', () => {
    const m = jest.fn(() => ({
      memoryStorage: () => ({}),
      any: () => jest.fn(),
    }));
    m.memoryStorage = jest.fn(() => ({}));
    m.MulterError = class MulterError extends Error {
      constructor(message) { super(message); this.name = 'MulterError'; }
    };
    return m;
  });

  mediaController = require('@/modules/media/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
});

afterEach(() => {
  jest.resetModules();
});

test('media api routes', () => {
  require('@/modules/media/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(router._mergeParams).toBe(true);
  expect(rs).toHaveLength(2);

  const [getGallery, postUpload] = rs;

  expect(getGallery.method).toBe('GET');
  expect(getGallery.path).toBe('/');
  expect(Array.isArray(getGallery.handlers[0])).toBe(true);
  expect(getGallery.handlers[0][getGallery.handlers[0].length - 1]).toBe(validateRequest);
  expect(getGallery.handlers[1]).toBe(mediaController.getGallery);

  expect(postUpload.method).toBe('POST');
  expect(postUpload.path).toBe('/');
  expect(postUpload.handlers[0]).toBe(verifyAuthToken);
  expect(postUpload.handlers[2]).toBe(mediaController.uploadMedia);
});
