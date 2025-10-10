const { auth } = require('../config/firebase.config');

/**
 * Middleware để xác thực Firebase ID Token.
 * Nếu token hợp lệ, thông tin user (decodedToken) sẽ được gắn vào req.user.
 */
const verifyAuthToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Unauthorized: No token provided or malformed header.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    req.user = await auth.verifyIdToken(idToken);
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(403).send({ error: 'Forbidden: Invalid or expired token.' });
  }
};

module.exports = { verifyAuthToken };