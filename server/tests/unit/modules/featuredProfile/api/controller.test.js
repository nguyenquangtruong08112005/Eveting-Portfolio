'use strict';

const mockProfileService = {
  getAllFeaturedProfiles: jest.fn(),
  getFeaturedProfileById: jest.fn(),
  getFeaturedProfileBySlug: jest.fn(),
  isFeaturedArtist: jest.fn(),
  createFeaturedProfile: jest.fn(),
  hasAdminPrivileges: jest.fn(),
  updateFeaturedProfile: jest.fn(),
  deleteFeaturedProfile: jest.fn(),
  grantFeaturedArtist: jest.fn(),
};

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

jest.mock('@/modules/featuredProfile/application/service', () => mockProfileService);

const {
  getAllProfiles,
  getProfileById,
  getProfileBySlug,
  createProfile,
  updateProfile,
  deleteProfile,
  grantFeaturedArtist,
} = require('@/modules/featuredProfile/api/controller');

const uid = 'user_001';
const profileId = 'fp_001';

function mockReq(overrides = {}) {
  return {
    user: { uid, roles: [] },
    params: {},
    body: {},
    query: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getAllProfiles', () => {
  it('returns all profiles with default pagination', async () => {
    const result = { profiles: [], total: 0 };
    mockProfileService.getAllFeaturedProfiles.mockResolvedValue(result);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await getAllProfiles(req, res, next);

    expect(mockProfileService.getAllFeaturedProfiles).toHaveBeenCalledWith(1, 10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('parses page and limit from query', async () => {
    mockProfileService.getAllFeaturedProfiles.mockResolvedValue({ profiles: [] });
    const req = mockReq({ query: { page: '3', limit: '5' } });
    const res = mockRes();
    const next = jest.fn();

    await getAllProfiles(req, res, next);

    expect(mockProfileService.getAllFeaturedProfiles).toHaveBeenCalledWith(3, 5);
  });

  it('falls back to defaults on NaN', async () => {
    mockProfileService.getAllFeaturedProfiles.mockResolvedValue({ profiles: [] });
    const req = mockReq({ query: { page: 'abc', limit: 'xyz' } });
    const res = mockRes();
    const next = jest.fn();

    await getAllProfiles(req, res, next);

    expect(mockProfileService.getAllFeaturedProfiles).toHaveBeenCalledWith(1, 10);
  });

  it('clamps limit to max 100', async () => {
    mockProfileService.getAllFeaturedProfiles.mockResolvedValue({ profiles: [] });
    const req = mockReq({ query: { limit: '999' } });
    const res = mockRes();
    const next = jest.fn();

    await getAllProfiles(req, res, next);

    expect(mockProfileService.getAllFeaturedProfiles).toHaveBeenCalledWith(1, 100);
  });

  it('clamps page to minimum 1', async () => {
    mockProfileService.getAllFeaturedProfiles.mockResolvedValue({ profiles: [] });
    const req = mockReq({ query: { page: '0' } });
    const res = mockRes();
    const next = jest.fn();

    await getAllProfiles(req, res, next);

    expect(mockProfileService.getAllFeaturedProfiles).toHaveBeenCalledWith(1, 10);
  });

  it('propagates service error via next', async () => {
    mockProfileService.getAllFeaturedProfiles.mockRejectedValue(new Error('DB fail'));
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await getAllProfiles(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'DB fail' }));
  });
});

describe('getProfileById', () => {
  it('returns profile with 200', async () => {
    const profile = { id: profileId, name: 'Artist' };
    mockProfileService.getFeaturedProfileById.mockResolvedValue(profile);
    const req = mockReq({ params: { profileId } });
    const res = mockRes();
    const next = jest.fn();

    await getProfileById(req, res, next);

    expect(mockProfileService.getFeaturedProfileById).toHaveBeenCalledWith(profileId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(profile);
  });

  it('throws NotFoundError when profile is null', async () => {
    mockProfileService.getFeaturedProfileById.mockResolvedValue(null);
    const req = mockReq({ params: { profileId } });
    const res = mockRes();
    const next = jest.fn();

    await getProfileById(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Featured profile not found.' })
    );
  });

  it('propagates async error via next', async () => {
    mockProfileService.getFeaturedProfileById.mockRejectedValue(new Error('Fail'));
    const req = mockReq({ params: { profileId } });
    const res = mockRes();
    const next = jest.fn();

    await getProfileById(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Fail' }));
  });
});

describe('getProfileBySlug', () => {
  it('returns profile by slug with 200', async () => {
    const profile = { id: profileId, slug: 'cool-artist' };
    mockProfileService.getFeaturedProfileBySlug.mockResolvedValue(profile);
    const req = mockReq({ params: { slug: 'cool-artist' } });
    const res = mockRes();
    const next = jest.fn();

    await getProfileBySlug(req, res, next);

    expect(mockProfileService.getFeaturedProfileBySlug).toHaveBeenCalledWith('cool-artist');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(profile);
  });

  it('throws NotFoundError when slug not found', async () => {
    mockProfileService.getFeaturedProfileBySlug.mockResolvedValue(null);
    const req = mockReq({ params: { slug: 'unknown' } });
    const res = mockRes();
    const next = jest.fn();

    await getProfileBySlug(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Featured profile not found.' })
    );
  });

  it('propagates async error via next', async () => {
    mockProfileService.getFeaturedProfileBySlug.mockRejectedValue(new Error('Fail'));
    const req = mockReq({ params: { slug: 'test' } });
    const res = mockRes();
    const next = jest.fn();

    await getProfileBySlug(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Fail' }));
  });
});

describe('createProfile', () => {
  it('creates profile and returns 201', async () => {
    const newProfile = { id: profileId, name: 'New Artist' };
    mockProfileService.isFeaturedArtist.mockResolvedValue(true);
    mockProfileService.createFeaturedProfile.mockResolvedValue(newProfile);
    const req = mockReq({ body: { name: 'New Artist', profileType: 'artist' } });
    const res = mockRes();
    const next = jest.fn();

    await createProfile(req, res, next);

    expect(mockProfileService.isFeaturedArtist).toHaveBeenCalledWith(uid);
    expect(mockProfileService.createFeaturedProfile).toHaveBeenCalledWith(
      { name: 'New Artist', profileType: 'artist' },
      { creatorId: uid }
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newProfile);
  });

  it('throws ForbiddenError when user is not featured artist', async () => {
    mockProfileService.isFeaturedArtist.mockResolvedValue(false);
    const req = mockReq({ body: { name: 'New' } });
    const res = mockRes();
    const next = jest.fn();

    await createProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Featured Artist approval is required to access Star Studio.' })
    );
    expect(mockProfileService.createFeaturedProfile).not.toHaveBeenCalled();
  });

  it('propagates async error via next', async () => {
    mockProfileService.isFeaturedArtist.mockRejectedValue(new Error('Fail'));
    const req = mockReq({ body: { name: 'New' } });
    const res = mockRes();
    const next = jest.fn();

    await createProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Fail' }));
  });
});

describe('grantFeaturedArtist', () => {
  it('grants featured artist and returns 200', async () => {
    const result = { userId: 'target_001', isFeaturedArtist: true };
    mockProfileService.grantFeaturedArtist.mockResolvedValue(result);
    const req = mockReq({ params: { userId: 'target_001' } });
    const res = mockRes();
    const next = jest.fn();

    await grantFeaturedArtist(req, res, next);

    expect(mockProfileService.grantFeaturedArtist).toHaveBeenCalledWith('target_001');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('propagates async error via next', async () => {
    mockProfileService.grantFeaturedArtist.mockRejectedValue(new Error('User not found'));
    const req = mockReq({ params: { userId: 'missing' } });
    const res = mockRes();
    const next = jest.fn();

    await grantFeaturedArtist(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'User not found' }));
  });
});

describe('updateProfile', () => {
  const existingProfile = { id: profileId, ownerUserId: uid, name: 'Old' };

  it('updates profile when user is owner', async () => {
    const updated = { id: profileId, name: 'Updated' };
    mockProfileService.getFeaturedProfileById.mockResolvedValue(existingProfile);
    mockProfileService.isFeaturedArtist.mockResolvedValue(true);
    mockProfileService.updateFeaturedProfile.mockResolvedValue(updated);
    const req = mockReq({ params: { profileId }, body: { name: 'Updated' } });
    const res = mockRes();
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(mockProfileService.getFeaturedProfileById).toHaveBeenCalledWith(profileId);
    expect(mockProfileService.updateFeaturedProfile).toHaveBeenCalledWith(profileId, { name: 'Updated' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('throws NotFoundError when profile does not exist', async () => {
    mockProfileService.getFeaturedProfileById.mockResolvedValue(null);
    const req = mockReq({ params: { profileId }, body: { name: 'Updated' } });
    const res = mockRes();
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Featured profile not found.' })
    );
    expect(mockProfileService.updateFeaturedProfile).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when user is not owner and not admin', async () => {
    mockProfileService.getFeaturedProfileById.mockResolvedValue({ ...existingProfile, ownerUserId: 'other_user' });
    mockProfileService.hasAdminPrivileges.mockResolvedValue(false);
    const req = mockReq({ params: { profileId }, body: { name: 'Hacked' } });
    const res = mockRes();
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
    expect(mockProfileService.updateFeaturedProfile).not.toHaveBeenCalled();
  });

  it('allows admin to update any profile', async () => {
    const updated = { id: profileId, name: 'Admin Updated' };
    mockProfileService.getFeaturedProfileById.mockResolvedValue({ ...existingProfile, ownerUserId: 'other_user' });
    mockProfileService.hasAdminPrivileges.mockResolvedValue(true);
    mockProfileService.isFeaturedArtist.mockResolvedValue(true);
    mockProfileService.updateFeaturedProfile.mockResolvedValue(updated);
    const req = mockReq({ params: { profileId }, body: { name: 'Admin Updated' } });
    const res = mockRes();
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(mockProfileService.updateFeaturedProfile).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('throws ForbiddenError when owner is not featured artist', async () => {
    mockProfileService.getFeaturedProfileById.mockResolvedValue(existingProfile);
    mockProfileService.isFeaturedArtist.mockResolvedValue(false);
    const req = mockReq({ params: { profileId }, body: { name: 'Updated' } });
    const res = mockRes();
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Featured Artist approval is required to access Star Studio.' })
    );
    expect(mockProfileService.updateFeaturedProfile).not.toHaveBeenCalled();
  });

  it('allows admin to update even without featured artist status', async () => {
    const updated = { id: profileId, name: 'Admin Updated' };
    mockProfileService.getFeaturedProfileById.mockResolvedValue({ ...existingProfile, ownerUserId: 'other_user' });
    mockProfileService.hasAdminPrivileges.mockResolvedValue(true);
    mockProfileService.updateFeaturedProfile.mockResolvedValue(updated);
    const req = mockReq({ params: { profileId }, body: { name: 'Admin Updated' } });
    const res = mockRes();
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(mockProfileService.hasAdminPrivileges).toHaveBeenCalledWith(uid);
    expect(mockProfileService.updateFeaturedProfile).toHaveBeenCalledWith(profileId, { name: 'Admin Updated' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('propagates async error via next', async () => {
    mockProfileService.getFeaturedProfileById.mockRejectedValue(new Error('Fail'));
    const req = mockReq({ params: { profileId }, body: { name: 'Updated' } });
    const res = mockRes();
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Fail' }));
  });
});

describe('deleteProfile', () => {
  const existingProfile = { id: profileId, ownerUserId: uid };

  it('deletes profile and returns 204', async () => {
    mockProfileService.getFeaturedProfileById.mockResolvedValue(existingProfile);
    mockProfileService.isFeaturedArtist.mockResolvedValue(true);
    const req = mockReq({ params: { profileId } });
    const res = mockRes();
    const next = jest.fn();

    await deleteProfile(req, res, next);

    expect(mockProfileService.getFeaturedProfileById).toHaveBeenCalledWith(profileId);
    expect(mockProfileService.deleteFeaturedProfile).toHaveBeenCalledWith(profileId);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('throws NotFoundError when profile does not exist', async () => {
    mockProfileService.getFeaturedProfileById.mockResolvedValue(null);
    const req = mockReq({ params: { profileId } });
    const res = mockRes();
    const next = jest.fn();

    await deleteProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Featured profile not found.' })
    );
    expect(mockProfileService.deleteFeaturedProfile).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when user cannot manage', async () => {
    mockProfileService.getFeaturedProfileById.mockResolvedValue({ ...existingProfile, ownerUserId: 'other_user' });
    mockProfileService.hasAdminPrivileges.mockResolvedValue(false);
    const req = mockReq({ params: { profileId } });
    const res = mockRes();
    const next = jest.fn();

    await deleteProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
    expect(mockProfileService.deleteFeaturedProfile).not.toHaveBeenCalled();
  });

  it('propagates async error via next', async () => {
    mockProfileService.getFeaturedProfileById.mockRejectedValue(new Error('Fail'));
    const req = mockReq({ params: { profileId } });
    const res = mockRes();
    const next = jest.fn();

    await deleteProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Fail' }));
  });
});
