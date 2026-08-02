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
jest.mock('@/modules/auth/application/helpers/profile.helper');
jest.mock('@/shared/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const crypto = require('crypto');
const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const googleAuthProvider = require('@/providers/auth/google.auth.provider');
const facebookAuthProvider = require('@/providers/auth/facebook.auth.provider');
const authRepository = require('@/providers/database/postgres.auth.repository');
const userProfileRepository = require('@/providers/database/postgres.user.repository');
const { makeTokens } = require('@/modules/auth/application/helpers/token.helper');
const { provisionAuthUserFromProfile, ensureUserProfileForAuthUser } = require('@/modules/auth/application/helpers/profile.helper');
const authService = require('@/modules/auth/application/service');
const { BadRequestError, UnauthorizedError, ForbiddenError } = require('@/shared/errors');

const uid = 'test-user-id';
const email = 'social@test.com';
const name = 'Social User';
const providerEmail = email;
const provider = 'google';
const providerSubject = 'google_sub_123';
const picture = 'https://pic.com/avatar.jpg';
const mockCryptoHex = 'deadbeefdeadbeefdeadbeefdeadbeef';

let activeUser;
let unverifiedUser;
let inactiveUser;

let cryptoSpies;

beforeEach(() => {
  jest.clearAllMocks();
  activeUser = {
    id: uid,
    email,
    name,
    password_hash: 'hashed',
    roles: ['user'],
    is_active: true,
    email_verified: true,
  };
  unverifiedUser = { ...activeUser, email_verified: false };
  inactiveUser = { ...activeUser, is_active: false };
  cryptoSpies = [
    jest.spyOn(crypto, 'randomBytes').mockImplementation(
      () => ({ toString: () => mockCryptoHex }),
    ),
  ];

  authRepository.findIdentityByProviderAndSubject.mockResolvedValue(null);
  authRepository.findUserById.mockResolvedValue(null);
  authRepository.findUserByEmail.mockResolvedValue(null);
  authRepository.createUser.mockResolvedValue(uid);
  authRepository.createAuthIdentity.mockResolvedValue('identity-id');
  authRepository.verifyUserEmailById.mockResolvedValue(undefined);
  authRepository.verifyUserEmail.mockResolvedValue(undefined);
  authRepository.appendRoleToUser.mockResolvedValue(undefined);
  authRepository.createSession.mockResolvedValue('session-id');

  userProfileRepository.findUserByEmail.mockResolvedValue(null);
  userProfileRepository.getUserDataById.mockResolvedValue(null);
  userProfileRepository.updateUserProfile = jest.fn().mockResolvedValue(undefined);
  userProfileRepository.appendRoleToProfile.mockResolvedValue(undefined);

  backendAuthProvider.hashPassword.mockResolvedValue('hashed-password');

  provisionAuthUserFromProfile.mockResolvedValue(activeUser);
  ensureUserProfileForAuthUser.mockResolvedValue(undefined);

  makeTokens.mockReturnValue({
    accessToken: 'test-at',
    refreshToken: 'test-rt',
    refreshTokenHash: 'test-rth',
  });
});

afterEach(() => {
  cryptoSpies.forEach((s) => s.mockRestore());
});

describe('handleSocialLogin', () => {
  it('rejects invalid role', async () => {
    await expect(
      authService.handleSocialLogin({
        provider, providerSubject, providerEmail,
        emailVerified: true, name, picture, role: 'superadmin',
      }),
    ).rejects.toThrow(BadRequestError);
    expect(authRepository.findIdentityByProviderAndSubject).not.toHaveBeenCalled();
  });

  it('rejects missing provider email', async () => {
    await expect(
      authService.handleSocialLogin({
        provider, providerSubject, providerEmail: '',
        emailVerified: true, name, picture, role: 'user',
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('returns tokens for existing identity with active user', async () => {
    authRepository.findIdentityByProviderAndSubject.mockResolvedValue({
      id: 'identity-1', user_id: uid, provider, provider_subject: providerSubject,
      provider_email: email,
    });
    authRepository.findUserById.mockResolvedValue(activeUser);

    const result = await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture, role: 'user',
    });

    expect(result.accessToken).toBe('test-at');
    expect(result.refreshToken).toBe('test-rt');
    expect(result.user).toMatchObject({
      id: uid, email, name, roles: ['user'], emailVerified: true,
    });
    expect(authRepository.findUserById).toHaveBeenCalledWith(uid);
    expect(makeTokens).toHaveBeenCalled();
    expect(authRepository.createSession).toHaveBeenCalled();
    expect(ensureUserProfileForAuthUser).toHaveBeenCalled();
  });

  it('rejects unverified social email on unverified account', async () => {
    authRepository.findIdentityByProviderAndSubject.mockResolvedValue(null);
    authRepository.findUserByEmail.mockResolvedValueOnce(unverifiedUser);

    await expect(
      authService.handleSocialLogin({
        provider, providerSubject, providerEmail,
        emailVerified: false, name, picture, role: 'user',
      }),
    ).rejects.toThrow(UnauthorizedError);
    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
  });

  it('links identity and promotes verified email', async () => {
    authRepository.findIdentityByProviderAndSubject.mockResolvedValue(null);
    authRepository.findUserByEmail.mockResolvedValueOnce(unverifiedUser);

    const result = await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture, role: 'user',
    });

    expect(authRepository.createAuthIdentity).toHaveBeenCalledWith({
      userId: uid, provider, providerSubject, providerEmail,
    });
    expect(authRepository.verifyUserEmailById).toHaveBeenCalledWith(uid);
    expect(authRepository.verifyUserEmail).toHaveBeenCalledWith(email);
    expect(result.user.emailVerified).toBe(true);
  });

  it('provisions auth user from existing profile', async () => {
    authRepository.findIdentityByProviderAndSubject.mockResolvedValue(null);
    authRepository.findUserByEmail.mockResolvedValueOnce(null);
    userProfileRepository.findUserByEmail.mockResolvedValueOnce({
      _id: 'profile-id', email, name, roles: ['user'],
    });
    provisionAuthUserFromProfile.mockResolvedValueOnce(activeUser);

    const result = await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture, role: 'user',
    });

    expect(provisionAuthUserFromProfile).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'profile-id', email }),
      'user',
    );
    expect(result.user).toMatchObject({ id: uid, email });
  });

  it('creates new account and links identity', async () => {
    authRepository.findUserById.mockResolvedValue(activeUser);

    const result = await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture: '', role: 'user',
    });

    expect(authRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email, roles: ['user'], emailVerified: true }),
    );
    expect(authRepository.findUserById).toHaveBeenCalledWith(uid);
    expect(authRepository.createAuthIdentity).toHaveBeenCalledWith({
      userId: uid, provider, providerSubject, providerEmail,
    });
    expect(result.accessToken).toBe('test-at');
  });

  it('falls back to find-by-email when createUser returns null', async () => {
    authRepository.createUser.mockResolvedValueOnce(null);
    authRepository.findUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValue(activeUser);

    const result = await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture, role: 'user',
    });

    expect(authRepository.createUser).toHaveBeenCalled();
    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(email);
    expect(authRepository.createAuthIdentity).toHaveBeenCalled();
    expect(result.user.id).toBe(uid);
  });

  it('throws when unable to create or find user', async () => {
    authRepository.createUser.mockResolvedValueOnce(null);
    authRepository.findUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValue(null);

    await expect(
      authService.handleSocialLogin({
        provider, providerSubject, providerEmail,
        emailVerified: true, name, picture, role: 'user',
      }),
    ).rejects.toThrow('Unable to create backend auth user from social login');
  });

  it('rejects inactive user', async () => {
    authRepository.findIdentityByProviderAndSubject.mockResolvedValue(null);
    authRepository.findUserByEmail.mockResolvedValueOnce(inactiveUser);

    await expect(
      authService.handleSocialLogin({
        provider, providerSubject, providerEmail,
        emailVerified: true, name, picture, role: 'user',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('appends organizer role to both auth and profile', async () => {
    authRepository.findUserById.mockResolvedValue(activeUser);

    const result = await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture, role: 'organizer',
    });

    expect(authRepository.appendRoleToUser).toHaveBeenCalledWith(uid, 'organizer');
    expect(userProfileRepository.appendRoleToProfile).toHaveBeenCalledWith(uid, 'organizer');
    expect(result.user.roles).toContain('organizer');
  });

  it('does not append role when user already has it', async () => {
    const organizerUser = { ...activeUser, roles: ['user', 'organizer'] };
    authRepository.findUserById.mockResolvedValue(organizerUser);

    const result = await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture, role: 'organizer',
    });

    expect(authRepository.appendRoleToUser).not.toHaveBeenCalled();
    expect(userProfileRepository.appendRoleToProfile).not.toHaveBeenCalled();
    expect(result.user.roles).toEqual(['user', 'organizer']);
  });

  it('updates empty avatar with picture', async () => {
    authRepository.findUserById.mockResolvedValue(activeUser);
    userProfileRepository.getUserDataById.mockResolvedValueOnce({
      profilePicUrl: '',
    });

    await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture, role: 'user',
    });

    expect(userProfileRepository.updateUserProfile).toHaveBeenCalledWith(
      uid, { profilePicUrl: picture },
    );
  });

  it('ignores picture when profile has existing image', async () => {
    authRepository.findUserById.mockResolvedValue(activeUser);
    userProfileRepository.getUserDataById.mockResolvedValueOnce({
      profilePicUrl: 'https://existing.pic/img.jpg',
    });

    await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture, role: 'user',
    });

    expect(userProfileRepository.updateUserProfile).not.toHaveBeenCalled();
  });

  it('ignores picture when profile not found', async () => {
    authRepository.findUserById.mockResolvedValue(activeUser);
    userProfileRepository.getUserDataById.mockResolvedValueOnce(null);

    await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture, role: 'user',
    });

    expect(userProfileRepository.updateUserProfile).not.toHaveBeenCalled();
  });

  it('ignores picture when profile fetch fails', async () => {
    authRepository.findUserById.mockResolvedValue(activeUser);
    userProfileRepository.getUserDataById.mockRejectedValueOnce(
      new Error('DB error'),
    );

    await expect(
      authService.handleSocialLogin({
        provider, providerSubject, providerEmail,
        emailVerified: true, name, picture, role: 'user',
      }),
    ).resolves.toHaveProperty('accessToken', 'test-at');
    expect(userProfileRepository.updateUserProfile).not.toHaveBeenCalled();
  });

  it('creates session and provisions profile', async () => {
    authRepository.findUserById.mockResolvedValue(activeUser);

    await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture: '', role: 'user',
    });

    expect(makeTokens).toHaveBeenCalledWith(uid, email, ['user']);
    expect(authRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: uid, refreshTokenHash: 'test-rth' }),
    );
    expect(ensureUserProfileForAuthUser).toHaveBeenCalledWith({
      id: uid, email, name, roles: ['user'],
    });
  });

  it('returns expected contract shape', async () => {
    authRepository.findUserById.mockResolvedValue(activeUser);

    const result = await authService.handleSocialLogin({
      provider, providerSubject, providerEmail,
      emailVerified: true, name, picture: '', role: 'user',
    });

    expect(result).toMatchObject({
      accessToken: 'test-at',
      refreshToken: 'test-rt',
      user: {
        id: uid,
        email,
        name,
        roles: ['user'],
        emailVerified: true,
      },
    });
  });
});

