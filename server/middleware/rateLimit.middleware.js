// middleware/rateLimit.middleware.js
const rateLimit = require('express-rate-limit');

// Configure a limiter for general public GET requests
// Allows 100 requests per 15 minutes from the same IP
const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
    max: 100, // Limit each IP to 100 requests per `windowMs`
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // keyGenerator: (req, res) => req.ip // Default, uses IP address
});

// (Optional) Configure a stricter limiter for sensitive actions like registration/login
// const authLimiter = rateLimit({
//  windowMs: 60 * 60 * 1000, // 1 hour
//  max: 5, // Limit each IP to 5 login attempts per hour
//  message: { error: 'Too many login attempts from this IP, please try again after an hour.' },
//  // ... other options
// });

module.exports = {
    publicApiLimiter,
    // authLimiter // Export other limiters if you create them
};