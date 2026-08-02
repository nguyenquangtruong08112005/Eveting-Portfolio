/* eslint-env jest */
const mockDb = { query: jest.fn(), transaction: jest.fn() };
const mockTx = { query: jest.fn() };

jest.mock('@/providers/database/postgres.client', () => mockDb);
jest.mock('crypto', () => ({ randomUUID: jest.fn(() => 'fixed-uuid') }));

const repo = require('@/modules/memberships/infrastructure/organizer-team.repository');

const TEAM_ID = 'team_1';
const OWNER_ID = 'user_owner';
const MEMBER_ID = 'otm_1';
const USER_ID = 'user_member';
const EVENT_ID = 'evt_1';
const EMAIL = 'member@example.com';

beforeEach(() => {
    jest.clearAllMocks();
    mockDb.transaction.mockImplementation(async (cb) => cb(mockTx));
});

describe('isPrimaryOrganizer', () => {
    it('returns true when an organizer profile row exists', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: 'org_1' }] });
        await expect(repo.isPrimaryOrganizer(OWNER_ID)).resolves.toBe(true);
        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT 1 FROM organizer_profiles'),
            [OWNER_ID]
        );
    });

    it('returns false when no organizer profile row exists', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.isPrimaryOrganizer(OWNER_ID)).resolves.toBe(false);
    });
});

describe('ensureTeamForOwner', () => {
    it('creates a team and owner member inside a transaction', async () => {
        const team = { id: 'oteam_fixed-uuid', owner_organizer_id: OWNER_ID, name: 'My Team' };
        mockTx.query
            .mockResolvedValueOnce({ rows: [team] })
            .mockResolvedValueOnce({ rows: [{ id: 'otm_fixed-uuid' }] });

        const result = await repo.ensureTeamForOwner(OWNER_ID, 'My Team');

        expect(result.team).toBe(team);
        expect(result.ownerMemberId).toBe('otm_fixed-uuid');
        expect(mockTx.query).toHaveBeenNthCalledWith(1, expect.stringContaining('INSERT INTO organizer_teams'), [
            'oteam_fixed-uuid', OWNER_ID, 'My Team',
        ]);
        expect(mockTx.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO organizer_team_members'), [
            'otm_fixed-uuid', team.id, OWNER_ID,
        ]);
    });

    it('defaults the team name to Organizer team when name is falsy', async () => {
        mockTx.query
            .mockResolvedValueOnce({ rows: [{ id: 'oteam_fixed-uuid' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'otm_fixed-uuid' }] });
        await repo.ensureTeamForOwner(OWNER_ID, null);
        expect(mockTx.query.mock.calls[0][1]).toEqual(['oteam_fixed-uuid', OWNER_ID, 'Organizer team']);
    });
});

describe('getTeamForOwner', () => {
    it('returns the mapped team when found', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: TEAM_ID, ownerOrganizerId: OWNER_ID, name: 'T', createdAt: 'now' }] });
        const result = await repo.getTeamForOwner(OWNER_ID);
        expect(result).toEqual({ id: TEAM_ID, ownerOrganizerId: OWNER_ID, name: 'T', createdAt: 'now' });
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE owner_organizer_id = $1'), [OWNER_ID]);
    });

    it('returns null when no team exists', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.getTeamForOwner(OWNER_ID)).resolves.toBeNull();
    });
});

describe('getTeamById', () => {
    it('returns the mapped team when found', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: TEAM_ID, ownerOrganizerId: OWNER_ID, name: 'T', createdAt: 'now' }] });
        const result = await repo.getTeamById(TEAM_ID);
        expect(result).toEqual({ id: TEAM_ID, ownerOrganizerId: OWNER_ID, name: 'T', createdAt: 'now' });
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [TEAM_ID]);
    });

    it('returns null when the team does not exist', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.getTeamById(TEAM_ID)).resolves.toBeNull();
    });
});

