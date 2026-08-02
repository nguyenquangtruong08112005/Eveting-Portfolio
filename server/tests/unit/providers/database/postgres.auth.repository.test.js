'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/postgres.auth.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('now', () => {
    it('returns the current date', () => {
        expect(repo.now()).toBeInstanceOf(Date);
    });
});

describe('createUser', () => {
    it('uses the provided id and inserts with the default roles array', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
            .mockResolvedValue({ rows: [] });

        await expect(
            repo.createUser({ id: 'u1', email: 'a@b.c', passwordHash: 'h', name: 'A' })
        ).resolves.toBe('u1');

        expect(mockQuery).toHaveBeenCalledTimes(2);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO auth_users');
        expect(sql).toContain('ON CONFLICT (email) DO NOTHING');
        expect(sql).toContain('RETURNING id');
        expect(params).toEqual(['u1', 'a@b.c', 'h', ['user'], false]);
        expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO user_profiles');
        expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 'A']);
    });

    it('keeps custom roles and emailVerified as provided', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'u9' }] });

        await repo.createUser({
            id: 'u9',
            email: 'a@b.c',
            passwordHash: 'h',
            roles: ['admin'],
            emailVerified: true,
        });

        expect(mockQuery.mock.calls[0][1]).toEqual(['u9', 'a@b.c', 'h', ['admin'], true]);
    });

    it('returns null when the email already exists and skips the profile insert', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(
            repo.createUser({ id: 'u1', email: 'a@b.c', passwordHash: 'h', name: 'A' })
        ).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('skips the profile insert when name is empty', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'u1' }] });

        await repo.createUser({ id: 'u1', email: 'a@b.c', passwordHash: 'h', name: '' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(
            repo.createUser({ email: 'a@b.c', passwordHash: 'h' })
        ).rejects.toThrow('db down');
    });
});

describe('findUserByEmail', () => {
    const fullRow = {
        id: 'u1',
        email: 'a@b.c',
        password_hash: 'h',
        name: 'A',
        roles: ['user'],
        profile_pic_url: 'p',
        bio: 'b',
        is_active: true,
        email_verified: true,
        created_at: new Date(1000),
    };

    it('maps a full auth user row with the LEFT JOINed profile', async () => {
        mockQuery.mockResolvedValue({ rows: [fullRow] });

        await expect(repo.findUserByEmail('a@b.c')).resolves.toEqual({
            id: 'u1',
            email: 'a@b.c',
            name: 'A',
            password_hash: 'h',
            roles: ['user'],
            profile_pic_url: 'p',
            bio: 'b',
            is_active: true,
            email_verified: true,
            created_at: fullRow.created_at,
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('LEFT JOIN user_profiles p ON p.id = a.id');
        expect(sql).toContain('WHERE a.email = $1');
        expect(params).toEqual(['a@b.c']);
    });

    it('applies defaults for missing optional profile fields', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'u1', email: 'a@b.c', password_hash: 'h', is_active: true, email_verified: false, created_at: null }],
        });

        await expect(repo.findUserByEmail('a@b.c')).resolves.toEqual({
            id: 'u1',
            email: 'a@b.c',
            name: '',
            password_hash: 'h',
            roles: [],
            profile_pic_url: '',
            bio: '',
            is_active: true,
            email_verified: false,
            created_at: null,
        });
    });

    it('returns null when no user matches', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findUserByEmail('nobody@x')).resolves.toBeNull();
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.findUserByEmail('a@b.c')).rejects.toThrow('db down');
    });
});

describe('findUserById', () => {
    it('maps the row and binds the id parameter', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'u1', email: 'a@b.c', password_hash: 'h', name: 'A', roles: ['user'], is_active: true, email_verified: false, created_at: null }],
        });

        await expect(repo.findUserById('u1')).resolves.toEqual(expect.objectContaining({
            id: 'u1',
            email: 'a@b.c',
            name: 'A',
            roles: ['user'],
        }));

        expect(mockQuery.mock.calls[0][1]).toEqual(['u1']);
    });

    it('returns null when no user matches', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findUserById('u1')).resolves.toBeNull();
    });
});

