'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

jest.mock('@/providers/database/social.helper', () => ({
    loadFollowedProfileIds: jest.fn(),
    loadHistoryEventIds: jest.fn(),
    loadFcmTokens: jest.fn(),
    loadFcmTokensForUsers: jest.fn(),
    replaceFollows: jest.fn(),
    replaceHistory: jest.fn(),
    replaceDevices: jest.fn(),
}));

const repo = require('@/providers/database/postgres.user.repository');

const {
    loadFollowedProfileIds,
    loadHistoryEventIds,
    loadFcmTokens,
    loadFcmTokensForUsers,
    replaceFollows,
    replaceHistory,
    replaceDevices,
} = require('@/providers/database/social.helper');

const CLIENT = { query: mockQuery };

beforeEach(() => {
    jest.clearAllMocks();
    loadFollowedProfileIds.mockResolvedValue([]);
    loadHistoryEventIds.mockResolvedValue([]);
    loadFcmTokens.mockResolvedValue([]);
    loadFcmTokensForUsers.mockResolvedValue({});
    replaceFollows.mockResolvedValue();
    replaceHistory.mockResolvedValue();
    replaceDevices.mockResolvedValue();
});

describe('getUserRoles', () => {
    it('returns relational role names when present', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ name: 'admin' }, { name: 'user' }],
        });

        await expect(repo.getUserRoles('u1')).resolves.toEqual(['admin', 'user']);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('FROM user_roles ur');
    });

    it('falls back to the auth_users roles cache', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ roles: ['user', 'organizer'] }] });

        await expect(repo.getUserRoles('u1')).resolves.toEqual(['user', 'organizer']);

        expect(mockQuery.mock.calls[1][0]).toContain('FROM auth_users');
    });

    it('returns an empty array when neither source has roles', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getUserRoles('u1')).resolves.toEqual([]);
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getUserRoles('u1')).rejects.toThrow('db down');
    });
});

