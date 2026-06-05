const backendAuthProvider = require('../providers/auth/backend.auth.provider');
const authRepository = require('../providers/database/postgres.auth.repository');
const userProfileRepository = require('../providers/database/postgres.user.repository');
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

async function provisionAuthUserFromProfile(profile, requestedRole) {
  var profileRoles = profile.roles || ['attendee'];
  var authRoles = profileRoles.map(function (r) { return r === 'attendee' ? 'user' : r; });
  var safeRole = requestedRole || 'user';
  if (safeRole !== 'user' && authRoles.indexOf(safeRole) === -1) {
    authRoles.push(safeRole);
  }
  var unusablePassword = 'migrated:' + profile._id + ':' + Date.now() + ':' + Math.random();
  var passwordHash = await backendAuthProvider.hashPassword(unusablePassword);
  var uid = await authRepository.createUser({
    id: profile._id,
    email: profile.email,
    name: profile.name || '',
    passwordHash: passwordHash,
    roles: authRoles,
  });
  if (uid) {
    return await authRepository.findUserById(uid);
  }
  return await authRepository.findUserByEmail(profile.email);
}

const REFRESH_TOKEN_EXPIRY_MS = (() => {
  const env = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  const match = env.match(/^(\d+)\s*(d|h|m|s)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 'd': return n * 24 * 60 * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'm': return n * 60 * 1000;
    case 's': return n * 1000;
    default:  return 7 * 24 * 60 * 60 * 1000;
  }
})();

async function ensureUserProfileForAuthUser(_a) {
  var id = _a.id, email = _a.email, name = _a.name, roles = _a.roles;
  var existing = await userProfileRepository.getUserDataById(id);
  if (existing) return;
  var profileRoles = (roles || []).map(function (r) { return r === 'user' ? 'attendee' : r; });
  await userProfileRepository.createUser(id, {
    id: id,
    email: email,
    name: name || '',
    profilePicUrl: '',
    coverPhotoUrl: null,
    bio: '',
    birthDate: null,
    roles: profileRoles,
    createdAt: Date.now(),
    followedProfileIds: [],
    historyEventIds: [],
    followersCount: 0,
    followingCount: 0,
    points: 0,
    level: 'bronze',
    matchingPreferences: { interests: [], ageRange: '18-25' },
    sharedMedia: [],
    fcmTokens: [],
  });
}

function makeTokens(uid, email, roles) {
  const payload = { uid, email, roles };
  const accessToken = backendAuthProvider.signAccessToken(payload);
  const { raw: refreshToken, hash: refreshTokenHash } = backendAuthProvider.generateRefreshToken();
  return { accessToken, refreshToken, refreshTokenHash };
}

async function register({ email, password, name, role }) {
  const ALLOWED_ROLES = new Set(['user', 'organizer']);
  const safeRole = role || 'user';
  if (!ALLOWED_ROLES.has(safeRole)) {
    const err = new Error(`Invalid role '${role}'. Allowed roles: user, organizer`);
    err.statusCode = 400;
    throw err;
  }

  const existing = await authRepository.findUserByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  var existingProfile = await userProfileRepository.findUserByEmail(email);
  if (existingProfile && existingProfile.email && existingProfile.email.trim() !== '') {
    const err = new Error('Email belongs to an existing profile. Use password reset or social login to claim this account.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await backendAuthProvider.hashPassword(password);
  const uid = await authRepository.createUser({
    email,
    name: name || '',
    passwordHash,
    roles: [safeRole],
  });
  if (!uid) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
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
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Account is deactivated');
    err.statusCode = 403;
    throw err;
  }

  const valid = await backendAuthProvider.verifyPassword(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
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
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  if (session.revoked_at) {
    const err = new Error('Refresh token revoked');
    err.statusCode = 401;
    throw err;
  }

  if (new Date() > new Date(session.expires_at)) {
    const err = new Error('Refresh token expired');
    err.statusCode = 401;
    throw err;
  }

  await authRepository.revokeSession(session.id);

  const user = await authRepository.findUserById(session.user_id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
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

function getMailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

async function sendEmail({ to, subject, text, html }) {
  const transporter = getMailTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@eventing.tdtuer.com',
      to,
      subject,
      text,
      html,
    });
  } else if (process.env.AUTH_MOCK_EMAIL === 'true') {
    console.log(`[MOCK EMAIL] To: ${to}\nSubject: ${subject}\nContent: ${text || html}`);
  } else {
    throw new Error('Email service not configured and mock mode is off');
  }
}

async function socialLogin({ email, name, role, profilePicUrl }) {
  const ALLOWED_ROLES = new Set(['user', 'organizer']);
  const safeRole = role || 'user';
  if (!ALLOWED_ROLES.has(safeRole)) {
    const err = new Error(`Invalid role '${role}'. Allowed roles: user, organizer`);
    err.statusCode = 400;
    throw err;
  }

  if (!email) {
    const err = new Error('Social provider did not return an email address');
    err.statusCode = 400;
    throw err;
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
    const err = new Error('Unable to create backend auth user from social login');
    err.statusCode = 500;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Account is deactivated');
    err.statusCode = 403;
    throw err;
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
    if (!aud || !allowedGoogleClientIds.includes(aud)) {
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
    const err = new Error(error.message || 'Invalid Google ID token');
    err.statusCode = error.statusCode || 401;
    throw err;
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
    const err = new Error(error.message || 'Invalid Facebook access token');
    err.statusCode = error.statusCode || 401;
    throw err;
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
    const err = new Error('Token and newPassword are required');
    err.statusCode = 400;
    throw err;
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const dbToken = await authRepository.findTokenByHash(tokenHash, 'password_reset');
  if (!dbToken || dbToken.used_at || new Date() > new Date(dbToken.expires_at)) {
    const err = new Error('Invalid or expired token');
    err.statusCode = 400;
    throw err;
  }
  const user = await authRepository.findUserByEmail(dbToken.email);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
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
    const err = new Error('Token is required');
    err.statusCode = 400;
    throw err;
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const dbToken = await authRepository.findTokenByHash(tokenHash, 'email_verification');
  if (!dbToken || dbToken.used_at || new Date() > new Date(dbToken.expires_at)) {
    const err = new Error('Invalid or expired token');
    err.statusCode = 400;
    throw err;
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
