const { auth } = require('../../config/firebase.config');

const verifyToken = async (idToken) => {
  const decodedToken = await auth.verifyIdToken(idToken);
  return decodedToken;
};

module.exports = {
  verifyToken,
};
