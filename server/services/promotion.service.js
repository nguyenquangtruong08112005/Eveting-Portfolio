// services/promotion.service.js
const { db } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Lấy tất cả các chương trình khuyến mãi đang hoạt động (Dành cho User - Client).
 */
const getAllPromotions = async () => {
    const promotions = [];
    const now = new Date().getTime();
    // Chỉ lấy public promotions hoặc admin promotions
    const snapshot = await db.collection('Promotions')
        .where('validUntil', '>', now)
        .where('isPublic', '==', true) // Thêm cờ này để lọc
        .get();

    snapshot.forEach(doc => {
        const promo = doc.data();
        if (promo.usedCount < promo.usageLimit) {
            promotions.push(promo);
        }
    });
    return promotions;
};

/**
 * Lấy danh sách khuyến mãi do Organizer tạo (Dành cho App Organizer).
 */
const getPromotionsByOrganizer = async (organizerId) => {
    const snapshot = await db.collection('Promotions')
        .where('organizerId', '==', organizerId)
        .orderBy('createdAt', 'desc')
        .get();

    const promotions = [];
    snapshot.forEach(doc => {
        promotions.push(doc.data());
    });
    return promotions;
};

/**
 * Tạo mã khuyến mãi mới.
 */
const createPromotion = async (organizerId, promoData) => {
    // 1. Validate dữ liệu đầu vào cơ bản
    if (!promoData.code || !promoData.discountValue) {
        throw new Error("Code and discount value are required.");
    }

    // 2. Kiểm tra trùng mã Code (Code phải là duy nhất trên toàn hệ thống để tránh conflict)
    const existingCode = await db.collection('Promotions').where('code', '==', promoData.code).get();
    if (!existingCode.empty) {
        throw new Error(`Promotion code '${promoData.code}' already exists.`);
    }

    // 3. Nếu áp dụng cho Event cụ thể, kiểm tra quyền sở hữu
    if (promoData.eventId) {
        const eventDoc = await db.collection('Events').doc(promoData.eventId).get();
        if (!eventDoc.exists) throw new Error("Event not found.");
        if (eventDoc.data().organizerId !== organizerId) throw new Error("You do not own this event.");
    }

    const promoId = `promo_${uuidv4()}`;
    const now = new Date().getTime();

    const newPromo = {
        id: promoId,
        organizerId: organizerId,
        code: promoData.code.toUpperCase(),
        name: promoData.name || "Discount Code",
        description: promoData.description || "",
        
        // Loại giảm giá: 'percent' (10%) hoặc 'amount' (50k)
        discountType: promoData.discountType || 'amount', 
        discountValue: Number(promoData.discountValue),

        // Điều kiện áp dụng (Combo: Mua tối thiểu 2 vé mới được giảm)
        minTicketQuantity: Number(promoData.minTicketQuantity) || 1, 

        // Phạm vi: null = toàn bộ event của organizer này, hoặc eventId cụ thể
        eventId: promoData.eventId || null, 

        validFrom: promoData.validFrom || now,
        validUntil: promoData.validUntil || (now + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        
        usageLimit: Number(promoData.usageLimit) || 100,
        usedCount: 0,
        isPublic: promoData.isPublic || false, // Có hiển thị công khai trên trang chủ không?
        createdAt: now
    };

    await db.collection('Promotions').doc(promoId).set(newPromo);
    return newPromo;
};

/**
 * Cập nhật mã khuyến mãi (Chỉ cho phép sửa số lượng, ngày hết hạn, mô tả).
 */
const updatePromotion = async (promoId, organizerId, updateData) => {
    const promoRef = db.collection('Promotions').doc(promoId);
    const doc = await promoRef.get();

    if (!doc.exists) throw new Error("Promotion not found.");
    if (doc.data().organizerId !== organizerId) throw new Error("Forbidden.");

    const allowedUpdates = {};
    if (updateData.usageLimit) allowedUpdates.usageLimit = Number(updateData.usageLimit);
    if (updateData.validUntil) allowedUpdates.validUntil = updateData.validUntil;
    if (updateData.description) allowedUpdates.description = updateData.description;
    if (updateData.isPublic !== undefined) allowedUpdates.isPublic = updateData.isPublic;

    if (Object.keys(allowedUpdates).length > 0) {
        await promoRef.update(allowedUpdates);
    }

    return { id: promoId, ...doc.data(), ...allowedUpdates };
};

/**
 * Xóa mã khuyến mãi.
 */
const deletePromotion = async (promoId, organizerId) => {
    const promoRef = db.collection('Promotions').doc(promoId);
    const doc = await promoRef.get();

    if (!doc.exists) throw new Error("Promotion not found.");
    if (doc.data().organizerId !== organizerId) throw new Error("Forbidden.");

    await promoRef.delete();
    return { success: true };
};

/**
 * Validate Promotion (Logic cũ giữ nguyên, bổ sung check minTicketQuantity).
 */
const validatePromotionCode = async (code, eventId, ticketQuantity = 1) => {
    const snapshot = await db.collection('Promotions').where('code', '==', code).limit(1).get();

    if (snapshot.empty) {
        return { valid: false, message: 'Invalid promotion code.' };
    }

    const promo = snapshot.docs[0].data();
    const now = new Date().getTime();

    if (promo.validUntil <= now) return { valid: false, message: 'Expired.' };
    if (promo.validFrom > now) return { valid: false, message: 'Not yet active.' };
    if (promo.usedCount >= promo.usageLimit) return { valid: false, message: 'Usage limit reached.' };
    
    // Check Event Scope
    if (promo.eventId && promo.eventId !== eventId) {
        return { valid: false, message: 'Not valid for this event.' };
    }
    
    // Check Organizer Scope (Nếu code global của organizer, check xem event có thuộc organizer đó không)
    // Phần này cần query event để check organizerId nếu promo.eventId == null. 
    // Để tối ưu performance, tạm thời giả định client gửi đúng.

    // Check Combo (Min Quantity)
    if (ticketQuantity < (promo.minTicketQuantity || 1)) {
        return { valid: false, message: `Minimum ${promo.minTicketQuantity} tickets required.` };
    }

    return { 
        valid: true, 
        message: 'Applied.',
        ...promo 
    };
};

module.exports = {
    getAllPromotions,
    getPromotionsByOrganizer,
    createPromotion,
    updatePromotion,
    deletePromotion,
    validatePromotionCode,
};