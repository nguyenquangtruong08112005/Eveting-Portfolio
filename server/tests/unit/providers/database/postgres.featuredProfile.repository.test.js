'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({ query: mockQuery }));

const repo = require('@/providers/database/postgres.featuredProfile.repository');

function profileRow(overrides = {}) {
    return {
        id: 'p1',
        name: 'Artist One',
        profile_type: 'band',
        bio: 'A bio',
        image_url: 'http://img/one.jpg',
        genres: ['rock'],
        follower_count: '1200',
        owner_user_id: 'u1',
        slug: 'artist-one',
        banner_url: 'http://banner.jpg',
        avatar_url: 'http://avatar.jpg',
        category_tag: 'vietnamese',
        external_links: { facebook: 'page' },
        created_by_user_id: 'u2',
        raw_data: null,
        ...overrides,
    };
}

function mappedProfile() {
    return {
        id: 'p1',
        name: 'Artist One',
        profileType: 'band',
        bio: 'A bio',
        imageUrl: 'http://img/one.jpg',
        genres: ['rock'],
        followerCount: 1200,
        followersCount: 1200,
        ownerUserId: 'u1',
        slug: 'artist-one',
        bannerUrl: 'http://banner.jpg',
        avatarUrl: 'http://avatar.jpg',
        categoryTag: 'vietnamese',
        externalLinks: { facebook: 'page' },
        createdByUserId: 'u2',
    };
}

function makeTx() {
    const txQuery = jest.fn();
    return { client: { query: txQuery }, txQuery };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getFeaturedProfilesPage', () => {
    it('returns mapped profiles and pagination from count and page queries', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 25 }] })
            .mockResolvedValueOnce({ rows: [profileRow(), profileRow({ id: 'p2', name: 'Artist Two' })] });

        const result = await repo.getFeaturedProfilesPage(3, 10);

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('SELECT COUNT(*)::int AS count FROM featured_profiles');
        expect(countCall.length).toBe(1);

        const pageCall = mockQuery.mock.calls[1];
        expect(pageCall[0]).toContain('SELECT id, name, profile_type, bio, image_url, genres, follower_count');
        expect(pageCall[0]).toContain('FROM featured_profiles');
        expect(pageCall[0]).toContain('ORDER BY name');
        expect(pageCall[0]).toContain('LIMIT $1 OFFSET $2');
        expect(pageCall[1]).toEqual([10, 20]);

        expect(result.profiles).toHaveLength(2);
        expect(result.profiles[0]).toEqual(mappedProfile());
        expect(result.pagination).toEqual({
            currentPage: 3,
            limit: 10,
            totalPages: 3,
            totalItems: 25,
        });
    });

    it('uses page and limit defaults when omitted', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] }).mockResolvedValueOnce({ rows: [] });

        const result = await repo.getFeaturedProfilesPage();

        expect(mockQuery.mock.calls[1][1]).toEqual([10, 0]);
        expect(result.pagination).toEqual({
            currentPage: 1,
            limit: 10,
            totalPages: 0,
            totalItems: 0,
        });
        expect(result.profiles).toEqual([]);
    });

    it('spreads raw_data and overrides with first-class columns when present', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 1 }] })
            .mockResolvedValueOnce({
                rows: [
                    profileRow({
                        id: 'p2',
                        name: 'ColName',
                        profile_type: null,
                        bio: null,
                        image_url: 'http://col.jpg',
                        genres: null,
                        follower_count: '50',
                        owner_user_id: null,
                        slug: null,
                        banner_url: null,
                        avatar_url: null,
                        category_tag: null,
                        external_links: null,
                        created_by_user_id: null,
                        raw_data: {
                            name: 'RawName',
                            bio: 'RawBio',
                            followerCount: 999,
                            categoryTag: 'raw-tag',
                            avatarUrl: 'http://raw-avatar.jpg',
                            externalLinks: { instagram: 'raw' },
                            createdByUserId: 'raw-creator',
                            customKey: 'kept',
                        },
                    }),
                ],
            });

        const result = await repo.getFeaturedProfilesPage(1, 10);

        const profile = result.profiles[0];
        expect(profile).toEqual(expect.objectContaining({
            id: 'p2',
            name: 'ColName',
            profileType: 'artist',
            bio: '',
            imageUrl: 'http://col.jpg',
            genres: [],
            followerCount: 50,
            followersCount: 50,
            ownerUserId: null,
            categoryTag: 'raw-tag',
            avatarUrl: 'http://raw-avatar.jpg',
            externalLinks: { instagram: 'raw' },
            createdByUserId: 'raw-creator',
            customKey: 'kept',
        }));
    });

    it('falls back to defaults when first-class columns are absent', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 1 }] })
            .mockResolvedValueOnce({
                rows: [profileRow({
                    name: 'Minimal',
                    profile_type: null,
                    bio: null,
                    image_url: null,
                    genres: null,
                    follower_count: null,
                    owner_user_id: null,
                    slug: null,
                    banner_url: null,
                    avatar_url: null,
                    category_tag: null,
                    external_links: null,
                    created_by_user_id: null,
                })],
            });

        const profile = (await repo.getFeaturedProfilesPage(1, 10)).profiles[0];

        expect(profile).toEqual(expect.objectContaining({
            name: 'Minimal',
            profileType: 'artist',
            bio: '',
            imageUrl: '',
            genres: [],
            followerCount: 0,
            followersCount: 0,
            ownerUserId: null,
            slug: null,
            bannerUrl: '',
            avatarUrl: '',
            categoryTag: null,
            externalLinks: {},
            createdByUserId: null,
        }));
    });

    it('mirrors followerCount into followersCount for a raw_data row', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 1 }] })
            .mockResolvedValueOnce({
                rows: [profileRow({
                    follower_count: '77',
                    raw_data: { followersCount: 5 },
                })],
            });

        const profile = (await repo.getFeaturedProfilesPage(1, 10)).profiles[0];

        expect(profile.followerCount).toBe(77);
        expect(profile.followersCount).toBe(77);
    });
});

