const { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('@/shared/errors');
const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const googleAuthProvider = require('@/providers/auth/google.auth.provider');
const facebookAuthProvider = require('@/providers/auth/facebook.auth.provider');
const authRepository = require('@/providers/database/postgres.auth.repository');
const userProfileRepository = require('@/providers/database/postgres.user.repository');
const crypto = require('crypto');
const logger = require('@/shared/logger');
const { REFRESH_TOKEN_EXPIRY_MS, makeTokens } = require('./helpers/token.helper');
const { sendEmail } = require('./helpers/email.helper');
const { provisionAuthUserFromProfile, ensureUserProfileForAuthUser } = require('./helpers/profile.helper');

async function createAndSendEmailVerification(email, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await authRepository.saveEmailVerification({
    tokenHash,
    userId,
    email,
    expiresAt,
  });

  const baseUrl = process.env.APP_PUBLIC_WEB_URL || process.env.WEB_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  try {
    await sendEmail({
      to: email,
      subject: 'Verify your email address - Eventing',
      text: `Please verify your email address by clicking the link: ${verificationUrl}`,
      html: `<p>Please verify your email address by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
    });
    logger.info(`[AuthService] Verification email sent to ${email}`);
  } catch (e) {
    logger.error(`[AuthService] Failed to send email verification: ${e.message}`);
  }

  return { token, tokenHash };
}

async function register({ email, password, name, role, clientTransport }) {
  const ALLOWED_ROLES = new Set(['user', 'organizer']);
  const safeRole = role || 'user';
  if (!ALLOWED_ROLES.has(safeRole)) {
    throw new BadRequestError(`Invalid role '${role}'. Allowed roles: user, organizer`);
  }

  const existing = await authRepository.findUserByEmail(email);
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  var existingProfile = await userProfileRepository.findUserByEmail(email);
  if (existingProfile && existingProfile.email && existingProfile.email.trim() !== '') {
    throw new ConflictError('Email belongs to an existing profile. Use password reset or social login to claim this account.');
  }

  const passwordHash = await backendAuthProvider.hashPassword(password);
  const uid = await authRepository.createUser({
    email,
    name: name || '',
    passwordHash,
    roles: [safeRole],
    emailVerified: false,
  });
  if (!uid) {
    throw new ConflictError('Email already registered');
  }

  await ensureUserProfileForAuthUser({ id: uid, email, name: name || '', roles: [safeRole] });
  await createAndSendEmailVerification(email, uid);

  // If web transport, registration creates an unverified account with no session issued
  if (clientTransport === 'web') {
    return {
      pendingVerification: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: { id: uid, email, name: name || '', roles: [safeRole], emailVerified: false },
    };
  }

  // Legacy / Mobile transport: issue session & tokens
  const { accessToken, refreshToken, refreshTokenHash } = makeTokens(uid, email, [safeRole]);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await authRepository.createSession({
    userId: uid,
    refreshTokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    user: { id: uid, email, name: name || '', roles: [safeRole], emailVerified: false },
  };
}

async function login({ email, password }) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.is_active) {
    throw new ForbiddenError('Account is deactivated');
  }

  const valid = await backendAuthProvider.verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const { accessToken, refreshToken, refreshTokenHash } = makeTokens(
    user.id, user.email, user.roles
  );
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await authRepository.createSession({
    userId: user.id,
    refreshTokenHash,
    expiresAt,
  });

  await ensureUserProfileForAuthUser({ id: user.id, email: user.email, name: user.name, roles: user.roles });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, roles: user.roles, emailVerified: user.email_verified ?? false },
  };
}

async function refreshToken(refreshTokenRaw) {
  const hash = backendAuthProvider.hashRefreshToken(refreshTokenRaw);
  const session = await authRepository.findSessionByRefreshHash(hash);
  if (!session) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (session.revoked_at) {
    await authRepository.revokeAllUserSessions(session.user_id);
    throw new UnauthorizedError('Refresh token revoked');
  }

  if (new Date() > new Date(session.expires_at)) {
    throw new UnauthorizedError('Refresh token expired');
  }

  await authRepository.revokeSession(session.id);

  const user = await authRepository.findUserById(session.user_id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const { accessToken, refreshToken, refreshTokenHash } = makeTokens(
    user.id, user.email, user.roles
  );
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await authRepository.createSession({
    userId: user.id,
    refreshTokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, roles: user.roles, emailVerified: user.email_verified ?? false },
  };
}

async function logout(refreshTokenRaw) {
  const hash = backendAuthProvider.hashRefreshToken(refreshTokenRaw);
  const session = await authRepository.findSessionByRefreshHash(hash);
  if (session && !session.revoked_at) {
    await authRepository.revokeSession(session.id);
  }
  return { success: true };
}

async function logoutAll(userId) {
  await authRepository.revokeAllUserSessions(userId);
  return { success: true };
}

async function handleSocialLogin({ provider, providerSubject, providerEmail, emailVerified = true, name = '', picture = '', role }) {
  const ALLOWED_ROLES = new Set(['user', 'organizer']);
  const safeRole = role || 'user';
  if (!ALLOWED_ROLES.has(safeRole)) {
    throw new BadRequestError(`Invalid role '${role}'. Allowed roles: user, organizer`);
  }

  if (!providerEmail) {
    throw new BadRequestError('Social provider did not return an email address');
  }

  let identity = await authRepository.findIdentityByProviderAndSubject(provider, providerSubject);
  let user = null;

  if (identity) {
    user = await authRepository.findUserById(identity.user_id);
  }

  if (!user) {
    user = await authRepository.findUserByEmail(providerEmail);
    if (user) {
      // Account Takeover Prevention:
      // Reject unverified social email attempting to claim an unverified existing account
      if (!emailVerified && !user.email_verified) {
        throw new UnauthorizedError('Unverified social email cannot claim existing account without verification.');
      }
      // Safe account linking
      await authRepository.createAuthIdentity({
        userId: user.id,
        provider,
        providerSubject,
        providerEmail,
      });

      if (emailVerified && !user.email_verified) {
        await authRepository.verifyUserEmailById(user.id);
        await authRepository.verifyUserEmail(user.email);
        user.email_verified = true;
      }
    } else {
      const profile = await userProfileRepository.findUserByEmail(providerEmail);
      if (profile && profile.email && profile.email.trim() !== '') {
        user = await provisionAuthUserFromProfile(profile, safeRole);
      }
    }
  }

  if (!user) {
    const unusablePassword = `social:${provider}:${providerSubject}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
    const passwordHash = await backendAuthProvider.hashPassword(unusablePassword);
    const uid = await authRepository.createUser({
      email: providerEmail,
      name: name || '',
      passwordHash,
      roles: [safeRole],
      emailVerified: emailVerified ?? true,
    });
    if (!uid) {
      user = await authRepository.findUserByEmail(providerEmail);
    } else {
      user = await authRepository.findUserById(uid);
    }

    if (user) {
      await authRepository.createAuthIdentity({
        userId: user.id,
        provider,
        providerSubject,
        providerEmail,
      });
    }
  }

  if (!user) {
    throw new Error('Unable to create backend auth user from social login');
  }

  if (!user.is_active) {
    throw new ForbiddenError('Account is deactivated');
  }

  if (safeRole !== 'user' && (!user.roles || !user.roles.includes(safeRole))) {
    await authRepository.appendRoleToUser(user.id, safeRole);
    await userProfileRepository.appendRoleToProfile(user.id, safeRole);
    user.roles = [...(user.roles || []), safeRole];
  }

  const roles = user.roles && user.roles.length ? user.roles : ['user'];
  const { accessToken, refreshToken, refreshTokenHash } = makeTokens(
    user.id, user.email, roles
  );
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await authRepository.createSession({
    userId: user.id,
    refreshTokenHash,
    expiresAt,
  });

  await ensureUserProfileForAuthUser({ id: user.id, email: user.email, name: user.name || name, roles });

  if (picture) {
    try {
      const existingProfile = await userProfileRepository.getUserDataById(user.id);
      if (existingProfile && !existingProfile.profilePicUrl) {
        await userProfileRepository.updateUserProfile(user.id, { profilePicUrl: picture });
      }
    } catch (e) {
      // Ignore profile pic update error
    }
  }

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name || name || '', roles, emailVerified: user.email_verified ?? true },
  };
}

async function googleLogin({ idToken, role }) {
  const payload = await googleAuthProvider.verifyGoogleIdToken(idToken);
  return handleSocialLogin({
    provider: payload.provider,
    providerSubject: payload.providerSubject,
    providerEmail: payload.providerEmail,
    emailVerified: payload.emailVerified,
    name: payload.name,
    picture: payload.picture,
    role,
  });
}

async function facebookLogin({ accessToken, role }) {
  const payload = await facebookAuthProvider.verifyFacebookAccessToken(accessToken);
  return handleSocialLogin({
    provider: payload.provider,
    providerSubject: payload.providerSubject,
    providerEmail: payload.providerEmail,
    emailVerified: payload.emailVerified,
    name: payload.name,
    picture: payload.picture,
    role,
  });
}

async function requestPasswordReset(email) {
  let user = await authRepository.findUserByEmail(email);

  if (!user) {
    var profile = await userProfileRepository.findUserByEmail(email);
    if (profile && profile.email && profile.email.trim() !== '') {
      await provisionAuthUserFromProfile(profile, 'user');
      user = await authRepository.findUserByEmail(email);
    }
  }

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    await authRepository.saveToken({ tokenHash, purpose: 'password_reset', email, expiresAt });
    try {
      await sendEmail({
        to: email,
        subject: 'Reset your password',
        text: `Use this token to reset your password: ${token}`,
        html: `<p>Use this token to reset your password: <strong>${token}</strong></p>`
      });
    } catch (e) {
      logger.error(`Failed to send password reset email: ${e.message}`);
    }
  }
  return { message: 'If the email is registered, a password reset link has been sent.' };
}

