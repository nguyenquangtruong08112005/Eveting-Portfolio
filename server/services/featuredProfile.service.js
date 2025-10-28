// services/featuredProfile.service.js
const { db } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Lấy tất cả các Featured Profiles. Có áp dụng phân trang.
 * @param {number} page - Trang hiện tại (mặc định là 1).
 * @param {number} limit - Số mục trên mỗi trang (mặc định là 10).
 * @returns {Promise<Array<object>>} Mảng các hồ sơ.
 */
const getAllFeaturedProfiles = async (page = 1, limit = 10) => {
    const profilesRef = db.collection('FeaturedProfiles');
    const offset = (page - 1) * limit;

    // Lấy tổng số lượng
    const countSnapshot = await profilesRef.count().get();
    const totalProfiles = countSnapshot.data().count;

    // Truy vấn dữ liệu trang hiện tại
    const snapshot = await profilesRef
        .orderBy('name') // Sắp xếp theo tên
        .limit(limit)
        .offset(offset)
        .get();

    const profiles = [];
    snapshot.forEach(doc => {
        profiles.push(doc.data()); // Giả sử ID đã có trong data
    });

    // Trả về cấu trúc phân trang
    return {
        profiles,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalProfiles / limit),
            totalItems: totalProfiles // Đổi tên cho rõ ràng hơn
        }
    };
};

/**
 * Lấy thông tin chi tiết một Featured Profile bằng ID.
 * @param {string} profileId - ID của hồ sơ.
 * @returns {Promise<object|null>} Dữ liệu hồ sơ hoặc null nếu không tìm thấy.
 */
const getFeaturedProfileById = async (profileId) => {
    const doc = await db.collection('FeaturedProfiles').doc(profileId).get();
    if (!doc.exists) {
        return null;
    }
    return doc.data();
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

    await db.collection('FeaturedProfiles').doc(profileId).set(newProfile);
    return newProfile;
};

/**
 * Cập nhật thông tin một Featured Profile.
 * @param {string} profileId - ID của hồ sơ cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Dữ liệu hồ sơ sau khi đã cập nhật.
 */
const updateFeaturedProfile = async (profileId, updateData) => {
    const profileRef = db.collection('FeaturedProfiles').doc(profileId);

    // TODO: Chỉ cho phép cập nhật các trường hợp lệ

    await profileRef.update(updateData);
    const updatedDoc = await profileRef.get();
    return updatedDoc.data();
};

/**
 * Xóa một Featured Profile.
 * @param {string} profileId - ID của hồ sơ cần xóa.
 * @returns {Promise<void>}
 */
const deleteFeaturedProfile = async (profileId) => {
    const profileRef = db.collection('FeaturedProfiles').doc(profileId);
    await profileRef.delete();
    // TODO: Cần xử lý logic liên quan, ví dụ: xóa profileId khỏi các Events, Users...
};


module.exports = {
    getAllFeaturedProfiles,
    getFeaturedProfileById,
    createFeaturedProfile,
    updateFeaturedProfile,
    deleteFeaturedProfile,
};