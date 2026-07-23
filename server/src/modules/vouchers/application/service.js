const voucherRepository = require('@/providers/database/postgres.voucher.repository');
const { BadRequestError } = require('@/shared/errors');

const validateVoucher = async (code, orderTotal, eventId = null) => {
    if (!code || !code.trim()) {
        throw new BadRequestError('Voucher code is required.');
    }

    const voucher = await voucherRepository.findByCode(code.trim());
    if (!voucher) {
        return { valid: false, message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.' };
    }

    // Check date validity
    const now = new Date();
    if (voucher.validFrom && new Date(voucher.validFrom) > now) {
        return { valid: false, message: 'Voucher chưa được kích hoạt.' };
    }
    if (voucher.validTo && new Date(voucher.validTo) < now) {
        return { valid: false, message: 'Voucher đã hết hạn.' };
    }

    // Check usage limit
    if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) {
        return { valid: false, message: 'Voucher đã hết lượt sử dụng.' };
    }

    // Check minimum order
    if (orderTotal < voucher.minOrder) {
        return {
            valid: false,
            message: `Đơn hàng tối thiểu ${voucher.minOrder.toLocaleString('vi-VN')}₫ để sử dụng voucher này.`,
        };
    }

    // Check event restriction
    if (voucher.eventId && eventId && voucher.eventId !== eventId) {
        return { valid: false, message: 'Voucher không áp dụng cho sự kiện này.' };
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.discountType === 'percent') {
        discountAmount = Math.round(orderTotal * (voucher.discountValue / 100));
        if (voucher.maxDiscount != null) {
            discountAmount = Math.min(discountAmount, voucher.maxDiscount);
        }
    } else {
        discountAmount = Math.min(voucher.discountValue, orderTotal);
    }

    return {
        valid: true,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        discountAmount,
        maxDiscount: voucher.maxDiscount,
        message: `Đã áp dụng voucher ${code.toUpperCase()} giảm ${
            voucher.discountType === 'percent' ? voucher.discountValue + '%' : discountAmount.toLocaleString('vi-VN') + '₫'
        }!`,
    };
};

module.exports = { validateVoucher };
