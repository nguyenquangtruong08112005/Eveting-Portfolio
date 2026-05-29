const firebaseUserRepository = require('./firebase.user.repository');

const getOrganizerProfile = async (userId) => {
  return firebaseUserRepository.getRawUserDataById(userId);
};

const addOrganizerRoleToUser = async (userId, organizerData) => {
  return firebaseUserRepository.addOrganizerRoleToUser(userId, organizerData);
};

const updateOrganizerProfile = async (userId, updateData) => {
  await firebaseUserRepository.updateUserFields(userId, updateData);
  return firebaseUserRepository.getRawUserDataById(userId);
};

module.exports = {
  getOrganizerProfile,
  addOrganizerRoleToUser,
  updateOrganizerProfile
};
