// services/user.service.js
const { db, FieldValue } = require('../config/firebase.config');

// --- HÀM HỖ TRỢ: Format dữ liệu trả về cho Mobile ---
const mapUserToMobileProfile = async (userData) => {
    if (!userData) return null;

    // 1. Xác định role
    const isOrganizer = userData.roles ? userData.roles.includes('organizer') : false;

    // 2. Lấy thông tin tóm tắt các sự kiện đã tham gia (joinedEvents)
    let joinedEvents = [];
    if (userData.historyEventIds && userData.historyEventIds.length > 0) {
        try {
            // Chỉ lấy tối đa 5-10 sự kiện gần nhất để hiển thị trên profile cho nhẹ
            const recentEventIds = userData.historyEventIds;

            if (recentEventIds.length > 0) {
                const eventsSnapshot = await db.collection('Events')
                    .where('id', 'in', recentEventIds)
                    .get();

                joinedEvents = eventsSnapshot.docs.map(doc => {
                    const ev = doc.data();
                    // Format ngày tháng sang chuỗi đẹp (hoặc để mobile tự format timestamp)
                    // Ở đây trả về timestamp để mobile linh hoạt
                    return {
                        id: ev.id,
                        name: ev.name,
                        date: ev.date,
                        imageUrl: ev.imageUrl || ev.bannerUrl || ""
                    };
                });
            }
        } catch (error) {
            console.error("Error fetching joined events:", error);
        }
    }

    // 3. Trả về cấu trúc đúng như Mobile App mong đợi
    return {
        id: userData.id,
        email: userData.email,
        userName: userData.name,
        profilePictureUrl: userData.profilePicUrl || "",
        // Nếu chưa có cover, dùng ảnh mặc định hoặc null
        coverPhotoUrl: userData.coverPhotoUrl || "https://picsum.photos/800/400",

        isOrganizer: isOrganizer,
        followingCount: userData.followedProfileIds ? userData.followedProfileIds.length : 0,
        // TODO: Cần logic tính followersCount nếu user là Artist/Organizer (lấy từ collection Follows hoặc count field)
        followersCount: userData.followersCount || 0,

        aboutMe: userData.bio || "", // Mapping 'bio' trong DB thành 'aboutMe'

        // Trả về mảng string, mobile sẽ tự map sang ProfileInterest với màu sắc
        interests: userData.matchingPreferences?.interests || [],

        joinedEvents: joinedEvents
    };
};

/**
 * Tạo một document user mới.
 */
const createUserProfile = async (userData, profileData) => {
    const { uid, email } = userData;

    const newUserProfile = {
        id: uid,
        email: email,
        name: profileData.name || '',
        profilePicUrl: profileData.profilePicUrl || '',
        coverPhotoUrl: profileData.coverPhotoUrl || null, // Thêm trường này
        bio: profileData.bio || '', // Thêm trường này
        birthDate: profileData.birthDate || null,

        roles: ['attendee'],
        createdAt: new Date().getTime(),

        followedProfileIds: [],
        historyEventIds: [],
        followersCount: 0, // Thêm trường này

        points: 0,
        level: 'bronze',

        // Lưu interests vào trong matchingPreferences cho gọn
        matchingPreferences: {
            interests: profileData.interests || [],
            ageRange: profileData.ageRange || "18-25"
        },
        sharedMedia: []
    };

    await db.collection('Users').doc(uid).set(newUserProfile);

    // Trả về format mobile cần
    return await mapUserToMobileProfile(newUserProfile);
};

/**
 * Lấy thông tin user bằng ID.
 */
const getUserById = async (userId) => {
    const userDoc = await db.collection('Users').doc(userId).get();
    if (!userDoc.exists) {
        return null;
    }
    // Transform dữ liệu trước khi trả về
    return await mapUserToMobileProfile(userDoc.data());
};

/**
 * Cập nhật thông tin user.
 */
const updateUserProfile = async (userId, updateData) => {
    const userRef = db.collection('Users').doc(userId);
    console.log(updateData);

    // Chuẩn bị dữ liệu update (mapping từ request body vào DB schema)
    const dataToUpdate = {};

    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.profilePicUrl !== undefined) dataToUpdate.profilePicUrl = updateData.profilePicUrl;
    if (updateData.coverPhotoUrl !== undefined) dataToUpdate.coverPhotoUrl = updateData.coverPhotoUrl;
    if (updateData.aboutMe !== undefined) dataToUpdate.bio = updateData.aboutMe; // Mobile gửi aboutMe, lưu vào bio
    if (updateData.birthDate !== undefined) dataToUpdate.birthDate = updateData.birthDate;

    // Xử lý interests (nằm lồng trong matchingPreferences)
    if (updateData.interests !== undefined) {
        dataToUpdate['matchingPreferences.interests'] = updateData.interests;
    }

    if (updateData.fcmToken) {
        // Thêm token mới vào mảng, tự động tránh trùng lặp
        dataToUpdate.fcmTokens = FieldValue.arrayUnion(updateData.fcmToken);

        // (Tùy chọn) Xóa trường fcmToken cũ (string) nếu có để dọn dẹp DB
        // dataToUpdate.fcmToken = FieldValue.delete(); 
    }

    if (Object.keys(dataToUpdate).length > 0) {
        await userRef.update(dataToUpdate);
    }

    // Lấy lại dữ liệu mới nhất và trả về format chuẩn
    return await getUserById(userId);
};

const followProfile = async (userId, profileId) => {
    const userRef = db.collection('Users').doc(userId);
    await userRef.update({
        followedProfileIds: FieldValue.arrayUnion(profileId)
    });
    // Tăng followerCount cho Profile kia (nếu cần thiết - TODO)
    return { success: true, message: `Successfully followed profile.` };
};

const unfollowProfile = async (userId, profileId) => {
    const userRef = db.collection('Users').doc(userId);
    await userRef.update({
        followedProfileIds: FieldValue.arrayRemove(profileId)
    });
    return { success: true, message: 'Successfully unfollowed profile.' };
};

// Hàm này để mobile gọi khi user Đăng xuất (Logout)
// Cần xóa token của thiết bị đó khỏi mảng để không gửi noti vào máy đã logout
const removeFcmToken = async (userId, fcmToken) => {
    const userRef = db.collection('Users').doc(userId);
    await userRef.update({
        fcmTokens: FieldValue.arrayRemove(fcmToken)
    });
    return { success: true };
};

module.exports = {
    createUserProfile,
    getUserById,
    updateUserProfile,
    followProfile,
    unfollowProfile,
    removeFcmToken
};