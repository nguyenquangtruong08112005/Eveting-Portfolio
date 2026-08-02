/* eslint-env jest */
const crypto = require('crypto');
const {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
} = require('@/shared/errors');
const { ALL_PERMISSIONS } = require('@/modules/memberships/domain/organizer-permissions');

const mockRepo = {
    isPrimaryOrganizer: jest.fn(),
    ensureTeamForOwner: jest.fn(),
    getEventAccess: jest.fn(),
    getTeamAccess: jest.fn(),
    getTeamForOwner: jest.fn(),
    getTeamById: jest.fn(),
    listUserTeams: jest.fn(),
    listTeamMembers: jest.fn(),
    createInvitation: jest.fn(),
    findUserById: jest.fn(),
    acceptInvitation: jest.fn(),
    getMemberById: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
    assertScopeEventsBelongToTeam: jest.fn(),
};

const mockPublisher = { publish: jest.fn() };
const mockLogger = { warn: jest.fn() };

jest.mock('@/modules/memberships/infrastructure/organizer-team.repository', () => mockRepo);
jest.mock('@/shared/events/event-publisher', () => mockPublisher);
jest.mock('@/shared/logger', () => mockLogger);

const TOKEN_BUFFER = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const TOKEN = TOKEN_BUFFER.toString('base64url');
const TOKEN_HASH = crypto.createHash('sha256').update(TOKEN).digest('hex');

const USER_ID = 'user_member';
const OWNER_ID = 'user_owner';
const TEAM_ID = 'team_1';
const MEMBER_ID = 'otm_1';
const EVENT_ID = 'evt_1';
const EMAIL = 'member@example.com';

const OWNER_ACCESS = {
    eventId: EVENT_ID,
    ownerOrganizerId: OWNER_ID,
    teamId: TEAM_ID,
    memberId: null,
    role: null,
    status: null,
    permissions: [],
    scopes: [],
};

const MANAGER_ACCESS = {
    eventId: EVENT_ID,
    ownerOrganizerId: OWNER_ID,
    teamId: TEAM_ID,
    memberId: MEMBER_ID,
    role: 'MANAGER',
    status: 'ACTIVE',
    permissions: ['MANAGE_TEAM', 'VIEW_ORDERS'],
    scopes: [],
};

const STAFF_ACCESS = {
    eventId: EVENT_ID,
    ownerOrganizerId: OWNER_ID,
    teamId: TEAM_ID,
    memberId: 'otm_staff',
    role: 'CHECK_IN_STAFF',
    status: 'ACTIVE',
    permissions: ['SCAN_TICKETS'],
    scopes: [{ eventId: EVENT_ID, performanceId: 'perf_1', ticketTypeId: 'tt_1' }],
};

let cryptoBytesSpy;
let cryptoUUIDSpy;
let service;

beforeAll(() => {
    cryptoBytesSpy = jest.spyOn(crypto, 'randomBytes').mockReturnValue(TOKEN_BUFFER);
    cryptoUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('fixed-uuid');
    service = require('@/modules/memberships/application/organizer-team.service');
});

afterAll(() => {
    cryptoBytesSpy.mockRestore();
    cryptoUUIDSpy.mockRestore();
});

beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.getTeamById.mockResolvedValue({ id: TEAM_ID, name: 'Test Team' });
    mockRepo.getTeamForOwner.mockResolvedValue({ id: TEAM_ID, ownerOrganizerId: OWNER_ID, name: 'Owner Team' });
    mockRepo.assertScopeEventsBelongToTeam.mockResolvedValue(true);
});

describe('requirePrimaryOrganizer', () => {
    it('resolves when the user owns an organizer profile', async () => {
        mockRepo.isPrimaryOrganizer.mockResolvedValue(true);
        await expect(service.requirePrimaryOrganizer(USER_ID)).resolves.toBe(true);
        expect(mockRepo.isPrimaryOrganizer).toHaveBeenCalledWith(USER_ID);
    });

    it('throws ForbiddenError when the user is not a primary organizer', async () => {
        mockRepo.isPrimaryOrganizer.mockResolvedValue(false);
        await expect(service.requirePrimaryOrganizer(USER_ID))
            .rejects.toThrow(ForbiddenError);
        await expect(service.requirePrimaryOrganizer(USER_ID))
            .rejects.toThrow('Primary organizer access is required');
    });
});

