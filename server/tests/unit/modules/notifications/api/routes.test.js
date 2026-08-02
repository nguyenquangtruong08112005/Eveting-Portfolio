'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, notificationController, verifyAuthToken;

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/notifications/api/controller', () => ({
    getUserNotifications: jest.fn(),
    markAsRead: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));

  notificationController = require('@/modules/notifications/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
});

afterEach(() => {
  jest.resetModules();
});

test('notifications api routes', () => {
  require('@/modules/notifications/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(2);

  const [getAll, postRead] = rs;

  expect(getAll.method).toBe('GET');
  expect(getAll.path).toBe('/');
  expect(getAll.handlers[0]).toBe(verifyAuthToken);
  expect(getAll.handlers[1]).toBe(notificationController.getUserNotifications);

  expect(postRead.method).toBe('POST');
  expect(postRead.path).toBe('/:notificationId/read');
  expect(postRead.handlers[0]).toBe(verifyAuthToken);
  expect(postRead.handlers[1]).toBe(notificationController.markAsRead);
});
