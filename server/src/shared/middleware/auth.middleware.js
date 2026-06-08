const config = require('@/shared/config/env.config');
const authProvider = require('@/providers/auth');
const userRepository = require('@/providers/database/user.repository');

const attachRequestUser = async (req, decodedToken) => {
  let userRoles = [];
  if (config.authProvider === 'backend') {
    userRoles = decodedToken.roles || [];
  } else {
    userRoles = await userRepository.getUserRoles(decodedToken.uid);
  }

  req.user = {
      ...decodedToken,
      roles: userRoles
  };
};

const verifyAuthToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Unauthorized: No token provided or malformed header.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await authProvider.verifyToken(idToken);
    await attachRequestUser(req, decodedToken);

    next();
  } catch (error) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        return res.status(401).send({ error: 'Unauthorized: Invalid or expired token.' });
    }
    if (config.authProvider === 'backend' && (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError')) {
        return res.status(401).send({ error: 'Unauthorized: Invalid or expired token.' });
    }
    console.error('Error verifying auth token:', error);
    return res.status(500).send({ error: 'Internal Server Error verifying token.' });
  }
};

const optionalAuthToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  req.user = null;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await authProvider.verifyToken(idToken);
    await attachRequestUser(req, decodedToken);
  } catch (error) {
    req.user = null;
  }

  return next();
};

const isOrganizer = (req, res, next) => {
  if (req.user && (req.user.roles?.includes('organizer') || req.user.role?.includes('organizer'))) {
      return next();
  }

  return res.status(403).send({ error: 'Forbidden: User does not have organizer privileges.' });
};

module.exports = {
  verifyAuthToken,
  optionalAuthToken,
  isOrganizer
};
