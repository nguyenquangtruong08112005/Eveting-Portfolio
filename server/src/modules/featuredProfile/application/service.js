const { v4: uuidv4 } = require('uuid');
const featuredProfileRepository = require('@/providers/database/featuredProfile.repository');

const getAllFeaturedProfiles = async (page = 1, limit = 10) => {
    return featuredProfileRepository.getFeaturedProfilesPage(page, limit);
};

const getFeaturedProfileById = async (profileId) => {
    return featuredProfileRepository.getFeaturedProfileById(profileId);
};

const createFeaturedProfile = async (profileData) => {
    const profileId = `fp_${uuidv4()}`;
    const newProfile = {
        id: profileId,
        name: profileData.name,
        profileType: profileData.profileType || 'artist',
        bio: profileData.bio || '',
        imageUrl: profileData.imageUrl || '',
        genres: profileData.genres || [],
        followerCount: 0,
        ownerUserId: profileData.ownerUserId || null,
    };

    return featuredProfileRepository.createFeaturedProfile(profileId, newProfile);
};

const updateFeaturedProfile = async (profileId, updateData) => {
    return featuredProfileRepository.updateFeaturedProfile(profileId, updateData);
};

const deleteFeaturedProfile = async (profileId) => {
    await featuredProfileRepository.deleteFeaturedProfile(profileId);
};

const hasAdminPrivileges = async (userId) => {
    return featuredProfileRepository.userHasOrganizerRole(userId);
};

module.exports = {
    getAllFeaturedProfiles,
    getFeaturedProfileById,
    createFeaturedProfile,
    updateFeaturedProfile,
    deleteFeaturedProfile,
    hasAdminPrivileges,
};