describe('googleLogin', () => {
  it('delegates to handleSocialLogin with verified Google payload', async () => {
    googleAuthProvider.verifyGoogleIdToken.mockResolvedValue({
      provider: 'google',
      providerSubject: 'google_sub_test',
      providerEmail: 'google@test.com',
      emailVerified: true,
      name: 'Google User',
      picture: 'https://pic.com/google.jpg',
    });
    authRepository.findUserById.mockResolvedValue({
      id: uid,
      email: 'google@test.com',
      name: 'Google User',
      password_hash: 'hashed',
      roles: ['user'],
      is_active: true,
      email_verified: true,
    });

    const result = await authService.googleLogin({
      idToken: 'google-id-token', role: 'user',
    });

    expect(googleAuthProvider.verifyGoogleIdToken).toHaveBeenCalledWith('google-id-token');
    expect(authRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'google@test.com', roles: ['user'] }),
    );
    expect(result).toHaveProperty('accessToken', 'test-at');
    expect(result).toHaveProperty('refreshToken', 'test-rt');
    expect(result.user).toMatchObject({
      email: 'google@test.com',
      name: 'Google User',
    });
    expect(authRepository.createAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        providerSubject: 'google_sub_test',
        providerEmail: 'google@test.com',
      }),
    );
  });
});

