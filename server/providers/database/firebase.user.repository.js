const { db, FieldValue, admin } = require('../../config/firebase.config');

const getUserRoles = async (userId) => {
  const userDoc = await db.collection('Users').doc(userId).get();
  if (userDoc.exists) {
    return userDoc.data().roles || userDoc.data().role || [];
  }
  return [];
};

const getUsersFcmTokens = async (userIds) => {
  const tokens = [];
  const recipientIds = [];
  const CHUNK_SIZE = 10;
  for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + CHUNK_SIZE);
    const userDocs = await db.collection('Users')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    userDocs.forEach(doc => {
      recipientIds.push(doc.id);
      const d = doc.data();
      if (d.fcmTokens && Array.isArray(d.fcmTokens)) tokens.push(...d.fcmTokens);
      else if (d.fcmToken) tokens.push(d.fcmToken);
    });
  }
  return { recipientIds, tokens };
};

const createUser = async (uid, userData) => {
  await db.collection('Users').doc(uid).set(userData);
};

const getUserDataById = async (userId) => {
  const doc = await db.collection('Users').doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

const updateUser = async (userId, updateData, fcmToken) => {
  if (fcmToken) {
    updateData.fcmTokens = FieldValue.arrayUnion(fcmToken);
  }
  await db.collection('Users').doc(userId).update(updateData);
};

const addFcmToken = async (userId, token) => {
  await db.collection('Users').doc(userId).update({
    fcmTokens: FieldValue.arrayUnion(token)
  });
};

const removeFcmToken = async (userId, token) => {
  await db.collection('Users').doc(userId).update({
    fcmTokens: FieldValue.arrayRemove(token)
  });
};

const getEventsByIds = async (eventIds) => {
  if (!eventIds || eventIds.length === 0) return [];
  const snapshot = await db.collection('Events')
    .where('id', 'in', eventIds)
    .get();
  return snapshot.docs.map(doc => {
    const ev = doc.data();
    return {
      id: ev.id,
      name: ev.name,
      date: ev.date,
      imageUrl: ev.imageUrl || ev.bannerUrl || ""
    };
  });
};

const followProfile = async (userId, profileId) => {
  return db.runTransaction(async (transaction) => {
    const userRef = db.collection('Users').doc(userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) throw new Error("User not found.");

    const userData = userDoc.data();
    if ((userData.followedProfileIds || []).includes(profileId)) {
      return { alreadyFollowing: true };
    }

    let profileRef = db.collection('FeaturedProfiles').doc(profileId);
    let profileDoc = await transaction.get(profileRef);
    if (!profileDoc.exists) {
      profileRef = db.collection('Users').doc(profileId);
      profileDoc = await transaction.get(profileRef);
      if (!profileDoc.exists) {
        throw new Error("Profile not found.");
      }
    }

    transaction.update(userRef, {
      followedProfileIds: FieldValue.arrayUnion(profileId),
      followingCount: FieldValue.increment(1)
    });

    transaction.update(profileRef, {
      followerCount: FieldValue.increment(1)
    });

    return { alreadyFollowing: false };
  });
};

const unfollowProfile = async (userId, profileId) => {
  return db.runTransaction(async (transaction) => {
    const userRef = db.collection('Users').doc(userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) throw new Error("User not found.");

    const userData = userDoc.data();
    if (!(userData.followedProfileIds || []).includes(profileId)) {
      return { notFollowing: true };
    }

    transaction.update(userRef, {
      followedProfileIds: FieldValue.arrayRemove(profileId),
      followingCount: FieldValue.increment(-1)
    });

    let profileRef = db.collection('FeaturedProfiles').doc(profileId);
    let profileDoc = await transaction.get(profileRef);
    if (profileDoc.exists) {
      transaction.update(profileRef, {
        followerCount: FieldValue.increment(-1)
      });
    } else {
      profileRef = db.collection('Users').doc(profileId);
      profileDoc = await transaction.get(profileRef);
      if (profileDoc.exists) {
        transaction.update(profileRef, {
          followerCount: FieldValue.increment(-1)
        });
      }
    }

    return { notFollowing: false };
  });
};

const getUsersByIds = async (userIds) => {
  if (!userIds || userIds.length === 0) return {};
  const usersMap = {};
  const CHUNK_SIZE = 10;
  for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + CHUNK_SIZE);
    const snap = await db.collection('Users')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    snap.forEach(doc => {
      usersMap[doc.id] = doc.data();
    });
  }
  return usersMap;
};

const findUserByEmail = async (email) => {
  const userSnapshot = await db.collection('Users').where('email', '==', email).limit(1).get();
  if (userSnapshot.empty) return null;
  const d = userSnapshot.docs[0];
  return { ...d.data(), _id: d.id };
};

const getRawUserDataById = async (userId) => {
  const doc = await db.collection('Users').doc(userId).get();
  if (!doc.exists) return null;
  return doc.data();
};

const addOrganizerRoleToUser = async (userId, organizerData) => {
  const userRef = db.collection('Users').doc(userId);
  await userRef.update({
    roles: FieldValue.arrayUnion('organizer'),
    organizerInfo: {
      companyName: organizerData.companyName,
      taxCode: organizerData.taxCode || '',
      description: organizerData.description || '',
      website: organizerData.website || '',
      createdAt: new Date().getTime()
    }
  });
  const updatedDoc = await userRef.get();
  return updatedDoc.data();
};

const updateUserFields = async (userId, updateData) => {
  await db.collection('Users').doc(userId).update(updateData);
};

const addHistoryEventIdInTransaction = (transaction, userId, eventId) => {
  transaction.update(db.collection('Users').doc(userId), {
    historyEventIds: FieldValue.arrayUnion(eventId)
  });
};

module.exports = {
  getUserRoles,
  getUsersFcmTokens,
  createUser,
  getUserDataById,
  updateUser,
  addFcmToken,
  removeFcmToken,
  getEventsByIds,
  followProfile,
  unfollowProfile,
  getUsersByIds,
  findUserByEmail,
  getRawUserDataById,
  addOrganizerRoleToUser,
  updateUserFields,
  addHistoryEventIdInTransaction,
};
