jest.mock('@/shared/config/env.config', () => ({
  authProvider: 'backend',
  adminUid: undefined,
  databaseProvider: 'postgres',
  databaseProviders: new Proxy({}, { get: () => 'postgres' }),
}));

jest.mock('@/providers/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/providers/database/user.repository', () => ({
  getUserRoles: jest.fn(),
}));

jest.mock('@/providers/database/postgres.auth.repository', () => ({
  findUserById: jest.fn(),
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

const authProvider = require('@/providers/auth');
const userRepository = require('@/providers/database/user.repository');
const postgresAuthRepository = require('@/providers/database/postgres.auth.repository');
const authzModule = require('@/shared/middleware/authz.middleware');
const config = require('@/shared/config/env.config');
const {
  verifyAuthToken,
  optionalAuthToken,
  isOrganizer,
  requireVerifiedEmail,
} = require('@/shared/middleware/auth.middleware');

function makeRes() {
  const r = { statusCode: 200 };
  r.status = jest.fn((code) => { r.statusCode = code; return r; });
  r.json = jest.fn().mockReturnValue(r);
  r.send = jest.fn().mockReturnValue(r);
  return r;
}

function makeDecoded(overrides) {
  return {
    uid: 'user-123',
    email: 'user@test.com',
    roles: ['user'],
    iat: 1000000,
    exp: 2000000,
    ...overrides,
  };
}

describe('verifyAuthToken', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {}, cookies: {} };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
    config.authProvider = 'backend';
  });

  it('returns 401 when no auth header or cookie', async () => {
    req.headers = {};
    req.cookies = {};
    await verifyAuthToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('No token provided') });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when auth header is missing Bearer prefix', async () => {
    req.headers.authorization = 'Basic somecreds';
    await verifyAuthToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when auth header has Bearer but empty token', async () => {
    req.headers.authorization = 'Bearer ';
    await verifyAuthToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('extracts token from Bearer header and proceeds', async () => {
    req.headers.authorization = 'Bearer valid-token';
    authProvider.verifyToken.mockResolvedValue(makeDecoded());
    await verifyAuthToken(req, res, next);
    expect(authProvider.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(req.user).toMatchObject({ uid: 'user-123', email: 'user@test.com', roles: ['user'] });
    expect(next).toHaveBeenCalled();
  });

  it('extracts token from accessToken cookie', async () => {
    req.cookies.accessToken = 'cookie-token';
    authProvider.verifyToken.mockResolvedValue(makeDecoded());
    await verifyAuthToken(req, res, next);
    expect(authProvider.verifyToken).toHaveBeenCalledWith('cookie-token');
    expect(next).toHaveBeenCalled();
  });

  it('extracts token from access_token cookie', async () => {
    req.cookies.access_token = 'cookie-token-underscore';
    authProvider.verifyToken.mockResolvedValue(makeDecoded());
    await verifyAuthToken(req, res, next);
    expect(authProvider.verifyToken).toHaveBeenCalledWith('cookie-token-underscore');
    expect(next).toHaveBeenCalled();
  });

  it('prefers Bearer header over cookie when both present', async () => {
    req.headers.authorization = 'Bearer header-token';
    req.cookies.accessToken = 'cookie-token';
    authProvider.verifyToken.mockResolvedValue(makeDecoded());
    await verifyAuthToken(req, res, next);
    expect(authProvider.verifyToken).toHaveBeenCalledWith('header-token');
  });

  it('returns 401 for Firebase expired token error code', async () => {
    req.headers.authorization = 'Bearer expired-token';
    const err = new Error('Token expired');
    err.code = 'auth/id-token-expired';
    authProvider.verifyToken.mockRejectedValue(err);
    await verifyAuthToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('Invalid or expired') });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for Firebase argument-error code', async () => {
    req.headers.authorization = 'Bearer bad-token';
    const err = new Error('Bad argument');
    err.code = 'auth/argument-error';
    authProvider.verifyToken.mockRejectedValue(err);
    await verifyAuthToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('Invalid or expired') });
  });

  it('returns 401 for backend JWT TokenExpiredError', async () => {
    req.headers.authorization = 'Bearer jwt-expired';
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    authProvider.verifyToken.mockRejectedValue(err);
    await verifyAuthToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('Invalid or expired') });
  });

  it('returns 401 for backend JWT JsonWebTokenError', async () => {
    req.headers.authorization = 'Bearer jwt-invalid';
    const err = new Error('invalid signature');
    err.name = 'JsonWebTokenError';
    authProvider.verifyToken.mockRejectedValue(err);
    await verifyAuthToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('Invalid or expired') });
  });

  it('returns 500 for unrecognized verification error', async () => {
    req.headers.authorization = 'Bearer unknown-error';
    authProvider.verifyToken.mockRejectedValue(new Error('Something broke'));
    await verifyAuthToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('Internal Server Error') });
    expect(next).not.toHaveBeenCalled();
  });

  describe('when authProvider is not backend', () => {
    beforeEach(() => {
      config.authProvider = 'firebase';
    });

    it('fetches roles from userRepository and attaches user', async () => {
      req.headers.authorization = 'Bearer firebase-token';
      authProvider.verifyToken.mockResolvedValue(makeDecoded({ roles: undefined }));
      userRepository.getUserRoles.mockResolvedValue(['premium', 'user']);
      await verifyAuthToken(req, res, next);
      expect(userRepository.getUserRoles).toHaveBeenCalledWith('user-123');
      expect(req.user).toMatchObject({ uid: 'user-123', roles: ['premium', 'user'] });
      expect(next).toHaveBeenCalled();
    });

    it('does not handle backend-specific JWT errors', async () => {
      config.authProvider = 'firebase';
      req.headers.authorization = 'Bearer jwt-expired-nonbackend';
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      authProvider.verifyToken.mockRejectedValue(err);
      await verifyAuthToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

describe('optionalAuthToken', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {}, cookies: {} };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('sets user to null and calls next when no token', async () => {
    await optionalAuthToken(req, res, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
    expect(authProvider.verifyToken).not.toHaveBeenCalled();
  });

  it('attaches user when valid token provided', async () => {
    req.headers.authorization = 'Bearer valid-token';
    authProvider.verifyToken.mockResolvedValue(makeDecoded());
    await optionalAuthToken(req, res, next);
    expect(req.user).toMatchObject({ uid: 'user-123' });
    expect(next).toHaveBeenCalled();
  });

  it('sets user to null when token verification fails', async () => {
    req.headers.authorization = 'Bearer bad-token';
    authProvider.verifyToken.mockRejectedValue(new Error('invalid'));
    await optionalAuthToken(req, res, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});

describe('isOrganizer', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns Unauthorized when req.user is falsy', () => {
    req.user = null;
    isOrganizer(req, res, next);
    expect(authzModule.sendLegacyError).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user.role is string "organizer"', () => {
    req.user = { role: 'organizer' };
    isOrganizer(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next when user.role array contains "organizer"', () => {
    req.user = { role: ['user', 'organizer'] };
    isOrganizer(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next when userHasRole returns true (roles array on user)', () => {
    req.user = { uid: 'u1', roles: ['user'], role: 'user' };
    authzModule.userHasRole.mockReturnValue(true);
    isOrganizer(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns Forbidden when userHasRole returns false', () => {
    req.user = { uid: 'u1', roles: ['user'] };
    authzModule.userHasRole.mockReturnValue(false);
    isOrganizer(req, res, next);
    expect(authzModule.sendLegacyError).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireVerifiedEmail', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns Unauthorized when no user', async () => {
    req.user = null;
    await requireVerifiedEmail(req, res, next);
    expect(authzModule.sendLegacyError).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when emailVerified is true', async () => {
    req.user = { uid: 'u1', emailVerified: true };
    await requireVerifiedEmail(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(postgresAuthRepository.findUserById).not.toHaveBeenCalled();
  });

  it('calls next when email_verified is true', async () => {
    req.user = { id: 'u1', email_verified: true };
    await requireVerifiedEmail(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('fetches from DB when emailVerified is not present', async () => {
    req.user = { uid: 'u1' };
    postgresAuthRepository.findUserById.mockResolvedValue({ email_verified: true });
    await requireVerifiedEmail(req, res, next);
    expect(postgresAuthRepository.findUserById).toHaveBeenCalledWith('u1');
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when DB also shows unverified', async () => {
    req.user = { uid: 'u1' };
    postgresAuthRepository.findUserById.mockResolvedValue({ email_verified: false });
    await requireVerifiedEmail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden: Email verification required.',
      code: 'EMAIL_VERIFICATION_REQUIRED',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when DB fetch throws', async () => {
    req.user = { uid: 'u1' };
    postgresAuthRepository.findUserById.mockRejectedValue(new Error('DB down'));
    await requireVerifiedEmail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
