const { db } = require('../../config/firebase.config');

const getFeaturedProfilesPage = async (page = 1, limit = 10) => {
    const profilesRef = db.collection('FeaturedProfiles');
    const offset = (page - 1) * limit;

    const countSnapshot = await profilesRef.count().get();
    const totalProfiles = countSnapshot.data().count;

    const snapshot = await profilesRef
        .orderBy('name')
        .limit(limit)
        .offset(offset)
        .get();

    const profiles = [];
    snapshot.forEach(doc => {
        profiles.push(doc.data());
    });

    return {
        profiles,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalProfiles / limit),
            totalItems: totalProfiles
        }
    };
};

const getFeaturedProfileById = async (profileId) => {
    const doc = await db.collection('FeaturedProfiles').doc(profileId).get();
    if (!doc.exists) {
        return null;
    }

    return doc.data();
};

const createFeaturedProfile = async (profileId, profile) => {
    await db.collection('FeaturedProfiles').doc(profileId).set(profile);
    return profile;
};

const updateFeaturedProfile = async (profileId, updateData) => {
    const profileRef = db.collection('FeaturedProfiles').doc(profileId);
    await profileRef.update(updateData);

    const updatedDoc = await profileRef.get();
    return updatedDoc.data();
};

const deleteFeaturedProfile = async (profileId) => {
    const profileRef = db.collection('FeaturedProfiles').doc(profileId);
    await profileRef.delete();
};

const userHasOrganizerRole = async (userId) => {
    if (!userId) {
        return false;
    }

    const userDoc = await db.collection('Users').doc(userId).get();
    return userDoc.exists && userDoc.data().roles?.includes('organizer');
};

module.exports = {
    getFeaturedProfilesPage,
    getFeaturedProfileById,
    createFeaturedProfile,
    updateFeaturedProfile,
    deleteFeaturedProfile,
    userHasOrganizerRole
};
