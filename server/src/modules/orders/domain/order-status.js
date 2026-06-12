const ORDER_STATUS = Object.freeze({
    PENDING_PAYMENT: 'pending_payment',
    PAID: 'paid',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    FAILED: 'failed',
});

const PAYMENT_STATUS = Object.freeze({
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
});

module.exports = { ORDER_STATUS, PAYMENT_STATUS };
