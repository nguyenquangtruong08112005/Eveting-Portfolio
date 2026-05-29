const { db, admin } = require('../../config/firebase.config');

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

module.exports = {
  getUserRoles,
  getUsersFcmTokens,
};
