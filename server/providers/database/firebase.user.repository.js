const { db } = require('../../config/firebase.config');

const getUserRoles = async (userId) => {
  const userDoc = await db.collection('Users').doc(userId).get();
  if (userDoc.exists) {
    return userDoc.data().roles || userDoc.data().role || [];
  }
  return [];
};

module.exports = {
  getUserRoles,
};