describe('getEventAccess', () => {
    const ROW = {
        event_id: EVENT_ID,
        owner_organizer_id: OWNER_ID,
        team_id: TEAM_ID,
        member_id: MEMBER_ID,
        role: 'MANAGER',
        status: 'ACTIVE',
        permissions: ['VIEW_ORDERS'],
    };

    it('returns null when the event does not exist', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.getEventAccess(EVENT_ID, USER_ID)).resolves.toBeNull();
    });

    it('passes eventId and userId in parameter order', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ ...ROW, member_id: null }] });
        await repo.getEventAccess(EVENT_ID, USER_ID);
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE e.id = $1'), [EVENT_ID, USER_ID]);
    });

    it('loads scopes for an existing member and maps the row', async () => {
        mockDb.query
            .mockResolvedValueOnce({ rows: [ROW] })
            .mockResolvedValueOnce({ rows: [{ eventId: EVENT_ID, performanceId: 'perf_1', ticketTypeId: null }] });
        const result = await repo.getEventAccess(EVENT_ID, USER_ID);
        expect(result).toEqual({
            eventId: EVENT_ID,
            ownerOrganizerId: OWNER_ID,
            teamId: TEAM_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['VIEW_ORDERS'],
            scopes: [{ eventId: EVENT_ID, performanceId: 'perf_1', ticketTypeId: null }],
        });
        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('FROM organizer_team_member_scopes'),
            [MEMBER_ID]
        );
    });

    it('skips the scopes query and defaults scopes when there is no member', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ ...ROW, member_id: null, permissions: null }] });
        const result = await repo.getEventAccess(EVENT_ID, USER_ID);
        expect(result.memberId).toBeNull();
        expect(result.scopes).toEqual([]);
        expect(result.permissions).toEqual([]);
        expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('uses the transaction client when a tx is provided', async () => {
        mockTx.query.mockResolvedValueOnce({ rows: [ROW] }).mockResolvedValueOnce({ rows: [] });
        await repo.getEventAccess(EVENT_ID, USER_ID, mockTx);
        expect(mockTx.query).toHaveBeenCalledTimes(2);
        expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('falls back to the shared query when tx is not a query object', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ ...ROW, member_id: null }] });
        await repo.getEventAccess(EVENT_ID, USER_ID, { notAQuery: true });
        expect(mockDb.query).toHaveBeenCalled();
        expect(mockTx.query).not.toHaveBeenCalled();
    });
});

describe('getTeamAccess', () => {
    it('returns null when the team does not exist', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.getTeamAccess(TEAM_ID, USER_ID)).resolves.toBeNull();
    });

    it('maps the row and passes teamId, userId in order', async () => {
        mockDb.query.mockResolvedValue({ rows: [{
            team_id: TEAM_ID,
            owner_organizer_id: OWNER_ID,
            member_id: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['MANAGE_TEAM'],
        }] });
        const result = await repo.getTeamAccess(TEAM_ID, USER_ID);
        expect(result).toEqual({
            teamId: TEAM_ID,
            ownerOrganizerId: OWNER_ID,
            memberId: MEMBER_ID,
            role: 'MANAGER',
            status: 'ACTIVE',
            permissions: ['MANAGE_TEAM'],
        });
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE ot.id = $1'), [TEAM_ID, USER_ID]);
    });

    it('defaults permissions to an empty array when null', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ team_id: TEAM_ID, permissions: null, member_id: null }] });
        const result = await repo.getTeamAccess(TEAM_ID, USER_ID);
        expect(result.permissions).toEqual([]);
    });
});

describe('listUserTeams', () => {
    it('returns rows as-is and queries by userId', async () => {
        const rows = [{ id: TEAM_ID, isOwner: true }];
        mockDb.query.mockResolvedValue({ rows });
        await expect(repo.listUserTeams(USER_ID)).resolves.toBe(rows);
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY ot.name'), [USER_ID]);
    });
});

describe('listTeamMembers', () => {
    it('attaches scopes to each member', async () => {
        const members = [{ id: MEMBER_ID, teamId: TEAM_ID, userId: USER_ID, email: 'a@b.c', name: 'A', role: 'MANAGER', status: 'ACTIVE', permissions: ['VIEW_ORDERS'] }];
        mockDb.query
            .mockResolvedValueOnce({ rows: members })
            .mockResolvedValueOnce({ rows: [{ eventId: EVENT_ID, performanceId: null, ticketTypeId: null }] });
        const result = await repo.listTeamMembers(TEAM_ID);
        expect(result[0].scopes).toEqual([{ eventId: EVENT_ID, performanceId: null, ticketTypeId: null }]);
        expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.stringContaining('WHERE otm.team_id = $1'), [TEAM_ID]);
        expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.stringContaining('WHERE member_id = $1'), [MEMBER_ID]);
    });

    it('returns an empty array when the team has no members', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.listTeamMembers(TEAM_ID)).resolves.toEqual([]);
    });
});