describe('getUsersFcmTokens', () => {
    it('returns empty buckets for an empty input without querying', async () => {
        await expect(repo.getUsersFcmTokens([])).resolves.toEqual({
            recipientIds: [],
            tokens: [],
        });

        expect(loadFcmTokensForUsers).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('collects tokens per recipient preserving order', async () => {
        loadFcmTokensForUsers.mockResolvedValue({
            u1: ['t1'],
            u2: ['t2', 't3'],
        });

        await expect(repo.getUsersFcmTokens(['u1', 'u2'])).resolves.toEqual({
            recipientIds: ['u1', 'u2'],
            tokens: ['t1', 't2', 't3'],
        });

        expect(loadFcmTokensForUsers).toHaveBeenCalledWith(CLIENT, ['u1', 'u2']);
    });
});

describe('createUser', () => {
    it('inserts a full profile with ordered params and updates auth roles', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const userData = {
            name: 'A',
            profilePicUrl: 'p',
            coverPhotoUrl: 'c',
            bio: 'b',
            birthDate: 1000,
            createdAt: 2000,
            followersCount: 5,
            followingCount: 6,
            points: 7,
            level: 'gold',
            matchingPreferences: { interests: ['x'] },
            sharedMedia: ['m'],
            organizerInfo: { company: 'X' },
            followedProfileIds: ['f1'],
            historyEventIds: ['h1'],
            fcmTokens: ['t1'],
            fcmToken: 't2',
            roles: ['attendee', 'admin'],
            password: 'secret',
        };

        await repo.createUser('u1', userData);

        expect(mockQuery).toHaveBeenCalledTimes(2);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO user_profiles');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
        expect(params).toHaveLength(15);
        expect(params[0]).toBe('u1');
        expect(params[1]).toBe('A');
        expect(params[2]).toBe('p');
        expect(params[5]).toEqual(new Date(1000000));
        expect(params[6]).toEqual(new Date(2000000));
        expect(params[7]).toBe(5);
        expect(params[8]).toBe(6);
        expect(params[9]).toBe(7);
        expect(params[10]).toBe('gold');
        expect(params[11]).toBe(JSON.stringify({ interests: ['x'] }));
        expect(params[12]).toBe(JSON.stringify(['m']));
        expect(params[13]).toBe(JSON.stringify({ company: 'X' }));
        expect(params[14]).toBe(JSON.stringify({
            name: 'A', profilePicUrl: 'p', coverPhotoUrl: 'c', bio: 'b',
            birthDate: 1000, createdAt: 2000, followersCount: 5, followingCount: 6,
            points: 7, level: 'gold', matchingPreferences: { interests: ['x'] },
            sharedMedia: ['m'], organizerInfo: { company: 'X' },
            followedProfileIds: ['f1'], historyEventIds: ['h1'],
            fcmTokens: ['t1', 't2'], fcmToken: 't2', roles: ['attendee', 'admin'],
        }));
        expect(params[14]).not.toContain('secret');

        const authSql = mockQuery.mock.calls[1][0];
        const authParams = mockQuery.mock.calls[1][1];
        expect(authSql).toContain('UPDATE auth_users SET roles = $1');
        expect(authParams).toEqual([['user', 'admin'], 'u1']);

        expect(replaceFollows).toHaveBeenCalledWith(CLIENT, 'u1', ['f1']);
        expect(replaceHistory).toHaveBeenCalledWith(CLIENT, 'u1', ['h1']);
        expect(replaceDevices).toHaveBeenCalledWith(CLIENT, 'u1', ['t1', 't2']);
    });

    it('applies defaults when the payload is minimal', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createUser('u1', { name: 'A' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const params = mockQuery.mock.calls[0][1];
        expect(params[1]).toBe('A');
        expect(params[5]).toBeNull();
        expect(params[6]).toEqual(expect.any(Date));
        expect(params[7]).toBe(0);
        expect(params[10]).toBe('bronze');
        expect(params[14]).toBe(JSON.stringify({ name: 'A' }));
        expect(replaceFollows).not.toHaveBeenCalled();
        expect(replaceHistory).not.toHaveBeenCalled();
        expect(replaceDevices).not.toHaveBeenCalled();
    });
});

describe('getUserDataById', () => {
    it('returns null when no profile exists', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getUserDataById('u1')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM user_profiles WHERE id = $1',
            ['u1']
        );
    });

    it('hydrates the row with social, auth, and raw_data extras', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'u1', name: 'A', profile_pic_url: 'p', cover_photo_url: 'c', bio: 'b',
                        birth_date: new Date(1000), created_at: new Date(2000),
                        followers_count: 3, following_count: 0, points: 0, level: 'bronze',
                        matching_preferences: { interests: ['x'] }, shared_media: ['m'],
                        organizer_info: { company: 'X' }, raw_data: { legacy: 'l' },
                    },
                ],
            })
            .mockResolvedValue({ rows: [{ email: 'a@b.c', roles: ['user'] }] });
        loadFollowedProfileIds.mockResolvedValue(['f1']);
        loadHistoryEventIds.mockResolvedValue(['h1']);
        loadFcmTokens.mockResolvedValue(['t1']);

        const result = await repo.getUserDataById('u1');

        expect(loadFollowedProfileIds).toHaveBeenCalledWith(CLIENT, 'u1');
        expect(loadHistoryEventIds).toHaveBeenCalledWith(CLIENT, 'u1');
        expect(loadFcmTokens).toHaveBeenCalledWith(CLIENT, 'u1');
        expect(mockQuery.mock.calls[1][0]).toContain('SELECT email, roles FROM auth_users');
        expect(result).toEqual({
            legacy: 'l',
            id: 'u1',
            email: 'a@b.c',
            name: 'A',
            profilePicUrl: 'p',
            coverPhotoUrl: 'c',
            bio: 'b',
            birthDate: 1000,
            createdAt: 2000,
            roles: ['user'],
            followedProfileIds: ['f1'],
            historyEventIds: ['h1'],
            followersCount: 3,
            matchingPreferences: { interests: ['x'] },
            sharedMedia: ['m'],
            fcmTokens: ['t1'],
            organizerInfo: { company: 'X' },
        });
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getUserDataById('u1')).rejects.toThrow('db down');
    });
});

describe('getRawUserDataById', () => {
    it('delegates to getUserDataById', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [{ id: 'u1', name: 'A', raw_data: { legacy: 'l' } }],
            })
            .mockResolvedValue({ rows: [{ email: '', roles: [] }] });

        const result = await repo.getRawUserDataById('u1');

        expect(result).toEqual({ legacy: 'l', id: 'u1', name: 'A' });
    });
});

