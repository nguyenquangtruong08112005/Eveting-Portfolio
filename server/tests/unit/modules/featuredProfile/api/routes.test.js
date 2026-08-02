'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, profileController, verifyAuthToken, publicApiLimiter,
  normalizeProfilePayload, profileIdValidation, listValidation, slugValidation,
  createValidation, updateValidation;

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/featuredProfile/api/controller', () => ({
    getAllProfiles: jest.fn(),
    getProfileBySlug: jest.fn(),
    getProfileById: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({ publicApiLimiter: jest.fn() }));
  jest.mock('@/modules/featuredProfile/api/validation', () => ({
    normalizeProfilePayload: jest.fn(),
    profileIdValidation: [jest.fn()],
    listValidation: [jest.fn()],
    slugValidation: [jest.fn()],
    createValidation: [jest.fn()],
    updateValidation: [jest.fn()],
  }));

  profileController = require('@/modules/featuredProfile/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  publicApiLimiter = require('@/shared/middleware/rateLimit.middleware').publicApiLimiter;
  const v = require('@/modules/featuredProfile/api/validation');
  normalizeProfilePayload = v.normalizeProfilePayload;
  profileIdValidation = v.profileIdValidation;
  listValidation = v.listValidation;
  slugValidation = v.slugValidation;
  createValidation = v.createValidation;
  updateValidation = v.updateValidation;
});

afterEach(() => {
  jest.resetModules();
});

test('featuredProfile api routes', () => {
  require('@/modules/featuredProfile/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(6);

  const isGet = (r, p) => r.method === 'GET' && r.path === p;
  const isPost = (r, p) => r.method === 'POST' && r.path === p;
  const isPut = (r, p) => r.method === 'PUT' && r.path === p;
  const isDel = (r, p) => r.method === 'DELETE' && r.path === p;

  const [getAll, getBySlug, getById, postCreate, putUpdate, delDelete] = rs;

  expect(isGet(getAll, '/')).toBe(true);
  expect(getAll.handlers[0]).toBe(publicApiLimiter);
  expect(getAll.handlers[1]).toBe(listValidation);
  expect(getAll.handlers[2]).toBe(profileController.getAllProfiles);

  expect(isGet(getBySlug, '/slug/:slug')).toBe(true);
  expect(getBySlug.handlers[0]).toBe(publicApiLimiter);
  expect(getBySlug.handlers[1]).toBe(slugValidation);
  expect(getBySlug.handlers[2]).toBe(profileController.getProfileBySlug);

  expect(isGet(getById, '/:profileId')).toBe(true);
  expect(getById.handlers[0]).toBe(publicApiLimiter);
  expect(getById.handlers[1]).toBe(profileIdValidation);
  expect(getById.handlers[2]).toBe(profileController.getProfileById);

  expect(isPost(postCreate, '/')).toBe(true);
  expect(postCreate.handlers[0]).toBe(verifyAuthToken);
  expect(postCreate.handlers[1]).toBe(normalizeProfilePayload);
  expect(postCreate.handlers[2]).toBe(createValidation);
  expect(postCreate.handlers[3]).toBe(profileController.createProfile);

  expect(isPut(putUpdate, '/:profileId')).toBe(true);
  expect(putUpdate.handlers[0]).toBe(verifyAuthToken);
  expect(putUpdate.handlers[1]).toBe(normalizeProfilePayload);
  expect(putUpdate.handlers[2]).toBe(updateValidation);
  expect(putUpdate.handlers[3]).toBe(profileController.updateProfile);

  expect(isDel(delDelete, '/:profileId')).toBe(true);
  expect(delDelete.handlers[0]).toBe(verifyAuthToken);
  expect(delDelete.handlers[1]).toBe(profileIdValidation);
  expect(delDelete.handlers[2]).toBe(profileController.deleteProfile);
});