async function confirmPasswordReset(token, newPassword) {
  if (!token || !newPassword) {
    throw new BadRequestError('Token and newPassword are required');
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const dbToken = await authRepository.findTokenByHash(tokenHash, 'password_reset');
  if (!dbToken || dbToken.used_at || new Date() > new Date(dbToken.expires_at)) {
    throw new BadRequestError('Invalid or expired token');
  }
  const user = await authRepository.findUserByEmail(dbToken.email);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  const passwordHash = await backendAuthProvider.hashPassword(newPassword);
  await authRepository.updateUserPassword(user.id, passwordHash);
  await authRepository.markTokenUsed(dbToken.id);
  await authRepository.revokeAllUserSessions(user.id);
  return { success: true, message: 'Password has been reset successfully.' };
}

async function requestEmailVerification(email) {
  const user = await authRepository.findUserByEmail(email);
  if (user) {
    if (user.email_verified) {
      return { message: 'Email is already verified.' };
    }
    await createAndSendEmailVerification(email, user.id);
  }
  return { message: 'If the email is registered, a verification link has been sent.' };
}

async function confirmEmailVerification(token) {
  if (!token) {
    throw new BadRequestError('Token is required');
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await authRepository.consumeEmailVerification(tokenHash);
  if (!record) {
    throw new BadRequestError('Invalid or expired verification token');
  }
  return { success: true, message: 'Email has been verified successfully.', email: record.email };
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  googleLogin,
  facebookLogin,
  requestPasswordReset,
  confirmPasswordReset,
  requestEmailVerification,
  confirmEmailVerification,
  createAndSendEmailVerification,
  handleSocialLogin,
};
