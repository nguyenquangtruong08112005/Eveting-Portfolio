const config = require('@/shared/config/env.config');
const authProvider = require('@/providers/auth');
const userRepository = require('@/providers/database/user.repository');
const authRepository = require('@/providers/database/postgres.auth.repository');
const { userHasRole, sendLegacyError } = require('@/shared/middleware/authz.middleware');
const { UnauthorizedError, ForbiddenError } = require('@/shared/errors');

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

const extractToken = (req) => {
  const authHeader = req.headers ? req.headers.authorization : null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split('Bearer ')[1];
  }
  if (req.cookies && (req.cookies.accessToken || req.cookies.access_token)) {
    return req.cookies.accessToken || req.cookies.access_token;
  }
  return null;
};

const verifyAuthToken = async (req, res, next) => {
  const idToken = extractToken(req);
  if (!idToken) {
    return res.status(401).send({ error: 'Unauthorized: No token provided or malformed header.' });
  }

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
  req.user = null;
  const idToken = extractToken(req);
  if (!idToken) {
    return next();
  }

  try {
    const decodedToken = await authProvider.verifyToken(idToken);
    await attachRequestUser(req, decodedToken);
  } catch (error) {
    req.user = null;
  }

  return next();
};

const isOrganizer = (req, res, next) => {
  if (req.user && req.user.role && (typeof req.user.role === 'string' ? req.user.role === 'organizer' : req.user.role.includes('organizer'))) {
      return next();
  }

  if (!req.user) {
    return sendLegacyError(res, new UnauthorizedError(), 'Unauthorized: No authenticated user.');
  }

  if (!userHasRole(req, 'organizer')) {
    return sendLegacyError(res, new ForbiddenError(), 'Forbidden: User does not have organizer privileges.');
  }

  next();
};

const requireVerifiedEmail = async (req, res, next) => {
  if (!req.user) {
    return sendLegacyError(res, new UnauthorizedError(), 'Unauthorized: No authenticated user.');
  }

  const userId = req.user.uid || req.user.id;
  let isVerified = req.user.emailVerified ?? req.user.email_verified;

  if (isVerified !== true && userId) {
    try {
      const user = await authRepository.findUserById(userId);
      isVerified = user?.email_verified ?? false;
    } catch (e) {
      isVerified = false;
    }
  }

  if (!isVerified) {
    return res.status(403).json({
      error: 'Forbidden: Email verification required.',
      code: 'EMAIL_VERIFICATION_REQUIRED'
    });
  }

  next();
};

const { requireRole, requireOwnership } = require('@/shared/middleware/authz.middleware');

module.exports = {
  verifyAuthToken,
  optionalAuthToken,
  isOrganizer,
  requireRole,
  requireOwnership,
  requireVerifiedEmail,
};
