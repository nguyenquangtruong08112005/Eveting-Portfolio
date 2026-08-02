'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, userController, ticketController, verifyAuthToken, validateRequest;

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/users/api/controller', () => ({
    registerUser: jest.fn(),
    getCurrentUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    followProfile: jest.fn(),
    unfollowProfile: jest.fn(),
    removeDeviceToken: jest.fn(),
  }));
  jest.mock('@/modules/tickets', () => ({
    controller: { getCurrentUserTickets: jest.fn() },
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));
  jest.mock('@/utils/validators/user.validator', () => ({ validateProfileUpdate: jest.fn() }));

  userController = require('@/modules/users/api/controller');
  ticketController = require('@/modules/tickets').controller;
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
});

afterEach(() => {
  jest.resetModules();
});

test('users api routes', () => {
  require('@/modules/users/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(7);

  const isPost = (r, p) => r.method === 'POST' && r.path === p;
  const isGet = (r, p) => r.method === 'GET' && r.path === p;
  const isPut = (r, p) => r.method === 'PUT' && r.path === p;
  const isDel = (r, p) => r.method === 'DELETE' && r.path === p;

  const [postRegister, getMe, putMe, getMeTickets, postFollow, delFollow, postDeviceToken] = rs;

  expect(isPost(postRegister, '/register')).toBe(true);
  expect(postRegister.handlers[0]).toBe(verifyAuthToken);
  expect(postRegister.handlers[2]).toBe(userController.registerUser);

  expect(isGet(getMe, '/me')).toBe(true);
  expect(getMe.handlers[0]).toBe(verifyAuthToken);
  expect(getMe.handlers[1]).toBe(userController.getCurrentUserProfile);

  expect(isPut(putMe, '/me')).toBe(true);
  expect(putMe.handlers[0]).toBe(verifyAuthToken);
  expect(putMe.handlers[2]).toBe(userController.updateUserProfile);

  expect(isGet(getMeTickets, '/me/tickets')).toBe(true);
  expect(getMeTickets.handlers[0]).toBe(verifyAuthToken);
  expect(getMeTickets.handlers[1]).toBe(ticketController.getCurrentUserTickets);

  expect(isPost(postFollow, '/me/follow')).toBe(true);
  expect(postFollow.handlers[0]).toBe(verifyAuthToken);
  expect(postFollow.handlers[2]).toBe(userController.followProfile);

  expect(isDel(delFollow, '/me/follow/:profileId')).toBe(true);
  expect(delFollow.handlers[0]).toBe(verifyAuthToken);
  expect(delFollow.handlers[2]).toBe(userController.unfollowProfile);

  expect(isPost(postDeviceToken, '/me/device-token/remove')).toBe(true);
  expect(postDeviceToken.handlers[0]).toBe(verifyAuthToken);
  expect(postDeviceToken.handlers[2]).toBe(userController.removeDeviceToken);
});