describe('getUserRoles', () => {
    it('returns relational role names when present', async () => {
        mockQuery.mockResolvedValue({ rows: [{ name: 'admin' }, { name: 'user' }] });

        await expect(repo.getUserRoles('u1')).resolves.toEqual(['admin', 'user']);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][1]).toEqual(['u1']);
    });

    it('falls back to the auth_users roles cache', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ roles: ['user', 'organizer'] }] });

        await expect(repo.getUserRoles('u1')).resolves.toEqual(['user', 'organizer']);
    });

    it('returns an empty array when neither source has roles', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getUserRoles('u1')).resolves.toEqual([]);
    });
});

describe('updateUserPassword', () => {
    it('updates the password hash for the user', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateUserPassword('u1', 'newhash');

        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE auth_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            ['newhash', 'u1']
        );
    });
});

describe('createSession', () => {
    it('inserts a session with defaults for optional user agent fields', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const sessionId = await repo.createSession({
            userId: 'u1',
            refreshTokenHash: 'h',
            expiresAt: new Date(2000),
        });

        expect(sessionId).toEqual(expect.any(String));
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO sessions');
        expect(params[0]).toBe(sessionId);
        expect(params[1]).toBe('u1');
        expect(params[2]).toBe('h');
        expect(params[3]).toBe('');
        expect(params[4]).toBe('');
        expect(params[5]).toEqual(new Date(2000));
    });

    it('preserves provided user agent and ip address', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createSession({
            userId: 'u1',
            refreshTokenHash: 'h',
            expiresAt: new Date(2000),
            userAgent: 'ua',
            ipAddress: '1.2.3.4',
        });

        const params = mockQuery.mock.calls[0][1];
        expect(params[3]).toBe('ua');
        expect(params[4]).toBe('1.2.3.4');
    });
});

describe('findSessionByRefreshHash', () => {
    it('returns the raw row when found', async () => {
        const row = { id: 's1', user_id: 'u1', refresh_token_hash: 'h' };
        mockQuery.mockResolvedValue({ rows: [row] });

        await expect(repo.findSessionByRefreshHash('h')).resolves.toBe(row);

        expect(mockQuery.mock.calls[0][1]).toEqual(['h']);
    });

    it('returns null when not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findSessionByRefreshHash('nope')).resolves.toBeNull();
    });
});

describe('revokeSession / revokeAllUserSessions', () => {
    it('revokes a single session', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.revokeSession('s1');

        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE sessions SET revoked_at = NOW() WHERE id = $1',
            ['s1']
        );
    });

    it('revokes all non-revoked sessions for a user', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.revokeAllUserSessions('u1');

        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
            ['u1']
        );
    });
});

describe('cleanExpiredSessions', () => {
    it('returns the deleted row count', async () => {
        mockQuery.mockResolvedValue({ rowCount: 3 });

        await expect(repo.cleanExpiredSessions()).resolves.toBe(3);

        expect(mockQuery.mock.calls[0][0]).toBe('DELETE FROM sessions WHERE expires_at < NOW()');
    });
});

describe('appendRoleToUser', () => {
    it('appends the role and maps attendee to the user role', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.appendRoleToUser('u1', 'attendee');

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[0][0]).toContain('array_append(roles, $2)');
        expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 'attendee']);
        expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO user_roles');
        expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 'user']);
    });

    it('keeps organizer as the role name', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.appendRoleToUser('u1', 'organizer');

        expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 'organizer']);
    });
});

