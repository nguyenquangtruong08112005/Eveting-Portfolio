const userRepository = require('@/providers/database/user.repository');
const authRepository = require('@/providers/database/postgres.auth.repository');
const { fcmService, helper: notifHelper } = require('@/modules/notifications');
require('dotenv').config();
const ADMIN_UID = process.env.ADMIN_UID;

const extractFcmTokens = (userData) => {
  let tokens = [];
  if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
    tokens = userData.fcmTokens;
  } else if (userData.fcmToken) {
    tokens.push(userData.fcmToken);
  }
  return tokens;
};

const mapUserToMobileProfile = async (userData) => {
    if (!userData) return null;

    const isOrganizer = userData.roles ? userData.roles.includes('organizer') : false;

    let joinedEvents = [];
    if (userData.historyEventIds && userData.historyEventIds.length > 0) {
        try {
            joinedEvents = await userRepository.getEventsByIds(userData.historyEventIds);
        } catch (error) {
            console.error("Error fetching joined events:", error);
        }
    }

    return {
        id: userData.id,
        email: userData.email,
        userName: userData.name,
        profilePictureUrl: userData.profilePicUrl || "",
        coverPhotoUrl: userData.coverPhotoUrl || "https://picsum.photos/800/400",
        isOrganizer: isOrganizer,
        followingCount: userData.followedProfileIds ? userData.followedProfileIds.length : 0,
        followersCount: userData.followersCount || 0,
        followedProfileIds: userData.followedProfileIds || [],
        aboutMe: userData.bio || "",
        interests: userData.matchingPreferences?.interests || [],
        joinedEvents: joinedEvents
    };
};

const createUserProfile = async (userData, profileData) => {
    const { uid, email } = userData;

    const newUserProfile = {
        id: uid,
        email: email,
        name: profileData.name || '',
        profilePicUrl: profileData.profilePicUrl || '',
        coverPhotoUrl: profileData.coverPhotoUrl || null,
        bio: profileData.bio || '',
        birthDate: profileData.birthDate || null,
        roles: ['attendee'],
        createdAt: new Date().getTime(),
        followedProfileIds: [],
        historyEventIds: [],
        followersCount: 0,
        points: 0,
        level: 'bronze',
        matchingPreferences: {
            interests: profileData.interests || [],
            ageRange: profileData.ageRange || "18-25"
        },
        sharedMedia: []
    };

    await userRepository.createUser(uid, newUserProfile);

    return await mapUserToMobileProfile(newUserProfile);
};

const getUserById = async (userId) => {
    const userData = await userRepository.getUserDataById(userId);

    if (userId === process.env.ADMIN_UID) return { ...userData, isAdmin: true };

    if (!userData) {
        return null;
    }
    const authUser = await authRepository.findUserById(userId);
    const emailVerified = authUser ? !!authUser.email_verified : false;

    const profile = await mapUserToMobileProfile(userData);
    if (profile) {
        profile.emailVerified = emailVerified;
    }
    return profile;
};

const updateUserProfile = async (userId, updateData) => {
    const dataToUpdate = {};

    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.profilePicUrl !== undefined) dataToUpdate.profilePicUrl = updateData.profilePicUrl;
    if (updateData.coverPhotoUrl !== undefined) dataToUpdate.coverPhotoUrl = updateData.coverPhotoUrl;
    if (updateData.aboutMe !== undefined) dataToUpdate.bio = updateData.aboutMe;
    if (updateData.birthDate !== undefined) dataToUpdate.birthDate = updateData.birthDate;

    if (updateData.interests !== undefined) {
        dataToUpdate['matchingPreferences.interests'] = updateData.interests;
    }

    const fcmToken = updateData.fcmToken || null;

    if (fcmToken && notifHelper.shouldManageDeviceTopics()) {
        try {
            const userData = await userRepository.getUserDataById(userId);
            const followedIds = userData ? (userData.followedProfileIds || []) : [];

            if (followedIds.length > 0) {
                const promises = followedIds.map(profileId => {
                    const topicName = `artist_${profileId}`;
                    return fcmService.subscribeToTopic(fcmToken, topicName);
                });
                await Promise.all(promises);
                console.log(`[Sync] Subscribed new token to ${followedIds.length} topics.`);
            }
        } catch (error) {
            console.error("[Sync] Error syncing topics for new token:", error);
        }
    } else if (fcmToken) {
        console.log("[Sync] Skipped device topic sync because notification provider uses external id targeting.");
    }

    if (Object.keys(dataToUpdate).length > 0 || fcmToken) {
        await userRepository.updateUser(userId, dataToUpdate, fcmToken);
    }

    return await getUserById(userId);
};

const followProfile = async (userId, profileId) => {
    try {
        await userRepository.followProfile(userId, profileId);

        const userData = await userRepository.getUserDataById(userId);
        const tokens = extractFcmTokens(userData);

        if (tokens.length > 0 && notifHelper.shouldManageDeviceTopics()) {
            const topicName = `artist_${profileId}`;
            await fcmService.subscribeToTopic(tokens, topicName);
        } else if (tokens.length > 0) {
            console.log(`[Follow] Skipped topic subscription for profile ${profileId}; external id targeting is active.`);
        }

        return { success: true, message: `Successfully followed profile.` };

    } catch (error) {
        console.error("Follow Transaction Error:", error);
        throw error;
    }
};

const unfollowProfile = async (userId, profileId) => {
    try {
        await userRepository.unfollowProfile(userId, profileId);

        const userData = await userRepository.getUserDataById(userId);
        const tokens = extractFcmTokens(userData);

        if (tokens.length > 0 && notifHelper.shouldManageDeviceTopics()) {
            const topicName = `artist_${profileId}`;
            await fcmService.unsubscribeFromTopic(tokens, topicName);
        } else if (tokens.length > 0) {
            console.log(`[Unfollow] Skipped topic unsubscription for profile ${profileId}; external id targeting is active.`);
        }

        return { success: true, message: 'Successfully unfollowed profile.' };

    } catch (error) {
        console.error("Unfollow Transaction Error:", error);
        throw error;
    }
};

const removeFcmToken = async (userId, fcmToken) => {
    await userRepository.removeFcmToken(userId, fcmToken);
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
