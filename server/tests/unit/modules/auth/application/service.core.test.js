'use strict';

jest.mock('@/providers/auth/backend.auth.provider');
jest.mock('@/providers/auth/google.auth.provider');
jest.mock('@/providers/auth/facebook.auth.provider');
jest.mock('@/providers/database/postgres.auth.repository');
jest.mock('@/providers/database/postgres.user.repository');
jest.mock('@/modules/auth/application/helpers/token.helper', () => ({
  REFRESH_TOKEN_EXPIRY_MS: 604800000,
  makeTokens: jest.fn(() => ({
    accessToken: 'test-at',
    refreshToken: 'test-rt',
    refreshTokenHash: 'test-rth',
  })),
}));
jest.mock('@/modules/auth/application/helpers/email.helper', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/shared/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const authRepository = require('@/providers/database/postgres.auth.repository');
const userProfileRepository = require('@/providers/database/postgres.user.repository');
const { makeTokens } = require('@/modules/auth/application/helpers/token.helper');
const { sendEmail } = require('@/modules/auth/application/helpers/email.helper');
const authService = require('@/modules/auth/application/service');
const {
  BadRequestError, UnauthorizedError, ForbiddenError, ConflictError, NotFoundError,
} = require('@/shared/errors');

const uid = 'test-user-id';
const email = 'user@test.com';
const password = 'Str0ng!Pass';
const name = 'Test User';
const roles = ['user'];
const passwordHash = 'scrypt:salt:deadbeef';

const mockUser = {
  id: uid,
  email,
  name,
  password_hash: passwordHash,
  roles,
  is_active: true,
  email_verified: false,
};
const mockSession = {
  id: 'sess-1',
  user_id: uid,
  refresh_token_hash: 'old-hash',
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  revoked_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  authRepository.findUserByEmail.mockResolvedValue(null);
  authRepository.findUserById.mockResolvedValue(null);
  userProfileRepository.findUserByEmail.mockResolvedValue(null);
  backendAuthProvider.hashPassword.mockResolvedValue(passwordHash);
  backendAuthProvider.verifyPassword.mockResolvedValue(true);
  backendAuthProvider.hashRefreshToken.mockImplementation(
    (t) => (t === 'valid-rt' ? 'hash-valid' : 'hash-unknown'),
  );
  authRepository.createUser.mockResolvedValue(uid);
  authRepository.findSessionByRefreshHash.mockImplementation(
    (h) => (h === 'hash-valid' ? { ...mockSession } : null),
  );
});

describe('register', () => {
  it('succeeds with web transport — pending verification, no session', async () => {
    const result = await authService.register({
      email, password, name, role: 'user', clientTransport: 'web',
    });
    expect(result).toEqual({
      pendingVerification: true,
      message: expect.any(String),
      user: expect.objectContaining({ id: uid, email, name, roles: ['user'], emailVerified: false }),
    });
    expect(authRepository.createUser).toHaveBeenCalled();
    expect(makeTokens).not.toHaveBeenCalled();
    expect(authRepository.createSession).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
  });

  it('succeeds with mobile transport — issues tokens and creates session', async () => {
    const result = await authService.register({
      email, password, name, role: 'user', clientTransport: 'mobile',
    });
    expect(result).toHaveProperty('accessToken', 'test-at');
    expect(result).toHaveProperty('refreshToken', 'test-rt');
    expect(result.user).toMatchObject({ id: uid, email, roles: ['user'] });
    expect(makeTokens).toHaveBeenCalledWith(uid, email, ['user']);
    expect(authRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: uid, refreshTokenHash: 'test-rth' }),
    );
  });

  it('rejects duplicate email', async () => {
    authRepository.findUserByEmail.mockResolvedValue(mockUser);
    await expect(
      authService.register({ email, password, role: 'user' }),
    ).rejects.toThrow(ConflictError);
  });

  it('rejects email belonging to an existing user profile', async () => {
    userProfileRepository.findUserByEmail.mockResolvedValue({ _id: 'profile-id', email });
    await expect(
      authService.register({ email, password, role: 'user' }),
    ).rejects.toThrow(ConflictError);
  });

  it('rejects invalid role', async () => {
    await expect(
      authService.register({ email, password, role: 'superadmin' }),
    ).rejects.toThrow(BadRequestError);
  });

  it('rejects when createUser returns null (race condition)', async () => {
    authRepository.createUser.mockResolvedValue(null);
    await expect(
      authService.register({ email, password, role: 'user' }),
    ).rejects.toThrow(ConflictError);
  });

  it('propagates hashPassword provider failure', async () => {
    backendAuthProvider.hashPassword.mockRejectedValue(new Error('scrypt error'));
    await expect(
      authService.register({ email, password, role: 'user' }),
    ).rejects.toThrow('scrypt error');
  });
});

