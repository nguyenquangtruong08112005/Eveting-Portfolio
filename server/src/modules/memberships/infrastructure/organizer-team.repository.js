const { query, transaction } = require('@/providers/database/postgres.client');
const { randomUUID } = require('crypto');

function clientFor(tx) {
    return tx && typeof tx.query === 'function' ? tx : { query };
}

async function isPrimaryOrganizer(userId) {
    const result = await query(
        'SELECT 1 FROM organizer_profiles WHERE user_id = $1 LIMIT 1',
        [userId]
    );
    return result.rows.length > 0;
}

async function ensureTeamForOwner(ownerOrganizerId, name) {
    return transaction(async (tx) => {
        const teamResult = await tx.query(
            `INSERT INTO organizer_teams (id, owner_organizer_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (owner_organizer_id) DO UPDATE
             SET name = CASE
                 WHEN organizer_teams.name = 'Organizer team' THEN EXCLUDED.name
                 ELSE organizer_teams.name
             END,
             updated_at = NOW()
             RETURNING id, owner_organizer_id, name, created_at, updated_at`,
            [`oteam_${randomUUID()}`, ownerOrganizerId, name || 'Organizer team']
        );
        const team = teamResult.rows[0];
        const memberResult = await tx.query(
            `INSERT INTO organizer_team_members (id, team_id, user_id, role, status)
             VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE')
             ON CONFLICT (team_id, user_id) DO UPDATE
             SET role = 'ADMIN', status = 'ACTIVE', updated_at = NOW()
             RETURNING id`,
            [`otm_${randomUUID()}`, team.id, ownerOrganizerId]
        );
        return { team, ownerMemberId: memberResult.rows[0].id };
    });
}

async function grantPermissions(memberId, permissions, tx = null) {
    const client = clientFor(tx);
    await client.query(
        'DELETE FROM organizer_team_member_permissions WHERE member_id = $1',
        [memberId]
    );
    if (!permissions.length) return;
    await client.query(
        `INSERT INTO organizer_team_member_permissions (member_id, permission)
         SELECT $1, UNNEST($2::text[])`,
        [memberId, permissions]
    );
}

async function replaceScopes(memberId, scopes, tx = null) {
    const client = clientFor(tx);
    await client.query(
        'DELETE FROM organizer_team_member_scopes WHERE member_id = $1',
        [memberId]
    );
    for (const scope of scopes) {
        await client.query(
            `INSERT INTO organizer_team_member_scopes (
                id, member_id, event_id, performance_id, ticket_type_id
             ) VALUES ($1, $2, $3, $4, $5)`,
            [
                `otms_${randomUUID()}`,
                memberId,
                scope.eventId,
                scope.performanceId || null,
                scope.ticketTypeId || null,
            ]
        );
    }
}

async function getTeamForOwner(ownerOrganizerId) {
    const result = await query(
        `SELECT id, owner_organizer_id AS "ownerOrganizerId", name, created_at AS "createdAt"
         FROM organizer_teams
         WHERE owner_organizer_id = $1`,
        [ownerOrganizerId]
    );
    return result.rows[0] || null;
}

async function getTeamById(teamId) {
    const result = await query(
        `SELECT id, owner_organizer_id AS "ownerOrganizerId", name, created_at AS "createdAt"
         FROM organizer_teams
         WHERE id = $1`,
        [teamId]
    );
    return result.rows[0] || null;
}