describe('ensureOrganizerTeam', () => {
    it('returns the team from ensureTeamForOwner with the given name', async () => {
        const team = { id: TEAM_ID, name: 'Custom Team' };
        mockRepo.ensureTeamForOwner.mockResolvedValue({ team, ownerMemberId: 'otm_owner' });
        await expect(service.ensureOrganizerTeam(OWNER_ID, 'Custom Team')).resolves.toBe(team);
        expect(mockRepo.ensureTeamForOwner).toHaveBeenCalledWith(OWNER_ID, 'Custom Team');
    });
});

describe('authorizeEventPermission', () => {
    it('throws BadRequestError for an unknown permission', async () => {
        await expect(service.authorizeEventPermission(USER_ID, EVENT_ID, 'NOT_A_PERMISSION'))
            .rejects.toThrow(BadRequestError);
        await expect(service.authorizeEventPermission(USER_ID, EVENT_ID, 'NOT_A_PERMISSION'))
            .rejects.toThrow('Unknown organizer permission');
        expect(mockRepo.getEventAccess).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when the event is not found', async () => {
        mockRepo.getEventAccess.mockResolvedValue(null);
        await expect(service.authorizeEventPermission(USER_ID, EVENT_ID, 'VIEW_ORDERS'))
            .rejects.toThrow(NotFoundError);
        await expect(service.authorizeEventPermission(USER_ID, EVENT_ID, 'VIEW_ORDERS'))
            .rejects.toThrow('Event not found');
    });

    it('returns isOwner true with ADMIN role and all permissions for the owner', async () => {
        mockRepo.getEventAccess.mockResolvedValue(OWNER_ACCESS);
        const result = await service.authorizeEventPermission(OWNER_ID, EVENT_ID, 'MANAGE_TEAM');
        expect(result).toMatchObject({
            eventId: EVENT_ID,
            ownerOrganizerId: OWNER_ID,
            teamId: TEAM_ID,
            memberId: null,
            role: 'ADMIN',
            isOwner: true,
        });
        expect(result.permissions).toEqual(ALL_PERMISSIONS);
    });

    it('throws ForbiddenError and logs when the member lacks the permission', async () => {
        mockRepo.getEventAccess.mockResolvedValue({
            ...MANAGER_ACCESS,
            permissions: ['VIEW_ORDERS'],
        });
        await expect(service.authorizeEventPermission(USER_ID, EVENT_ID, 'MANAGE_TEAM'))
            .rejects.toThrow(ForbiddenError);
        await expect(service.authorizeEventPermission(USER_ID, EVENT_ID, 'MANAGE_TEAM'))
            .rejects.toThrow('Organizer team permission required: MANAGE_TEAM');
        expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('throws ForbiddenError when the user is not a member at all', async () => {
        mockRepo.getEventAccess.mockResolvedValue(OWNER_ACCESS);
        await expect(service.authorizeEventPermission(USER_ID, EVENT_ID, 'VIEW_ORDERS'))
            .rejects.toThrow(ForbiddenError);
    });

    it('returns isOwner false for a member with the permission', async () => {
        mockRepo.getEventAccess.mockResolvedValue(MANAGER_ACCESS);
        const result = await service.authorizeEventPermission(USER_ID, EVENT_ID, 'VIEW_ORDERS');
        expect(result).toMatchObject({ ...MANAGER_ACCESS, isOwner: false });
    });

    it('forwards the transaction to getEventAccess when provided', async () => {
        mockRepo.getEventAccess.mockResolvedValue(MANAGER_ACCESS);
        const tx = { query: jest.fn() };
        await service.authorizeEventPermission(USER_ID, EVENT_ID, 'VIEW_ORDERS', {}, tx);
        expect(mockRepo.getEventAccess).toHaveBeenCalledWith(EVENT_ID, USER_ID, tx);
    });

    describe('CHECK_IN_STAFF scope matching', () => {
        it('allows when a scope matches the context', async () => {
            mockRepo.getEventAccess.mockResolvedValue(STAFF_ACCESS);
            const result = await service.authorizeEventPermission(
                USER_ID, EVENT_ID, 'SCAN_TICKETS',
                { performanceId: 'perf_1', ticketTypeId: 'tt_1' }
            );
            expect(result.isOwner).toBe(false);
        });

        it('allows when context has narrower constraints than the scope', async () => {
            mockRepo.getEventAccess.mockResolvedValue(STAFF_ACCESS);
            const result = await service.authorizeEventPermission(
                USER_ID, EVENT_ID, 'SCAN_TICKETS',
                { performanceId: 'perf_1' }
            );
            expect(result.isOwner).toBe(false);
        });

        it('allows when context has constraints but the scope is event-wide', async () => {
            mockRepo.getEventAccess.mockResolvedValue({
                ...STAFF_ACCESS,
                scopes: [{ eventId: EVENT_ID, performanceId: null, ticketTypeId: null }],
            });
            const result = await service.authorizeEventPermission(
                USER_ID, EVENT_ID, 'SCAN_TICKETS',
                { performanceId: 'perf_1', ticketTypeId: 'tt_1' }
            );
            expect(result.isOwner).toBe(false);
        });

        it('rejects when context performanceId does not match the scope', async () => {
            mockRepo.getEventAccess.mockResolvedValue(STAFF_ACCESS);
            await expect(service.authorizeEventPermission(
                USER_ID, EVENT_ID, 'SCAN_TICKETS',
                { performanceId: 'perf_other' }
            )).rejects.toThrow(ForbiddenError);
            await expect(service.authorizeEventPermission(
                USER_ID, EVENT_ID, 'SCAN_TICKETS',
                { performanceId: 'perf_other' }
            )).rejects.toThrow('Check-in staff is not assigned to this event or ticket type');
        });

        it('rejects when context ticketTypeId does not match the scope', async () => {
            mockRepo.getEventAccess.mockResolvedValue(STAFF_ACCESS);
            await expect(service.authorizeEventPermission(
                USER_ID, EVENT_ID, 'SCAN_TICKETS',
                { ticketTypeId: 'tt_other' }
            )).rejects.toThrow(ForbiddenError);
        });

        it('rejects when no scope matches the event at all', async () => {
            mockRepo.getEventAccess.mockResolvedValue({
                ...STAFF_ACCESS,
                scopes: [{ eventId: 'evt_other', performanceId: null, ticketTypeId: null }],
            });
            await expect(service.authorizeEventPermission(
                USER_ID, EVENT_ID, 'SCAN_TICKETS', {}
            )).rejects.toThrow(ForbiddenError);
        });

        it('rejects a staff member with no scopes', async () => {
            mockRepo.getEventAccess.mockResolvedValue({ ...STAFF_ACCESS, scopes: [] });
            await expect(service.authorizeEventPermission(
                USER_ID, EVENT_ID, 'SCAN_TICKETS', {}
            )).rejects.toThrow(ForbiddenError);
        });
    });
});

describe('authorizeTeamPermission', () => {
    it('throws NotFoundError when the team is not found', async () => {
        mockRepo.getTeamAccess.mockResolvedValue(null);
        await expect(service.authorizeTeamPermission(USER_ID, TEAM_ID, 'MANAGE_TEAM'))
            .rejects.toThrow(NotFoundError);
        await expect(service.authorizeTeamPermission(USER_ID, TEAM_ID, 'MANAGE_TEAM'))
            .rejects.toThrow('Organizer team not found');
    });

    it('returns isOwner true with ADMIN role for the team owner', async () => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: null,
            permissions: [],
        });
        const result = await service.authorizeTeamPermission(OWNER_ID, TEAM_ID, 'MANAGE_TEAM');
        expect(result).toMatchObject({ role: 'ADMIN', isOwner: true });
        expect(result.permissions).toEqual(ALL_PERMISSIONS);
    });

    it('returns isOwner false for a member with the permission', async () => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['MANAGE_TEAM'],
        });
        const result = await service.authorizeTeamPermission(USER_ID, TEAM_ID, 'MANAGE_TEAM');
        expect(result).toMatchObject({ isOwner: false });
    });

    it('throws ForbiddenError when the member lacks the permission', async () => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['VIEW_ORDERS'],
        });
        await expect(service.authorizeTeamPermission(USER_ID, TEAM_ID, 'MANAGE_TEAM'))
            .rejects.toThrow(ForbiddenError);
    });

    it('throws ForbiddenError when the user is not a member', async () => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: null,
            permissions: [],
        });
        await expect(service.authorizeTeamPermission(USER_ID, TEAM_ID, 'MANAGE_TEAM'))
            .rejects.toThrow(ForbiddenError);
    });
});

