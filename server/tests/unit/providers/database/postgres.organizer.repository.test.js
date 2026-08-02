'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

jest.mock('@/providers/database/postgres.user.repository', () => ({
    addOrganizerRoleToUser: jest.fn(),
    updateUserFields: jest.fn(),
    getRawUserDataById: jest.fn(),
}));

const repo = require('@/providers/database/postgres.organizer.repository');
const {
    addOrganizerRoleToUser: userAddOrganizerRoleToUser,
    updateUserFields: userUpdateUserFields,
    getRawUserDataById: userGetRawUserDataById,
} = require('@/providers/database/postgres.user.repository');

beforeEach(() => {
    jest.clearAllMocks();
    userAddOrganizerRoleToUser.mockResolvedValue();
    userUpdateUserFields.mockResolvedValue();
    userGetRawUserDataById.mockResolvedValue(null);
});

describe('getOrganizerProfile', () => {
    it('returns null when the user does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getOrganizerProfile('u1')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM auth_users a'), ['u1']);
    });

    it('maps the row with organizer fields and defaults for optionals', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'u1',
                name: 'A',
                email: 'a@b.c',
                profile_pic_url: 'p',
                roles: ['user', 'organizer'],
                company_name: 'Co',
                tax_code: 'T',
                website: null,
                description: null,
                status: null,
                created_at: new Date(1000),
                raw_data: null,
            }],
        });

        const result = await repo.getOrganizerProfile('u1');

        expect(result).toEqual({
            id: 'u1',
            name: 'A',
            email: 'a@b.c',
            profilePicUrl: 'p',
            roles: ['user', 'organizer'],
            organizerInfo: {
                companyName: 'Co',
                taxCode: 'T',
                description: '',
                website: '',
                status: 'approved',
                createdAt: 1000,
            },
        });
    });

    it('spreads raw_data under the organizer info fields', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'u1', name: null, email: null, profile_pic_url: null, roles: null,
                company_name: 'Co', tax_code: null, website: null, description: null,
                status: 'pending', created_at: null, raw_data: { legacy: 'l', status: 'pending' },
            }],
        });

        const result = await repo.getOrganizerProfile('u1');

        expect(result.organizerInfo).toEqual({
            legacy: 'l',
            companyName: 'Co',
            taxCode: '',
            description: '',
            website: '',
            status: 'pending',
            createdAt: expect.any(Number),
        });
    });

    it('falls back to user_profiles organizer_info when no organizer_profiles row exists', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'u1', name: 'A', email: 'a@b.c', profile_pic_url: '', roles: [],
                company_name: null, tax_code: null, website: null, description: null,
                status: null, created_at: null, raw_data: null,
            }],
        });
        userGetRawUserDataById.mockResolvedValue({ organizerInfo: { companyName: 'Legacy' } });

        const result = await repo.getOrganizerProfile('u1');

        expect(userGetRawUserDataById).toHaveBeenCalledWith('u1');
        expect(result.organizerInfo).toEqual({ companyName: 'Legacy' });
    });

    it('omits organizerInfo when no fallback data exists', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'u1', name: 'A', email: 'a@b.c', profile_pic_url: '', roles: [],
                company_name: null, tax_code: null, website: null, description: null,
                status: null, created_at: null, raw_data: null,
            }],
        });

        const result = await repo.getOrganizerProfile('u1');

        expect(result.organizerInfo).toBeUndefined();
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getOrganizerProfile('u1')).rejects.toThrow('db down');
    });
});

