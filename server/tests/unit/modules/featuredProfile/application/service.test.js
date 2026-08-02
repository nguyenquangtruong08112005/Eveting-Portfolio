/* eslint-env jest */
const { BadRequestError, NotFoundError } = require('@/shared/errors');

const mockRepo = {
  getFeaturedProfilesPage: jest.fn(),
  getFeaturedProfileById: jest.fn(),
  getFeaturedProfileBySlug: jest.fn(),
  featuredProfileSlugExists: jest.fn(),
  createFeaturedProfile: jest.fn(),
  updateFeaturedProfile: jest.fn(),
  deleteFeaturedProfile: jest.fn(),
  userHasAdminRole: jest.fn(),
  userIsFeaturedArtist: jest.fn(),
  setUserFeaturedArtistStatus: jest.fn(),
};

const mockLogger = { info: jest.fn(), error: jest.fn() };

jest.mock('@/providers/database/featuredProfile.repository', () => mockRepo);
jest.mock('@/shared/logger', () => mockLogger);

let cryptoSpy;
let service;

beforeAll(() => {
  cryptoSpy = jest.spyOn(require('crypto'), 'randomUUID').mockReturnValue('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa');
  service = require('@/modules/featuredProfile/application/service');
});

afterAll(() => {
  cryptoSpy.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

const PROFILE_ID = 'fp_test123';
const CREATOR_ID = 'user_creator';

const VALID_PROFILE_DATA = {
  name: 'Test Artist',
  profileType: 'artist',
  bio: '  A great artist  ',
  imageUrl: 'https://example.com/image.jpg',
  avatarUrl: 'https://example.com/avatar.jpg',
  bannerUrl: 'https://example.com/banner.jpg',
  genres: ['  Rock  ', '  Pop  ', '  Rock  ', ''],
  externalLinks: { officialWebsite: 'https://example.com' },
};

const BUILT_PROFILE = {
  name: 'Test Artist',
  profileType: 'artist',
  bio: 'A great artist',
  imageUrl: 'https://example.com/image.jpg',
  avatarUrl: 'https://example.com/avatar.jpg',
  bannerUrl: 'https://example.com/banner.jpg',
  genres: ['Rock', 'Pop'],
  categoryTag: null,
  externalLinks: { officialWebsite: 'https://example.com/' },
  followerCount: 0,
  ownerUserId: CREATOR_ID,
  createdByUserId: CREATOR_ID,
  slug: 'test-artist',
};

// ---------------------------------------------------------------------------
// get delegates
// ---------------------------------------------------------------------------

describe('getAllFeaturedProfiles', () => {
  it('forwards page and limit to repository', async () => {
    const rows = [{ id: 'fp_1' }];
    mockRepo.getFeaturedProfilesPage.mockResolvedValue(rows);
    await expect(service.getAllFeaturedProfiles(2, 20)).resolves.toBe(rows);
    expect(mockRepo.getFeaturedProfilesPage).toHaveBeenCalledWith(2, 20);
  });

  it('uses defaults (1, 10)', async () => {
    mockRepo.getFeaturedProfilesPage.mockResolvedValue([]);
    await service.getAllFeaturedProfiles();
    expect(mockRepo.getFeaturedProfilesPage).toHaveBeenCalledWith(1, 10);
  });
});

describe('getFeaturedProfileById', () => {
  it('delegates to repository', async () => {
    const profile = { id: PROFILE_ID };
    mockRepo.getFeaturedProfileById.mockResolvedValue(profile);
    await expect(service.getFeaturedProfileById(PROFILE_ID)).resolves.toBe(profile);
    expect(mockRepo.getFeaturedProfileById).toHaveBeenCalledWith(PROFILE_ID);
  });
});

describe('getFeaturedProfileBySlug', () => {
  it('delegates to repository', async () => {
    const profile = { id: PROFILE_ID, slug: 'test-artist' };
    mockRepo.getFeaturedProfileBySlug.mockResolvedValue(profile);
    await expect(service.getFeaturedProfileBySlug('test-artist')).resolves.toBe(profile);
    expect(mockRepo.getFeaturedProfileBySlug).toHaveBeenCalledWith('test-artist');
  });
});

// ---------------------------------------------------------------------------
// createFeaturedProfile
// ---------------------------------------------------------------------------

describe('createFeaturedProfile', () => {
  beforeEach(() => {
    mockRepo.featuredProfileSlugExists.mockResolvedValue(false);
    mockRepo.createFeaturedProfile.mockImplementation((id, data) => ({ id, ...data }));
  });

  describe('validation', () => {
    it('throws BadRequestError when creatorId is missing', async () => {
      await expect(service.createFeaturedProfile(VALID_PROFILE_DATA, {}))
        .rejects.toThrow(BadRequestError);
      await expect(service.createFeaturedProfile(VALID_PROFILE_DATA, {}))
        .rejects.toThrow('Featured profile creator is required.');
      expect(mockRepo.createFeaturedProfile).not.toHaveBeenCalled();
    });

    it('throws BadRequestError for unsupported profile type', async () => {
      const data = { ...VALID_PROFILE_DATA, profileType: 'invalid-type' };
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow(BadRequestError);
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow('Unsupported featured profile type.');
    });

    it('throws BadRequestError when name is empty', async () => {
      const data = { ...VALID_PROFILE_DATA, name: '  ' };
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow(BadRequestError);
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow('Featured profile name is required.');
    });

    it('throws BadRequestError for non-object externalLinks', async () => {
      const data = { ...VALID_PROFILE_DATA, externalLinks: 'not-an-object' };
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow(BadRequestError);
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow('externalLinks must be an object.');
    });

    it('throws BadRequestError for unsupported external link key', async () => {
      const data = {
        ...VALID_PROFILE_DATA,
        externalLinks: { twitter: 'https://twitter.com/test' },
      };
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow(BadRequestError);
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow('Unsupported external link "twitter".');
    });

    it('throws BadRequestError for invalid URL in externalLinks', async () => {
      const data = {
        ...VALID_PROFILE_DATA,
        externalLinks: { officialWebsite: 'not-a-url' },
      };
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow(BadRequestError);
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow('External link "officialWebsite" must be a valid URL.');
    });

    it('throws BadRequestError for non-http/https protocol in externalLinks', async () => {
      const data = {
        ...VALID_PROFILE_DATA,
        externalLinks: { officialWebsite: 'ftp://example.com' },
      };
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow(BadRequestError);
      await expect(service.createFeaturedProfile(data, { creatorId: CREATOR_ID }))
        .rejects.toThrow('External link "officialWebsite" must use http or https.');
    });
  });

  describe('normalization', () => {
    it('trims name', async () => {
      const data = { ...VALID_PROFILE_DATA, name: '  Trimmed Name  ' };
      await service.createFeaturedProfile(data, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.name).toBe('Trimmed Name');
    });

    it('trims bio', async () => {
      const data = { ...VALID_PROFILE_DATA, bio: '  Some bio  ' };
      await service.createFeaturedProfile(data, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.bio).toBe('Some bio');
    });

    it('falls back imageUrl to avatarUrl when imageUrl is missing', async () => {
      const data = { ...VALID_PROFILE_DATA, imageUrl: undefined, avatarUrl: 'https://example.com/avatar.jpg' };
      await service.createFeaturedProfile(data, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.imageUrl).toBe('https://example.com/avatar.jpg');
      expect(calledData.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('falls back avatarUrl to imageUrl when avatarUrl is missing', async () => {
      const data = { ...VALID_PROFILE_DATA, avatarUrl: undefined };
      await service.createFeaturedProfile(data, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.imageUrl).toBe('https://example.com/image.jpg');
      expect(calledData.avatarUrl).toBe('https://example.com/image.jpg');
    });

    it('uses empty strings when both imageUrl and avatarUrl are missing', async () => {
      const data = { ...VALID_PROFILE_DATA, imageUrl: undefined, avatarUrl: undefined };
      await service.createFeaturedProfile(data, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.imageUrl).toBe('');
      expect(calledData.avatarUrl).toBe('');
    });

    it('deduplicates, trims, and filters empty genres', async () => {
      const data = {
        ...VALID_PROFILE_DATA,
        genres: ['  Rock  ', '  Pop  ', '  Rock  ', '', '  Jazz  '],
      };
      await service.createFeaturedProfile(data, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.genres).toEqual(['Rock', 'Pop', 'Jazz']);
    });

    it('normalizes externalLinks (skips null/empty, preserves valid URLs)', async () => {
      const data = {
        ...VALID_PROFILE_DATA,
        externalLinks: {
          officialWebsite: 'https://example.com',
          spotify: null,
          youtube: '',
          instagram: 'https://instagram.com/test',
        },
      };
      await service.createFeaturedProfile(data, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.externalLinks).toEqual({
        officialWebsite: 'https://example.com/',
        instagram: 'https://instagram.com/test',
      });
    });

    it('returns empty object for null externalLinks', async () => {
      const data = { ...VALID_PROFILE_DATA, externalLinks: null };
      await service.createFeaturedProfile(data, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.externalLinks).toEqual({});
    });
  });

  describe('slug allocation', () => {
    it('uses slugified name when slug does not collide', async () => {
      mockRepo.featuredProfileSlugExists.mockResolvedValue(false);
      const data = { ...VALID_PROFILE_DATA, name: '  Héllo Wörld  ' };
      await service.createFeaturedProfile(data, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.slug).toBe('hello-world');
    });

    it('appends UUID suffix when slug collides', async () => {
      mockRepo.featuredProfileSlugExists.mockResolvedValue(true);
      await service.createFeaturedProfile(VALID_PROFILE_DATA, { creatorId: CREATOR_ID });
      const calledData = mockRepo.createFeaturedProfile.mock.calls[0][1];
      expect(calledData.slug).toBe('test-artist-aaaaaaaa');
      expect(cryptoSpy).toHaveBeenCalled();
    });
  });

  describe('transaction and logging', () => {
    it('passes transaction to repository when provided', async () => {
      const transaction = { query: jest.fn() };
      await service.createFeaturedProfile(VALID_PROFILE_DATA, { creatorId: CREATOR_ID, transaction });
      expect(mockRepo.featuredProfileSlugExists).toHaveBeenCalledWith('test-artist', transaction);
      expect(mockRepo.createFeaturedProfile).toHaveBeenCalledWith(
        `fp_aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa`,
        expect.any(Object),
        transaction
      );
    });

    it('logs create with profile_api source when no transaction', async () => {
      await service.createFeaturedProfile(VALID_PROFILE_DATA, { creatorId: CREATOR_ID });
      expect(mockLogger.info).toHaveBeenCalledWith('Featured profile created', {
        profileId: `fp_aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa`,
        creatorId: CREATOR_ID,
        source: 'profile_api',
      });
    });

    it('logs create with event_builder source when transaction is provided', async () => {
      const transaction = { query: jest.fn() };
      await service.createFeaturedProfile(VALID_PROFILE_DATA, { creatorId: CREATOR_ID, transaction });
      expect(mockLogger.info).toHaveBeenCalledWith('Featured profile created', {
        profileId: `fp_aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa`,
        creatorId: CREATOR_ID,
        source: 'event_builder',
      });
    });

    it('builds full profile record with all normalized fields', async () => {
      mockRepo.featuredProfileSlugExists.mockResolvedValue(false);
      const created = await service.createFeaturedProfile(VALID_PROFILE_DATA, { creatorId: CREATOR_ID });
      expect(created).toMatchObject(BUILT_PROFILE);
    });

    it('generates profileId with fp_ prefix', async () => {
      await service.createFeaturedProfile(VALID_PROFILE_DATA, { creatorId: CREATOR_ID });
      expect(mockRepo.createFeaturedProfile).toHaveBeenCalledWith(
        expect.stringMatching(/^fp_/),
        expect.any(Object),
        null
      );
    });
  });
});

// ---------------------------------------------------------------------------
// updateFeaturedProfile
// ---------------------------------------------------------------------------

describe('updateFeaturedProfile', () => {
  const EXISTING_PROFILE = { id: PROFILE_ID, name: 'Old Name', slug: 'old-name' };

  beforeEach(() => {
    mockRepo.getFeaturedProfileById.mockResolvedValue(EXISTING_PROFILE);
  });

  describe('validation', () => {
    it('throws NotFoundError when profile does not exist', async () => {
      mockRepo.getFeaturedProfileById.mockResolvedValue(null);
      await expect(service.updateFeaturedProfile(PROFILE_ID, { name: 'New' }))
        .rejects.toThrow(NotFoundError);
      await expect(service.updateFeaturedProfile(PROFILE_ID, { name: 'New' }))
        .rejects.toThrow('Featured profile not found.');
      expect(mockRepo.updateFeaturedProfile).not.toHaveBeenCalled();
    });

    it('throws BadRequestError for unsupported profileType', async () => {
      await expect(service.updateFeaturedProfile(PROFILE_ID, { profileType: 'robot' }))
        .rejects.toThrow(BadRequestError);
      await expect(service.updateFeaturedProfile(PROFILE_ID, { profileType: 'robot' }))
        .rejects.toThrow('Unsupported featured profile type.');
    });

    it('throws BadRequestError for empty name after trimming', async () => {
      await expect(service.updateFeaturedProfile(PROFILE_ID, { name: '  ' }))
        .rejects.toThrow(BadRequestError);
      await expect(service.updateFeaturedProfile(PROFILE_ID, { name: '  ' }))
        .rejects.toThrow('Featured profile name is required.');
    });

    it('throws BadRequestError for invalid externalLinks', async () => {
      await expect(service.updateFeaturedProfile(PROFILE_ID, { externalLinks: 'bad' }))
        .rejects.toThrow(BadRequestError);
      await expect(service.updateFeaturedProfile(PROFILE_ID, { externalLinks: 'bad' }))
        .rejects.toThrow('externalLinks must be an object.');
    });

    it('throws BadRequestError when slug is empty after slugify', async () => {
      await expect(service.updateFeaturedProfile(PROFILE_ID, { slug: '!!!' }))
        .rejects.toThrow(BadRequestError);
      await expect(service.updateFeaturedProfile(PROFILE_ID, { slug: '!!!' }))
        .rejects.toThrow('slug is invalid.');
    });

    it('throws BadRequestError when slug is already in use by another profile', async () => {
      mockRepo.getFeaturedProfileBySlug.mockResolvedValue({ id: 'fp_other', slug: 'taken-slug' });
      await expect(service.updateFeaturedProfile(PROFILE_ID, { slug: 'taken-slug' }))
        .rejects.toThrow(BadRequestError);
      await expect(service.updateFeaturedProfile(PROFILE_ID, { slug: 'taken-slug' }))
        .rejects.toThrow('slug is already in use.');
    });

    it('allows slug that matches current profile (no collision)', async () => {
      mockRepo.getFeaturedProfileBySlug.mockResolvedValue(EXISTING_PROFILE);
      mockRepo.updateFeaturedProfile.mockResolvedValue({ ...EXISTING_PROFILE, slug: 'old-name' });
      await expect(service.updateFeaturedProfile(PROFILE_ID, { slug: 'old-name' }))
        .resolves.toBeDefined();
      expect(mockRepo.updateFeaturedProfile).toHaveBeenCalled();
    });
  });

  describe('selective fields and normalization', () => {
    it('only includes provided fields in update (omits undefined)', async () => {
      mockRepo.updateFeaturedProfile.mockResolvedValue({});
      await service.updateFeaturedProfile(PROFILE_ID, { name: '   New Name   ' });
      const updateArg = mockRepo.updateFeaturedProfile.mock.calls[0][1];
      expect(Object.keys(updateArg)).toEqual(['name']);
      expect(updateArg.name).toBe('New Name');
    });

    it('trims name and bio, normalizes genres', async () => {
      mockRepo.updateFeaturedProfile.mockResolvedValue({});
      await service.updateFeaturedProfile(PROFILE_ID, {
        name: '  New Name  ',
        bio: '  New bio  ',
        genres: ['  A  ', '  B  ', '  A  ', ''],
      });
      const updateArg = mockRepo.updateFeaturedProfile.mock.calls[0][1];
      expect(updateArg.name).toBe('New Name');
      expect(updateArg.bio).toBe('New bio');
      expect(updateArg.genres).toEqual(['A', 'B']);
    });

    it('normalizes externalLinks before update', async () => {
      mockRepo.updateFeaturedProfile.mockResolvedValue({});
      await service.updateFeaturedProfile(PROFILE_ID, {
        externalLinks: { officialWebsite: 'https://example.com', spotify: '' },
      });
      const updateArg = mockRepo.updateFeaturedProfile.mock.calls[0][1];
      expect(updateArg.externalLinks).toEqual({ officialWebsite: 'https://example.com/' });
    });

    it('slugifies the slug before updating', async () => {
      mockRepo.getFeaturedProfileBySlug.mockResolvedValue(null);
      mockRepo.updateFeaturedProfile.mockResolvedValue({});
      await service.updateFeaturedProfile(PROFILE_ID, { slug: '  New Slug!  ' });
      const updateArg = mockRepo.updateFeaturedProfile.mock.calls[0][1];
      expect(updateArg.slug).toBe('new-slug');
    });

    it('passes profileId and allowed fields to repository.updateFeaturedProfile', async () => {
      mockRepo.updateFeaturedProfile.mockResolvedValue({ id: PROFILE_ID, name: 'Updated' });
      const result = await service.updateFeaturedProfile(PROFILE_ID, { name: 'Updated' });
      expect(mockRepo.updateFeaturedProfile).toHaveBeenCalledWith(PROFILE_ID, { name: 'Updated' });
      expect(result).toEqual({ id: PROFILE_ID, name: 'Updated' });
    });
  });
});

// ---------------------------------------------------------------------------
// deleteFeaturedProfile
// ---------------------------------------------------------------------------

describe('deleteFeaturedProfile', () => {
  const EXISTING_PROFILE = { id: PROFILE_ID, name: 'To Delete' };

  it('throws NotFoundError when profile does not exist', async () => {
    mockRepo.getFeaturedProfileById.mockResolvedValue(null);
    await expect(service.deleteFeaturedProfile(PROFILE_ID))
      .rejects.toThrow(NotFoundError);
    await expect(service.deleteFeaturedProfile(PROFILE_ID))
      .rejects.toThrow('Featured profile not found.');
    expect(mockRepo.deleteFeaturedProfile).not.toHaveBeenCalled();
  });

  it('deletes profile successfully', async () => {
    mockRepo.getFeaturedProfileById.mockResolvedValue(EXISTING_PROFILE);
    mockRepo.deleteFeaturedProfile.mockResolvedValue(undefined);
    await expect(service.deleteFeaturedProfile(PROFILE_ID)).resolves.toBeUndefined();
    expect(mockRepo.getFeaturedProfileById).toHaveBeenCalledWith(PROFILE_ID);
    expect(mockRepo.deleteFeaturedProfile).toHaveBeenCalledWith(PROFILE_ID);
  });
});

// ---------------------------------------------------------------------------
// role and featured status delegates
// ---------------------------------------------------------------------------

describe('hasAdminPrivileges', () => {
  it('delegates to repository and returns result', async () => {
    mockRepo.userHasAdminRole.mockResolvedValue(true);
    await expect(service.hasAdminPrivileges('user_1')).resolves.toBe(true);
    expect(mockRepo.userHasAdminRole).toHaveBeenCalledWith('user_1');
  });
});

describe('isFeaturedArtist', () => {
  it('delegates to repository and returns result', async () => {
    mockRepo.userIsFeaturedArtist.mockResolvedValue(true);
    await expect(service.isFeaturedArtist('user_1')).resolves.toBe(true);
    expect(mockRepo.userIsFeaturedArtist).toHaveBeenCalledWith('user_1');
  });
});

// ---------------------------------------------------------------------------
// grantFeaturedArtist
// ---------------------------------------------------------------------------

describe('grantFeaturedArtist', () => {
  it('throws NotFoundError when user not found', async () => {
    mockRepo.setUserFeaturedArtistStatus.mockResolvedValue(null);
    await expect(service.grantFeaturedArtist('user_missing'))
      .rejects.toThrow(NotFoundError);
    await expect(service.grantFeaturedArtist('user_missing'))
      .rejects.toThrow('User not found.');
  });

  it('returns mapped result on success', async () => {
    mockRepo.setUserFeaturedArtistStatus.mockResolvedValue({
      id: 'user_1',
      is_featured_artist: true,
    });
    const result = await service.grantFeaturedArtist('user_1');
    expect(result).toEqual({ userId: 'user_1', isFeaturedArtist: true });
    expect(mockRepo.setUserFeaturedArtistStatus).toHaveBeenCalledWith('user_1', true);
  });

  it('maps is_featured_artist === false correctly', async () => {
    mockRepo.setUserFeaturedArtistStatus.mockResolvedValue({
      id: 'user_2',
      is_featured_artist: false,
    });
    const result = await service.grantFeaturedArtist('user_2');
    expect(result).toEqual({ userId: 'user_2', isFeaturedArtist: false });
  });
});