describe('getFeaturedProfileById', () => {
    it('returns null when the profile is not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getFeaturedProfileById('missing')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE id = $1'),
            ['missing']
        );
    });

    it('returns the mapped profile when found', async () => {
        mockQuery.mockResolvedValue({ rows: [profileRow()] });

        await expect(repo.getFeaturedProfileById('p1')).resolves.toEqual(mappedProfile());
    });

    it('delegates to the transaction client when provided', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [profileRow()] });

        const result = await repo.getFeaturedProfileById('p1', client);

        expect(txQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['p1']);
        expect(result).toEqual(mappedProfile());
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('getFeaturedProfileBySlug', () => {
    it('queries with case-insensitive slug and returns the mapped profile', async () => {
        mockQuery.mockResolvedValue({ rows: [profileRow()] });

        const result = await repo.getFeaturedProfileBySlug('ARTIST-ONE');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE LOWER(slug) = LOWER($1)'),
            ['ARTIST-ONE']
        );
        expect(result).toEqual(mappedProfile());
    });

    it('returns null when no profile matches the slug', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getFeaturedProfileBySlug('nope')).resolves.toBeNull();
    });
});

describe('featuredProfileSlugExists', () => {
    it('returns true when a row matches', async () => {
        mockQuery.mockResolvedValue({ rows: [{ 1: 1 }] });

        await expect(repo.featuredProfileSlugExists('artist-one')).resolves.toBe(true);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE LOWER(slug) = LOWER($1)'),
            ['artist-one']
        );
    });

    it('returns false when no row matches', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.featuredProfileSlugExists('artist-one')).resolves.toBe(false);
    });

    it('delegates to the transaction client when provided', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [{ 1: 1 }] });

        await expect(repo.featuredProfileSlugExists('artist-one', client)).resolves.toBe(true);

        expect(txQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE LOWER(slug) = LOWER($1)'),
            ['artist-one']
        );
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('createFeaturedProfile', () => {
    it('inserts all 15 parameters in order and returns the merged profile', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const profile = {
            name: 'X',
            profileType: 'solo',
            bio: 'b',
            imageUrl: 'i',
            genres: ['j'],
            followerCount: 5,
            ownerUserId: 'o',
            slug: 's',
            bannerUrl: 'bn',
            avatarUrl: 'av',
            categoryTag: 'c',
            externalLinks: { a: 1 },
            createdByUserId: 'cu',
        };

        const result = await repo.createFeaturedProfile('fp1', profile);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO featured_profiles');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
        expect(sql).toContain('$13::jsonb, $14, $15::jsonb, NOW()');
        expect(params).toEqual([
            'fp1',
            'X',
            'solo',
            'b',
            'i',
            ['j'],
            5,
            'o',
            's',
            'bn',
            'av',
            'c',
            JSON.stringify({ a: 1 }),
            'cu',
            JSON.stringify(profile),
        ]);
        expect(result).toEqual({ ...profile, id: 'fp1' });
    });

    it('applies defaults when optional fields are absent', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const profile = { imageUrl: 'img', ownerUserId: 'u' };

        await repo.createFeaturedProfile('fp1', profile);

        const params = mockQuery.mock.calls[0][1];
        expect(params).toEqual([
            'fp1',
            '',
            'artist',
            '',
            'img',
            [],
            0,
            'u',
            null,
            '',
            'img',
            null,
            '{}',
            'u',
            JSON.stringify(profile),
        ]);
    });

    it('delegates to the transaction client when provided', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        await repo.createFeaturedProfile('fp1', { name: 'X' }, client);

        expect(txQuery).toHaveBeenCalledTimes(1);
        expect(txQuery.mock.calls[0][0]).toContain('INSERT INTO featured_profiles');
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('updateFeaturedProfile', () => {
    it('throws when the profile does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.updateFeaturedProfile('missing', { name: 'X' })).rejects.toThrow(
            'Featured profile not found'
        );

        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('merges existing data, upserts, and returns the refreshed profile', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [profileRow()] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [profileRow({ name: 'Artist One (Renamed)' })] });

        const result = await repo.updateFeaturedProfile('p1', { name: 'Artist One (Renamed)' });

        expect(mockQuery).toHaveBeenCalledTimes(3);
        expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO featured_profiles');
        expect(mockQuery.mock.calls[1][1][1]).toBe('Artist One (Renamed)');
        expect(result.name).toBe('Artist One (Renamed)');
        expect(result.id).toBe('p1');
    });

    it('routes all reads and writes through the transaction client', async () => {
        const { client, txQuery } = makeTx();
        txQuery
            .mockResolvedValueOnce({ rows: [profileRow()] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [profileRow({ name: 'New' })] });

        const result = await repo.updateFeaturedProfile('p1', { name: 'New' }, client);

        expect(txQuery).toHaveBeenCalledTimes(3);
        expect(result.name).toBe('New');
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('deleteFeaturedProfile', () => {
    it('deletes the profile by id', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.deleteFeaturedProfile('p1');

        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM featured_profiles WHERE id = $1',
            ['p1']
        );
    });
});

