const asyncHandler = require('@/shared/middleware/asyncHandler');
const { ConflictError, NotFoundError, BadRequestError } = require('@/shared/errors');
const userService = require('@/modules/users/application/service');

const registerUser = asyncHandler(async (req, res) => {
    const existingUser = await userService.getUserById(req.user.uid);
    if (existingUser) {
        throw new ConflictError('User profile already exists.');
    }
    const newUser = await userService.createUserProfile(req.user, req.body);
    res.status(201).json(newUser);
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
    const userProfile = await userService.getUserById(req.user.uid);
    if (!userProfile) {
        throw new NotFoundError('User profile not found. Please complete registration.');
    }
    res.status(200).json(userProfile);
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const updatedUser = await userService.updateUserProfile(req.user.uid, req.body);
    res.status(200).json(updatedUser);
});

const followProfile = asyncHandler(async (req, res) => {
    const { profileId } = req.body;
    if (!profileId) {
        throw new BadRequestError('profileId is required.');
    }
    const result = await userService.followProfile(req.user.uid, profileId);
    res.status(200).json(result);
});

const unfollowProfile = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const result = await userService.unfollowProfile(req.user.uid, profileId);
    res.status(200).json(result);
});

const removeDeviceToken = asyncHandler(async (req, res) => {
    const { fcmToken } = req.body;
    if (!fcmToken) {
        throw new BadRequestError('fcmToken is required');
    }
    await userService.removeFcmToken(req.user.uid, fcmToken);
    res.status(200).json({ message: 'Device token removed successfully' });
});

module.exports = {
    registerUser, getCurrentUserProfile, updateUserProfile,
    followProfile, unfollowProfile, removeDeviceToken,
};
