/**
 * Simulated bank account verification adapter.
 * No external API call. Returns false for the documented invalid test number 000000000.
 */
async function verifyBankAccount(accountNumber, accountHolder, bankName) {
    if (!accountNumber || !accountHolder || !bankName) return false;
    const sanitized = accountNumber.replace(/\s+/g, '');
    if (sanitized === '000000000') return false;
    return true;
}

module.exports = { verifyBankAccount };