describe('listUserTeams', () => {
    it('grants all permissions to owned teams', async () => {
        mockRepo.listUserTeams.mockResolvedValue([
            { id: 'team_owner', isOwner: true, permissions: [] },
            { id: 'team_member', isOwner: false, permissions: ['VIEW_ORDERS'] },
        ]);
        const result = await service.listUserTeams(USER_ID);
        expect(mockRepo.listUserTeams).toHaveBeenCalledWith(USER_ID);
        expect(result[0]).toMatchObject({ isOwner: true });
        expect(result[0].permissions).toEqual(ALL_PERMISSIONS);
        expect(result[1]).toEqual({ id: 'team_member', isOwner: false, permissions: ['VIEW_ORDERS'] });
    });
});

describe('listTeamMembers', () => {
    it('resolves the team, authorizes, and delegates', async () => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['MANAGE_TEAM'],
        });
        const members = [{ id: 'otm_1' }];
        mockRepo.listTeamMembers.mockResolvedValue(members);
        await expect(service.listTeamMembers(USER_ID, TEAM_ID)).resolves.toBe(members);
        expect(mockRepo.listTeamMembers).toHaveBeenCalledWith(TEAM_ID);
    });

    it('resolves the owned team when no teamId is requested', async () => {
        mockRepo.getTeamForOwner.mockResolvedValue({ id: TEAM_ID, ownerOrganizerId: OWNER_ID, name: 'Owner Team' });
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['MANAGE_TEAM'],
        });
        const members = [{ id: 'otm_1' }];
        mockRepo.listTeamMembers.mockResolvedValue(members);
        await expect(service.listTeamMembers(USER_ID, undefined)).resolves.toBe(members);
        expect(mockRepo.getTeamForOwner).toHaveBeenCalledWith(USER_ID);
        expect(mockRepo.listTeamMembers).toHaveBeenCalledWith(TEAM_ID);
    });

    it('throws ForbiddenError for a member without MANAGE_TEAM', async () => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['VIEW_ORDERS'],
        });
        await expect(service.listTeamMembers(USER_ID, TEAM_ID)).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError when no team is resolvable', async () => {
        mockRepo.getTeamForOwner.mockResolvedValue(null);
        await expect(service.listTeamMembers(USER_ID, undefined))
            .rejects.toThrow(BadRequestError);
    });
});

