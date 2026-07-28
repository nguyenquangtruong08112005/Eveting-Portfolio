const asyncHandler = require('@/shared/middleware/asyncHandler');
const { ForbiddenError, NotFoundError } = require('@/shared/errors');
const profileService = require('@/modules/featuredProfile/application/service');

const getAllProfiles = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const result = await profileService.getAllFeaturedProfiles(page, limit);
    res.status(200).json(result);
});

const getProfileById = asyncHandler(async (req, res) => {
    const profile = await profileService.getFeaturedProfileById(req.params.profileId);
    if (!profile) throw new NotFoundError('Featured profile not found.');
    res.status(200).json(profile);
});

const getProfileBySlug = asyncHandler(async (req, res) => {
    const profile = await profileService.getFeaturedProfileBySlug(req.params.slug);
    if (!profile) throw new NotFoundError('Featured profile not found.');
    res.status(200).json(profile);
});

const createProfile = asyncHandler(async (req, res) => {
    const creatorId = req.user.uid;
    if (!(await profileService.isFeaturedArtist(creatorId))) {
        throw new ForbiddenError('Featured Artist approval is required to access Star Studio.');
    }
    const newProfile = await profileService.createFeaturedProfile(req.body, { creatorId });
    res.status(201).json(newProfile);
});

async function assertCanManage(profile, requestingUser) {
    const roles = requestingUser.roles || [];
    const isAdmin = roles.includes('admin')
        || await profileService.hasAdminPrivileges(requestingUser.uid);
    const isOwner = profile.ownerUserId === requestingUser.uid;
    if (!isAdmin && !isOwner) {
        throw new ForbiddenError('You do not have permission to modify this profile.');
    }
    if (!isAdmin && !(await profileService.isFeaturedArtist(requestingUser.uid))) {
        throw new ForbiddenError('Featured Artist approval is required to access Star Studio.');
    }
}

const grantFeaturedArtist = asyncHandler(async (req, res) => {
    const granted = await profileService.grantFeaturedArtist(req.params.userId);
    res.status(200).json(granted);
});

const updateProfile = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const existingProfile = await profileService.getFeaturedProfileById(profileId);
    if (!existingProfile) throw new NotFoundError('Featured profile not found.');

    await assertCanManage(existingProfile, req.user);
    const updatedProfile = await profileService.updateFeaturedProfile(profileId, req.body);
    res.status(200).json(updatedProfile);
});

const deleteProfile = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const existingProfile = await profileService.getFeaturedProfileById(profileId);
    if (!existingProfile) throw new NotFoundError('Featured profile not found.');

    await assertCanManage(existingProfile, req.user);
    await profileService.deleteFeaturedProfile(profileId);
    res.status(204).send();
});

module.exports = {
    getAllProfiles,
    getProfileById,
    getProfileBySlug,
    createProfile,
    updateProfile,
    deleteProfile,
    grantFeaturedArtist,
};
