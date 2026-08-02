'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, venueController, verifyAuthToken, isOrganizer, requireOwnership, validateRequest;
let mockOwnershipMiddleware;

beforeEach(() => {
  mockOwnershipMiddleware = jest.fn();

  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/venues/api/controller', () => ({
    getVenues: jest.fn(),
    getVenueById: jest.fn(),
    createVenue: jest.fn(),
    updateVenue: jest.fn(),
    deleteVenue: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({
    verifyAuthToken: jest.fn(),
    isOrganizer: jest.fn(),
  }));
  jest.mock('@/shared/middleware/authz.middleware', () => ({
    requireOwnership: jest.fn(() => mockOwnershipMiddleware),
  }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));

  venueController = require('@/modules/venues/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  isOrganizer = require('@/shared/middleware/auth.middleware').isOrganizer;
  requireOwnership = require('@/shared/middleware/authz.middleware').requireOwnership;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
});

afterEach(() => {
  jest.resetModules();
});

test('venues api routes', () => {
  require('@/modules/venues/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(5);

  const isGet = (r, p) => r.method === 'GET' && r.path === p;
  const isPost = (r, p) => r.method === 'POST' && r.path === p;
  const isPut = (r, p) => r.method === 'PUT' && r.path === p;
  const isDel = (r, p) => r.method === 'DELETE' && r.path === p;

  const [getAll, getById, postCreate, putUpdate, delDelete] = rs;

  expect(isGet(getAll, '/')).toBe(true);
  expect(getAll.handlers[0]).toBe(verifyAuthToken);
  expect(getAll.handlers[1]).toBe(isOrganizer);
  expect(getAll.handlers[2]).toBe(venueController.getVenues);

  expect(isGet(getById, '/:id')).toBe(true);
  expect(getById.handlers[0]).toBe(verifyAuthToken);
  expect(getById.handlers[1]).toBe(isOrganizer);
  expect(getById.handlers[3]).toBe(venueController.getVenueById);

  expect(isPost(postCreate, '/')).toBe(true);
  expect(postCreate.handlers[0]).toBe(verifyAuthToken);
  expect(postCreate.handlers[1]).toBe(isOrganizer);
  expect(postCreate.handlers[3]).toBe(venueController.createVenue);

  expect(isPut(putUpdate, '/:id')).toBe(true);
  expect(putUpdate.handlers[0]).toBe(verifyAuthToken);
  expect(putUpdate.handlers[1]).toBe(isOrganizer);
  expect(putUpdate.handlers[2]).toBe(mockOwnershipMiddleware);
  expect(requireOwnership).toHaveBeenCalledWith('Venue', 'id');
  expect(putUpdate.handlers[4]).toBe(venueController.updateVenue);

  expect(isDel(delDelete, '/:id')).toBe(true);
  expect(delDelete.handlers[0]).toBe(verifyAuthToken);
  expect(delDelete.handlers[1]).toBe(isOrganizer);
  expect(delDelete.handlers[2]).toBe(mockOwnershipMiddleware);
  expect(requireOwnership).toHaveBeenCalledWith('Venue', 'id');
  expect(delDelete.handlers[4]).toBe(venueController.deleteVenue);
});