describe('inviteMember', () => {
    const VALID_INPUT = {
        teamId: TEAM_ID,
        email: `  ${EMAIL}  `,
        role: 'manager',
        permissions: ['view_orders', 'VIEW_ORDERS'],
        scopes: [],
    };

    beforeEach(() => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['MANAGE_TEAM'],
        });
    });

    it('throws ForbiddenError when the inviter cannot manage the team', async () => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: [],
        });
        await expect(service.inviteMember(USER_ID, VALID_INPUT))
            .rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError for an invalid role', async () => {
        await expect(service.inviteMember(USER_ID, { ...VALID_INPUT, role: 'intern' }))
            .rejects.toThrow(BadRequestError);
        await expect(service.inviteMember(USER_ID, { ...VALID_INPUT, role: 'intern' }))
            .rejects.toThrow('role must be ADMIN, MANAGER, or CHECK_IN_STAFF');
        expect(mockRepo.createInvitation).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when permissions is not an array', async () => {
        await expect(service.inviteMember(USER_ID, { ...VALID_INPUT, permissions: 'VIEW_ORDERS' }))
            .rejects.toThrow(BadRequestError);
        await expect(service.inviteMember(USER_ID, { ...VALID_INPUT, permissions: 'VIEW_ORDERS' }))
            .rejects.toThrow('permissions must be an array');
    });

    it('throws BadRequestError when a permission is not allowed for the role', async () => {
        await expect(service.inviteMember(USER_ID, {
            ...VALID_INPUT,
            role: 'CHECK_IN_STAFF',
            permissions: ['MANAGE_TEAM'],
        })).rejects.toThrow(BadRequestError);
        await expect(service.inviteMember(USER_ID, {
            ...VALID_INPUT,
            role: 'CHECK_IN_STAFF',
            permissions: ['MANAGE_TEAM'],
        })).rejects.toThrow('permissions are not allowed for CHECK_IN_STAFF: MANAGE_TEAM');
    });

    it('throws BadRequestError when scopes is not an array', async () => {
        await expect(service.inviteMember(USER_ID, { ...VALID_INPUT, scopes: 'all' }))
            .rejects.toThrow(BadRequestError);
        await expect(service.inviteMember(USER_ID, { ...VALID_INPUT, scopes: 'all' }))
            .rejects.toThrow('scopes must be an array');
    });

    it('throws BadRequestError when a scope lacks eventId', async () => {
        await expect(service.inviteMember(USER_ID, {
            ...VALID_INPUT,
            scopes: [{ performanceId: 'perf_1' }],
        })).rejects.toThrow(BadRequestError);
        await expect(service.inviteMember(USER_ID, {
            ...VALID_INPUT,
            scopes: [{ performanceId: 'perf_1' }],
        })).rejects.toThrow('each scope requires eventId');
    });

    it('throws BadRequestError when CHECK_IN_STAFF has no scopes', async () => {
        await expect(service.inviteMember(USER_ID, {
            ...VALID_INPUT,
            role: 'CHECK_IN_STAFF',
            permissions: undefined,
            scopes: [],
        })).rejects.toThrow(BadRequestError);
        await expect(service.inviteMember(USER_ID, {
            ...VALID_INPUT,
            role: 'CHECK_IN_STAFF',
            permissions: undefined,
            scopes: [],
        })).rejects.toThrow('CHECK_IN_STAFF requires at least one event scope');
    });

    it('throws ForbiddenError when a scope belongs to another team', async () => {
        mockRepo.assertScopeEventsBelongToTeam.mockResolvedValue(false);
        await expect(service.inviteMember(USER_ID, {
            ...VALID_INPUT,
            scopes: [{ eventId: EVENT_ID }],
        })).rejects.toThrow(ForbiddenError);
        await expect(service.inviteMember(USER_ID, {
            ...VALID_INPUT,
            scopes: [{ eventId: EVENT_ID }],
        })).rejects.toThrow('One or more scopes belong to another organizer team');
    });

    it('creates a normalized invitation and publishes a notification', async () => {
        mockRepo.createInvitation.mockImplementation((inv) => ({ id: 'oti_1', ...inv }));
        await service.inviteMember(USER_ID, VALID_INPUT);
        expect(mockRepo.getTeamAccess).toHaveBeenCalledWith(TEAM_ID, USER_ID);
        const created = mockRepo.createInvitation.mock.calls[0][0];
        expect(created).toMatchObject({
            id: 'oti_fixed-uuid',
            teamId: TEAM_ID,
            email: EMAIL,
            role: 'MANAGER',
            permissions: ['VIEW_ORDERS'],
            invitedBy: USER_ID,
        });
        expect(created.tokenHash).toBe(TOKEN_HASH);
        expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now());
        expect(created.expiresAt.getTime()).toBeLessThan(Date.now() + 8 * 24 * 60 * 60 * 1000);
        expect(mockPublisher.publish).toHaveBeenCalledWith('notification', expect.objectContaining({
            channel: 'email',
            target: EMAIL,
            title: 'Invitation to Test Team',
            data: { invitationId: 'oti_fixed-uuid', teamId: TEAM_ID },
        }));
    });

    it('returns the invitation token outside production', async () => {
        mockRepo.createInvitation.mockImplementation((inv) => ({ id: 'oti_1', ...inv }));
        const result = await service.inviteMember(USER_ID, VALID_INPUT);
        expect(result.invitationToken).toBe(TOKEN);
    });

    it('omits the invitation token and strips trailing slash in production', async () => {
        const originalNodeEnv = process.env.NODE_ENV;
        const originalUrl = process.env.APP_PUBLIC_WEB_URL;
        process.env.NODE_ENV = 'production';
        process.env.APP_PUBLIC_WEB_URL = 'https://app.example.com/';
        try {
            mockRepo.createInvitation.mockImplementation((inv) => ({ id: 'oti_1', ...inv }));
            const result = await service.inviteMember(USER_ID, VALID_INPUT);
            expect(result.invitationToken).toBeUndefined();
            const body = mockPublisher.publish.mock.calls[0][1].body;
            expect(body).toContain(
                `https://app.example.com/organizer/team/invitations/accept?token=${encodeURIComponent(TOKEN)}`
            );
        } finally {
            process.env.NODE_ENV = originalNodeEnv;
            process.env.APP_PUBLIC_WEB_URL = originalUrl;
        }
    });
});

