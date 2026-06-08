require('dotenv').config();
const config = require('@/shared/config/env.config');

const isAdmin = (req, res, next) => {
    try {
        const currentUid = req.user.uid;
        const adminUid = config.adminUid;

        if (currentUid && currentUid === adminUid) {
            return next();
        }

        return res.status(403).send({ error: 'Forbidden: Require Admin Privileges.' });
    } catch (e) {
        return res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = { isAdmin };
