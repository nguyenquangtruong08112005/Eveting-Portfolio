'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, analyticsController, verifyAuthToken, publicApiLimiter, validateRequest, requireEventPermission;
let mockRbacMiddleware;

beforeEach(() => {
  mockRbacMiddleware = jest.fn();

  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/analytics/api/controller', () => ({
    recordTraffic: jest.fn(),
    getEventAnalytics: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({ publicApiLimiter: jest.fn() }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));
  jest.mock('@/modules/memberships/api/organizer-rbac.middleware', () => ({
    requireEventPermission: jest.fn(() => mockRbacMiddleware),
  }));

  analyticsController = require('@/modules/analytics/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  publicApiLimiter = require('@/shared/middleware/rateLimit.middleware').publicApiLimiter;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
  requireEventPermission = require('@/modules/memberships/api/organizer-rbac.middleware').requireEventPermission;
});

afterEach(() => {
  jest.resetModules();
});

test('analytics api routes', () => {
  require('@/modules/analytics/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(2);

  const [postTraffic, getAnalytics] = rs;

  expect(postTraffic.method).toBe('POST');
  expect(postTraffic.path).toBe('/traffic');
  expect(postTraffic.handlers[0]).toBe(publicApiLimiter);
  expect(Array.isArray(postTraffic.handlers[1])).toBe(true);
  expect(postTraffic.handlers[2]).toBe(analyticsController.recordTraffic);

  expect(getAnalytics.method).toBe('GET');
  expect(getAnalytics.path).toBe('/');
  expect(getAnalytics.handlers[0]).toBe(verifyAuthToken);
  expect(Array.isArray(getAnalytics.handlers[1])).toBe(true);
  expect(getAnalytics.handlers[2]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('VIEW_ANALYTICS', { fromQuery: true });
  expect(getAnalytics.handlers[3]).toBe(analyticsController.getEventAnalytics);
});
