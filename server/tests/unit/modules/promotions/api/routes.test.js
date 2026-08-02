'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, promoController, verifyAuthToken, isOrganizer, publicApiLimiter, validateRequest;

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/promotions/api/controller', () => ({
    getAllPromotions: jest.fn(),
    applyPromotion: jest.fn(),
    getOrganizerPromotions: jest.fn(),
    createPromotion: jest.fn(),
    updatePromotion: jest.fn(),
    deletePromotion: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({
    verifyAuthToken: jest.fn(),
    isOrganizer: jest.fn(),
  }));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({ publicApiLimiter: jest.fn() }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));

  promoController = require('@/modules/promotions/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  isOrganizer = require('@/shared/middleware/auth.middleware').isOrganizer;
  publicApiLimiter = require('@/shared/middleware/rateLimit.middleware').publicApiLimiter;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
});

afterEach(() => {
  jest.resetModules();
});

test('promotions api routes', () => {
  require('@/modules/promotions/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(6);

  const isGet = (r, p) => r.method === 'GET' && r.path === p;
  const isPost = (r, p) => r.method === 'POST' && r.path === p;
  const isPut = (r, p) => r.method === 'PUT' && r.path === p;
  const isDel = (r, p) => r.method === 'DELETE' && r.path === p;

  const [getAll, postApply, getOrg, postCreate, putUpdate, delDelete] = rs;

  expect(isGet(getAll, '/')).toBe(true);
  expect(getAll.handlers[0]).toBe(publicApiLimiter);
  expect(getAll.handlers[1]).toBe(promoController.getAllPromotions);

  expect(isPost(postApply, '/apply')).toBe(true);
  expect(postApply.handlers[0]).toBe(verifyAuthToken);
  expect(Array.isArray(postApply.handlers[1])).toBe(true);
  expect(postApply.handlers[2]).toBe(promoController.applyPromotion);

  expect(isGet(getOrg, '/organizer')).toBe(true);
  expect(getOrg.handlers[0]).toBe(verifyAuthToken);
  expect(getOrg.handlers[1]).toBe(isOrganizer);
  expect(getOrg.handlers[2]).toBe(promoController.getOrganizerPromotions);

  expect(isPost(postCreate, '/organizer')).toBe(true);
  expect(postCreate.handlers[0]).toBe(verifyAuthToken);
  expect(postCreate.handlers[1]).toBe(isOrganizer);
  expect(Array.isArray(postCreate.handlers[2])).toBe(true);
  expect(postCreate.handlers[3]).toBe(promoController.createPromotion);

  expect(isPut(putUpdate, '/organizer/:id')).toBe(true);
  expect(putUpdate.handlers[0]).toBe(verifyAuthToken);
  expect(putUpdate.handlers[1]).toBe(isOrganizer);
  expect(Array.isArray(putUpdate.handlers[2])).toBe(true);
  expect(putUpdate.handlers[3]).toBe(promoController.updatePromotion);

  expect(isDel(delDelete, '/organizer/:id')).toBe(true);
  expect(delDelete.handlers[0]).toBe(verifyAuthToken);
  expect(delDelete.handlers[1]).toBe(isOrganizer);
  expect(Array.isArray(delDelete.handlers[2])).toBe(true);
  expect(delDelete.handlers[3]).toBe(promoController.deletePromotion);
});
