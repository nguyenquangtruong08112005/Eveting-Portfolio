const crypto = require('crypto');
const { query } = require('./postgres.client');

function now() {
  return new Date();
}

async function createUser({ id, email, name, passwordHash, roles }) {
  const userId = id || crypto.randomUUID();
  const result = await query(
    `INSERT INTO auth_users (id, email, name, password_hash, roles)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [userId, email, name || '', passwordHash, roles || ['user']]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return userId;
}

async function findUserByEmail(email) {
  const result = await query(
    'SELECT id, email, name, password_hash, roles, profile_pic_url, bio, is_active, created_at FROM auth_users WHERE email = $1',
    [email]
  );
  return result.rows.length ? result.rows[0] : null;
}

async function findUserById(id) {
  const result = await query(
    'SELECT id, email, name, password_hash, roles, profile_pic_url, bio, is_active, created_at FROM auth_users WHERE id = $1',
    [id]
  );
  return result.rows.length ? result.rows[0] : null;
}

async function getUserRoles(userId) {
  const result = await query('SELECT roles FROM auth_users WHERE id = $1', [userId]);
  return result.rows.length ? result.rows[0].roles : [];
}

async function updateUserPassword(userId, newPasswordHash) {
  await query(
    'UPDATE auth_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newPasswordHash, userId]
  );
}

async function createSession({ userId, refreshTokenHash, expiresAt, userAgent, ipAddress }) {
  const sessionId = crypto.randomUUID();
  await query(
    `INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [sessionId, userId, refreshTokenHash, userAgent || '', ipAddress || '', expiresAt]
  );
  return sessionId;
}

async function findSessionByRefreshHash(hash) {
  const result = await query(
    `SELECT id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, created_at, revoked_at
     FROM sessions
     WHERE refresh_token_hash = $1`,
    [hash]
  );
  return result.rows.length ? result.rows[0] : null;
}

async function revokeSession(sessionId) {
  await query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1', [sessionId]);
}

async function revokeAllUserSessions(userId) {
  await query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

async function cleanExpiredSessions() {
  const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
  return result.rowCount;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getUserRoles,
  updateUserPassword,
  createSession,
  findSessionByRefreshHash,
  revokeSession,
  revokeAllUserSessions,
  cleanExpiredSessions,
};
