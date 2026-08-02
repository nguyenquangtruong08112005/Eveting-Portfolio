'use strict';

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockUserService = {
  getUserById: jest.fn(),
  createUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  followProfile: jest.fn(),
  unfollowProfile: jest.fn(),
  removeFcmToken: jest.fn(),
};

jest.mock('@/modules/users/application/service', () => mockUserService);

const {
  registerUser, getCurrentUserProfile, updateUserProfile,
  followProfile, unfollowProfile, removeDeviceToken,
} = require('@/modules/users/api/controller');

const uid = 'user_001';
const profileId = 'profile_001';

function mockReq(overrides = {}) {
  return {
    user: { uid },
    body: {},
    params: {},
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
  jest.clearAllMocks();
});

describe('registerUser', () => {
  it('creates user and returns 201', async () => {
    const newUser = { id: uid, name: 'Test' };
    mockUserService.getUserById.mockResolvedValue(null);
    mockUserService.createUserProfile.mockResolvedValue(newUser);
    const req = mockReq({ body: { name: 'Test' } });
    const res = mockRes();
    const next = jest.fn();

    await registerUser(req, res, next);

    expect(mockUserService.getUserById).toHaveBeenCalledWith(uid);
    expect(mockUserService.createUserProfile).toHaveBeenCalledWith(req.user, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newUser);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws ConflictError when profile already exists', async () => {
    mockUserService.getUserById.mockResolvedValue({ id: uid });
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await registerUser(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409, message: 'User profile already exists.' }));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('getCurrentUserProfile', () => {
  it('returns profile with 200', async () => {
    const profile = { id: uid, name: 'Test' };
    mockUserService.getUserById.mockResolvedValue(profile);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await getCurrentUserProfile(req, res, next);

    expect(mockUserService.getUserById).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(profile);
  });

  it('throws NotFoundError when no profile', async () => {
    mockUserService.getUserById.mockResolvedValue(null);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await getCurrentUserProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('updateUserProfile', () => {
  it('returns updated profile with 200', async () => {
    const updated = { id: uid, name: 'Updated' };
    mockUserService.updateUserProfile.mockResolvedValue(updated);
    const req = mockReq({ body: { name: 'Updated' } });
    const res = mockRes();
    const next = jest.fn();

    await updateUserProfile(req, res, next);

    expect(mockUserService.updateUserProfile).toHaveBeenCalledWith(uid, req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('propagates service error via next', async () => {
    const error = new Error('DB error');
    mockUserService.updateUserProfile.mockRejectedValue(error);
    const req = mockReq({ body: { name: 'X' } });
    const res = mockRes();
    const next = jest.fn();

    await updateUserProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('followProfile', () => {
  it('follows and returns 200', async () => {
    const result = { success: true };
    mockUserService.followProfile.mockResolvedValue(result);
    const req = mockReq({ body: { profileId } });
    const res = mockRes();
    const next = jest.fn();

    await followProfile(req, res, next);

    expect(mockUserService.followProfile).toHaveBeenCalledWith(uid, profileId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('throws BadRequestError when profileId missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = jest.fn();

    await followProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: 'profileId is required.' }));
    expect(mockUserService.followProfile).not.toHaveBeenCalled();
  });
});

describe('unfollowProfile', () => {
  it('unfollows and returns 200', async () => {
    const result = { success: true };
    mockUserService.unfollowProfile.mockResolvedValue(result);
    const req = mockReq({ params: { profileId } });
    const res = mockRes();
    const next = jest.fn();

    await unfollowProfile(req, res, next);

    expect(mockUserService.unfollowProfile).toHaveBeenCalledWith(uid, profileId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('removeDeviceToken', () => {
  it('removes token and returns 200', async () => {
    mockUserService.removeFcmToken.mockResolvedValue({ success: true });
    const req = mockReq({ body: { fcmToken: 'tok_123' } });
    const res = mockRes();
    const next = jest.fn();

    await removeDeviceToken(req, res, next);

    expect(mockUserService.removeFcmToken).toHaveBeenCalledWith(uid, 'tok_123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Device token removed successfully' });
  });

  it('throws BadRequestError when fcmToken missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = jest.fn();

    await removeDeviceToken(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: 'fcmToken is required' }));
    expect(mockUserService.removeFcmToken).not.toHaveBeenCalled();
  });
});