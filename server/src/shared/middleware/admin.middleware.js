require('dotenv').config();
const config = require('@/shared/config/env.config');
const { userHasRole, sendLegacyError } = require('@/shared/middleware/authz.middleware');
const { ForbiddenError, InternalServerError } = require('@/shared/errors');
const logger = require('@/shared/logger');

const isAdmin = (req, res, next) => {
    try {
        const currentUid = req.user.uid;
        const adminUid = config.adminUid;

        if (currentUid && currentUid === adminUid) {
            return next();
        }

        if (userHasRole(req, 'admin')) {
            return next();
        }

        return sendLegacyError(res, new ForbiddenError(), 'Forbidden: Require Admin Privileges.');
    } catch (e) {
        logger.error('isAdmin error', { error: e.message });
        return sendLegacyError(res, new InternalServerError(), 'Internal Server Error');
    }
};

module.exports = { isAdmin };
