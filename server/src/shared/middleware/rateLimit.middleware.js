const rateLimit = require('express-rate-limit');

const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    publicApiLimiter,
};