describe('updateUser', () => {
    it('maps FIELD_MAP keys and date columns via toDb', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const birthDate = new Date(9000);
        const updateData = { name: 'New', birthDate, points: 3 };

        await repo.updateUser('u1', updateData);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            'UPDATE user_profiles SET name = $1, birth_date = $2, points = $3, ' +
            "raw_data = COALESCE(raw_data, '{}'::jsonb) || $4::jsonb, updated_at = NOW() " +
            'WHERE id = $5'
        );
        expect(params).toEqual([
            'New', birthDate, 3, JSON.stringify(updateData), 'u1',
        ]);
    });

    it('builds jsonb_set for a matchingPreferences.interests dot key', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateUser('u1', { 'matchingPreferences.interests': ['a', 'b'] });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            "UPDATE user_profiles SET matching_preferences = jsonb_set(COALESCE(matching_preferences, '{}'::jsonb), '{interests}', $1::jsonb), " +
            "raw_data = COALESCE(raw_data, '{}'::jsonb) || $2::jsonb, updated_at = NOW() " +
            'WHERE id = $3'
        );
        expect(params).toEqual([
            JSON.stringify(['a', 'b']),
            JSON.stringify({ 'matchingPreferences.interests': ['a', 'b'] }),
            'u1',
        ]);
    });

    it('replaces matchingPreferences wholesale', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateUser('u1', { matchingPreferences: { lang: 'en' } });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            'UPDATE user_profiles SET matching_preferences = $1, ' +
            "raw_data = COALESCE(raw_data, '{}'::jsonb) || $2::jsonb, updated_at = NOW() " +
            'WHERE id = $3'
        );
        expect(params).toEqual([
            JSON.stringify({ lang: 'en' }),
            JSON.stringify({ matchingPreferences: { lang: 'en' } }),
            'u1',
        ]);
    });

    it('snake_cases unknown camelCase keys into new columns', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateUser('u1', { customField: 'x' });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('custom_field = $1');
        expect(params).toEqual([
            'x', JSON.stringify({ customField: 'x' }), 'u1',
        ]);
    });

    it('rejects unsafe column names', async () => {
        await expect(
            repo.updateUser('u1', { 'my field!': 1 })
        ).rejects.toThrow('Invalid column name: my field!');

        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('routes email and roles to auth_users and skips them as profile columns', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateUser('u1', { email: 'n@x', roles: ['attendee'] });

        expect(mockQuery).toHaveBeenCalledTimes(3);
        expect(mockQuery.mock.calls[0][0]).toBe(
            'UPDATE auth_users SET email = $1, updated_at = NOW() WHERE id = $2'
        );
        expect(mockQuery.mock.calls[0][1]).toEqual(['n@x', 'u1']);
        expect(mockQuery.mock.calls[1][1]).toEqual([['user'], 'u1']);
        const [sql, params] = mockQuery.mock.calls[2];
        expect(sql).toContain('UPDATE user_profiles SET raw_data = ');
        expect(sql).not.toContain('email = ');
        expect(params).toEqual([
            JSON.stringify({ email: 'n@x', roles: ['attendee'] }),
            'u1',
        ]);
    });

    it('replaces social relations for relational fields and skips profile columns', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateUser('u1', {
            followedProfileIds: ['f1'],
            historyEventIds: ['h1'],
            fcmTokens: ['t1'],
        });

        expect(replaceFollows).toHaveBeenCalledWith(CLIENT, 'u1', ['f1']);
        expect(replaceHistory).toHaveBeenCalledWith(CLIENT, 'u1', ['h1']);
        expect(replaceDevices).toHaveBeenCalledWith(CLIENT, 'u1', ['t1']);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).not.toContain('followed_profile_ids');
        expect(params).toEqual([
            JSON.stringify({
                followedProfileIds: ['f1'],
                historyEventIds: ['h1'],
                fcmTokens: ['t1'],
            }),
            'u1',
        ]);
    });

    it('merges a single fcmToken into the existing device list', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        loadFcmTokens.mockResolvedValue(['t1']);

        await repo.updateUser('u1', { name: 'X' }, 't9');

        expect(loadFcmTokens).toHaveBeenCalledWith(CLIENT, 'u1');
        expect(replaceDevices).toHaveBeenCalledWith(CLIENT, 'u1', ['t1', 't9']);
        expect(mockQuery.mock.calls[0][1]).toEqual([
            'X', JSON.stringify({ name: 'X' }), 'u1',
        ]);
    });

    it('is a no-op when only ignored keys are supplied', async () => {
        await repo.updateUser('u1', { id: 'other' });

        expect(mockQuery).not.toHaveBeenCalled();
        expect(replaceFollows).not.toHaveBeenCalled();
    });
});

