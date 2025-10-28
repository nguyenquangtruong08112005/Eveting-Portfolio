// middleware/auth.middleware.js
const { auth, db } = require('../config/firebase.config'); // Đảm bảo đã import cả auth và db

/**
 * Middleware để xác thực Firebase ID Token và lấy thông tin User roles.
 * Nếu token hợp lệ, thông tin user (bao gồm uid, email, roles...) sẽ được gắn vào req.user.
 */
const verifyAuthToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Unauthorized: No token provided or malformed header.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // 1. Xác thực token
    const decodedToken = await auth.verifyIdToken(idToken);

    // 2. Lấy thông tin User từ Firestore để có roles
    let userRoles = []; // Mặc định là mảng rỗng
    const userDoc = await db.collection('Users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
        userRoles = userDoc.data().roles || userDoc.data().role || []; // Lấy roles hoặc mảng rỗng nếu không có
    }

    // 3. Gắn thông tin đầy đủ vào req.user
    req.user = {
        ...decodedToken, // Giữ lại thông tin cơ bản từ token (uid, email, ...)
        roles: userRoles  // Thêm roles đã lấy từ DB
    };

    next(); // Chuyển tiếp request
  } catch (error) {
    console.error('Error verifying auth token:', error);
    // Phân biệt lỗi token không hợp lệ và lỗi server khác
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        return res.status(403).send({ error: 'Forbidden: Invalid or expired token.' });
    }
    return res.status(500).send({ error: 'Internal Server Error verifying token.' });
  }
};

/**
 * Middleware để kiểm tra xem user có phải là 'organizer' không.
 * PHẢI được dùng SAU KHI verifyAuthToken đã chạy.
 */
const isOrganizer = (req, res, next) => {
  // Kiểm tra trực tiếp roles đã được gắn vào req.user
  if (req.user && (req.user.roles?.includes('organizer') || req.user.role?.includes('organizer'))) {
      return next(); // User hợp lệ, cho phép đi tiếp
  }

  // Nếu không, trả về lỗi
  return res.status(403).send({ error: 'Forbidden: User does not have organizer privileges.' });
};


module.exports = {
  verifyAuthToken,
  isOrganizer
};