describe('userHasOrganizerRole', () => {
    it('returns false without querying when userId is missing', async () => {
        await expect(repo.userHasOrganizerRole(null)).resolves.toBe(false);
        await expect(repo.userHasOrganizerRole(undefined)).resolves.toBe(false);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns false when the user has no roles row', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(repo.userHasOrganizerRole('u1')).resolves.toBe(false);
    });

    it('returns false when roles do not include organizer', async () => {
        mockQuery.mockResolvedValue({ rows: [{ roles: ['fan', 'admin'] }] });
        await expect(repo.userHasOrganizerRole('u1')).resolves.toBe(false);
    });

    it('returns false when roles is null', async () => {
        mockQuery.mockResolvedValue({ rows: [{ roles: null }] });
        await expect(repo.userHasOrganizerRole('u1')).resolves.toBe(false);
    });

    it('returns true when roles include organizer', async () => {
        mockQuery.mockResolvedValue({ rows: [{ roles: ['fan', 'organizer'] }] });
        await expect(repo.userHasOrganizerRole('u1')).resolves.toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT roles FROM auth_users WHERE id = $1',
            ['u1']
        );
    });
});

describe('userHasAdminRole', () => {
    it('returns false without querying when userId is missing', async () => {
        await expect(repo.userHasAdminRole(null)).resolves.toBe(false);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns false when the user has no roles row', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(repo.userHasAdminRole('u1')).resolves.toBe(false);
    });

    it('returns true when roles include admin', async () => {
        mockQuery.mockResolvedValue({ rows: [{ roles: ['admin'] }] });
        await expect(repo.userHasAdminRole('u1')).resolves.toBe(true);
    });

    it('returns false when roles do not include admin', async () => {
        mockQuery.mockResolvedValue({ rows: [{ roles: ['organizer'] }] });
        await expect(repo.userHasAdminRole('u1')).resolves.toBe(false);
    });
});

