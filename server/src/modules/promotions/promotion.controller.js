// controllers/promotion.controller.js
const promoService = require('./promotion.service');

// User API: Lấy danh sách public
const getAllPromotions = async (req, res) => {
    try {
        const promotions = await promoService.getAllPromotions();
        res.status(200).json(promotions);
    } catch (error) {
        console.error("Error getAllPromotions: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

// User API: Apply code
const applyPromotion = async (req, res) => {
    try {
        const { code, eventId, quantity } = req.body; // Thêm quantity để check combo
        if (!code) {
            return res.status(400).send({ error: 'Promotion code is required.' });
        }

        const result = await promoService.validatePromotionCode(code, eventId, quantity || 1);

        if (!result.valid) {
            return res.status(404).send({ error: result.message });
        }

        res.status(200).json(result);
    } catch (error) {
        console.error("Error applyPromotion: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

// Organizer API: Lấy danh sách của mình
const getOrganizerPromotions = async (req, res) => {
    try {
        const organizerId = req.user.uid;
        const promotions = await promoService.getPromotionsByOrganizer(organizerId);
        res.status(200).json(promotions);
    } catch (error) {
        // console.log(error);

        res.status(500).send({ error: error.message });
    }
};

// Organizer API: Tạo mới
const createPromotion = async (req, res) => {
    try {
        const organizerId = req.user.uid;
        const newPromo = await promoService.createPromotion(organizerId, req.body);
        res.status(201).json(newPromo);
    } catch (error) {
        // Check lỗi trùng code
        if (error.message.includes("already exists")) {
            return res.status(409).send({ error: error.message });
        }
        res.status(500).send({ error: error.message });
    }
};

// Organizer API: Cập nhật
const updatePromotion = async (req, res) => {
    try {
        const organizerId = req.user.uid;
        const { id } = req.params;
        const updatedPromo = await promoService.updatePromotion(id, organizerId, req.body);
        res.status(200).json(updatedPromo);
    } catch (error) {
        if (error.message === "Forbidden.") return res.status(403).send({ error: error.message });
        if (error.message === "Promotion not found.") return res.status(404).send({ error: error.message });
        res.status(500).send({ error: error.message });
    }
};

// Organizer API: Xóa
const deletePromotion = async (req, res) => {
    try {
        const organizerId = req.user.uid;
        const { id } = req.params;
        await promoService.deletePromotion(id, organizerId);
        res.status(204).send();
    } catch (error) {
        if (error.message === "Forbidden.") return res.status(403).send({ error: error.message });
        res.status(500).send({ error: error.message });
    }
};

module.exports = {
    getAllPromotions,
    applyPromotion,
    getOrganizerPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion
};
