// services/user.service.js
const { db, FieldValue } = require('../config/firebase.config');
const fcmService = require('./fcm.service'); // <-- Import FCM Service
require('dotenv').config();
const ADMIN_UID = process.env.ADMIN_UID;

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
        followedProfileIds: userData.followedProfileIds || [], 
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

    if (userId === process.env.ADMIN_UID) return { ...userDoc.data(), isAdmin: true };

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

        // --- Logic đồng bộ: Subscribe token mới vào các topic đã follow ---
        try {
            const userDoc = await userRef.get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const followedIds = userData.followedProfileIds || [];

                if (followedIds.length > 0) {
                    // Duyệt qua tất cả profile đã follow và đăng ký token mới vào topic tương ứng
                    const promises = followedIds.map(profileId => {
                        const topicName = `artist_${profileId}`;
                        return fcmService.subscribeToTopic(updateData.fcmToken, topicName);
                    });
                    
                    // Thực hiện subscribe song song
                    await Promise.all(promises);
                    console.log(`[Sync] Subscribed new token to ${followedIds.length} topics.`);
                }
            }
        } catch (error) {
            console.error("[Sync] Error syncing topics for new token:", error);
            // Không throw lỗi để đảm bảo quá trình update user profile vẫn thành công
        }
    }

    if (Object.keys(dataToUpdate).length > 0) {
        await userRef.update(dataToUpdate);
    }

    // Lấy lại dữ liệu mới nhất và trả về format chuẩn
    return await getUserById(userId);
};

const followProfile = async (userId, profileId) => {
    const userRef = db.collection('Users').doc(userId);
    
    // Cần xác định profileId thuộc collection nào (Users hay FeaturedProfiles)
    // Giả sử FeaturedProfiles trước, nếu không tìm thấy thì tìm trong Users (đối với Organizer)
    let profileRef = db.collection('FeaturedProfiles').doc(profileId);
    let profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
        // Thử tìm trong Users (Organizer)
        profileRef = db.collection('Users').doc(profileId);
        profileDoc = await profileRef.get();
        if (!profileDoc.exists) {
            throw new Error("Profile not found.");
        }
    }

    // Dùng Transaction để đảm bảo tính nhất quán:
    // 1. Thêm ID vào followedProfileIds của User
    // 2. Tăng followerCount của Profile
    try {
        await db.runTransaction(async (transaction) => {
            // Đọc dữ liệu User hiện tại trong transaction
            const userDocTrans = await transaction.get(userRef);
            if (!userDocTrans.exists) throw new Error("User not found.");
            
            const userData = userDocTrans.data();
            const followedIds = userData.followedProfileIds || [];

            if (followedIds.includes(profileId)) {
                // Đã follow rồi -> Không làm gì cả (tránh spam tăng count)
                return; 
            }

            // 1. Cập nhật User: Thêm vào list follow & Tăng followingCount
            transaction.update(userRef, {
                followedProfileIds: FieldValue.arrayUnion(profileId),
                followingCount: FieldValue.increment(1)
            });

            // 2. Cập nhật Profile: Tăng followerCount
            transaction.update(profileRef, {
                followerCount: FieldValue.increment(1)
            });
        });

        // 3. Logic FCM (Thực hiện sau khi DB update thành công)
        // Lấy lại user data để lấy token mới nhất (không cần trong transaction)
        const userDocAfter = await userRef.get();
        const userDataAfter = userDocAfter.data();
        
        let tokens = [];
        if (userDataAfter.fcmTokens && Array.isArray(userDataAfter.fcmTokens)) {
            tokens = userDataAfter.fcmTokens;
        } else if (userDataAfter.fcmToken) {
            tokens.push(userDataAfter.fcmToken);
        }

        if (tokens.length > 0) {
            const topicName = `artist_${profileId}`;
            await fcmService.subscribeToTopic(tokens, topicName);
        }

        return { success: true, message: `Successfully followed profile.` };

    } catch (error) {
        console.error("Follow Transaction Error:", error);
        throw error; // Ném lỗi để controller bắt
    }
};

const unfollowProfile = async (userId, profileId) => {
    const userRef = db.collection('Users').doc(userId);
    
    // Tương tự, tìm collection đúng
    let profileRef = db.collection('FeaturedProfiles').doc(profileId);
    let profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
        profileRef = db.collection('Users').doc(profileId);
        profileDoc = await profileRef.get();
        if (!profileDoc.exists) {
             // Nếu profile bị xóa rồi, vẫn cho phép user unfollow để dọn dẹp data rác
             console.warn("Unfollowing a non-existent profile.");
        }
    }

    try {
        await db.runTransaction(async (transaction) => {
            const userDocTrans = await transaction.get(userRef);
            if (!userDocTrans.exists) throw new Error("User not found.");
            
            const userData = userDocTrans.data();
            const followedIds = userData.followedProfileIds || [];

            if (!followedIds.includes(profileId)) {
                return; // Chưa follow -> Không cần unfollow
            }

            // 1. Cập nhật User: Xóa khỏi list & Giảm followingCount
            transaction.update(userRef, {
                followedProfileIds: FieldValue.arrayRemove(profileId),
                followingCount: FieldValue.increment(-1)
            });

            // 2. Cập nhật Profile: Giảm followerCount (nếu profile còn tồn tại)
            if (profileDoc.exists) {
                transaction.update(profileRef, {
                    followerCount: FieldValue.increment(-1)
                });
            }
        });

        // 3. Logic FCM
        const userDocAfter = await userRef.get();
        const userDataAfter = userDocAfter.data();
        
        let tokens = [];
        if (userDataAfter.fcmTokens && Array.isArray(userDataAfter.fcmTokens)) {
            tokens = userDataAfter.fcmTokens;
        } else if (userDataAfter.fcmToken) {
            tokens.push(userDataAfter.fcmToken);
        }

        if (tokens.length > 0) {
            const topicName = `artist_${profileId}`;
            await fcmService.unsubscribeFromTopic(tokens, topicName);
        }

        return { success: true, message: 'Successfully unfollowed profile.' };

    } catch (error) {
        console.error("Unfollow Transaction Error:", error);
        throw error;
    }
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
    followProfile,      // Đã cập nhật
    unfollowProfile,    // Đã cập nhật
    removeFcmToken
};