describe('addFcmToken / removeFcmToken', () => {
    it('adds a token when absent', async () => {
        loadFcmTokens.mockResolvedValue(['t1']);

        await repo.addFcmToken('u1', 't2');

        expect(loadFcmTokens).toHaveBeenCalledWith(CLIENT, 'u1');
        expect(replaceDevices).toHaveBeenCalledWith(CLIENT, 'u1', ['t1', 't2']);
    });

    it('skips adding a duplicate token', async () => {
        loadFcmTokens.mockResolvedValue(['t1']);

        await repo.addFcmToken('u1', 't1');

        expect(replaceDevices).toHaveBeenCalledWith(CLIENT, 'u1', ['t1']);
    });

    it('removes an existing token', async () => {
        loadFcmTokens.mockResolvedValue(['t1', 't2']);

        await repo.removeFcmToken('u1', 't2');

        expect(replaceDevices).toHaveBeenCalledWith(CLIENT, 'u1', ['t1']);
    });
});

describe('getEventsByIds', () => {
    it('is a stub returning an empty array', async () => {
        await expect(repo.getEventsByIds()).resolves.toEqual([]);
    });
});

describe('followProfile', () => {
    it('throws when the following user does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.followProfile('u1', 'u2')).rejects.toThrow('User not found.');

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT id FROM user_profiles WHERE id = $1',
            ['u1']
        );
    });

    it('returns alreadyFollowing when the follow exists', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
            .mockResolvedValueOnce({ rows: [{ exists: true }] });

        await expect(repo.followProfile('u1', 'u2')).resolves.toEqual({
            alreadyFollowing: true,
        });

        expect(mockQuery.mock.calls[1][0]).toContain('FROM user_follows');
    });

    it('follows a featured profile', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'fp1' }] })
            .mockResolvedValue({ rows: [] });

        await expect(repo.followProfile('u1', 'fp1')).resolves.toEqual({
            alreadyFollowing: false,
        });

        expect(mockQuery).toHaveBeenCalledTimes(4);
        expect(mockQuery.mock.calls[2][0]).toContain('FROM featured_profiles');
        expect(mockQuery.mock.calls[3][0]).toContain('INSERT INTO user_follows');
        expect(mockQuery.mock.calls[3][1]).toEqual(['u1', 'fp1', expect.any(Date)]);
    });

    it('falls back to a regular profile when not featured', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'u2' }] })
            .mockResolvedValue({ rows: [] });

        await expect(repo.followProfile('u1', 'u2')).resolves.toEqual({
            alreadyFollowing: false,
        });

        expect(mockQuery.mock.calls[3][0]).toBe('SELECT id FROM user_profiles WHERE id = $1');
        expect(mockQuery.mock.calls[3][1]).toEqual(['u2']);
    });

    it('throws when the target profile does not exist', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await expect(repo.followProfile('u1', 'ghost')).rejects.toThrow('Profile not found.');
    });
});

describe('unfollowProfile', () => {
    it('throws when the following user does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.unfollowProfile('u1', 'u2')).rejects.toThrow('User not found.');
    });

    it('returns notFollowing when no follow exists', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
            .mockResolvedValueOnce({ rows: [] });

        await expect(repo.unfollowProfile('u1', 'u2')).resolves.toEqual({
            notFollowing: true,
        });
    });

    it('deletes the existing follow', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
            .mockResolvedValueOnce({ rows: [{ exists: true }] })
            .mockResolvedValue({ rows: [] });

        await expect(repo.unfollowProfile('u1', 'u2')).resolves.toEqual({
            notFollowing: false,
        });

        expect(mockQuery.mock.calls[2][0]).toBe(
            'DELETE FROM user_follows WHERE follower_id = $1 AND followee_id = $2'
        );
        expect(mockQuery.mock.calls[2][1]).toEqual(['u1', 'u2']);
    });
});

describe('getUsersByIds', () => {
    it('returns an empty map without querying', async () => {
        await expect(repo.getUsersByIds([])).resolves.toEqual({});

        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('builds an IN query and hydrates each row without an id', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [
                    { id: 'u1', name: 'A', raw_data: { legacy: 'l1' } },
                    { id: 'u2', name: 'B', raw_data: { legacy: 'l2' } },
                ],
            })
            .mockResolvedValue({ rows: [{ email: '', roles: [] }] });

        const result = await repo.getUsersByIds(['u1', 'u2']);

        expect(mockQuery.mock.calls[0][0]).toBe(
            'SELECT * FROM user_profiles WHERE id IN ($1,$2)'
        );
        expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 'u2']);
        expect(result).toEqual({
            u1: { legacy: 'l1', name: 'A' },
            u2: { legacy: 'l2', name: 'B' },
        });
        expect(result.u1.id).toBeUndefined();
    });
});

