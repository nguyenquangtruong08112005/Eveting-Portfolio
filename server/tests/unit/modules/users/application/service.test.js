/* eslint-env jest */

const mockUserRepo = {
  createUser: jest.fn(),
  getUserDataById: jest.fn(),
  updateUser: jest.fn(),
  followProfile: jest.fn(),
  unfollowProfile: jest.fn(),
  removeFcmToken: jest.fn(),
};

const mockAuthRepo = {
  findUserById: jest.fn(),
};

const mockProfileHelper = {
  mapUserToMobileProfile: jest.fn(),
  buildUserProfileObject: jest.fn(),
  buildProfileUpdateData: jest.fn(),
};

const mockFcmHelper = {
  extractFcmTokens: jest.fn(),
  syncTokenTopics: jest.fn(),
  subscribeTokensToTopic: jest.fn(),
  unsubscribeTokensFromTopic: jest.fn(),
};

jest.mock('@/providers/database/user.repository', () => mockUserRepo);
jest.mock('@/providers/database/postgres.auth.repository', () => mockAuthRepo);
jest.mock('@/modules/users/application/profile.helper', () => mockProfileHelper);
jest.mock('@/modules/users/application/fcm.helper', () => mockFcmHelper);

process.env.ADMIN_UID = 'admin_001';

let service;
beforeAll(() => { service = require('@/modules/users/application/service'); });

beforeEach(() => { jest.resetAllMocks(); });

afterEach(() => { jest.restoreAllMocks(); });

describe('createUserProfile', () => {
  it('creates user profile and returns mobile profile', async () => {
    const userData = { uid: 'user_001' };
    const profileData = { name: 'Test' };
    const builtProfile = { id: 'user_001', name: 'Test' };
    const mobileProfile = { id: 'user_001', userName: 'Test' };

    mockProfileHelper.buildUserProfileObject.mockReturnValue(builtProfile);
    mockProfileHelper.mapUserToMobileProfile.mockResolvedValue(mobileProfile);

    const result = await service.createUserProfile(userData, profileData);

    expect(mockProfileHelper.buildUserProfileObject).toHaveBeenCalledWith(userData, profileData);
    expect(mockUserRepo.createUser).toHaveBeenCalledWith('user_001', builtProfile);
    expect(mockProfileHelper.mapUserToMobileProfile).toHaveBeenCalledWith(builtProfile);
    expect(result).toBe(mobileProfile);
  });
});

describe('getUserById', () => {
  it('returns null when no user data', async () => {
    mockUserRepo.getUserDataById.mockResolvedValue(null);
    expect(await service.getUserById('nonexistent')).toBeNull();
  });

  it('returns admin with isAdmin: true for ADMIN_UID', async () => {
    const userData = { id: 'admin_001', email: 'admin@test.com' };
    mockUserRepo.getUserDataById.mockResolvedValue(userData);
    const result = await service.getUserById('admin_001');
    expect(result.isAdmin).toBe(true);
    expect(result).toMatchObject(userData);
  });

  it('sets emailVerified true when auth user is verified', async () => {
    mockUserRepo.getUserDataById.mockResolvedValue({ id: 'user_001' });
    mockAuthRepo.findUserById.mockResolvedValue({ email_verified: true });
    mockProfileHelper.mapUserToMobileProfile.mockResolvedValue({ id: 'user_001' });
    const result = await service.getUserById('user_001');
    expect(result.emailVerified).toBe(true);
  });

  it('sets emailVerified false when auth user is null', async () => {
    mockUserRepo.getUserDataById.mockResolvedValue({ id: 'user_001' });
    mockAuthRepo.findUserById.mockResolvedValue(null);
    mockProfileHelper.mapUserToMobileProfile.mockResolvedValue({ id: 'user_001' });
    const result = await service.getUserById('user_001');
    expect(result.emailVerified).toBe(false);
  });

  it('returns profile without emailVerified when mapUserToMobileProfile returns null', async () => {
    mockUserRepo.getUserDataById.mockResolvedValue({ id: 'user_001' });
    mockAuthRepo.findUserById.mockResolvedValue({ email_verified: true });
    mockProfileHelper.mapUserToMobileProfile.mockResolvedValue(null);
    const result = await service.getUserById('user_001');
    expect(result).toBeNull();
  });

  it('does not call authRepository for admin user', async () => {
    mockUserRepo.getUserDataById.mockResolvedValue({ id: 'admin_001' });
    await service.getUserById('admin_001');
    expect(mockAuthRepo.findUserById).not.toHaveBeenCalled();
  });
});

