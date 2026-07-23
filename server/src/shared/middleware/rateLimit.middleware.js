const rateLimit = require('express-rate-limit');

// Raised for local/dev SPA traffic (list + search + home sections + refresh).
// Production can tighten via env if needed.
const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.PUBLIC_API_RATE_LIMIT || 400),
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: 'Too many login or registration attempts, please try again after 1 minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const bookingLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 requests per windowMs
    message: { error: 'Too many ticket booking or seat holding requests, please try again after 1 minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500, // High limit for webhook callbacks to prevent block during payment callback storm
    message: { error: 'Too many webhook callback requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    publicApiLimiter,
    authLimiter,
    bookingLimiter,
    webhookLimiter,
};
