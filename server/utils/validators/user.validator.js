// utils/validators/user.validator.js
const { body, validationResult } = require('express-validator');

const validateProfileUpdate = [
    body('name').optional().isString().withMessage('Name must be a string'),
    body('aboutMe').optional().isString().withMessage('About Me must be a string'),
    body('coverPhotoUrl').optional().isURL().withMessage('Cover photo must be a valid URL'),
    body('profilePicUrl').optional().isURL().withMessage('Profile picture must be a valid URL'),
    body('interests').optional().isArray().withMessage('Interests must be an array of strings'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = { validateProfileUpdate };