async function getEventAccess(eventId, userId, tx = null) {
    const client = clientFor(tx);
    const result = await client.query(
        `SELECT
            e.id AS event_id,
            e.organizer_id AS owner_organizer_id,
            ot.id AS team_id,
            otm.id AS member_id,
            otm.role,
            otm.status,
            COALESCE(
                ARRAY_AGG(otmp.permission) FILTER (WHERE otmp.permission IS NOT NULL),
                '{}'::text[]
            ) AS permissions
         FROM events e
         LEFT JOIN organizer_teams ot
            ON ot.owner_organizer_id = e.organizer_id
         LEFT JOIN organizer_team_members otm
            ON otm.team_id = ot.id
           AND otm.user_id = $2
           AND otm.status = 'ACTIVE'
         LEFT JOIN organizer_team_member_permissions otmp
            ON otmp.member_id = otm.id
         WHERE e.id = $1
           AND e.deleted_at IS NULL
         GROUP BY e.id, e.organizer_id, ot.id, otm.id, otm.role, otm.status`,
        [eventId, userId]
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    let scopes = [];
    if (row.member_id) {
        const scopeResult = await client.query(
            `SELECT
                event_id AS "eventId",
                performance_id AS "performanceId",
                ticket_type_id AS "ticketTypeId"
             FROM organizer_team_member_scopes
             WHERE member_id = $1`,
            [row.member_id]
        );
        scopes = scopeResult.rows;
    }
    return {
        eventId: row.event_id,
        ownerOrganizerId: row.owner_organizer_id,
        teamId: row.team_id,
        memberId: row.member_id,
        role: row.role,
        status: row.status,
        permissions: row.permissions || [],
        scopes,
    };
}

async function getTeamAccess(teamId, userId) {
    const result = await query(
        `SELECT
            ot.id AS team_id,
            ot.owner_organizer_id,
            otm.id AS member_id,
            otm.role,
            otm.status,
            COALESCE(
                ARRAY_AGG(otmp.permission) FILTER (WHERE otmp.permission IS NOT NULL),
                '{}'::text[]
            ) AS permissions
         FROM organizer_teams ot
         LEFT JOIN organizer_team_members otm
            ON otm.team_id = ot.id
           AND otm.user_id = $2
           AND otm.status = 'ACTIVE'
         LEFT JOIN organizer_team_member_permissions otmp
            ON otmp.member_id = otm.id
         WHERE ot.id = $1
         GROUP BY ot.id, ot.owner_organizer_id, otm.id, otm.role, otm.status`,
        [teamId, userId]
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
        teamId: row.team_id,
        ownerOrganizerId: row.owner_organizer_id,
        memberId: row.member_id,
        role: row.role,
        status: row.status,
        permissions: row.permissions || [],
    };
}

async function listUserTeams(userId) {
    const result = await query(
        `SELECT
            ot.id,
            ot.name,
            ot.owner_organizer_id AS "ownerOrganizerId",
            otm.id AS "memberId",
            CASE WHEN ot.owner_organizer_id = $1 THEN 'ADMIN' ELSE otm.role END AS role,
            CASE WHEN ot.owner_organizer_id = $1 THEN true ELSE false END AS "isOwner",
            COALESCE(
                ARRAY_AGG(otmp.permission) FILTER (WHERE otmp.permission IS NOT NULL),
                '{}'::text[]
            ) AS permissions
         FROM organizer_teams ot
         LEFT JOIN organizer_team_members otm
            ON otm.team_id = ot.id
           AND otm.user_id = $1
           AND otm.status = 'ACTIVE'
         LEFT JOIN organizer_team_member_permissions otmp
            ON otmp.member_id = otm.id
         WHERE ot.owner_organizer_id = $1 OR otm.id IS NOT NULL
         GROUP BY ot.id, ot.name, ot.owner_organizer_id, otm.id, otm.role
         ORDER BY ot.name, ot.id`,
        [userId]
    );
    return result.rows;
}

async function listTeamMembers(teamId) {
    const result = await query(
        `SELECT
            otm.id,
            otm.team_id AS "teamId",
            otm.user_id AS "userId",
            au.email,
            COALESCE(NULLIF(up.name, ''), au.email) AS name,
            otm.role,
            otm.status,
            otm.joined_at AS "joinedAt",
            COALESCE(
                ARRAY_AGG(DISTINCT otmp.permission)
                    FILTER (WHERE otmp.permission IS NOT NULL),
                '{}'::text[]
            ) AS permissions
         FROM organizer_team_members otm
         JOIN auth_users au ON au.id = otm.user_id
         LEFT JOIN user_profiles up ON up.id = otm.user_id
         LEFT JOIN organizer_team_member_permissions otmp ON otmp.member_id = otm.id
         WHERE otm.team_id = $1
         GROUP BY otm.id, au.email, up.name
         ORDER BY otm.joined_at, otm.id`,
        [teamId]
    );
    const members = result.rows;
    for (const member of members) {
        const scopes = await query(
            `SELECT
                event_id AS "eventId",
                performance_id AS "performanceId",
                ticket_type_id AS "ticketTypeId"
             FROM organizer_team_member_scopes
             WHERE member_id = $1
             ORDER BY event_id, performance_id NULLS FIRST, ticket_type_id NULLS FIRST`,
            [member.id]
        );
        member.scopes = scopes.rows;
    }
    return members;
}

async function findUserByEmail(email) {
    const result = await query(
        `SELECT
            au.id,
            au.email,
            COALESCE(NULLIF(up.name, ''), au.email) AS name
         FROM auth_users au
         LEFT JOIN user_profiles up ON up.id = au.id
         WHERE LOWER(au.email) = LOWER($1)
           AND au.is_active = true
           AND au.deleted_at IS NULL`,
        [email]
    );
    return result.rows[0] || null;
}

async function findUserById(userId) {
    const result = await query(
        `SELECT
            au.id,
            au.email,
            COALESCE(NULLIF(up.name, ''), au.email) AS name
         FROM auth_users au
         LEFT JOIN user_profiles up ON up.id = au.id
         WHERE au.id = $1
           AND au.is_active = true
           AND au.deleted_at IS NULL`,
        [userId]
    );
    return result.rows[0] || null;
}

async function createInvitation(invitation) {
    const result = await query(
        `INSERT INTO organizer_team_invitations (
            id, team_id, email, token_hash, role, permissions, scopes,
            invited_by, expires_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, team_id AS "teamId", email, role, permissions,
            scopes, status, expires_at AS "expiresAt", created_at AS "createdAt"`,
        [
            invitation.id,
            invitation.teamId,
            invitation.email,
            invitation.tokenHash,
            invitation.role,
            invitation.permissions,
            JSON.stringify(invitation.scopes),
            invitation.invitedBy,
            invitation.expiresAt,
        ]
    );
    return result.rows[0];
}

async function acceptInvitation(tokenHash, userId, expectedEmail) {
    return transaction(async (tx) => {
        const invitationResult = await tx.query(
            `SELECT *
             FROM organizer_team_invitations
             WHERE token_hash = $1
             FOR UPDATE`,
            [tokenHash]
        );
        const invitation = invitationResult.rows[0];
        if (!invitation) return { state: 'NOT_FOUND' };
        if (invitation.status !== 'PENDING') return { state: invitation.status };
        if (new Date(invitation.expires_at).getTime() <= Date.now()) {
            await tx.query(
                `UPDATE organizer_team_invitations
                 SET status = 'EXPIRED'
                 WHERE id = $1`,
                [invitation.id]
            );
            return { state: 'EXPIRED' };
        }
        if (invitation.email.toLowerCase() !== expectedEmail.toLowerCase()) {
            return { state: 'EMAIL_MISMATCH' };
        }

        const memberResult = await tx.query(
            `INSERT INTO organizer_team_members (
                id, team_id, user_id, role, status, invited_by
             ) VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
             ON CONFLICT (team_id, user_id) DO UPDATE
             SET role = EXCLUDED.role,
                 status = 'ACTIVE',
                 invited_by = EXCLUDED.invited_by,
                 updated_at = NOW()
             RETURNING id, team_id AS "teamId", user_id AS "userId", role, status`,
            [
                `otm_${randomUUID()}`,
                invitation.team_id,
                userId,
                invitation.role,
                invitation.invited_by,
            ]
        );
        const member = memberResult.rows[0];
        await grantPermissions(member.id, invitation.permissions || [], tx);
        await replaceScopes(member.id, invitation.scopes || [], tx);
        await tx.query(
            `UPDATE organizer_team_invitations
             SET status = 'ACCEPTED', accepted_at = NOW()
             WHERE id = $1`,
            [invitation.id]
        );
        return { state: 'ACCEPTED', member };
    });
}

async function getMemberById(memberId) {
    const result = await query(
        `SELECT
            otm.id,
            otm.team_id AS "teamId",
            otm.user_id AS "userId",
            otm.role,
            otm.status,
            ot.owner_organizer_id AS "ownerOrganizerId",
            COALESCE(
                (
                    SELECT ARRAY_AGG(otmp.permission ORDER BY otmp.permission)
                    FROM organizer_team_member_permissions otmp
                    WHERE otmp.member_id = otm.id
                ),
                '{}'::text[]
            ) AS permissions
         FROM organizer_team_members otm
         JOIN organizer_teams ot ON ot.id = otm.team_id
         WHERE otm.id = $1`,
        [memberId]
    );
    const member = result.rows[0] || null;
    if (!member) return null;
    const scopeResult = await query(
        `SELECT
            event_id AS "eventId",
            performance_id AS "performanceId",
            ticket_type_id AS "ticketTypeId"
         FROM organizer_team_member_scopes
         WHERE member_id = $1`,
        [memberId]
    );
    member.scopes = scopeResult.rows;
    return member;
}

async function updateMember(memberId, role, status, permissions, scopes) {
    return transaction(async (tx) => {
        const result = await tx.query(
            `UPDATE organizer_team_members
             SET role = $2, status = $3, updated_at = NOW()
             WHERE id = $1
             RETURNING id, team_id AS "teamId", user_id AS "userId", role, status`,
            [memberId, role, status]
        );
        if (!result.rows.length) return null;
        await grantPermissions(memberId, permissions, tx);
        await replaceScopes(memberId, scopes, tx);
        return result.rows[0];
    });
}

async function removeMember(memberId) {
    const result = await query(
        'DELETE FROM organizer_team_members WHERE id = $1 RETURNING id',
        [memberId]
    );
    return result.rows.length > 0;
}

async function assertScopeEventsBelongToTeam(teamId, eventIds) {
    if (!eventIds.length) return true;
    const result = await query(
        `SELECT COUNT(DISTINCT e.id)::int AS count
         FROM events e
         JOIN organizer_teams ot ON ot.owner_organizer_id = e.organizer_id
         WHERE ot.id = $1
           AND e.id = ANY($2::text[])
           AND e.deleted_at IS NULL`,
        [teamId, eventIds]
    );
    return result.rows[0].count === new Set(eventIds).size;
}

module.exports = {
    isPrimaryOrganizer,
    ensureTeamForOwner,
    getTeamForOwner,
    getTeamById,
    getEventAccess,
    getTeamAccess,
    listUserTeams,
    listTeamMembers,
    findUserByEmail,
    findUserById,
    createInvitation,
    acceptInvitation,
    getMemberById,
    updateMember,
    removeMember,
    assertScopeEventsBelongToTeam,
};
