const userRepository = require('@/providers/database/user.repository');

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
        address: userData.address || "",
        interests: userData.matchingPreferences?.interests || [],
        joinedEvents: joinedEvents
    };
};

const buildUserProfileObject = (userData, profileData) => {
    const { uid, email } = userData;
    return {
        id: uid, email, name: profileData.name || '',
        profilePicUrl: profileData.profilePicUrl || '', coverPhotoUrl: profileData.coverPhotoUrl || null,
        bio: profileData.bio || '', birthDate: profileData.birthDate || null,
        roles: ['attendee'], createdAt: new Date().getTime(), followedProfileIds: [],
        historyEventIds: [], followersCount: 0, points: 0, level: 'bronze',
        matchingPreferences: { interests: profileData.interests || [], ageRange: profileData.ageRange || "18-25" },
        sharedMedia: []
    };
};

const buildProfileUpdateData = (updateData) => {
    const dataToUpdate = {};
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.profilePicUrl !== undefined) dataToUpdate.profilePicUrl = updateData.profilePicUrl;
    if (updateData.coverPhotoUrl !== undefined) dataToUpdate.coverPhotoUrl = updateData.coverPhotoUrl;
    if (updateData.aboutMe !== undefined) dataToUpdate.bio = updateData.aboutMe;
    if (updateData.birthDate !== undefined) dataToUpdate.birthDate = updateData.birthDate;
    if (updateData.interests !== undefined) { dataToUpdate['matchingPreferences.interests'] = updateData.interests; }
    if (updateData.address !== undefined) dataToUpdate.address = updateData.address;
    return dataToUpdate;
};

module.exports = { mapUserToMobileProfile, buildUserProfileObject, buildProfileUpdateData };
