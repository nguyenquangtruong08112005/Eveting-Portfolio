'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, reviewController, verifyAuthToken;

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/reviews/api/controller', () => ({
    getEventReviews: jest.fn(),
    createReview: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));

  reviewController = require('@/modules/reviews/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
});

afterEach(() => {
  jest.resetModules();
});

test('reviews api routes', () => {
  require('@/modules/reviews/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(router._mergeParams).toBe(true);
  expect(rs).toHaveLength(2);

  const [getAll, postCreate] = rs;

  expect(getAll.method).toBe('GET');
  expect(getAll.path).toBe('/');
  expect(getAll.handlers[0]).toBe(reviewController.getEventReviews);

  expect(postCreate.method).toBe('POST');
  expect(postCreate.path).toBe('/');
  expect(postCreate.handlers[0]).toBe(verifyAuthToken);
  expect(postCreate.handlers[1]).toBe(reviewController.createReview);
});
