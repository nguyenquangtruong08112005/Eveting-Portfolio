// controllers/promotion.controller.js
const promoService = require('../services/promotion.service');

const getAllPromotions = async (req, res) => {
    try {
        const promotions = await promoService.getAllPromotions();
        res.status(200).json(promotions);
    } catch (error) {
        console.error("Error in Promotion Controller - getAllPromotions: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const applyPromotion = async (req, res) => {
    try {
        const { code, eventId } = req.body;
        if (!code) {
            return res.status(400).send({ error: 'Bad Request: Promotion code is required.' });
        }

        const result = await promoService.validatePromotionCode(code, eventId);

        if (!result.valid) {
            return res.status(404).send({ error: result.message });
        }

        res.status(200).json(result);
    } catch (error) {
        console.error("Error in Promotion Controller - applyPromotion: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getAllPromotions,
    applyPromotion,
};