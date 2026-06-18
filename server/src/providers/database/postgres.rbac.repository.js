const crypto = require('crypto');
const { query, transaction } = require('./postgres.client');

function newId() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
async function createRole({ id, name, description, isSystem }) {
  const roleId = id || newId();
  const result = await query(
    `INSERT INTO roles (id, name, description, is_system)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [roleId, name, description || '', isSystem || false]
  );
  return result.rows[0].id;
}

async function findRoleByName(name) {
  const result = await query('SELECT * FROM roles WHERE name = $1', [name]);
  return result.rows.length ? result.rows[0] : null;
}

async function findAllRoles() {
  const result = await query('SELECT * FROM roles ORDER BY name');
  return result.rows;
}

async function deleteRole(id) {
  await query('DELETE FROM roles WHERE id = $1 AND is_system = false', [id]);
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
async function createPermission({ id, name, description, resource, action }) {
  const permId = id || newId();
  const result = await query(
    `INSERT INTO permissions (id, name, description, resource, action)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [permId, name, description || '', resource, action]
  );
  return result.rows[0].id;
}

async function findPermissionByName(name) {
  const result = await query('SELECT * FROM permissions WHERE name = $1', [name]);
  return result.rows.length ? result.rows[0] : null;
}

async function findAllPermissions() {
  const result = await query('SELECT * FROM permissions ORDER BY resource, action');
  return result.rows;
}