describe('acceptInvitation', () => {
    const MEMBER = { id: 'otm_joined', teamId: TEAM_ID, userId: USER_ID, role: 'MANAGER', status: 'ACTIVE' };

    beforeEach(() => {
        mockRepo.findUserById.mockResolvedValue({ id: USER_ID, email: EMAIL });
    });

    it('throws NotFoundError when the user does not exist', async () => {
        mockRepo.findUserById.mockResolvedValue(null);
        await expect(service.acceptInvitation(USER_ID, TOKEN)).rejects.toThrow(NotFoundError);
        await expect(service.acceptInvitation(USER_ID, TOKEN)).rejects.toThrow('User not found');
        expect(mockRepo.acceptInvitation).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when the invitation is not found', async () => {
        mockRepo.acceptInvitation.mockResolvedValue({ state: 'NOT_FOUND' });
        await expect(service.acceptInvitation(USER_ID, TOKEN)).rejects.toThrow(NotFoundError);
        await expect(service.acceptInvitation(USER_ID, TOKEN)).rejects.toThrow('Invitation not found');
    });

    it('throws ForbiddenError on email mismatch', async () => {
        mockRepo.acceptInvitation.mockResolvedValue({ state: 'EMAIL_MISMATCH' });
        await expect(service.acceptInvitation(USER_ID, TOKEN)).rejects.toThrow(ForbiddenError);
        await expect(service.acceptInvitation(USER_ID, TOKEN))
            .rejects.toThrow('Invitation email does not match the authenticated user');
    });

    it('throws BadRequestError when the invitation has expired', async () => {
        mockRepo.acceptInvitation.mockResolvedValue({ state: 'EXPIRED' });
        await expect(service.acceptInvitation(USER_ID, TOKEN)).rejects.toThrow(BadRequestError);
        await expect(service.acceptInvitation(USER_ID, TOKEN)).rejects.toThrow('Invitation has expired');
    });

    it('throws ConflictError for any other terminal state', async () => {
        mockRepo.acceptInvitation.mockResolvedValue({ state: 'DECLINED' });
        await expect(service.acceptInvitation(USER_ID, TOKEN)).rejects.toThrow(ConflictError);
        await expect(service.acceptInvitation(USER_ID, TOKEN))
            .rejects.toThrow('Invitation is already declined');
    });

    it('hashes the raw token and returns the accepted member', async () => {
        mockRepo.acceptInvitation.mockResolvedValue({ state: 'ACCEPTED', member: MEMBER });
        await expect(service.acceptInvitation(USER_ID, TOKEN)).resolves.toBe(MEMBER);
        expect(mockRepo.acceptInvitation).toHaveBeenCalledWith(TOKEN_HASH, USER_ID, EMAIL);
    });
});

