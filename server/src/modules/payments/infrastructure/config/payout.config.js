const envConfig = require('@/shared/config/env.config');

/**
 * Lazy getter: decodes Base64 BANK_ACCOUNT_ENCRYPTION_KEY and validates
 * it is exactly 32 decoded bytes for AES-256-GCM.
 * Does not throw on module load — only when first accessed.
 */
function getEncryptionKey() {
    const raw = envConfig.payout.bankAccountEncryptionKey;
    if (!raw) {
        throw new Error('BANK_ACCOUNT_ENCRYPTION_KEY not configured');
    }
    let decoded;
    try {
        decoded = Buffer.from(raw, 'base64');
    } catch (_) {
        throw new Error('BANK_ACCOUNT_ENCRYPTION_KEY must be a valid Base64 string');
    }
    if (decoded.length !== 32) {
        throw new Error(`BANK_ACCOUNT_ENCRYPTION_KEY decoded to ${decoded.length} bytes; must be exactly 32 bytes (256 bits) for AES-256-GCM`);
    }
    return decoded;
}

module.exports = { getEncryptionKey };
