// utils/validators/review.validator.js
const { body, validationResult } = require('express-validator');

const validateReviewCreation = [
    // Kiểm tra rating: phải là số, từ 1 đến 5
    body('rating')
        .notEmpty().withMessage('Rating is required.')
        .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
    // Kiểm tra comment: là chuỗi, có thể trống
    body('comment')
        .optional() // Cho phép trống
        .isString().withMessage('Comment must be a string.'),

    // Middleware để xử lý kết quả validation
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Nếu có lỗi, trả về 400 Bad Request cùng danh sách lỗi
            return res.status(400).json({ errors: errors.array() });
        }
        next(); // Nếu không có lỗi, cho phép đi tiếp
    }
];

module.exports = { validateReviewCreation };