describe('facebookLogin', () => {
  it('delegates to handleSocialLogin with verified Facebook payload', async () => {
    facebookAuthProvider.verifyFacebookAccessToken.mockResolvedValue({
      provider: 'facebook',
      providerSubject: 'fb_sub_456',
      providerEmail: 'fb@test.com',
      emailVerified: true,
      name: 'FB User',
      picture: '',
    });
    authRepository.findUserById.mockResolvedValue({
      id: uid,
      email: 'fb@test.com',
      name: 'FB User',
      password_hash: 'hashed',
      roles: ['user'],
      is_active: true,
      email_verified: true,
    });

    const result = await authService.facebookLogin({
      accessToken: 'fb-access-token', role: 'user',
    });

    expect(facebookAuthProvider.verifyFacebookAccessToken).toHaveBeenCalledWith('fb-access-token');
    expect(authRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'fb@test.com', roles: ['user'] }),
    );
    expect(result).toHaveProperty('accessToken', 'test-at');
    expect(result).toHaveProperty('refreshToken', 'test-rt');
    expect(result.user).toMatchObject({
      email: 'fb@test.com',
      name: 'FB User',
    });
    expect(authRepository.createAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'facebook',
        providerSubject: 'fb_sub_456',
        providerEmail: 'fb@test.com',
      }),
    );
  });
});
