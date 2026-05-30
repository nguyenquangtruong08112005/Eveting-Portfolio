// middleware/auth.middleware.js
const authProvider = require('../providers/auth');
const userRepository = require('../providers/database/user.repository');

const verifyAuthToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Unauthorized: No token provided or malformed header.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await authProvider.verifyToken(idToken);

    let userRoles = [];
    if (process.env.AUTH_PROVIDER === 'backend') {
      userRoles = decodedToken.roles || [];
    } else {
      userRoles = await userRepository.getUserRoles(decodedToken.uid);
    }

    req.user = {
        ...decodedToken,
        roles: userRoles
    };

    next();
  } catch (error) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        return res.status(403).send({ error: 'Forbidden: Invalid or expired token.' });
    }
    if (process.env.AUTH_PROVIDER === 'backend' && (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError')) {
        return res.status(403).send({ error: 'Forbidden: Invalid or expired token.' });
    }
    console.error('Error verifying auth token:', error);
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