const profileService = require('@/modules/featuredProfile/application/service');

const getAllProfiles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await profileService.getAllFeaturedProfiles(page, limit);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error in FeaturedProfile Controller - getAllProfiles: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const getProfileById = async (req, res) => {
    try {
        const { profileId } = req.params;
        const profile = await profileService.getFeaturedProfileById(profileId);
        if (!profile) {
            return res.status(404).send({ error: 'Featured Profile not found.' });
        }
        res.status(200).json(profile);
    } catch (error) {
        console.error("Error in FeaturedProfile Controller - getProfileById: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const createProfile = async (req, res) => {
    try {
        const creatorId = req.user.uid;
        const profileData = {
            ...req.body,
            ownerUserId: req.body.ownerUserId || creatorId
        };

        const newProfile = await profileService.createFeaturedProfile(profileData);
        res.status(201).json(newProfile);
    } catch (error) {
        console.error("Error in FeaturedProfile Controller - createProfile: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const hasAdminPrivileges = async (userId) => {
    return profileService.hasAdminPrivileges(userId);
};

const updateProfile = async (req, res) => {
    try {
        const { profileId } = req.params;
        const requestingUserId = req.user.uid;

        const existingProfile = await profileService.getFeaturedProfileById(profileId);
        if (!existingProfile) {
             return res.status(404).send({ error: 'Featured Profile not found.' });
        }

        const isAdmin = await hasAdminPrivileges(requestingUserId);
        const isOwner = existingProfile.ownerUserId === requestingUserId;

        if (!isAdmin && !isOwner) {
            return res.status(403).send({ error: 'Forbidden: You do not have permission to modify this profile.' });
        }

        const updatedProfile = await profileService.updateFeaturedProfile(profileId, req.body);
        res.status(200).json(updatedProfile);
    } catch (error) {
        console.error("Error in FeaturedProfile Controller - updateProfile: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const deleteProfile = async (req, res) => {
    try {
        const { profileId } = req.params;
        const requestingUserId = req.user.uid;

        const existingProfile = await profileService.getFeaturedProfileById(profileId);
        if (!existingProfile) {
             return res.status(404).send({ error: 'Featured Profile not found.' });
        }

        const isAdmin = await hasAdminPrivileges(requestingUserId);
        const isOwner = existingProfile.ownerUserId === requestingUserId;

        if (!isAdmin && !isOwner) {
            return res.status(403).send({ error: 'Forbidden: You do not have permission to delete this profile.' });
        }

        await profileService.deleteFeaturedProfile(profileId);
        res.status(204).send();
    } catch (error) {
        console.error("Error in FeaturedProfile Controller - deleteProfile: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getAllProfiles,
    getProfileById,
    createProfile,
    updateProfile,
    deleteProfile,
};
