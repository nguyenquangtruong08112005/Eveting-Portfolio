'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, membershipController, teamController, verifyAuthToken, publicApiLimiter;

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/memberships/api/controller', () => ({ getMyMembership: jest.fn() }));
  jest.mock('@/modules/memberships/api/team.controller', () => ({ getMyTeams: jest.fn() }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({ publicApiLimiter: jest.fn() }));

  membershipController = require('@/modules/memberships/api/controller');
  teamController = require('@/modules/memberships/api/team.controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  publicApiLimiter = require('@/shared/middleware/rateLimit.middleware').publicApiLimiter;
});

afterEach(() => {
  jest.resetModules();
});

test('memberships api routes', () => {
  require('@/modules/memberships/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(2);

  const [getMe, getTeams] = rs;

  expect(getMe.method).toBe('GET');
  expect(getMe.path).toBe('/me');
  expect(getMe.handlers[0]).toBe(publicApiLimiter);
  expect(getMe.handlers[1]).toBe(verifyAuthToken);
  expect(getMe.handlers[2]).toBe(membershipController.getMyMembership);

  expect(getTeams.method).toBe('GET');
  expect(getTeams.path).toBe('/organizer-teams');
  expect(getTeams.handlers[0]).toBe(publicApiLimiter);
  expect(getTeams.handlers[1]).toBe(verifyAuthToken);
  expect(getTeams.handlers[2]).toBe(teamController.getMyTeams);
});
