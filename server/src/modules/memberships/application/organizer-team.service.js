const crypto = require('crypto');
const { randomUUID } = require('crypto');
const teamRepository = require('@/modules/memberships/infrastructure/organizer-team.repository');
const eventPublisher = require('@/shared/events/event-publisher');
const logger = require('@/shared/logger');
const {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
} = require('@/shared/errors');
const {
    ALL_PERMISSIONS,
    ROLE_PERMISSIONS,
} = require('@/modules/memberships/domain/organizer-permissions');

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeRole(role) {
    const normalized = String(role || '').trim().toUpperCase();
    if (!ROLE_PERMISSIONS[normalized]) {
        throw new BadRequestError('role must be ADMIN, MANAGER, or CHECK_IN_STAFF');
    }
    return normalized;
}

function normalizePermissions(role, requestedPermissions) {
    const allowed = ROLE_PERMISSIONS[role];
    const requested = requestedPermissions === undefined ? allowed : requestedPermissions;
    if (!Array.isArray(requested)) {
        throw new BadRequestError('permissions must be an array');
    }
    const permissions = [...new Set(requested.map((value) => String(value).trim().toUpperCase()))];
    const invalid = permissions.filter(
        (permission) => !ALL_PERMISSIONS.includes(permission) || !allowed.includes(permission)
    );
    if (invalid.length) {
        throw new BadRequestError(`permissions are not allowed for ${role}: ${invalid.join(', ')}`);
    }
    return permissions;
}

function normalizeScopes(scopes) {
    if (scopes === undefined) return [];
    if (!Array.isArray(scopes)) throw new BadRequestError('scopes must be an array');
    return scopes.map((scope) => {
        if (!scope || typeof scope !== 'object' || !scope.eventId) {
            throw new BadRequestError('each scope requires eventId');
        }
        return {
            eventId: String(scope.eventId),
            performanceId: scope.performanceId ? String(scope.performanceId) : null,
            ticketTypeId: scope.ticketTypeId ? String(scope.ticketTypeId) : null,
        };
    });
}

function requireCheckInScopes(role, scopes) {
    if (role === 'CHECK_IN_STAFF' && scopes.length === 0) {
        throw new BadRequestError('CHECK_IN_STAFF requires at least one event scope');
    }
}

function scopeMatches(scope, eventId, context) {
    if (scope.eventId !== eventId) return false;
    if (
        context.performanceId &&
        scope.performanceId &&
        scope.performanceId !== context.performanceId
    ) {
        return false;
    }
    if (
        context.ticketTypeId &&
        scope.ticketTypeId &&
        scope.ticketTypeId !== context.ticketTypeId
    ) {
        return false;
    }
    return true;
}

async function requirePrimaryOrganizer(userId) {
    if (!(await teamRepository.isPrimaryOrganizer(userId))) {
        throw new ForbiddenError('Primary organizer access is required');
    }
    return true;
}

async function ensureOrganizerTeam(ownerOrganizerId, name) {
    const result = await teamRepository.ensureTeamForOwner(ownerOrganizerId, name);
    return result.team;
}

async function authorizeEventPermission(
    userId,
    eventId,
    permission,
    context = {},
    tx = null
) {
    if (!ALL_PERMISSIONS.includes(permission)) {
        throw new BadRequestError(`Unknown organizer permission: ${permission}`);
    }
    const access = await teamRepository.getEventAccess(eventId, userId, tx);
    if (!access) throw new NotFoundError('Event not found');

    if (access.ownerOrganizerId === userId) {
        return { ...access, role: 'ADMIN', permissions: ALL_PERMISSIONS, isOwner: true };
    }
    if (!access.memberId || !access.permissions.includes(permission)) {
        logger.warn('Organizer team permission denied', {
            userId,
            eventId,
            teamId: access.teamId,
            permission,
        });
        throw new ForbiddenError(`Organizer team permission required: ${permission}`);
    }
    if (access.role === 'CHECK_IN_STAFF') {
        const hasScope = access.scopes.some((scope) => scopeMatches(scope, eventId, context));
        if (!hasScope) {
            throw new ForbiddenError('Check-in staff is not assigned to this event or ticket type');
        }
    }
    return { ...access, isOwner: false };
}

async function authorizeTeamPermission(userId, teamId, permission) {
    const access = await teamRepository.getTeamAccess(teamId, userId);
    if (!access) throw new NotFoundError('Organizer team not found');
    if (access.ownerOrganizerId === userId) {
        return { ...access, role: 'ADMIN', permissions: ALL_PERMISSIONS, isOwner: true };
    }
    if (!access.memberId || !access.permissions.includes(permission)) {
        throw new ForbiddenError(`Organizer team permission required: ${permission}`);
    }
    return { ...access, isOwner: false };
}

