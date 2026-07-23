const userRepository = require('@/providers/database/user.repository');
const authRepository = require('@/providers/database/postgres.auth.repository');
require('dotenv').config();
const ADMIN_UID = process.env.ADMIN_UID;

const { extractFcmTokens, syncTokenTopics, subscribeTokensToTopic, unsubscribeTokensFromTopic } = require('./fcm.helper');
const { mapUserToMobileProfile, buildUserProfileObject, buildProfileUpdateData } = require('./profile.helper');

const createUserProfile = async (userData, profileData) => {
    const newUserProfile = buildUserProfileObject(userData, profileData);
    await userRepository.createUser(userData.uid, newUserProfile);
    return await mapUserToMobileProfile(newUserProfile);
};

const getUserById = async (userId) => {
    const userData = await userRepository.getUserDataById(userId);
    if (userId === process.env.ADMIN_UID) return { ...userData, isAdmin: true };
    if (!userData) return null;
    const authUser = await authRepository.findUserById(userId);
    const emailVerified = authUser ? !!authUser.email_verified : false;
    const profile = await mapUserToMobileProfile(userData);
    if (profile) { profile.emailVerified = emailVerified; }
    return profile;
};

const updateUserProfile = async (userId, updateData) => {
    const dataToUpdate = buildProfileUpdateData(updateData);
    const fcmToken = updateData.fcmToken || null;
    if (fcmToken) {
        try {
            const userData = await userRepository.getUserDataById(userId);
            const followedIds = userData ? (userData.followedProfileIds || []) : [];
            await syncTokenTopics(fcmToken, followedIds);
        } catch (error) {
            console.error("[Sync] Error syncing topics for new token:", error);
        }
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
        await subscribeTokensToTopic(tokens, profileId);
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
        await unsubscribeTokensFromTopic(tokens, profileId);
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
    createUserProfile, getUserById, updateUserProfile,
    followProfile, unfollowProfile, removeFcmToken
};
