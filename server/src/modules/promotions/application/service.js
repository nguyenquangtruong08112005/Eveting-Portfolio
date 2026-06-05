const promotionRepo = require('@/providers/database/promotion.repository');
const { v4: uuidv4 } = require('uuid');

const getAllPromotions = async () => {
    return promotionRepo.getActivePromotions();
};

const getPromotionsByOrganizer = async (organizerId) => {
    return promotionRepo.getPromotionsByOrganizer(organizerId);
};

const createPromotion = async (organizerId, promoData) => {
    if (!promoData.code || !promoData.discountValue) {
        throw new Error("Code and discount value are required.");
    }

    const existingPromo = await promotionRepo.findByCode(promoData.code);
    if (existingPromo) {
        throw new Error(`Promotion code '${promoData.code}' already exists.`);
    }

    if (promoData.eventId) {
        const event = await promotionRepo.getEventById(promoData.eventId);
        if (!event) throw new Error("Event not found.");
        if (event.organizerId !== organizerId) throw new Error("You do not own this event.");
    }

    const promoId = `promo_${uuidv4()}`;
    const now = new Date().getTime();

    const newPromo = {
        id: promoId,
        organizerId: organizerId,
        code: promoData.code.toUpperCase(),
        name: promoData.name || "Discount Code",
        description: promoData.description || "",
        discountType: promoData.discountType || 'amount',
        discountValue: Number(promoData.discountValue),
        minTicketQuantity: Number(promoData.minTicketQuantity) || 1,
        eventId: promoData.eventId || null,
        validFrom: promoData.validFrom || now,
        validUntil: promoData.validUntil || (now + 30 * 24 * 60 * 60 * 1000),
        usageLimit: Number(promoData.usageLimit) || 100,
        usedCount: 0,
        isPublic: promoData.isPublic || false,
        createdAt: now
    };

    await promotionRepo.createPromotion(promoId, newPromo);
    return newPromo;
};

const updatePromotion = async (promoId, organizerId, updateData) => {
    const promo = await promotionRepo.getPromotionById(promoId);
    if (!promo) throw new Error("Promotion not found.");
    if (promo.organizerId !== organizerId) throw new Error("Forbidden.");

    const allowedUpdates = {};
    if (updateData.usageLimit) allowedUpdates.usageLimit = Number(updateData.usageLimit);
    if (updateData.validUntil) allowedUpdates.validUntil = updateData.validUntil;
    if (updateData.description) allowedUpdates.description = updateData.description;
    if (updateData.isPublic !== undefined) allowedUpdates.isPublic = updateData.isPublic;

    if (Object.keys(allowedUpdates).length > 0) {
        await promotionRepo.updatePromotion(promoId, allowedUpdates);
    }

    return { id: promoId, ...promo, ...allowedUpdates };
};

const deletePromotion = async (promoId, organizerId) => {
    const promo = await promotionRepo.getPromotionById(promoId);
    if (!promo) throw new Error("Promotion not found.");
    if (promo.organizerId !== organizerId) throw new Error("Forbidden.");

    await promotionRepo.deletePromotion(promoId);
    return { success: true };
};

const validatePromotionCode = async (code, eventId, ticketQuantity = 1) => {
    const promo = await promotionRepo.findByCode(code);

    if (!promo) {
        return { valid: false, message: 'Invalid promotion code.' };
    }

    const now = new Date().getTime();

    if (promo.validUntil <= now) return { valid: false, message: 'Expired.' };
    if (promo.validFrom > now) return { valid: false, message: 'Not yet active.' };
    if (promo.usedCount >= promo.usageLimit) return { valid: false, message: 'Usage limit reached.' };

    if (promo.eventId && promo.eventId !== eventId) {
        return { valid: false, message: 'Not valid for this event.' };
    }

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
