const { auth } = require('../config/firebase.config');
const { db } = require('../config/firebase.config');
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

/**
 * Middleware để kiểm tra xem user có phải là 'organizer' không.
 * PHẢI được dùng SAU KHI verifyAuthToken đã chạy.
 */

const isOrganizer = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('Users').doc(userId).get();
    // TODO: call controller to check role
    if (userDoc.exists && userDoc.data().role === 'organizer') {
      return next(); // User hợp lệ, cho phép đi tiếp
    }

    // Nếu không, trả về lỗi
    return res.status(403).send({ error: 'Forbidden: User does not have organizer privileges.' });
  } catch (error) {
    console.error('Error checking organizer role:', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
};
module.exports = {
  verifyAuthToken,
  isOrganizer
};