async function resolveManagedTeam(userId, requestedTeamId) {
    if (requestedTeamId) return requestedTeamId;
    const team = await teamRepository.getTeamForOwner(userId);
    if (!team) throw new BadRequestError('teamId is required for non-owner team access');
    return team.id;
}

async function listUserTeams(userId) {
    const teams = await teamRepository.listUserTeams(userId);
    return teams.map((team) => (
        team.isOwner ? { ...team, permissions: ALL_PERMISSIONS } : team
    ));
}

async function listTeamMembers(userId, requestedTeamId) {
    const teamId = await resolveManagedTeam(userId, requestedTeamId);
    await authorizeTeamPermission(userId, teamId, 'MANAGE_TEAM');
    return teamRepository.listTeamMembers(teamId);
}

async function validateScopeOwnership(teamId, scopes) {
    const valid = await teamRepository.assertScopeEventsBelongToTeam(
        teamId,
        scopes.map((scope) => scope.eventId)
    );
    if (!valid) throw new ForbiddenError('One or more scopes belong to another organizer team');
}

async function inviteMember(userId, input) {
    const teamId = await resolveManagedTeam(userId, input.teamId);
    await authorizeTeamPermission(userId, teamId, 'MANAGE_TEAM');
    const team = await teamRepository.getTeamById(teamId);
    const role = normalizeRole(input.role);
    const permissions = normalizePermissions(
        role,
        input.permissions
    );
    const scopes = normalizeScopes(input.scopes);
    requireCheckInScopes(role, scopes);
    await validateScopeOwnership(teamId, scopes);

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await teamRepository.createInvitation({
        id: `oti_${randomUUID()}`,
        teamId,
        email: String(input.email).trim().toLowerCase(),
        tokenHash,
        role,
        permissions,
        scopes,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    });

    const publicWebUrl = String(process.env.APP_PUBLIC_WEB_URL || '').replace(/\/+$/, '');
    const acceptUrl = `${publicWebUrl}/organizer/team/invitations/accept?token=${encodeURIComponent(token)}`;
    await eventPublisher.publish('notification', {
        channel: 'email',
        target: invitation.email,
        title: `Invitation to ${team.name}`,
        body: `You were invited as ${role}. Accept the invitation: ${acceptUrl}`,
        data: { invitationId: invitation.id, teamId },
    });

    return {
        ...invitation,
        ...(process.env.NODE_ENV === 'production' ? {} : { invitationToken: token }),
    };
}

async function acceptInvitation(userId, token) {
    const user = await teamRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await teamRepository.acceptInvitation(tokenHash, userId, user.email);
    if (result.state === 'NOT_FOUND') throw new NotFoundError('Invitation not found');
    if (result.state === 'EMAIL_MISMATCH') {
        throw new ForbiddenError('Invitation email does not match the authenticated user');
    }
    if (result.state === 'EXPIRED') throw new BadRequestError('Invitation has expired');
    if (result.state !== 'ACCEPTED') {
        throw new ConflictError(`Invitation is already ${result.state.toLowerCase()}`);
    }
    return result.member;
}

async function updateMember(userId, memberId, input) {
    const member = await teamRepository.getMemberById(memberId);
    if (!member) throw new NotFoundError('Team member not found');
    await authorizeTeamPermission(userId, member.teamId, 'MANAGE_TEAM');
    if (member.userId === member.ownerOrganizerId) {
        throw new ForbiddenError('The primary organizer membership cannot be changed');
    }
    const role = normalizeRole(input.role || member.role);
    const permissions = normalizePermissions(
        role,
        input.permissions === undefined ? member.permissions : input.permissions
    );
    const scopes = normalizeScopes(
        input.scopes === undefined ? member.scopes : input.scopes
    );
    const status = String(input.status || member.status).toUpperCase();
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
        throw new BadRequestError('status must be ACTIVE or SUSPENDED');
    }
    requireCheckInScopes(role, scopes);
    await validateScopeOwnership(member.teamId, scopes);
    return teamRepository.updateMember(memberId, role, status, permissions, scopes);
}

async function removeMember(userId, memberId) {
    const member = await teamRepository.getMemberById(memberId);
    if (!member) throw new NotFoundError('Team member not found');
    await authorizeTeamPermission(userId, member.teamId, 'MANAGE_TEAM');
    if (member.userId === member.ownerOrganizerId) {
        throw new ForbiddenError('The primary organizer membership cannot be removed');
    }
    await teamRepository.removeMember(memberId);
    return { removed: true };
}

module.exports = {
    requirePrimaryOrganizer,
    ensureOrganizerTeam,
    authorizeEventPermission,
    authorizeTeamPermission,
    listUserTeams,
    listTeamMembers,
    inviteMember,
    acceptInvitation,
    updateMember,
    removeMember,
    normalizePermissions,
    normalizeScopes,
};
