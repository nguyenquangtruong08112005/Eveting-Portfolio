-- Migration: 017_create_rbac_tables
-- Description: Normalized RBAC / organization staff foundation.
--              Adds roles, permissions, role_permissions, organizations,
--              organization_memberships, and audit_logs tables.
--              Keeps existing auth_users.roles TEXT[] for backward compatibility.

CREATE TABLE IF NOT EXISTS roles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    is_system   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    resource    TEXT NOT NULL,
    action      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    logo_url    TEXT DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_memberships (
    id                  TEXT PRIMARY KEY,
    organization_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id             TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    role                TEXT NOT NULL DEFAULT 'member',
    permissions_override TEXT[],
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id            TEXT PRIMARY KEY,
    actor_id      TEXT NOT NULL,
    action        TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id   TEXT NOT NULL,
    metadata      JSONB DEFAULT '{}',
    ip_address    TEXT DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles (name);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions (name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions (resource, action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions (permission_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_org ON organization_memberships (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user ON organization_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