// ---------------------------------------------------------------------------
// Role-Permission assignments
// ---------------------------------------------------------------------------
async function assignPermissionToRole(roleId, permissionId) {
  await query(
    `INSERT INTO role_permissions (role_id, permission_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [roleId, permissionId]
  );
}

async function removePermissionFromRole(roleId, permissionId) {
  await query(
    'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
    [roleId, permissionId]
  );
}

async function getPermissionsForRole(roleId) {
  const result = await query(
    `SELECT p.* FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = $1
     ORDER BY p.resource, p.action`,
    [roleId]
  );
  return result.rows;
}

async function getRolesForPermission(permissionId) {
  const result = await query(
    `SELECT r.* FROM roles r
     JOIN role_permissions rp ON rp.role_id = r.id
     WHERE rp.permission_id = $1
     ORDER BY r.name`,
    [permissionId]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Permission resolution (combines auth_users.roles + role_permissions)
// ---------------------------------------------------------------------------
async function resolveUserPermissions(userId) {
  // Collect permissions from all roles assigned in auth_users.roles
  const result = await query(
    `SELECT DISTINCT p.* FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN roles r ON r.id = rp.role_id
     JOIN auth_users u ON u.id = $1
     WHERE r.name = ANY(u.roles)
     ORDER BY p.resource, p.action`,
    [userId]
  );
  return result.rows;
}

async function resolveUserPermissionNames(userId) {
  const perms = await resolveUserPermissions(userId);
  return perms.map(function(p) { return p.name; });
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------
async function createOrganization({ id, name, slug, description, logoUrl }) {
  const orgId = id || newId();
  const result = await query(
    `INSERT INTO organizations (id, name, slug, description, logo_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id`,
    [orgId, name, slug, description || '', logoUrl || '']
  );
  return result.rows[0].id;
}

async function findOrganizationById(id) {
  const result = await query('SELECT * FROM organizations WHERE id = $1', [id]);
  return result.rows.length ? result.rows[0] : null;
}

async function findOrganizationBySlug(slug) {
  const result = await query('SELECT * FROM organizations WHERE slug = $1', [slug]);
  return result.rows.length ? result.rows[0] : null;
}

async function findAllOrganizations() {
  const result = await query('SELECT * FROM organizations ORDER BY name');
  return result.rows;
}

// ---------------------------------------------------------------------------
// Organization Memberships
// ---------------------------------------------------------------------------
async function addOrganizationMember({ id, organizationId, userId, role, permissionsOverride }) {
  const membershipId = id || newId();
  await query(
    `INSERT INTO organization_memberships (id, organization_id, user_id, role, permissions_override)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (organization_id, user_id) DO UPDATE
       SET role = EXCLUDED.role,
           permissions_override = EXCLUDED.permissions_override`,
    [membershipId, organizationId, userId, role || 'member', permissionsOverride || null]
  );
  return membershipId;
}

async function removeOrganizationMember(organizationId, userId) {
  await query(
    'DELETE FROM organization_memberships WHERE organization_id = $1 AND user_id = $2',
    [organizationId, userId]
  );
}

async function getOrganizationMembers(organizationId) {
  const result = await query(
    `SELECT om.*, u.email, u.name
     FROM organization_memberships om
     JOIN auth_users u ON u.id = om.user_id
     WHERE om.organization_id = $1
     ORDER BY om.joined_at`,
    [organizationId]
  );
  return result.rows;
}

async function getUserOrganizationMemberships(userId) {
  const result = await query(
    `SELECT om.*, o.name AS organization_name, o.slug AS organization_slug
     FROM organization_memberships om
     JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = $1
     ORDER BY o.name`,
    [userId]
  );
  return result.rows;
}

async function getOrganizationMember(organizationId, userId) {
  const result = await query(
    `SELECT om.*, u.email, u.name
     FROM organization_memberships om
     JOIN auth_users u ON u.id = om.user_id
     WHERE om.organization_id = $1 AND om.user_id = $2`,
    [organizationId, userId]
  );
  return result.rows.length ? result.rows[0] : null;
}

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------
async function createAuditLog({ id, actorId, action, resourceType, resourceId, metadata, ipAddress }) {
  const { v4: uuidv4 } = require('uuid');
  const logId = id || `aud_${uuidv4()}`;
  await query(
    `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, changes, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [logId, actorId, action, resourceType, resourceId, metadata ? JSON.stringify(metadata) : '{}', ipAddress || '', Date.now()]
  );
  return logId;
}

async function findAuditLogsByActor(actorId, limit, offset) {
  const lim = limit || 50;
  const off = offset || 0;
  const result = await query(
    'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [actorId, lim, off]
  );
  return result.rows;
}

async function findAuditLogsByResource(resourceType, resourceId, limit, offset) {
  const lim = limit || 50;
  const off = offset || 0;
  const result = await query(
    'SELECT * FROM audit_logs WHERE resource_type = $1 AND resource_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4',
    [resourceType, resourceId, lim, off]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Seed default roles and permissions
// ---------------------------------------------------------------------------
async function seedDefaults() {
  await transaction(async function(client) {
    // Create default roles
    const roles = [
      { name: 'user', description: 'Default authenticated user' },
      { name: 'organizer', description: 'Event organizer' },
      { name: 'admin', description: 'System administrator' },
      { name: 'staff', description: 'Organization staff member' },
      { name: 'manager', description: 'Organization manager' },
    ];

    for (const r of roles) {
      await client.query(
        `INSERT INTO roles (id, name, description, is_system)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (name) DO NOTHING`,
        [newId(), r.name, r.description]
      );
    }

    // Create permissions
    const permissions = [
      { name: 'event:create', resource: 'event', action: 'create' },
      { name: 'event:read', resource: 'event', action: 'read' },
      { name: 'event:update', resource: 'event', action: 'update' },
      { name: 'event:delete', resource: 'event', action: 'delete' },
      { name: 'event:publish', resource: 'event', action: 'publish' },
      { name: 'event:cancel', resource: 'event', action: 'cancel' },
      { name: 'ticket:manage', resource: 'ticket', action: 'manage' },
      { name: 'ticket:read', resource: 'ticket', action: 'read' },
      { name: 'user:read', resource: 'user', action: 'read' },
      { name: 'user:update', resource: 'user', action: 'update' },
      { name: 'user:manage', resource: 'user', action: 'manage' },
      { name: 'organization:manage', resource: 'organization', action: 'manage' },
      { name: 'organization:read', resource: 'organization', action: 'read' },
      { name: 'analytics:read', resource: 'analytics', action: 'read' },
      { name: 'media:manage', resource: 'media', action: 'manage' },
      { name: 'review:moderate', resource: 'review', action: 'moderate' },
    ];

    const permIds = {};
    for (const p of permissions) {
      const pid = newId();
      await client.query(
        `INSERT INTO permissions (id, name, description, resource, action)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO NOTHING`,
        [pid, p.name, '', p.resource, p.action]
      );
      permIds[p.name] = pid;
    }

    // Map role -> permission assignments
    const rolePermMap = {
      admin: permissions.map(function(p) { return p.name; }),
      organizer: ['event:create', 'event:read', 'event:update', 'event:publish', 'event:cancel', 'ticket:manage', 'ticket:read', 'user:read', 'user:update', 'media:manage', 'analytics:read', 'organization:read'],
      manager: ['event:create', 'event:read', 'event:update', 'ticket:read', 'user:read', 'organization:read'],
      staff: ['event:read', 'event:update', 'ticket:read', 'user:read', 'organization:read'],
      user: ['event:read', 'ticket:read', 'user:read', 'user:update'],
    };

    for (const [roleName, permNames] of Object.entries(rolePermMap)) {
      const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
      if (roleRes.rows.length === 0) continue;
      const roleId = roleRes.rows[0].id;
      for (const permName of permNames) {
        const permRes = await client.query('SELECT id FROM permissions WHERE name = $1', [permName]);
        if (permRes.rows.length === 0) continue;
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roleId, permRes.rows[0].id]
        );
      }
    }
  });
}

module.exports = {
  createRole,
  findRoleByName,
  findAllRoles,
  deleteRole,
  createPermission,
  findPermissionByName,
  findAllPermissions,
  assignPermissionToRole,
  removePermissionFromRole,
  getPermissionsForRole,
  getRolesForPermission,
  resolveUserPermissions,
  resolveUserPermissionNames,
  createOrganization,
  findOrganizationById,
  findOrganizationBySlug,
  findAllOrganizations,
  addOrganizationMember,
  removeOrganizationMember,
  getOrganizationMembers,
  getUserOrganizationMemberships,
  getOrganizationMember,
  createAuditLog,
  findAuditLogsByActor,
  findAuditLogsByResource,
  seedDefaults,
};
