// services/promotion.service.js
const { db } = require('../config/firebase.config');

/**
 * Lấy tất cả các chương trình khuyến mãi đang hoạt động.
 * @returns {Promise<Array<object>>} Mảng các promotions.
 */
const getAllPromotions = async () => {
    const promotions = [];
    const now = new Date().getTime();

    // Lấy các khuyến mãi chưa hết hạn
    const snapshot = await db.collection('Promotions').where('validUntil', '>', now).get();

    snapshot.forEach(doc => {
        const promo = doc.data();
        // Chỉ trả về các khuyến mãi còn lượt sử dụng
        if (promo.usedCount < promo.usageLimit) {
            promotions.push(promo);
        }
    });
    return promotions;
};

/**
 * Kiểm tra tính hợp lệ của một mã khuyến mãi.
 * @param {string} code - Mã code người dùng nhập.
 * @param {string} eventId - ID của sự kiện đang áp dụng.
 * @returns {Promise<object|null>} Dữ liệu promotion nếu hợp lệ, ngược lại trả về null.
 */
const validatePromotionCode = async (code, eventId) => {
    const snapshot = await db.collection('Promotions').where('code', '==', code).limit(1).get();

    if (snapshot.empty) {
        return { valid: false, message: 'Invalid promotion code.' };
    }

    const promo = snapshot.docs[0].data();
    const now = new Date().getTime();

    // 1. Kiểm tra hạn sử dụng
    if (promo.validUntil <= now) {
        return { valid: false, message: 'This promotion has expired.' };
    }
    // 2. Kiểm tra lượt sử dụng
    if (promo.usedCount >= promo.usageLimit) {
        return { valid: false, message: 'This promotion has reached its usage limit.' };
    }
    // 3. Kiểm tra sự kiện áp dụng
    // Nếu promo.eventId là null, nó áp dụng cho mọi sự kiện.
    // Nếu không, nó phải khớp với eventId được gửi lên.
    if (promo.eventId !== null && promo.eventId !== eventId) {
        return { valid: false, message: 'This promotion is not valid for the selected event.' };
    }

    // Nếu tất cả đều hợp lệ
    return { 
        valid: true, 
        message: 'Promotion applied successfully.',
        ...promo 
    };
};


module.exports = {
    getAllPromotions,
    validatePromotionCode,
};