describe('addOrganizerRoleToUser', () => {
    it('delegates to the user repository and upserts organizer_profiles', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'u1', name: 'A', email: 'a@b.c', profile_pic_url: '', roles: [],
                company_name: 'Co', tax_code: 'T', website: 'w', description: 'd',
                status: 'approved', created_at: new Date(1000), raw_data: null,
            }],
        });

        const result = await repo.addOrganizerRoleToUser('u1', {
            companyName: 'Co', taxCode: 'T', website: 'w', description: 'd',
        });

        expect(userAddOrganizerRoleToUser).toHaveBeenCalledWith('u1', {
            companyName: 'Co', taxCode: 'T', website: 'w', description: 'd',
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO organizer_profiles');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
        expect(params).toEqual([
            'u1', 'Co', 'T', 'w', 'd', 'approved', expect.any(Date),
            JSON.stringify({ status: 'approved', companyName: 'Co', taxCode: 'T', website: 'w', description: 'd' }),
        ]);

        expect(result.id).toBe('u1');
    });

    it('applies defaults for missing fields and honors an explicit status', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'u1', name: '', email: '', profile_pic_url: '', roles: [],
                company_name: 'Co', tax_code: '', website: '', description: '',
                status: 'pending', created_at: new Date(1000), raw_data: null,
            }],
        });

        const result = await repo.addOrganizerRoleToUser('u1', { companyName: 'Co', status: 'pending' });

        const params = mockQuery.mock.calls[0][1];
        expect(params[1]).toBe('Co');
        expect(params[2]).toBe('');
        expect(params[3]).toBe('');
        expect(params[4]).toBe('');
        expect(params[5]).toBe('pending');
        expect(params[7]).toBe(JSON.stringify({ status: 'pending', companyName: 'Co' }));
        expect(result.organizerInfo.status).toBe('pending');
    });

    it('propagates user repository failures', async () => {
        userAddOrganizerRoleToUser.mockRejectedValue(new Error('repo down'));

        await expect(repo.addOrganizerRoleToUser('u1', { companyName: 'Co' })).rejects.toThrow('repo down');
    });
});

describe('updateOrganizerProfile', () => {
    it('delegates to the user repository and updates recognized org columns', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'u1', name: 'A', email: 'a@b.c', profile_pic_url: '', roles: [],
                company_name: 'NewCo', tax_code: 'T', website: 'w', description: 'd',
                status: 'approved', created_at: new Date(1000), raw_data: null,
            }],
        });

        const result = await repo.updateOrganizerProfile('u1', {
            companyName: 'NewCo', taxCode: 'T', website: 'w', description: 'd', status: 'approved',
        });

        expect(userUpdateUserFields).toHaveBeenCalledWith('u1', {
            companyName: 'NewCo', taxCode: 'T', website: 'w', description: 'd', status: 'approved',
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            "UPDATE organizer_profiles SET company_name = $1, tax_code = $2, website = $3, description = $4, status = $5, raw_data = COALESCE(raw_data, '{}'::jsonb) || $6::jsonb, updated_at = NOW() WHERE id = $7"
        );
        expect(params).toEqual([
            'NewCo', 'T', 'w', 'd', 'approved',
            JSON.stringify({ companyName: 'NewCo', taxCode: 'T', website: 'w', description: 'd', status: 'approved' }),
            'u1',
        ]);
        expect(result.organizerInfo.companyName).toBe('NewCo');
    });

    it('maps organizerInfo dot-prefixed keys to org columns', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'u1', name: '', email: '', profile_pic_url: '', roles: [],
                company_name: 'Co', tax_code: '', website: '', description: 'Desc',
                status: 'approved', created_at: new Date(1000), raw_data: null,
            }],
        });

        const result = await repo.updateOrganizerProfile('u1', {
            'organizerInfo.companyName': 'Co',
            'organizerInfo.description': 'Desc',
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('company_name = $1');
        expect(sql).toContain('description = $2');
        expect(params).toEqual([
            'Co', 'Desc',
            JSON.stringify({ companyName: 'Co', description: 'Desc' }),
            'u1',
        ]);
        expect(result.organizerInfo.description).toBe('Desc');
    });

    it('skips profile-only updates that have no org columns', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'u1', name: 'A', email: '', profile_pic_url: '', roles: [],
                company_name: null, tax_code: null, website: null, description: null,
                status: null, created_at: new Date(1000), raw_data: null,
            }],
        });

        const result = await repo.updateOrganizerProfile('u1', { name: 'NewName' });

        expect(userUpdateUserFields).toHaveBeenCalledWith('u1', { name: 'NewName' });
        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(result.name).toBe('A');
    });

    it('propagates user repository failures', async () => {
        userUpdateUserFields.mockRejectedValue(new Error('repo down'));

        await expect(repo.updateOrganizerProfile('u1', { name: 'X' })).rejects.toThrow('repo down');
    });
});