describe('updateMember', () => {
    const EXISTING = {
        id: MEMBER_ID,
        teamId: TEAM_ID,
        userId: 'user_member2',
        ownerOrganizerId: OWNER_ID,
        role: 'MANAGER',
        status: 'ACTIVE',
        permissions: ['VIEW_ORDERS'],
        scopes: [],
    };

    beforeEach(() => {
        mockRepo.getMemberById.mockResolvedValue(EXISTING);
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['MANAGE_TEAM'],
        });
    });

    it('throws NotFoundError when the member does not exist', async () => {
        mockRepo.getMemberById.mockResolvedValue(null);
        await expect(service.updateMember(USER_ID, MEMBER_ID, {})).rejects.toThrow(NotFoundError);
        await expect(service.updateMember(USER_ID, MEMBER_ID, {})).rejects.toThrow('Team member not found');
    });

    it('throws ForbiddenError when the target is the primary organizer membership', async () => {
        mockRepo.getMemberById.mockResolvedValue({ ...EXISTING, userId: OWNER_ID, ownerOrganizerId: OWNER_ID });
        await expect(service.updateMember(USER_ID, MEMBER_ID, { role: 'MANAGER' }))
            .rejects.toThrow(ForbiddenError);
        await expect(service.updateMember(USER_ID, MEMBER_ID, { role: 'MANAGER' }))
            .rejects.toThrow('The primary organizer membership cannot be changed');
    });

    it('throws ForbiddenError without MANAGE_TEAM permission', async () => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: [],
        });
        await expect(service.updateMember(USER_ID, MEMBER_ID, {})).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError for an invalid role', async () => {
        await expect(service.updateMember(USER_ID, MEMBER_ID, { role: 'intern' }))
            .rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError for an invalid status', async () => {
        await expect(service.updateMember(USER_ID, MEMBER_ID, { status: 'REMOVED' }))
            .rejects.toThrow(BadRequestError);
        await expect(service.updateMember(USER_ID, MEMBER_ID, { status: 'REMOVED' }))
            .rejects.toThrow('status must be ACTIVE or SUSPENDED');
    });

    it('throws BadRequestError when CHECK_IN_STAFF has no scopes', async () => {
        await expect(service.updateMember(USER_ID, MEMBER_ID, {
            role: 'CHECK_IN_STAFF',
            permissions: ['scan_tickets'],
        })).rejects.toThrow(BadRequestError);
        await expect(service.updateMember(USER_ID, MEMBER_ID, {
            role: 'CHECK_IN_STAFF',
            permissions: ['scan_tickets'],
        })).rejects.toThrow('CHECK_IN_STAFF requires at least one event scope');
    });

    it('throws ForbiddenError when scopes belong to another team', async () => {
        mockRepo.assertScopeEventsBelongToTeam.mockResolvedValue(false);
        await expect(service.updateMember(USER_ID, MEMBER_ID, { scopes: [{ eventId: EVENT_ID }] }))
            .rejects.toThrow(ForbiddenError);
    });

    it('keeps existing values when optional fields are omitted', async () => {
        mockRepo.updateMember.mockResolvedValue({ id: MEMBER_ID, teamId: TEAM_ID, role: 'MANAGER', status: 'ACTIVE' });
        await service.updateMember(USER_ID, MEMBER_ID, {});
        expect(mockRepo.updateMember).toHaveBeenCalledWith(
            MEMBER_ID, 'MANAGER', 'ACTIVE', ['VIEW_ORDERS'], []
        );
        expect(mockRepo.assertScopeEventsBelongToTeam).toHaveBeenCalledWith(TEAM_ID, []);
    });

    it('normalizes and forwards explicit role, status, permissions and scopes', async () => {
        mockRepo.updateMember.mockResolvedValue({ id: MEMBER_ID, role: 'CHECK_IN_STAFF', status: 'SUSPENDED' });
        await service.updateMember(USER_ID, MEMBER_ID, {
            role: 'check_in_staff',
            status: 'suspended',
            permissions: ['scan_tickets'],
            scopes: [{ eventId: EVENT_ID, performanceId: 'perf_1', ticketTypeId: 'tt_1' }],
        });
        expect(mockRepo.updateMember).toHaveBeenCalledWith(
            MEMBER_ID,
            'CHECK_IN_STAFF',
            'SUSPENDED',
            ['SCAN_TICKETS'],
            [{ eventId: EVENT_ID, performanceId: 'perf_1', ticketTypeId: 'tt_1' }]
        );
        expect(mockRepo.assertScopeEventsBelongToTeam).toHaveBeenCalledWith(TEAM_ID, [EVENT_ID]);
    });

    it('throws BadRequestError when a permission is not allowed for the new role', async () => {
        await expect(service.updateMember(USER_ID, MEMBER_ID, {
            role: 'CHECK_IN_STAFF',
            scopes: [{ eventId: EVENT_ID }],
            permissions: ['VIEW_ORDERS'],
        })).rejects.toThrow(BadRequestError);
        await expect(service.updateMember(USER_ID, MEMBER_ID, {
            role: 'CHECK_IN_STAFF',
            scopes: [{ eventId: EVENT_ID }],
            permissions: ['VIEW_ORDERS'],
        })).rejects.toThrow('permissions are not allowed for CHECK_IN_STAFF: VIEW_ORDERS');
    });
});

