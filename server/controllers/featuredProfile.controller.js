// controllers/featuredProfile.controller.js
const profileService = require('../services/featuredProfile.service');
const { db } = require('../config/firebase.config');

const getAllProfiles = async (req, res) => {
    try {
        // Lấy page, limit từ query params
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
        // TODO: Thêm validation cho req.body
        const newProfile = await profileService.createFeaturedProfile(req.body);
        res.status(201).json(newProfile);
    } catch (error) {
        console.error("Error in FeaturedProfile Controller - createProfile: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};
/**
 * Kiểm tra xem user có quyền quản lý (admin/organizer) hay không.
 * Tách ra thành hàm riêng để tái sử dụng.
 */
const hasAdminPrivileges = async (userId) => {
    if (!userId) return false;
    const userDoc = await db.collection('Users').doc(userId).get();
    // TODO: Sau này nên kiểm tra cả role 'admin'
    return userDoc.exists && userDoc.data().roles?.includes('organizer');
};

const updateProfile = async (req, res) => {
    try {
        const { profileId } = req.params;
        const requestingUserId = req.user.uid; // ID người gửi request

        const existingProfile = await profileService.getFeaturedProfileById(profileId);
        if (!existingProfile) {
             return res.status(404).send({ error: 'Featured Profile not found.' });
        }

        // --- KIỂM TRA QUYỀN NÂNG CAO ---
        const isAdmin = await hasAdminPrivileges(requestingUserId);
        const isOwner = existingProfile.ownerUserId === requestingUserId;

        if (!isAdmin && !isOwner) {
            return res.status(403).send({ error: 'Forbidden: You do not have permission to modify this profile.' });
        }

        // TODO: Thêm validation cho req.body
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
        const requestingUserId = req.user.uid; // ID người gửi request

        const existingProfile = await profileService.getFeaturedProfileById(profileId);
        if (!existingProfile) {
             return res.status(404).send({ error: 'Featured Profile not found.' });
        }

        // --- KIỂM TRA QUYỀN NÂNG CAO ---
        const isAdmin = await hasAdminPrivileges(requestingUserId);
        const isOwner = existingProfile.ownerUserId === requestingUserId;

        if (!isAdmin && !isOwner) {
            return res.status(403).send({ error: 'Forbidden: You do not have permission to delete this profile.' });
        }
        
        await profileService.deleteFeaturedProfile(profileId);
        res.status(204).send(); // 204 No Content - Xóa thành công
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