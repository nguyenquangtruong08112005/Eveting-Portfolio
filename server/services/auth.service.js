const backendAuthProvider = require('../providers/auth/backend.auth.provider');
const authRepository = require('../providers/database/postgres.auth.repository');

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

function makeTokens(uid, email, roles) {
  const payload = { uid, email, roles };
  const accessToken = backendAuthProvider.signAccessToken(payload);
  const { raw: refreshToken, hash: refreshTokenHash } = backendAuthProvider.generateRefreshToken();
  return { accessToken, refreshToken, refreshTokenHash };
}

async function register({ email, password, name }) {
  const existing = await authRepository.findUserByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await backendAuthProvider.hashPassword(password);
  const uid = await authRepository.createUser({
    email,
    name: name || '',
    passwordHash,
    roles: ['user'],
  });
  if (!uid) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const { accessToken, refreshToken, refreshTokenHash } = makeTokens(uid, email, ['user']);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await authRepository.createSession({
    userId: uid,
    refreshTokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    user: { id: uid, email, name: name || '', roles: ['user'] },
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

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
};