describe('findUserByEmail', () => {
    it('returns the mapped user when found', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: 'user_1', email: 'a@b.c', name: 'A' }] });
        const result = await repo.findUserByEmail('  A@B.C  ');
        expect(result).toEqual({ id: 'user_1', email: 'a@b.c', name: 'A' });
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE LOWER(au.email) = LOWER($1)'), ['  A@B.C  ']);
    });

    it('returns null when no active user matches', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.findUserByEmail('missing@b.c')).resolves.toBeNull();
    });
});

describe('findUserById', () => {
    it('returns the mapped user when found', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: 'user_1', email: 'a@b.c', name: 'A' }] });
        await expect(repo.findUserById('user_1')).resolves.toEqual({ id: 'user_1', email: 'a@b.c', name: 'A' });
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE au.id = $1'), ['user_1']);
    });

    it('returns null when the user is missing', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.findUserById('user_x')).resolves.toBeNull();
    });
});

describe('createInvitation', () => {
    it('inserts with the correct parameter ordering and returns the row', async () => {
        const expiresAt = new Date('2026-01-01T00:00:00Z');
        const row = { id: 'oti_1', teamId: TEAM_ID, email: 'a@b.c', role: 'MANAGER', status: 'PENDING' };
        mockDb.query.mockResolvedValue({ rows: [row] });
        const invitation = {
            id: 'oti_1',
            teamId: TEAM_ID,
            email: 'a@b.c',
            tokenHash: 'hash',
            role: 'MANAGER',
            permissions: ['VIEW_ORDERS'],
            scopes: [{ eventId: EVENT_ID }],
            invitedBy: 'user_inviter',
            expiresAt,
        };
        const result = await repo.createInvitation(invitation);
        expect(result).toBe(row);
        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'),
            [
                'oti_1', TEAM_ID, 'a@b.c', 'hash', 'MANAGER',
                ['VIEW_ORDERS'], JSON.stringify([{ eventId: EVENT_ID }]), 'user_inviter', expiresAt,
            ]
        );
    });
});