describe('removeMember', () => {
    const EXISTING = {
        id: MEMBER_ID,
        teamId: TEAM_ID,
        userId: 'user_member2',
        ownerOrganizerId: OWNER_ID,
        role: 'MANAGER',
        status: 'ACTIVE',
        permissions: ['VIEW_ORDERS'],
        scopes: [],
    };

    beforeEach(() => {
        mockRepo.getMemberById.mockResolvedValue(EXISTING);
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['MANAGE_TEAM'],
        });
    });

    it('throws NotFoundError when the member does not exist', async () => {
        mockRepo.getMemberById.mockResolvedValue(null);
        await expect(service.removeMember(USER_ID, MEMBER_ID)).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when removing the primary organizer membership', async () => {
        mockRepo.getMemberById.mockResolvedValue({ ...EXISTING, userId: OWNER_ID, ownerOrganizerId: OWNER_ID });
        await expect(service.removeMember(USER_ID, MEMBER_ID)).rejects.toThrow(ForbiddenError);
        await expect(service.removeMember(USER_ID, MEMBER_ID)).rejects.toThrow('The primary organizer membership cannot be removed');
    });

    it('throws ForbiddenError without MANAGE_TEAM permission', async () => {
        mockRepo.getTeamAccess.mockResolvedValue({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: [],
        });
        await expect(service.removeMember(USER_ID, MEMBER_ID)).rejects.toThrow(ForbiddenError);
    });

    it('removes the member and returns removed true', async () => {
        mockRepo.removeMember.mockResolvedValue(true);
        await expect(service.removeMember(USER_ID, MEMBER_ID)).resolves.toEqual({ removed: true });
        expect(mockRepo.removeMember).toHaveBeenCalledWith(MEMBER_ID);
    });
});

