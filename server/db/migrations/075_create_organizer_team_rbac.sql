-- Migration 075: Organizer teams and granular Phase 07 permissions.

CREATE TABLE IF NOT EXISTS organizer_teams (
    id TEXT PRIMARY KEY,
    owner_organizer_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_organizer_id)
);

CREATE TABLE IF NOT EXISTS organizer_team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES organizer_teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CHECK_IN_STAFF')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    invited_by TEXT REFERENCES auth_users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS organizer_team_member_permissions (
    member_id TEXT NOT NULL REFERENCES organizer_team_members(id) ON DELETE CASCADE,
    permission TEXT NOT NULL CHECK (permission IN (
        'SCAN_TICKETS',
        'VIEW_CHECKIN_REPORTS',
        'MANAGE_TEAM',
        'MANAGE_SEATMAP',
        'VIEW_ORDERS',
        'SEND_CUSTOMER_EMAIL',
        'EXPORT_ORDER_REPORTS',
        'VIEW_REVENUE',
        'VIEW_ANALYTICS',
        'MARKETING_OPERATIONS',
        'MANAGE_VOUCHERS',
        'EDIT_EVENT'
    )),
    PRIMARY KEY (member_id, permission)
);

CREATE TABLE IF NOT EXISTS organizer_team_member_scopes (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES organizer_team_members(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    performance_id TEXT,
    ticket_type_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE NULLS NOT DISTINCT (member_id, event_id, performance_id, ticket_type_id)
);

CREATE TABLE IF NOT EXISTS organizer_team_invitations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES organizer_teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CHECK_IN_STAFF')),
    permissions TEXT[] NOT NULL DEFAULT '{}',
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')),
    invited_by TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizer_team_members_user
    ON organizer_team_members (user_id, status);
CREATE INDEX IF NOT EXISTS idx_organizer_team_members_team
    ON organizer_team_members (team_id, status);
CREATE INDEX IF NOT EXISTS idx_organizer_team_scopes_member_event
    ON organizer_team_member_scopes (member_id, event_id);
CREATE INDEX IF NOT EXISTS idx_organizer_team_invitations_email_status
    ON organizer_team_invitations (LOWER(email), status);

INSERT INTO organizer_teams (id, owner_organizer_id, name)
SELECT
    'oteam_' || MD5(op.user_id),
    op.user_id,
    COALESCE(NULLIF(op.company_name, ''), 'Organizer team')
FROM organizer_profiles op
JOIN auth_users au ON au.id = op.user_id
ON CONFLICT (owner_organizer_id) DO NOTHING;

INSERT INTO organizer_team_members (id, team_id, user_id, role, status)
SELECT
    'otm_' || MD5(ot.id || ':' || ot.owner_organizer_id),
    ot.id,
    ot.owner_organizer_id,
    'ADMIN',
    'ACTIVE'
FROM organizer_teams ot
ON CONFLICT (team_id, user_id) DO NOTHING;

INSERT INTO organizer_team_member_permissions (member_id, permission)
SELECT otm.id, permission
FROM organizer_team_members otm
CROSS JOIN UNNEST(ARRAY[
    'SCAN_TICKETS',
    'VIEW_CHECKIN_REPORTS',
    'MANAGE_TEAM',
    'MANAGE_SEATMAP',
    'VIEW_ORDERS',
    'SEND_CUSTOMER_EMAIL',
    'EXPORT_ORDER_REPORTS',
    'VIEW_REVENUE',
    'VIEW_ANALYTICS',
    'MARKETING_OPERATIONS',
    'MANAGE_VOUCHERS',
    'EDIT_EVENT'
]) AS permission
WHERE otm.role = 'ADMIN'
ON CONFLICT DO NOTHING;
