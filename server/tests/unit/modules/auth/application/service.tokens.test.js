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

const crypto = require('crypto');
const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const authRepository = require('@/providers/database/postgres.auth.repository');
const userProfileRepository = require('@/providers/database/postgres.user.repository');
const { makeTokens } = require('@/modules/auth/application/helpers/token.helper');
const { sendEmail } = require('@/modules/auth/application/helpers/email.helper');
const logger = require('@/shared/logger');
const authService = require('@/modules/auth/application/service');
const {
  BadRequestError, UnauthorizedError, NotFoundError,
} = require('@/shared/errors');

const uid = 'test-user-id';
const email = 'user@test.com';
const passwordHash = 'scrypt:salt:deadbeef';
const roles = ['user'];

const mockUser = {
  id: uid, email, name: 'Test User', password_hash: passwordHash, roles, is_active: true, email_verified: false,
};
const mockSession = {
  id: 'sess-1', user_id: uid, refresh_token_hash: 'old-hash',
  expires_at: new Date(Date.now() + 3600000).toISOString(), revoked_at: null,
};

const mockToken = 'deterministic-token-hex';
const mockTokenHash = 'deterministic-token-hash';

let cryptoSpies;

beforeEach(() => {
  jest.clearAllMocks();
  cryptoSpies = [
    jest.spyOn(crypto, 'randomBytes').mockImplementation(() => ({ toString: () => mockToken })),
    jest.spyOn(crypto, 'createHash').mockImplementation(() => ({ update: () => ({ digest: () => mockTokenHash }) })),
  ];
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

afterEach(() => {
  cryptoSpies.forEach((s) => s.mockRestore());
});

describe('refreshToken', () => {
  it('rejects unknown refresh token', async () => {
    await expect(authService.refreshToken('bad-token')).rejects.toThrow(UnauthorizedError);
    expect(authRepository.revokeSession).not.toHaveBeenCalled();
  });

  it('rejects revoked token and revokes all user sessions', async () => {
    authRepository.findSessionByRefreshHash.mockResolvedValue({ ...mockSession, revoked_at: new Date().toISOString() });
    await expect(authService.refreshToken('valid-rt')).rejects.toThrow(UnauthorizedError);
    expect(authRepository.revokeAllUserSessions).toHaveBeenCalledWith(uid);
  });

  it('rejects expired token', async () => {
    authRepository.findSessionByRefreshHash.mockResolvedValue({ ...mockSession, expires_at: new Date(Date.now() - 1000).toISOString() });
    await expect(authService.refreshToken('valid-rt')).rejects.toThrow(UnauthorizedError);
    expect(authRepository.revokeSession).not.toHaveBeenCalled();
  });

  it('rejects when user not found after revoke', async () => {
    await expect(authService.refreshToken('valid-rt')).rejects.toThrow(NotFoundError);
    expect(authRepository.revokeSession).toHaveBeenCalledWith('sess-1');
  });

  it('succeeds with rotation — revokes old, creates new session', async () => {
    authRepository.findUserById.mockResolvedValue(mockUser);
    const result = await authService.refreshToken('valid-rt');
    expect(result).toHaveProperty('accessToken', 'test-at');
    expect(result).toHaveProperty('refreshToken', 'test-rt');
    expect(result.user).toMatchObject({ id: uid, email, roles });
    expect(makeTokens).toHaveBeenCalledWith(uid, email, roles);
    expect(authRepository.revokeSession).toHaveBeenCalledWith('sess-1');
    expect(authRepository.createSession).toHaveBeenCalledWith(expect.objectContaining({ userId: uid }));
  });
});

describe('logout', () => {
  it('revokes session for valid active token', async () => {
    await authService.logout('valid-rt');
    expect(backendAuthProvider.hashRefreshToken).toHaveBeenCalledWith('valid-rt');
    expect(authRepository.revokeSession).toHaveBeenCalledWith('sess-1');
  });

  it('returns success for unknown token', async () => {
    const result = await authService.logout('bad-token');
    expect(result).toEqual({ success: true });
    expect(authRepository.revokeSession).not.toHaveBeenCalled();
  });

  it('returns success for revoked session', async () => {
    authRepository.findSessionByRefreshHash.mockResolvedValue({ ...mockSession, revoked_at: new Date().toISOString() });
    const result = await authService.logout('valid-rt');
    expect(result).toEqual({ success: true });
    expect(authRepository.revokeSession).not.toHaveBeenCalled();
  });
});

describe('logoutAll', () => {
  it('revokes all sessions for given user', async () => {
    const result = await authService.logoutAll(uid);
    expect(result).toEqual({ success: true });
    expect(authRepository.revokeAllUserSessions).toHaveBeenCalledWith(uid);
  });
});

describe('requestPasswordReset', () => {
  it('returns generic message for unknown email (non-enumerating)', async () => {
    const result = await authService.requestPasswordReset('unknown@test.com');
    expect(result).toEqual({ message: expect.any(String) });
    expect(authRepository.saveToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('provisions auth user from profile and sends reset email', async () => {
    const profile = { _id: 'profile-id', email, roles: ['user'] };
    userProfileRepository.findUserByEmail.mockResolvedValue(profile);
    authRepository.findUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockUser);
    authRepository.findUserById.mockResolvedValue(mockUser);
    await authService.requestPasswordReset(email);
    expect(authRepository.saveToken).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: mockTokenHash, purpose: 'password_reset', email }),
    );
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: email }));
  });

  it('logs error but does not throw when sendEmail fails', async () => {
    authRepository.findUserByEmail.mockResolvedValue(mockUser);
    sendEmail.mockRejectedValue(new Error('SMTP down'));
    await expect(authService.requestPasswordReset(email)).resolves.toEqual(
      { message: expect.any(String) },
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send password reset email'));
  });

  it('saves token and sends email for existing user', async () => {
    authRepository.findUserByEmail.mockResolvedValue(mockUser);
    const result = await authService.requestPasswordReset(email);
    expect(result).toEqual({ message: expect.any(String) });
    expect(authRepository.saveToken).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: mockTokenHash, purpose: 'password_reset', email }),
    );
    expect(sendEmail).toHaveBeenCalled();
  });
});