describe('findUserByEmail', () => {
    it('returns null when the auth user is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findUserByEmail('a@b.c')).resolves.toBeNull();
    });

    it('returns a minimal stub when the profile is missing', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
            .mockResolvedValue({ rows: [] });

        await expect(repo.findUserByEmail('a@b.c')).resolves.toEqual({
            _id: 'u1',
            email: 'a@b.c',
        });
    });

    it('merges the hydrated profile under _id', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
            .mockResolvedValueOnce({
                rows: [{ id: 'u1', name: 'A', raw_data: { legacy: 'l' } }],
            })
            .mockResolvedValue({ rows: [{ email: 'a@b.c', roles: ['user'] }] });

        await expect(repo.findUserByEmail('a@b.c')).resolves.toEqual({
            _id: 'u1',
            id: 'u1',
            email: 'a@b.c',
            legacy: 'l',
            name: 'A',
            roles: ['user'],
        });

        expect(mockQuery.mock.calls[0][0]).toContain('LOWER(email) = LOWER($1)');
    });
});

describe('addOrganizerRoleToUser', () => {
    it('returns null when the user does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.addOrganizerRoleToUser('u1', { companyName: 'Co' })).resolves.toBeNull();
    });

    it('merges organizer info into raw_data and preserves its createdAt', async () => {
        const row = {
            raw_data: { note: 'n', organizerInfo: { createdAt: 1 } },
            organizer_info: null,
        };
        mockQuery
            .mockResolvedValueOnce({ rows: [row] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'u1', name: 'A', raw_data: { legacy: 'l' } }] })
            .mockResolvedValue({ rows: [{ email: '', roles: [] }] });

        await repo.addOrganizerRoleToUser('u1', { companyName: 'Co' });

        const organizerInfo = {
            companyName: 'Co', taxCode: '', description: '', website: '', createdAt: 1,
        };
        const updateSql = mockQuery.mock.calls[1][0];
        const updateParams = mockQuery.mock.calls[1][1];
        expect(updateSql).toContain('SET organizer_info = $1,');
        expect(updateSql).toContain('raw_data = $2,');
        expect(updateParams).toEqual([
            JSON.stringify(organizerInfo),
            JSON.stringify({ note: 'n', organizerInfo }),
            'u1',
        ]);
        expect(mockQuery.mock.calls[2][0]).toContain("WHEN 'organizer' = ANY(roles)");
    });

    it('updates only organizer_info when raw_data is absent', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ raw_data: null, organizer_info: null }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'u1', name: 'A' }] })
            .mockResolvedValue({ rows: [{ email: '', roles: [] }] });

        await repo.addOrganizerRoleToUser('u1', { companyName: 'Co', createdAt: 5 });

        const updateSql = mockQuery.mock.calls[1][0];
        const updateParams = mockQuery.mock.calls[1][1];
        expect(updateSql).toContain('SET organizer_info = $1,');
        expect(updateSql).not.toContain('raw_data =');
        expect(updateParams).toEqual([
            JSON.stringify({
                companyName: 'Co', taxCode: '', description: '', website: '', createdAt: 5,
            }),
            'u1',
        ]);
    });
});

describe('updateUserFields', () => {
    it('delegates to updateUser', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateUserFields('u1', { name: 'X' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][1]).toEqual([
            'X', JSON.stringify({ name: 'X' }), 'u1',
        ]);
    });
});

describe('appendRoleToProfile', () => {
    it('maps attendee to the auth user role', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.appendRoleToProfile('u1', 'attendee');

        expect(mockQuery.mock.calls[0][0]).toContain('array_append(roles, $2)');
        expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 'user']);
    });

    it('keeps organizer as-is', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.appendRoleToProfile('u1', 'organizer');

        expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 'organizer']);
    });
});

describe('addHistoryEventIdInTransaction', () => {
    it('uses the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.addHistoryEventIdInTransaction(tx, 'u1', 'e1');

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        const [sql, params] = tx.query.mock.calls[0];
        expect(sql).toContain('INSERT INTO user_event_history');
        expect(sql).toContain("'attended'");
        expect(params).toEqual(['u1', 'e1', expect.any(Date)]);
    });

    it('falls back to the module query when transaction is omitted', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.addHistoryEventIdInTransaction(null, 'u1', 'e1');

        expect(mockQuery).toHaveBeenCalledTimes(1);
    });
});
