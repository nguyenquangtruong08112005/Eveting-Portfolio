jest.mock('@/shared/config/env.config', () => ({
  authProvider: 'backend',
  adminUid: 'admin-uid-1',
  databaseProvider: 'postgres',
  databaseProviders: new Proxy({}, { get: () => 'postgres' }),
}));

jest.mock('@/providers/database/rbac.repository', () => ({
  resolveUserPermissionNames: jest.fn(),
  getOrganizationMember: jest.fn(),
  createAuditLog: jest.fn(),
}));

jest.mock('@/shared/middleware/authz.middleware', () => {
  const actual = jest.requireActual('@/shared/middleware/authz.middleware');
  return {
    ...actual,
    userHasRole: jest.fn(),
    sendLegacyError: jest.fn((res, err, msg) => {
      res.status(err.statusCode).send({ error: msg });
    }),
  };
});

jest.mock('@/shared/errors', () => {
  const actual = jest.requireActual('@/shared/errors');
  return actual;
});

jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const config = require('@/shared/config/env.config');
const authzModule = require('@/shared/middleware/authz.middleware');
const logger = require('@/shared/logger');
const { isAdmin } = require('@/shared/middleware/admin.middleware');

function makeRes() {
  const r = { statusCode: 200 };
  r.status = jest.fn((code) => { r.statusCode = code; return r; });
  r.json = jest.fn().mockReturnValue(r);
  r.send = jest.fn().mockReturnValue(r);
  return r;
}

describe('isAdmin', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { uid: 'user-1', roles: ['user'] } };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
    config.adminUid = 'admin-uid-1';
  });

  it('calls next when user uid matches adminUid', () => {
    req.user.uid = 'admin-uid-1';
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next when user has admin role', () => {
    authzModule.userHasRole.mockReturnValue(true);
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when neither uid match nor admin role', () => {
    authzModule.userHasRole.mockReturnValue(false);
    isAdmin(req, res, next);
    expect(authzModule.sendLegacyError).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when error thrown during check', () => {
    req.user = null;
    isAdmin(req, res, next);
    expect(logger.error).toHaveBeenCalledWith('isAdmin error', { error: expect.any(String) });
    expect(authzModule.sendLegacyError).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