describe('userIsFeaturedArtist', () => {
    it('returns false without querying when userId is missing', async () => {
        await expect(repo.userIsFeaturedArtist(null)).resolves.toBe(false);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns true when is_featured_artist is true', async () => {
        mockQuery.mockResolvedValue({ rows: [{ is_featured_artist: true }] });
        await expect(repo.userIsFeaturedArtist('u1')).resolves.toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT is_featured_artist FROM auth_users WHERE id = $1',
            ['u1']
        );
    });

    it('returns false when is_featured_artist is false', async () => {
        mockQuery.mockResolvedValue({ rows: [{ is_featured_artist: false }] });
        await expect(repo.userIsFeaturedArtist('u1')).resolves.toBe(false);
    });

    it('returns false when is_featured_artist is undefined', async () => {
        mockQuery.mockResolvedValue({ rows: [{}] });
        await expect(repo.userIsFeaturedArtist('u1')).resolves.toBe(false);
    });

    it('returns false when the user is not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(repo.userIsFeaturedArtist('u1')).resolves.toBe(false);
    });
});

describe('setUserFeaturedArtistStatus', () => {
    it('updates with the boolean coercion and returns the row', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'u1', is_featured_artist: true }] });

        const result = await repo.setUserFeaturedArtistStatus('u1');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('SET is_featured_artist = $2'),
            ['u1', true]
        );
        expect(result).toEqual({ id: 'u1', is_featured_artist: true });
    });

    it('passes false through unchanged', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'u1', is_featured_artist: false }] });

        await repo.setUserFeaturedArtistStatus('u1', false);

        expect(mockQuery.mock.calls[0][1]).toEqual(['u1', false]);
    });

    it('returns null when no row is returned', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.setUserFeaturedArtistStatus('u1', true)).resolves.toBeNull();
    });
});

describe('getFeaturedProfilesByIds', () => {
    it('returns an empty list without querying for empty or missing ids', async () => {
        await expect(repo.getFeaturedProfilesByIds([])).resolves.toEqual([]);
        await expect(repo.getFeaturedProfilesByIds(null)).resolves.toEqual([]);
        await expect(repo.getFeaturedProfilesByIds(undefined)).resolves.toEqual([]);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('queries with ANY($1) and maps the rows', async () => {
        mockQuery.mockResolvedValue({ rows: [profileRow(), profileRow({ id: 'p2', name: 'Two' })] });

        const result = await repo.getFeaturedProfilesByIds(['p1', 'p2']);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE id = ANY($1)'),
            [['p1', 'p2']]
        );
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(mappedProfile());
    });

    it('returns an empty list when no rows match', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getFeaturedProfilesByIds(['nope'])).resolves.toEqual([]);
    });
});

describe('getFeaturedProfileNamesByIds', () => {
    it('returns an empty list without querying for empty ids', async () => {
        await expect(repo.getFeaturedProfileNamesByIds([])).resolves.toEqual([]);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns the name for each row', async () => {
        mockQuery.mockResolvedValue({ rows: [{ name: 'A' }, { name: 'B' }] });

        await expect(repo.getFeaturedProfileNamesByIds(['1', '2'])).resolves.toEqual(['A', 'B']);

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT name FROM featured_profiles WHERE id = ANY($1)',
            [['1', '2']]
        );
    });
});

describe('getFeaturedProfilesDataByIds', () => {
    it('delegates to getFeaturedProfilesByIds', async () => {
        mockQuery.mockResolvedValue({ rows: [profileRow()] });

        const result = await repo.getFeaturedProfilesDataByIds(['p1']);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE id = ANY($1)'),
            [['p1']]
        );
        expect(result).toEqual([mappedProfile()]);
    });
});

describe('getAllFeaturedProfiles', () => {
    it('returns all profiles ordered by name', async () => {
        mockQuery.mockResolvedValue({ rows: [profileRow(), profileRow({ id: 'p2', name: 'Two' })] });

        const result = await repo.getAllFeaturedProfiles();

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('SELECT id, name, profile_type');
        expect(sql).toContain('ORDER BY name');
        expect(params).toBeUndefined();
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(mappedProfile());
    });

    it('returns an empty list when there are no profiles', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getAllFeaturedProfiles()).resolves.toEqual([]);
    });
});
