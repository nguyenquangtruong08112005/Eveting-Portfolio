// middleware/admin.middleware.js
require('dotenv').config();

const isAdmin = (req, res, next) => {
    try {
        // req.user đã có từ verifyAuthToken
        const currentUid = req.user.uid;
        const adminUid = process.env.ADMIN_UID;

        if (currentUid && currentUid === adminUid) {
            return next(); // Cho phép nếu UID trùng khớp
        }

        return res.status(403).send({ error: 'Forbidden: Require Admin Privileges.' });
    } catch (e) {
        return res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = { isAdmin };