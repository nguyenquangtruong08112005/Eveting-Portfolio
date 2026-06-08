const { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('@/shared/errors');
const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const authRepository = require('@/providers/database/postgres.auth.repository');
const userProfileRepository = require('@/providers/database/postgres.user.repository');
const axios = require('axios');
const crypto = require('crypto');
const { REFRESH_TOKEN_EXPIRY_MS, makeTokens } = require('./helpers/token.helper');
const { sendEmail } = require('./helpers/email.helper');
const { provisionAuthUserFromProfile, ensureUserProfileForAuthUser } = require('./helpers/profile.helper');

async function register({ email, password, name, role }) {
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
  });
  if (!uid) {
    throw new ConflictError('Email already registered');
  }

  const { accessToken, refreshToken, refreshTokenHash } = makeTokens(uid, email, [safeRole]);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await authRepository.createSession({
    userId: uid,
    refreshTokenHash,
    expiresAt,
  });

  await ensureUserProfileForAuthUser({ id: uid, email, name: name || '', roles: [safeRole] });

  return {
    accessToken,
    refreshToken,
    user: { id: uid, email, name: name || '', roles: [safeRole] },
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
    user: { id: user.id, email: user.email, name: user.name, roles: user.roles },
  };
}

async function refreshToken(refreshTokenRaw) {
  const hash = backendAuthProvider.hashRefreshToken(refreshTokenRaw);
  const session = await authRepository.findSessionByRefreshHash(hash);
  if (!session) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (session.revoked_at) {
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
    user: { id: user.id, email: user.email, name: user.name, roles: user.roles },
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

async function socialLogin({ email, name, role, profilePicUrl }) {
  const ALLOWED_ROLES = new Set(['user', 'organizer']);
  const safeRole = role || 'user';
  if (!ALLOWED_ROLES.has(safeRole)) {
    throw new BadRequestError(`Invalid role '${role}'. Allowed roles: user, organizer`);
  }

  if (!email) {
    throw new BadRequestError('Social provider did not return an email address');
  }

  let user = await authRepository.findUserByEmail(email);

  if (!user) {
    var profile = await userProfileRepository.findUserByEmail(email);
    if (profile && profile.email && profile.email.trim() !== '') {
      user = await provisionAuthUserFromProfile(profile, safeRole);
    }
  }

  if (!user) {
    const unusablePassword = `social:${email}:${Date.now()}:${Math.random()}`;
    const passwordHash = await backendAuthProvider.hashPassword(unusablePassword);
    const uid = await authRepository.createUser({
      email,
      name,
      passwordHash,
      roles: [safeRole],
    });
    if (!uid) {
      user = await authRepository.findUserByEmail(email);
    } else {
      user = await authRepository.findUserById(uid);
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

  if (profilePicUrl) {
    try {
      const existingProfile = await userProfileRepository.getUserDataById(user.id);
      if (existingProfile && !existingProfile.profilePicUrl) {
        await userProfileRepository.updateUserProfile(user.id, { profilePicUrl });
      }
    } catch (e) {
      // Ignore profile pic update failures
    }
  }

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name || name, roles },
  };
}

async function googleLogin({ idToken, role }) {
  const bypass = process.env.AUTH_SOCIAL_DEV_BYPASS === 'true' && process.env.NODE_ENV === 'development';
  if (bypass) {
    let email = 'bypass_google_user@example.com';
    let name = 'Bypass Google User';
    if (idToken.startsWith('mock_google_token_')) {
      email = idToken.replace('mock_google_token_', '') + '@example.com';
      name = 'Mock Google User';
    }
    return await socialLogin({ email, name, role, profilePicUrl: '' });
  }

  try {
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (response.status !== 200) {
      throw new Error('Google token verification failed');
    }
    const payload = response.data;
    const allowedGoogleClientIds = (process.env.GOOGLE_ALLOWED_CLIENT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowedGoogleClientIds.length === 0) {
      throw new Error('Google allowed client IDs not configured');
    }
    const aud = payload.aud;
    if (!allowedGoogleClientIds.includes(aud)) {
      throw new Error('Google token audience mismatch');
    }
    if (payload.email_verified !== true && payload.email_verified !== 'true') {
      throw new Error('Google email is not verified');
    }
    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const profilePicUrl = payload.picture || '';
    return await socialLogin({ email, name, role, profilePicUrl });
  } catch (error) {
    throw new UnauthorizedError(error.message || 'Invalid Google ID token');
  }
}

async function facebookLogin({ accessToken, role }) {
  const bypass = process.env.AUTH_SOCIAL_DEV_BYPASS === 'true' && process.env.NODE_ENV === 'development';
  if (bypass) {
    let email = 'bypass_facebook_user@example.com';
    let name = 'Bypass Facebook User';
    if (accessToken.startsWith('mock_facebook_token_')) {
      email = accessToken.replace('mock_facebook_token_', '') + '@example.com';
      name = 'Mock Facebook User';
    }
    return await socialLogin({ email, name, role, profilePicUrl: '' });
  }

  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error('Facebook App ID or Secret not configured');
    }

    const debugResponse = await axios.get(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
    );
    if (debugResponse.status !== 200 || !debugResponse.data?.data) {
      throw new Error('Facebook token debugging failed');
    }
    const debugData = debugResponse.data.data;
    if (!debugData.is_valid) {
      throw new Error('Facebook token is invalid');
    }
    if (debugData.app_id !== appId) {
      throw new Error('Facebook App ID mismatch');
    }

    const profileResponse = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );
    if (profileResponse.status !== 200) {
      throw new Error('Facebook profile fetch failed');
    }
    const payload = profileResponse.data;
    const email = payload.email;
    if (!email) {
      throw new Error('Facebook profile did not return email');
    }
    const name = payload.name || email.split('@')[0];
    const profilePicUrl = payload.picture?.data?.url || '';
    return await socialLogin({ email, name, role, profilePicUrl });
  } catch (error) {
    throw new UnauthorizedError(error.message || 'Invalid Facebook access token');
  }
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
      console.error('Failed to send password reset email:', e.message);
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
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 86400000); // 24 hours
    await authRepository.saveToken({ tokenHash, purpose: 'email_verification', email, expiresAt });
    try {
      await sendEmail({
        to: email,
        subject: 'Verify your email',
        text: `Use this token to verify your email: ${token}`,
        html: `<p>Use this token to verify your email: <strong>${token}</strong></p>`
      });
    } catch (e) {
      console.error('Failed to send email verification:', e.message);
    }
  }
  return { message: 'If the email is registered, a verification link has been sent.' };
}

async function confirmEmailVerification(token) {
  if (!token) {
    throw new BadRequestError('Token is required');
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const dbToken = await authRepository.findTokenByHash(tokenHash, 'email_verification');
  if (!dbToken || dbToken.used_at || new Date() > new Date(dbToken.expires_at)) {
    throw new BadRequestError('Invalid or expired token');
  }
  await authRepository.verifyUserEmail(dbToken.email);
  await authRepository.markTokenUsed(dbToken.id);
  return { success: true, message: 'Email has been verified successfully.' };
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
};
