// services/featuredProfile.service.js
const { v4: uuidv4 } = require('uuid');
const featuredProfileRepository = require('../../providers/database/featuredProfile.repository');

/**
 * Lấy tất cả các Featured Profiles. Có áp dụng phân trang.
 * @param {number} page - Trang hiện tại (mặc định là 1).
 * @param {number} limit - Số mục trên mỗi trang (mặc định là 10).
 * @returns {Promise<Array<object>>} Mảng các hồ sơ.
 */
const getAllFeaturedProfiles = async (page = 1, limit = 10) => {
    return featuredProfileRepository.getFeaturedProfilesPage(page, limit);
};

/**
 * Lấy thông tin chi tiết một Featured Profile bằng ID.
 * @param {string} profileId - ID của hồ sơ.
 * @returns {Promise<object|null>} Dữ liệu hồ sơ hoặc null nếu không tìm thấy.
 */
const getFeaturedProfileById = async (profileId) => {
    return featuredProfileRepository.getFeaturedProfileById(profileId);
};

/**
 * Tạo một Featured Profile mới.
 * @param {object} profileData - Dữ liệu hồ sơ (name, profileType, bio, imageUrl, genres).
 * @returns {Promise<object>} Document hồ sơ vừa được tạo.
 */
const createFeaturedProfile = async (profileData) => {
    const profileId = `fp_${uuidv4()}`; // Tạo ID theo format
    const newProfile = {
        id: profileId,
        name: profileData.name,
        profileType: profileData.profileType || 'artist', // Mặc định là artist
        bio: profileData.bio || '',
        imageUrl: profileData.imageUrl || '',
        genres: profileData.genres || [],
        followerCount: 0, // Khởi tạo follower count
        ownerUserId: profileData.ownerUserId || null,
    };

    // TODO: Thêm validation cho profileData

    return featuredProfileRepository.createFeaturedProfile(profileId, newProfile);
};

/**
 * Cập nhật thông tin một Featured Profile.
 * @param {string} profileId - ID của hồ sơ cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Dữ liệu hồ sơ sau khi đã cập nhật.
 */
const updateFeaturedProfile = async (profileId, updateData) => {
    // TODO: Chỉ cho phép cập nhật các trường hợp lệ

    return featuredProfileRepository.updateFeaturedProfile(profileId, updateData);
};

/**
 * Xóa một Featured Profile.
 * @param {string} profileId - ID của hồ sơ cần xóa.
 * @returns {Promise<void>}
 */
const deleteFeaturedProfile = async (profileId) => {
    await featuredProfileRepository.deleteFeaturedProfile(profileId);
    // TODO: Cần xử lý logic liên quan, ví dụ: xóa profileId khỏi các Events, Users...
};

const hasAdminPrivileges = async (userId) => {
    // TODO: Sau này nên kiểm tra cả role 'admin'
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
