// utils/validators/user.validator.js
const { body, validationResult } = require('express-validator');

const validateProfileUpdate = [
    // Kiểm tra name: là chuỗi, không được trống
    body('name')
        .optional() // Chỉ validate nếu trường này được gửi lên
        .notEmpty().withMessage('Name cannot be empty.')
        .isString().withMessage('Name must be a string.'),
    // Kiểm tra profilePicUrl: phải là URL hợp lệ (nếu có)
    body('profilePicUrl')
        .optional()
        .isURL().withMessage('Profile picture URL must be a valid URL.'),
    // Kiểm tra birthDate: phải là timestamp hợp lệ (nếu có)
    body('birthDate')
        .optional()
        .isNumeric().withMessage('Birth date must be a valid timestamp (number).'),

    // Middleware xử lý lỗi
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = { validateProfileUpdate };