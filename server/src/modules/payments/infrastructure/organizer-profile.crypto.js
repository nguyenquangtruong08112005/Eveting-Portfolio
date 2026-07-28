const crypto = require('crypto');
const payoutKey = require('@/modules/payments/infrastructure/config/payout.config');

function normalizeAccountNumber(accountNumber) {
    return String(accountNumber || '').replace(/\s+/g, '');
}

function encryptBankAccount(organizerId, accountNumber, bankName) {
    const normalized = normalizeAccountNumber(accountNumber);
    const key = payoutKey.getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(normalized, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    const fingerprint = crypto
        .createHmac('sha256', key)
        .update([organizerId, normalized, bankName].join('|'))
        .digest('hex');
    return {
        encryptedBankAccount: `${iv.toString('hex')}:${authTag}:${encrypted}`,
        maskedBankAccount: `XXXXXX${normalized.slice(-4)}`,
        bankFingerprint: fingerprint,
    };
}

module.exports = {
    normalizeAccountNumber,
    encryptBankAccount,
};