describe('acceptInvitation', () => {
    const PENDING_INVITATION = {
        id: 'oti_1',
        team_id: TEAM_ID,
        email: EMAIL,
        role: 'MANAGER',
        permissions: ['VIEW_ORDERS'],
        scopes: [{ eventId: EVENT_ID, performanceId: null, ticketTypeId: null }],
        invited_by: 'user_inviter',
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        status: 'PENDING',
    };

    it('returns NOT_FOUND when no invitation matches the hash', async () => {
        mockTx.query.mockResolvedValueOnce({ rows: [] });
        const result = await repo.acceptInvitation('hash', USER_ID, EMAIL);
        expect(result).toEqual({ state: 'NOT_FOUND' });
        expect(mockTx.query).toHaveBeenCalledWith(expect.stringContaining('WHERE token_hash = $1'), ['hash']);
    });

    it('returns the stored state when the invitation is not pending', async () => {
        mockTx.query.mockResolvedValueOnce({ rows: [{ ...PENDING_INVITATION, status: 'ACCEPTED' }] });
        const result = await repo.acceptInvitation('hash', USER_ID, EMAIL);
        expect(result).toEqual({ state: 'ACCEPTED' });
    });

    it('marks and returns EXPIRED when the invitation has passed expiry', async () => {
        mockTx.query
            .mockResolvedValueOnce({ rows: [{ ...PENDING_INVITATION, expires_at: new Date(Date.now() - 1000) }] })
            .mockResolvedValueOnce({ rows: [] });
        const result = await repo.acceptInvitation('hash', USER_ID, EMAIL);
        expect(result).toEqual({ state: 'EXPIRED' });
        expect(mockTx.query).toHaveBeenNthCalledWith(2, expect.stringContaining("SET status = 'EXPIRED'"), [PENDING_INVITATION.id]);
    });

    it('returns EMAIL_MISMATCH when the invitation email differs from the expected email', async () => {
        mockTx.query.mockResolvedValueOnce({ rows: [PENDING_INVITATION] });
        const result = await repo.acceptInvitation('hash', USER_ID, 'other@example.com');
        expect(result).toEqual({ state: 'EMAIL_MISMATCH' });
    });

    it('compares emails case-insensitively', async () => {
        const member = { id: 'otm_new', teamId: TEAM_ID, userId: USER_ID, role: 'MANAGER', status: 'ACTIVE' };
        mockTx.query
            .mockResolvedValueOnce({ rows: [{ ...PENDING_INVITATION, email: EMAIL.toUpperCase() }] })
            .mockResolvedValueOnce({ rows: [member] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });
        const result = await repo.acceptInvitation('hash', USER_ID, EMAIL);
        expect(result).toEqual({ state: 'ACCEPTED', member });
    });

    it('accepts the invitation, grants permissions, replaces scopes and marks accepted', async () => {
        const member = { id: 'otm_new', teamId: TEAM_ID, userId: USER_ID, role: 'MANAGER', status: 'ACTIVE' };
        mockTx.query
            .mockResolvedValueOnce({ rows: [PENDING_INVITATION] })
            .mockResolvedValueOnce({ rows: [member] })
            .mockResolvedValueOnce({ rows: [] }) // grantPermissions DELETE
            .mockResolvedValueOnce({ rows: [] }) // grantPermissions INSERT
            .mockResolvedValueOnce({ rows: [] }) // replaceScopes DELETE
            .mockResolvedValueOnce({ rows: [] }) // replaceScopes INSERT
            .mockResolvedValueOnce({ rows: [] }); // update invitation
        const result = await repo.acceptInvitation('hash', USER_ID, EMAIL);
        expect(result).toEqual({ state: 'ACCEPTED', member });
        expect(mockTx.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO organizer_team_members'), [
            'otm_fixed-uuid', TEAM_ID, USER_ID, 'MANAGER', 'user_inviter',
        ]);
        expect(mockTx.query).toHaveBeenNthCalledWith(5, expect.stringContaining('DELETE FROM organizer_team_member_scopes'), [member.id]);
        expect(mockTx.query).toHaveBeenLastCalledWith(expect.stringContaining("SET status = 'ACCEPTED'"), [PENDING_INVITATION.id]);
    });

    it('defaults missing permissions and scopes to empty arrays', async () => {
        const member = { id: 'otm_new' };
        mockTx.query
            .mockResolvedValueOnce({ rows: [{ ...PENDING_INVITATION, permissions: undefined, scopes: undefined }] })
            .mockResolvedValueOnce({ rows: [member] })
            .mockResolvedValueOnce({ rows: [] }) // grantPermissions DELETE, no INSERT
            .mockResolvedValueOnce({ rows: [] }) // replaceScopes DELETE, no INSERT
            .mockResolvedValueOnce({ rows: [] }); // update invitation
        const result = await repo.acceptInvitation('hash', USER_ID, EMAIL);
        expect(result.state).toBe('ACCEPTED');
        expect(mockTx.query).toHaveBeenCalledTimes(5);
    });
});

describe('getMemberById', () => {
    const MEMBER_ROW = {
        id: MEMBER_ID,
        teamId: TEAM_ID,
        userId: USER_ID,
        role: 'MANAGER',
        status: 'ACTIVE',
        ownerOrganizerId: OWNER_ID,
        permissions: ['VIEW_ORDERS'],
    };

    it('returns null when the member does not exist', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.getMemberById(MEMBER_ID)).resolves.toBeNull();
    });

    it('returns the member with scopes attached', async () => {
        mockDb.query
            .mockResolvedValueOnce({ rows: [MEMBER_ROW] })
            .mockResolvedValueOnce({ rows: [{ eventId: EVENT_ID, performanceId: 'perf_1', ticketTypeId: null }] });
        const result = await repo.getMemberById(MEMBER_ID);
        expect(result).toEqual({ ...MEMBER_ROW, scopes: [{ eventId: EVENT_ID, performanceId: 'perf_1', ticketTypeId: null }] });
        expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.stringContaining('WHERE otm.id = $1'), [MEMBER_ID]);
        expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM organizer_team_member_scopes'), [MEMBER_ID]);
    });

    it('passes the permissions array through unchanged when present', async () => {
        mockDb.query
            .mockResolvedValueOnce({ rows: [{ ...MEMBER_ROW, permissions: null }] })
            .mockResolvedValueOnce({ rows: [] });
        const result = await repo.getMemberById(MEMBER_ID);
        expect(result.permissions).toBeNull();
    });
});