describe('confirmPasswordReset', () => {
  const newPassword = 'NewStr0ng!Pass';

  it('rejects missing token', async () => {
    await expect(authService.confirmPasswordReset(null, newPassword)).rejects.toThrow(BadRequestError);
  });

  it('rejects missing newPassword', async () => {
    await expect(authService.confirmPasswordReset('some-token', null)).rejects.toThrow(BadRequestError);
  });

  it('rejects token with invalid hash', async () => {
    await expect(authService.confirmPasswordReset('invalid-token', newPassword)).rejects.toThrow(BadRequestError);
  });

  it('rejects used token', async () => {
    authRepository.findTokenByHash.mockResolvedValue({
      id: 'tok-1', token_hash: mockTokenHash, purpose: 'password_reset', email,
      expires_at: new Date(Date.now() + 3600000).toISOString(), used_at: new Date().toISOString(),
    });
    await expect(authService.confirmPasswordReset('used-token', newPassword)).rejects.toThrow(BadRequestError);
  });

  it('rejects expired token', async () => {
    authRepository.findTokenByHash.mockResolvedValue({
      id: 'tok-1', token_hash: mockTokenHash, purpose: 'password_reset', email,
      expires_at: new Date(Date.now() - 1000).toISOString(), used_at: null,
    });
    await expect(authService.confirmPasswordReset('expired-token', newPassword)).rejects.toThrow(BadRequestError);
  });

  it('rejects when user not found', async () => {
    authRepository.findTokenByHash.mockResolvedValue({
      id: 'tok-1', token_hash: mockTokenHash, purpose: 'password_reset', email,
      expires_at: new Date(Date.now() + 3600000).toISOString(), used_at: null,
    });
    await expect(authService.confirmPasswordReset('valid-token', newPassword)).rejects.toThrow(NotFoundError);
  });

  it('updates password, consumes token, and revokes sessions on success', async () => {
    authRepository.findTokenByHash.mockResolvedValue({
      id: 'tok-1', token_hash: mockTokenHash, purpose: 'password_reset', email,
      expires_at: new Date(Date.now() + 3600000).toISOString(), used_at: null,
    });
    authRepository.findUserByEmail.mockResolvedValue(mockUser);
    const result = await authService.confirmPasswordReset('valid-token', newPassword);
    expect(result).toEqual({ success: true, message: expect.any(String) });
    expect(backendAuthProvider.hashPassword).toHaveBeenCalledWith(newPassword);
    expect(authRepository.updateUserPassword).toHaveBeenCalledWith(uid, passwordHash);
    expect(authRepository.markTokenUsed).toHaveBeenCalledWith('tok-1');
    expect(authRepository.revokeAllUserSessions).toHaveBeenCalledWith(uid);
  });
});

describe('requestEmailVerification', () => {
  it('returns generic message for unknown email', async () => {
    const result = await authService.requestEmailVerification('unknown@test.com');
    expect(result).toEqual({ message: expect.any(String) });
    expect(authRepository.saveEmailVerification).not.toHaveBeenCalled();
  });

  it('returns already-verified message when email is verified', async () => {
    authRepository.findUserByEmail.mockResolvedValue({ ...mockUser, email_verified: true });
    const result = await authService.requestEmailVerification(email);
    expect(result).toEqual({ message: 'Email is already verified.' });
    expect(authRepository.saveEmailVerification).not.toHaveBeenCalled();
  });

  it('sends verification email for unverified user', async () => {
    authRepository.findUserByEmail.mockResolvedValue(mockUser);
    const result = await authService.requestEmailVerification(email);
    expect(result).toEqual({ message: expect.any(String) });
    expect(authRepository.saveEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: uid, email }),
    );
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: email }));
  });

  it('logs error when sending verification email fails', async () => {
    authRepository.findUserByEmail.mockResolvedValue(mockUser);
    sendEmail.mockRejectedValue(new Error('SMTP error'));
    const result = await authService.requestEmailVerification(email);
    expect(result).toEqual({ message: expect.any(String) });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send email verification'));
  });
});

describe('confirmEmailVerification', () => {
  it('rejects missing token', async () => {
    await expect(authService.confirmEmailVerification(null)).rejects.toThrow(BadRequestError);
  });

  it('rejects invalid or expired verification token', async () => {
    await expect(authService.confirmEmailVerification('bad-token')).rejects.toThrow(BadRequestError);
  });

  it('confirms email verification on success', async () => {
    authRepository.consumeEmailVerification.mockResolvedValue({ id: 'ver-1', email, user_id: uid });
    const result = await authService.confirmEmailVerification('valid-token');
    expect(result).toEqual({ success: true, message: expect.any(String), email });
  });
});