describe('saveToken', () => {
    it('uses the provided id and binds all parameters in order', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.saveToken({
            id: 't1',
            tokenHash: 'h',
            purpose: 'reset',
            email: 'a@b.c',
            expiresAt: new Date(3000),
            userId: 'u1',
        })).resolves.toBe('t1');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO auth_tokens');
        expect(params).toEqual(['t1', 'h', 'reset', 'a@b.c', new Date(3000), 'u1']);
    });

    it('generates an id and defaults userId to null', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const tokenId = await repo.saveToken({
            tokenHash: 'h',
            purpose: 'reset',
            email: 'a@b.c',
            expiresAt: new Date(3000),
        });

        expect(tokenId).toEqual(expect.any(String));
        expect(mockQuery.mock.calls[0][1]).toEqual([
            tokenId, 'h', 'reset', 'a@b.c', new Date(3000), null,
        ]);
    });
});

describe('findTokenByHash', () => {
    it('returns the raw row when found', async () => {
        const row = { id: 't1', purpose: 'reset' };
        mockQuery.mockResolvedValue({ rows: [row] });

        await expect(repo.findTokenByHash('h', 'reset')).resolves.toBe(row);

        expect(mockQuery.mock.calls[0][1]).toEqual(['h', 'reset']);
    });

    it('returns null when not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findTokenByHash('h', 'reset')).resolves.toBeNull();
    });
});

describe('markTokenUsed / verifyUserEmail / verifyUserEmailById', () => {
    it('marks the token used', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.markTokenUsed('t1');

        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE auth_tokens SET used_at = NOW() WHERE id = $1',
            ['t1']
        );
    });

    it('verifies the email by email address', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.verifyUserEmail('a@b.c');

        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE auth_users SET email_verified = true, updated_at = NOW() WHERE email = $1',
            ['a@b.c']
        );
    });

    it('verifies the email by user id', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.verifyUserEmailById('u1');

        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE auth_users SET email_verified = true, updated_at = NOW() WHERE id = $1',
            ['u1']
        );
    });
});

describe('updateUserProfileFields', () => {
    it('builds the upsert and update with ordered parameters', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateUserProfileFields('u1', { name: 'A', profilePicUrl: 'p', bio: 'b' });

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[0][0]).toBe(
            'INSERT INTO user_profiles (id, name, created_at, updated_at)\n     VALUES ($4, \'\', NOW(), NOW())\n     ON CONFLICT (id) DO NOTHING'
        );
        expect(mockQuery.mock.calls[0][1]).toEqual(['u1']);
        expect(mockQuery.mock.calls[1][0]).toBe(
            'UPDATE user_profiles SET name = $1, profile_pic_url = $2, bio = $3, updated_at = NOW() WHERE id = $4'
        );
        expect(mockQuery.mock.calls[1][1]).toEqual(['A', 'p', 'b', 'u1']);
    });

    it('only sets the provided subset of fields', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateUserProfileFields('u1', { name: 'A' });

        expect(mockQuery.mock.calls[0][1]).toEqual(['u1']);
        expect(mockQuery.mock.calls[1][0]).toBe(
            'UPDATE user_profiles SET name = $1, updated_at = NOW() WHERE id = $2'
        );
        expect(mockQuery.mock.calls[1][1]).toEqual(['A', 'u1']);
    });

    it('is a no-op when no field is provided', async () => {
        await repo.updateUserProfileFields('u1', {});

        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('identity functions', () => {
    it('findIdentityByProviderAndSubject returns the row or null', async () => {
        const row = { id: 'i1', user_id: 'u1', provider: 'google', provider_subject: 'sub' };
        mockQuery.mockResolvedValue({ rows: [row] });

        await expect(repo.findIdentityByProviderAndSubject('google', 'sub')).resolves.toBe(row);
        expect(mockQuery.mock.calls[0][1]).toEqual(['google', 'sub']);

        mockQuery.mockResolvedValue({ rows: [] });
        await expect(repo.findIdentityByProviderAndSubject('google', 'x')).resolves.toBeNull();
    });

    it('findIdentitiesByUserId returns all rows for the user', async () => {
        const rows = [{ id: 'i1', user_id: 'u1', provider: 'google' }];
        mockQuery.mockResolvedValue({ rows });

        await expect(repo.findIdentitiesByUserId('u1')).resolves.toBe(rows);
        expect(mockQuery.mock.calls[0][1]).toEqual(['u1']);
    });

    it('createAuthIdentity returns the id or null on conflict', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 'i1' }] });

        await expect(repo.createAuthIdentity({
            id: 'i1', userId: 'u1', provider: 'google', providerSubject: 'sub', providerEmail: 'a@b.c',
        })).resolves.toBe('i1');
        expect(mockQuery.mock.calls[0][1]).toEqual(['i1', 'u1', 'google', 'sub', 'a@b.c']);

        mockQuery.mockResolvedValueOnce({ rows: [] });
        await expect(repo.createAuthIdentity({
            userId: 'u1', provider: 'google', providerSubject: 'dup', providerEmail: 'a@b.c',
        })).resolves.toBeNull();
    });
});