describe('updateMember', () => {
    it('returns null when the member update affects no rows', async () => {
        mockTx.query.mockResolvedValueOnce({ rows: [] });
        await expect(repo.updateMember(MEMBER_ID, 'MANAGER', 'ACTIVE', [], []))
            .resolves.toBeNull();
        expect(mockTx.query).toHaveBeenCalledWith(
            expect.stringContaining('SET role = $2, status = $3'),
            [MEMBER_ID, 'MANAGER', 'ACTIVE']
        );
    });

    it('updates role and status then replaces permissions and scopes', async () => {
        const updated = { id: MEMBER_ID, teamId: TEAM_ID, userId: USER_ID, role: 'CHECK_IN_STAFF', status: 'SUSPENDED' };
        mockTx.query
            .mockResolvedValueOnce({ rows: [updated] })
            .mockResolvedValueOnce({ rows: [] }) // grantPermissions DELETE
            .mockResolvedValueOnce({ rows: [] }) // grantPermissions INSERT
            .mockResolvedValueOnce({ rows: [] }) // replaceScopes DELETE
            .mockResolvedValueOnce({ rows: [] }) // replaceScopes INSERT scope 1
            .mockResolvedValueOnce({ rows: [] }); // replaceScopes INSERT scope 2
        const result = await repo.updateMember(MEMBER_ID, 'CHECK_IN_STAFF', 'SUSPENDED', ['SCAN_TICKETS'], [
            { eventId: EVENT_ID, performanceId: null, ticketTypeId: null },
            { eventId: 'evt_2', performanceId: null, ticketTypeId: null },
        ]);
        expect(result).toBe(updated);
        expect(mockTx.query).toHaveBeenNthCalledWith(2, expect.stringContaining('DELETE FROM organizer_team_member_permissions'), [MEMBER_ID]);
        expect(mockTx.query).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO organizer_team_member_permissions'), [MEMBER_ID, ['SCAN_TICKETS']]);
        expect(mockTx.query).toHaveBeenNthCalledWith(5, expect.stringContaining('INSERT INTO organizer_team_member_scopes'), [
            'otms_fixed-uuid', MEMBER_ID, EVENT_ID, null, null,
        ]);
    });

    it('skips inserts when permissions and scopes are empty', async () => {
        mockTx.query
            .mockResolvedValueOnce({ rows: [{ id: MEMBER_ID }] })
            .mockResolvedValueOnce({ rows: [] }) // grantPermissions DELETE only
            .mockResolvedValueOnce({ rows: [] }); // replaceScopes DELETE only
        await repo.updateMember(MEMBER_ID, 'MANAGER', 'ACTIVE', [], []);
        expect(mockTx.query).toHaveBeenCalledTimes(3);
    });
});

describe('removeMember', () => {
    it('returns true when a row was deleted', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: MEMBER_ID }] });
        await expect(repo.removeMember(MEMBER_ID)).resolves.toBe(true);
        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM organizer_team_members WHERE id = $1 RETURNING id'),
            [MEMBER_ID]
        );
    });

    it('returns false when no row was deleted', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        await expect(repo.removeMember(MEMBER_ID)).resolves.toBe(false);
    });
});

describe('assertScopeEventsBelongToTeam', () => {
    it('returns true without querying when there are no event ids', async () => {
        await expect(repo.assertScopeEventsBelongToTeam(TEAM_ID, [])).resolves.toBe(true);
        expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('returns true when the count matches the distinct event id set', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ count: 2 }] });
        await expect(repo.assertScopeEventsBelongToTeam(TEAM_ID, [EVENT_ID, 'evt_2'])).resolves.toBe(true);
        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('e.id = ANY($2::text[])'),
            [TEAM_ID, [EVENT_ID, 'evt_2']]
        );
    });

    it('returns false when some events belong to another team', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ count: 1 }] });
        await expect(repo.assertScopeEventsBelongToTeam(TEAM_ID, [EVENT_ID, 'evt_2'])).resolves.toBe(false);
    });

    it('deduplicates repeated event ids when comparing', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ count: 2 }] });
        await expect(repo.assertScopeEventsBelongToTeam(TEAM_ID, [EVENT_ID, EVENT_ID, 'evt_2'])).resolves.toBe(true);
        expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [TEAM_ID, [EVENT_ID, EVENT_ID, 'evt_2']]);
    });
});
