const crypto = require('crypto');
const { query } = require('./postgres.client');

function now() {
  return new Date();
}

function mapAuthUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || '',
    password_hash: row.password_hash,
    roles: row.roles || [],
    profile_pic_url: row.profile_pic_url || '',
    bio: row.bio || '',
    is_active: row.is_active,
    email_verified: row.email_verified,
    created_at: row.created_at,
  };
}

async function createUser({ id, email, name, passwordHash, roles }) {
  const userId = id || crypto.randomUUID();
  const result = await query(
    `INSERT INTO auth_users (id, email, password_hash, roles)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [userId, email, passwordHash, roles || ['user']]
  );
  if (result.rows.length === 0) {
    return null;
  }
  // name is profile-only (042); create/update profile display if provided
  if (name != null && name !== '') {
    await query(
      `INSERT INTO user_profiles (id, name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      [userId, name]
    );
  }
  return userId;
}

async function findUserByEmail(email) {
  const result = await query(
    `SELECT a.id, a.email, a.password_hash, a.roles, a.is_active, a.email_verified, a.created_at,
            p.name, p.profile_pic_url, p.bio
     FROM auth_users a
     LEFT JOIN user_profiles p ON p.id = a.id AND p.deleted_at IS NULL
     WHERE a.email = $1 AND a.deleted_at IS NULL`,
    [email]
  );
  return result.rows.length ? mapAuthUser(result.rows[0]) : null;
}

async function findUserById(id) {
  const result = await query(
    `SELECT a.id, a.email, a.password_hash, a.roles, a.is_active, a.email_verified, a.created_at,
            p.name, p.profile_pic_url, p.bio
     FROM auth_users a
     LEFT JOIN user_profiles p ON p.id = a.id AND p.deleted_at IS NULL
     WHERE a.id = $1 AND a.deleted_at IS NULL`,
    [id]
  );
  return result.rows.length ? mapAuthUser(result.rows[0]) : null;
}

async function getUserRoles(userId) {
  const fromTable = await query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  if (fromTable.rows.length > 0) {
    return fromTable.rows.map((row) => row.name);
  }
  const result = await query(
    'SELECT roles FROM auth_users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
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

async function appendRoleToUser(userId, role) {
  await query(
    `UPDATE auth_users
     SET roles = CASE
       WHEN $2 = ANY(roles) THEN roles
       ELSE array_append(roles, $2)
     END,
     updated_at = NOW()
     WHERE id = $1`,
    [userId, role]
  );
  const roleName = role === 'attendee' ? 'user' : role;
  await query(
    `INSERT INTO user_roles (user_id, role_id, created_at)
     SELECT $1, r.id, NOW() FROM roles r WHERE r.name = $2
     ON CONFLICT DO NOTHING`,
    [userId, roleName]
  );
}

async function saveToken({ id, tokenHash, purpose, email, expiresAt, userId = null }) {
  const tokenId = id || crypto.randomUUID();
  await query(
    `INSERT INTO auth_tokens (id, token_hash, purpose, email, expires_at, user_id)
     VALUES (
       $1, $2, $3, $4, $5,
       COALESCE(
         $6,
         (SELECT id FROM auth_users WHERE LOWER(email) = LOWER($4) LIMIT 1)
       )
     )`,
    [tokenId, tokenHash, purpose, email, expiresAt, userId]
  );
  return tokenId;
}

async function findTokenByHash(tokenHash, purpose) {
  const result = await query(
    `SELECT id, token_hash, purpose, email, expires_at, created_at, used_at, user_id
     FROM auth_tokens
     WHERE token_hash = $1 AND purpose = $2`,
    [tokenHash, purpose]
  );
  return result.rows.length ? result.rows[0] : null;
}

async function markTokenUsed(tokenId) {
  await query('UPDATE auth_tokens SET used_at = NOW() WHERE id = $1', [tokenId]);
}

async function verifyUserEmail(email) {
  await query(
    'UPDATE auth_users SET email_verified = true, updated_at = NOW() WHERE email = $1',
    [email]
  );
}

async function updateUserProfileFields(userId, { name, profilePicUrl, bio } = {}) {
  const sets = [];
  const params = [];
  let idx = 1;
  if (name != null) {
    sets.push(`name = $${idx++}`);
    params.push(name);
  }
  if (profilePicUrl != null) {
    sets.push(`profile_pic_url = $${idx++}`);
    params.push(profilePicUrl);
  }
  if (bio != null) {
    sets.push(`bio = $${idx++}`);
    params.push(bio);
  }
  if (sets.length === 0) return;
  sets.push('updated_at = NOW()');
  params.push(userId);
  await query(
    `INSERT INTO user_profiles (id, name, created_at, updated_at)
     VALUES ($${idx}, '', NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [userId]
  );
  await query(
    `UPDATE user_profiles SET ${sets.join(', ')} WHERE id = $${idx}`,
    params
  );
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
  appendRoleToUser,
  saveToken,
  findTokenByHash,
  markTokenUsed,
  verifyUserEmail,
  updateUserProfileFields,
  now,
};
