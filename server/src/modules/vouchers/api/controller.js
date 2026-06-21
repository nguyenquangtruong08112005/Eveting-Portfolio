const asyncHandler = require('@/shared/middleware/asyncHandler');
const { BadRequestError } = require('@/shared/errors');
const voucherService = require('@/modules/vouchers/application/service');

const validateVoucher = asyncHandler(async (req, res) => {
    const { code, orderTotal, eventId } = req.body;

    if (!code) {
        throw new BadRequestError('Voucher code is required.');
    }
    if (orderTotal === undefined || orderTotal === null) {
        throw new BadRequestError('Order total is required.');
    }

    const result = await voucherService.validateVoucher(code, Number(orderTotal), eventId);
    res.status(200).json(result);
});

module.exports = { validateVoucher };
