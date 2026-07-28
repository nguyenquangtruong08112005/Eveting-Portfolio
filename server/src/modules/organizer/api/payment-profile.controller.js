const asyncHandler = require('@/shared/middleware/asyncHandler');
const paymentProfileService = require('@/modules/payments/application/organizer-payment-profile.service');

const getPaymentProfile = asyncHandler(async (req, res) => {
    const profile = await paymentProfileService.getPaymentProfile(req.user.uid);
    res.status(200).json({ registered: Boolean(profile), profile });
});

const savePaymentProfile = asyncHandler(async (req, res) => {
    const profile = await paymentProfileService.savePaymentProfile(
        req.user.uid,
        req.body
    );
    res.status(200).json({ profile });
});

const requestTaxInvoice = asyncHandler(async (req, res) => {
    const request = await paymentProfileService.requestTaxInvoice(
        req.user.uid,
        req.params.orderId,
        req.body
    );
    res.status(201).json({ request });
});

module.exports = {
    getPaymentProfile,
    savePaymentProfile,
    requestTaxInvoice,
};
