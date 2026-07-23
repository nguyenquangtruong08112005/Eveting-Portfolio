/**
 * Seed three local demo auth accounts (attendee / organizer / admin).
 *
 * Password for all: 123456
 *
 * Usage (from server/):
 *   node scripts/seed/seed.demo-users.postgres.js
 *   npm run db:seed:demo-users
 *
 * Requires DATABASE_URL (or local postgres) and migrations applied.
 */
require('../../src/alias-bootstrap');
require('dotenv').config();

const crypto = require('crypto');
const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const { query } = require('@/providers/database/postgres.client');

const DEMO_PASSWORD = '123456';

const ACCOUNTS = [
  {
    id: 'demo_attendee_001',
    email: 'alice@email.com',
    name: 'Alice Attendee',
    roles: ['user'],
  },
  {
    id: 'demo_organizer_001',
    email: 'organizer@eventing.com',
    name: 'Events Pro Asia',
    roles: ['organizer'],
  },
  {
    id: 'demo_admin_001',
    email: 'admin@eventing.com',
    name: 'Platform Admin',
    roles: ['admin'],
  },
];

async function upsertAccount({ id, email, name, roles }, passwordHash) {
  // If email exists with different id, update that row instead of inserting demo id
  const existing = await query(
    `SELECT id, email, roles FROM auth_users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );

  let userId = id;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    await query(
      `UPDATE auth_users
       SET password_hash = $2,
           roles = $3,
           is_active = true,
           email_verified = true,
           updated_at = NOW()
       WHERE id = $1`,
      [userId, passwordHash, roles]
    );
    console.log(`[update] ${email}  id=${userId}  roles=${roles.join(',')}`);
  } else {
    await query(
      `INSERT INTO auth_users (id, email, password_hash, roles, is_active, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         roles = EXCLUDED.roles,
         is_active = true,
         email_verified = true,
         updated_at = NOW()`,
      [userId, email, passwordHash, roles]
    );
    console.log(`[insert] ${email}  id=${userId}  roles=${roles.join(',')}`);
  }

  await query(
    `INSERT INTO user_profiles (id, name, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
    [userId, name]
  );

  // RBAC junction if roles table exists
  try {
    for (const roleName of roles) {
      const roleRow = await query(`SELECT id FROM roles WHERE name = $1 LIMIT 1`, [roleName]);
      if (roleRow.rows.length === 0) continue;
      await query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, roleRow.rows[0].id]
      );
    }
  } catch (e) {
    // roles / user_roles may not exist or PK shape differs — auth_users.roles is enough for login
    console.warn(`[warn] user_roles skip for ${email}: ${e.message}`);
  }

  return userId;
}

async function main() {
  console.log('Seeding demo auth users (password: 123456)…\n');
  const passwordHash = await backendAuthProvider.hashPassword(DEMO_PASSWORD);

  const adminIds = [];
  for (const acc of ACCOUNTS) {
    const uid = await upsertAccount(acc, passwordHash);
    if (acc.roles.includes('admin')) adminIds.push(uid);
  }

  console.log('\n--- Demo accounts ---');
  console.log('| Role       | Email                   | Password |');
  console.log('|------------|-------------------------|----------|');
  console.log('| Attendee   | alice@email.com         | 123456   |');
  console.log('| Organizer  | organizer@eventing.com  | 123456   |');
  console.log('| Admin      | admin@eventing.com      | 123456   |');
  if (adminIds[0]) {
    console.log(
      `\nTip: set ADMIN_UID="${adminIds[0]}" in server/.env (optional; roles already include admin).`
    );
  }
  console.log('\nDone. Login at http://localhost:3001/login');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
