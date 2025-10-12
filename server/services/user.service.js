// services/user.service.js
const { db, FieldValue } = require('../config/firebase.config');

/**
 * Tạo một document user mới trong collection 'Users'.
 * @param {object} userData - Dữ liệu user từ Firebase Auth (uid, email).
 * @param {object} profileData - Dữ liệu hồ sơ ban đầu từ client (name, birthDate).
 * @returns {object} Dữ liệu user đầy đủ sau khi tạo.
 */
const createUserProfile = async (userData, profileData) => {
    const { uid, email } = userData;

    // TODO: Bổ sung validation cho profileData (ví dụ: kiểm tra tên không được trống).

    const newUserProfile = {
        id: uid,
        email: email,
        name: profileData.name || '',
        profilePicUrl: profileData.profilePicUrl || '',
        birthDate: profileData.birthDate || null,
        roles: ['attendee'], // Mặc định khi đăng ký là attendee
        createdAt: new Date().getTime(),
        followedProfileIds: [],
        historyEventIds: [],
        points: 0,
        level: 'bronze',
        matchingPreferences: {},
        sharedMedia: []
    };

    await db.collection('Users').doc(uid).update(newUserProfile);
    return newUserProfile;
};

/**
 * Lấy thông tin user bằng ID.
 * @param {string} userId - ID của user.
 * @returns {object|null} Dữ liệu user hoặc null nếu không tìm thấy.
 */
const getUserById = async (userId) => {
    const userDoc = await db.collection('Users').doc(userId).get();
    if (!userDoc.exists) {
        return null;
    }
    return userDoc.data();
};

/**
 * Cập nhật thông tin user.
 * @param {string} userId - ID của user cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật.
 * @returns {object} Dữ liệu user sau khi đã cập nhật.
 */
const updateUserProfile = async (userId, updateData) => {
    const userRef = db.collection('Users').doc(userId);

    // TODO: Loại bỏ các trường không được phép cập nhật từ client (ví dụ: roles, points, level).

    await userRef.update(updateData);

    const updatedUser = await getUserById(userId);
    return updatedUser;
};

// TODO: Thêm các service cho việc lấy vé, theo dõi nghệ sĩ...
const followProfile = async (userId, profileId) => {
    const userRef = db.collection('Users').doc(userId);
    // Dùng FieldValue.arrayUnion để thêm một ID vào mảng mà không bị trùng lặp
    await userRef.update({
        followedProfileIds: FieldValue.arrayUnion(profileId)
    });
    return { success: true, message: `Successfully followed profile.` }
};

const unfollowProfile = async (userId, profileId) => {
    const userRef = db.collection('Users').doc(userId);
    // Dùng FieldValue.arrayRemove để xóa một ID khỏi mảng
    await userRef.update({
        followedProfileIds: FieldValue.arrayRemove(profileId)
    });
    return { success: true, message: ' Successfully unfollowed profile.' };
};

module.exports = {
    createUserProfile,
    getUserById,
    updateUserProfile,
    followProfile,
    unfollowProfile,
};