describe('login', () => {
  it('succeeds with valid credentials', async () => {
    authRepository.findUserByEmail.mockResolvedValue(mockUser);
    authRepository.findUserById.mockResolvedValue(mockUser);
    const result = await authService.login({ email, password });
    expect(result).toHaveProperty('accessToken', 'test-at');
    expect(result).toHaveProperty('refreshToken', 'test-rt');
    expect(result.user).toMatchObject({ id: uid, email, roles });
    expect(backendAuthProvider.verifyPassword).toHaveBeenCalledWith(password, passwordHash);
    expect(makeTokens).toHaveBeenCalledWith(uid, email, roles);
    expect(authRepository.createSession).toHaveBeenCalled();
    expect(userProfileRepository.getUserDataById).toHaveBeenCalledWith(uid);
  });

  it('rejects unknown email', async () => {
    await expect(authService.login({ email, password })).rejects.toThrow(UnauthorizedError);
  });

  it('rejects wrong password', async () => {
    authRepository.findUserByEmail.mockResolvedValue(mockUser);
    backendAuthProvider.verifyPassword.mockResolvedValue(false);
    await expect(authService.login({ email, password })).rejects.toThrow(UnauthorizedError);
  });

  it('rejects deactivated account', async () => {
    authRepository.findUserByEmail.mockResolvedValue({ ...mockUser, is_active: false });
    await expect(authService.login({ email, password })).rejects.toThrow(ForbiddenError);
  });

  it('propagates verifyPassword provider failure', async () => {
    authRepository.findUserByEmail.mockResolvedValue(mockUser);
    backendAuthProvider.verifyPassword.mockRejectedValue(new Error('scrypt internal error'));
    await expect(authService.login({ email, password })).rejects.toThrow('scrypt internal error');
  });
});

describe('refreshToken', () => {
  it('succeeds with rotation — revokes old, creates new session', async () => {
    authRepository.findUserById.mockResolvedValue(mockUser);
    const result = await authService.refreshToken('valid-rt');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(makeTokens).toHaveBeenCalledWith(uid, email, roles);
    expect(authRepository.revokeSession).toHaveBeenCalledWith('sess-1');
    expect(authRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: uid }),
    );
  });

  it('rejects revoked token and revokes all user sessions', async () => {
    authRepository.findSessionByRefreshHash.mockImplementation(
      (h) => (h === 'hash-valid'
        ? { ...mockSession, revoked_at: new Date().toISOString() }
        : null),
    );
    await expect(authService.refreshToken('valid-rt')).rejects.toThrow(UnauthorizedError);
    expect(authRepository.revokeAllUserSessions).toHaveBeenCalledWith(uid);
  });

  it('rejects expired token', async () => {
    authRepository.findSessionByRefreshHash.mockImplementation(
      (h) => (h === 'hash-valid'
        ? { ...mockSession, expires_at: new Date(Date.now() - 1000).toISOString() }
        : null),
    );
    await expect(authService.refreshToken('valid-rt')).rejects.toThrow(UnauthorizedError);
    expect(authRepository.revokeSession).not.toHaveBeenCalled();
  });

  it('rejects unknown refresh token', async () => {
    await expect(authService.refreshToken('bad-token')).rejects.toThrow(UnauthorizedError);
    expect(authRepository.revokeSession).not.toHaveBeenCalled();
  });

  it('rejects when user not found after token rotation', async () => {
    await expect(authService.refreshToken('valid-rt')).rejects.toThrow(NotFoundError);
  });
});

describe('logout', () => {
  it('revokes session for valid token', async () => {
    await authService.logout('valid-rt');
    expect(backendAuthProvider.hashRefreshToken).toHaveBeenCalledWith('valid-rt');
    expect(authRepository.revokeSession).toHaveBeenCalledWith('sess-1');
  });

  it('returns success for unknown token', async () => {
    const result = await authService.logout('bad-token');
    expect(result).toEqual({ success: true });
    expect(authRepository.revokeSession).not.toHaveBeenCalled();
  });

  it('returns success for already-revoked session', async () => {
    authRepository.findSessionByRefreshHash.mockImplementation(
      (h) => (h === 'hash-valid'
        ? { ...mockSession, revoked_at: new Date().toISOString() }
        : null),
    );
    const result = await authService.logout('valid-rt');
    expect(result).toEqual({ success: true });
    expect(authRepository.revokeSession).not.toHaveBeenCalled();
  });
});

describe('logoutAll', () => {
  it('revokes all sessions for the given user', async () => {
    const result = await authService.logoutAll(uid);
    expect(result).toEqual({ success: true });
    expect(authRepository.revokeAllUserSessions).toHaveBeenCalledWith(uid);
  });
});