describe('normalizePermissions', () => {
    it('defaults to the full role permissions when requested is undefined', () => {
        expect(service.normalizePermissions('CHECK_IN_STAFF', undefined)).toEqual(['SCAN_TICKETS', 'VIEW_CHECKIN_REPORTS']);
    });

    it('throws BadRequestError when requested is not an array', () => {
        expect(() => service.normalizePermissions('MANAGER', 'SCAN_TICKETS')).toThrow(BadRequestError);
    });

    it('normalizes, trims and deduplicates permissions', () => {
        const result = service.normalizePermissions('MANAGER', [' view_orders ', 'VIEW_ORDERS']);
        expect(result).toEqual(['VIEW_ORDERS']);
    });

    it('throws BadRequestError when a permission is not allowed for the role', () => {
        expect(() => service.normalizePermissions('CHECK_IN_STAFF', ['MANAGE_TEAM']))
            .toThrow(BadRequestError);
    });

    it('throws BadRequestError for a permission outside ALL_PERMISSIONS', () => {
        expect(() => service.normalizePermissions('ADMIN', ['MAKE_COFFEE']))
            .toThrow(BadRequestError);
    });
});

describe('normalizeScopes', () => {
    it('returns an empty array when scopes is undefined', () => {
        expect(service.normalizeScopes(undefined)).toEqual([]);
    });

    it('throws BadRequestError when scopes is not an array', () => {
        expect(() => service.normalizeScopes('evt_1')).toThrow(BadRequestError);
    });

    it('throws BadRequestError when a scope lacks eventId', () => {
        expect(() => service.normalizeScopes([{ performanceId: 'perf_1' }])).toThrow(BadRequestError);
        expect(() => service.normalizeScopes([null])).toThrow(BadRequestError);
    });

    it('normalizes event ids and nulls out missing performance/ticket ids', () => {
        const result = service.normalizeScopes([
            { eventId: 42, performanceId: 'perf_1' },
            { eventId: 'evt_2' },
        ]);
        expect(result).toEqual([
            { eventId: '42', performanceId: 'perf_1', ticketTypeId: null },
            { eventId: 'evt_2', performanceId: null, ticketTypeId: null },
        ]);
    });
});