describe('saveEmailVerification', () => {
    it('inserts with ordered parameters and returns the id', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const verificationId = await repo.saveEmailVerification({
            id: 'v1', tokenHash: 'h', userId: 'u1', email: 'a@b.c', expiresAt: new Date(4000),
        });

        expect(verificationId).toBe('v1');
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO email_verifications');
        expect(params).toEqual(['v1', 'h', 'u1', 'a@b.c', new Date(4000)]);
    });
});

describe('findEmailVerificationByHash', () => {
    it('returns the email_verifications row when found', async () => {
        const row = { id: 'v1', token_hash: 'h', user_id: 'u1', email: 'a@b.c' };
        mockQuery.mockResolvedValue({ rows: [row] });

        await expect(repo.findEmailVerificationByHash('h')).resolves.toBe(row);
    });

    it('falls back to the legacy auth_tokens mapping', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{
                    id: 't1', token_hash: 'h', user_id: 'u1', email: 'a@b.c',
                    expires_at: new Date(1000), created_at: new Date(500), used_at: new Date(900),
                }],
            });

        await expect(repo.findEmailVerificationByHash('h')).resolves.toEqual({
            id: 't1',
            token_hash: 'h',
            user_id: 'u1',
            email: 'a@b.c',
            expires_at: new Date(1000),
            created_at: new Date(500),
            consumed_at: new Date(900),
        });

        expect(mockQuery.mock.calls[1][0]).toContain('FROM auth_tokens');
        expect(mockQuery.mock.calls[1][1]).toEqual(['h', 'email_verification']);
    });

    it('returns null when neither table has a match', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findEmailVerificationByHash('nope')).resolves.toBeNull();
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });
});

describe('consumeEmailVerification', () => {
    it('consumes an existing verification and verifies the email', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'v1' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'v1', user_id: 'u1', email: 'a@b.c' }] })
            .mockResolvedValue({ rows: [] });

        await expect(repo.consumeEmailVerification('h')).resolves.toEqual({
            id: 'v1', user_id: 'u1', email: 'a@b.c',
        });

        expect(mockQuery.mock.calls[1][0]).toContain('UPDATE email_verifications');
        expect(mockQuery.mock.calls[2][0]).toContain('UPDATE auth_users SET email_verified = true');
        expect(mockQuery.mock.calls[3][0]).toContain('WHERE id = $1');
    });

    it('returns null when the verification is already consumed or expired', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'v1' }] })
            .mockResolvedValue({ rows: [] });

        await expect(repo.consumeEmailVerification('h')).resolves.toBeNull();
    });

    it('consumes a legacy auth_token without a user id', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 't1', user_id: null, email: 'a@b.c' }] })
            .mockResolvedValue({ rows: [] });

        await expect(repo.consumeEmailVerification('h')).resolves.toEqual({
            id: 't1', user_id: null, email: 'a@b.c',
        });

        expect(mockQuery.mock.calls[1][0]).toContain('UPDATE auth_tokens');
        expect(mockQuery.mock.calls[1][1]).toEqual(['h']);
        expect(mockQuery.mock.calls[2][0]).toContain('UPDATE auth_users SET email_verified = true');
        expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('returns null when nothing can be consumed', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.consumeEmailVerification('h')).resolves.toBeNull();
    });
});
