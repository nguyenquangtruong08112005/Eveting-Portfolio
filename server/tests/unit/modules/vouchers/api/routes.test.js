'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, voucherController, verifyAuthToken, publicApiLimiter, validateRequest;

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/vouchers/api/controller', () => ({
    validateVoucher: jest.fn(),
    quoteVoucher: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({ publicApiLimiter: jest.fn() }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));

  voucherController = require('@/modules/vouchers/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  publicApiLimiter = require('@/shared/middleware/rateLimit.middleware').publicApiLimiter;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
});

afterEach(() => {
  jest.resetModules();
});

test('vouchers api routes', () => {
  require('@/modules/vouchers/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(2);

  const [postValidate, postQuote] = rs;

  expect(postValidate.method).toBe('POST');
  expect(postValidate.path).toBe('/validate');
  expect(postValidate.handlers[0]).toBe(verifyAuthToken);
  expect(postValidate.handlers[1]).toBe(publicApiLimiter);
  expect(postValidate.handlers[2][postValidate.handlers[2].length - 1]).toBe(validateRequest);
  expect(postValidate.handlers[3]).toBe(voucherController.validateVoucher);

  expect(postQuote.method).toBe('POST');
  expect(postQuote.path).toBe('/quote');
  expect(postQuote.handlers[0]).toBe(verifyAuthToken);
  expect(postQuote.handlers[1]).toBe(publicApiLimiter);
  expect(postQuote.handlers[2][postQuote.handlers[2].length - 1]).toBe(validateRequest);
  expect(postQuote.handlers[3]).toBe(voucherController.quoteVoucher);
});