describe('updateUserProfile', () => {
  it('syncs topics when fcmToken is provided', async () => {
    const updateData = { name: 'New', fcmToken: 'tok_123' };
    mockProfileHelper.buildProfileUpdateData.mockReturnValue({ name: 'New' });
    mockUserRepo.getUserDataById.mockResolvedValue({ followedProfileIds: ['pid_1'] });
    mockUserRepo.updateUser.mockResolvedValue(undefined);
    mockProfileHelper.mapUserToMobileProfile.mockResolvedValue({ id: 'user_001' });

    await service.updateUserProfile('user_001', updateData);

    expect(mockFcmHelper.syncTokenTopics).toHaveBeenCalledWith('tok_123', ['pid_1']);
    expect(mockUserRepo.updateUser).toHaveBeenCalledWith('user_001', { name: 'New' }, 'tok_123');
  });

  it('does not call updateUser when no update data and no fcmToken', async () => {
    mockProfileHelper.buildProfileUpdateData.mockReturnValue({});
    mockProfileHelper.mapUserToMobileProfile.mockResolvedValue({ id: 'user_001' });
    await service.updateUserProfile('user_001', {});
    expect(mockUserRepo.updateUser).not.toHaveBeenCalled();
  });

  it('calls updateUser even without fcmToken when there is update data', async () => {
    mockProfileHelper.buildProfileUpdateData.mockReturnValue({ name: 'New' });
    mockUserRepo.updateUser.mockResolvedValue(undefined);
    mockProfileHelper.mapUserToMobileProfile.mockResolvedValue({ id: 'user_001' });
    await service.updateUserProfile('user_001', { name: 'New' });
    expect(mockUserRepo.updateUser).toHaveBeenCalledWith('user_001', { name: 'New' }, null);
  });

  it('handles sync error gracefully', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProfileHelper.buildProfileUpdateData.mockReturnValue({ name: 'New' });
    mockUserRepo.getUserDataById.mockResolvedValue({ followedProfileIds: ['pid_1'] });
    mockFcmHelper.syncTokenTopics.mockRejectedValue(new Error('FCM down'));
    mockUserRepo.updateUser.mockResolvedValue(undefined);
    mockProfileHelper.mapUserToMobileProfile.mockResolvedValue({ id: 'user_001' });

    const result = await service.updateUserProfile('user_001', { name: 'New', fcmToken: 'tok_1' });

    expect(spy).toHaveBeenCalledWith('[Sync] Error syncing topics for new token:', expect.any(Error));
    expect(mockUserRepo.updateUser).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'user_001' });
    spy.mockRestore();
  });

  it('syncs topics with empty followedProfileIds when userData has none', async () => {
    mockProfileHelper.buildProfileUpdateData.mockReturnValue({ name: 'New' });
    mockUserRepo.getUserDataById.mockResolvedValue({});
    mockUserRepo.updateUser.mockResolvedValue(undefined);
    mockProfileHelper.mapUserToMobileProfile.mockResolvedValue({ id: 'user_001' });

    await service.updateUserProfile('user_001', { name: 'New', fcmToken: 'tok_1' });

    expect(mockFcmHelper.syncTokenTopics).toHaveBeenCalledWith('tok_1', []);
  });
});

describe('followProfile', () => {
  it('follows profile and subscribes tokens to topic', async () => {
    mockUserRepo.followProfile.mockResolvedValue({ alreadyFollowing: false });
    mockUserRepo.getUserDataById.mockResolvedValue({ fcmTokens: ['tok_1'] });
    mockFcmHelper.extractFcmTokens.mockReturnValue(['tok_1']);

    const result = await service.followProfile('user_001', 'artist_1');

    expect(mockUserRepo.followProfile).toHaveBeenCalledWith('user_001', 'artist_1');
    expect(mockFcmHelper.subscribeTokensToTopic).toHaveBeenCalledWith(['tok_1'], 'artist_1');
    expect(result).toEqual({ success: true, message: 'Successfully followed profile.' });
  });

  it('re-throws repository error', async () => {
    const error = new Error('DB error');
    mockUserRepo.followProfile.mockRejectedValue(error);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(service.followProfile('user_001', 'artist_1')).rejects.toThrow('DB error');
    spy.mockRestore();
  });
});

describe('unfollowProfile', () => {
  it('unfollows profile and unsubscribes tokens from topic', async () => {
    mockUserRepo.unfollowProfile.mockResolvedValue({ notFollowing: false });
    mockUserRepo.getUserDataById.mockResolvedValue({ fcmTokens: ['tok_1'] });
    mockFcmHelper.extractFcmTokens.mockReturnValue(['tok_1']);

    const result = await service.unfollowProfile('user_001', 'artist_1');

    expect(mockUserRepo.unfollowProfile).toHaveBeenCalledWith('user_001', 'artist_1');
    expect(mockFcmHelper.unsubscribeTokensFromTopic).toHaveBeenCalledWith(['tok_1'], 'artist_1');
    expect(result).toEqual({ success: true, message: 'Successfully unfollowed profile.' });
  });

  it('re-throws repository error', async () => {
    const error = new Error('DB error');
    mockUserRepo.unfollowProfile.mockRejectedValue(error);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(service.unfollowProfile('user_001', 'artist_1')).rejects.toThrow('DB error');
    spy.mockRestore();
  });
});

describe('removeFcmToken', () => {
  it('removes token and returns success', async () => {
    const result = await service.removeFcmToken('user_001', 'tok_1');
    expect(mockUserRepo.removeFcmToken).toHaveBeenCalledWith('user_001', 'tok_1');
    expect(result).toEqual({ success: true });
  });
});
