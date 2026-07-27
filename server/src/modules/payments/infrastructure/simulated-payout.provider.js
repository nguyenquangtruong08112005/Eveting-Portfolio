const crypto = require('crypto');

async function submitPayout(organizerId, amount) {
    const providerRef = `sim_payout_${organizerId.slice(-8)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
        providerReference: providerRef,
        status: 'PROCESSING',
        providerMessage: 'Payout submitted to simulated provider for processing',
    };
}

/**
 * Simulated reconciliation: returns COMPLETED for any reference
 * that follows the sim_payout_ prefix convention.
 * A documented safe failure hook: set DETERMINISTIC_PAYOUT_FAILURE=true
 * in environment to force a FAILED status (for smoke testing).
 */
async function getTransferStatus(providerReference) {
    if (!providerReference || !providerReference.startsWith('sim_payout_')) {
        return { status: 'UNKNOWN', providerMessage: 'Unknown provider reference' };
    }
    if (process.env.DETERMINISTIC_PAYOUT_FAILURE === 'true') {
        return { status: 'FAILED', providerMessage: 'Simulated provider failure (DETERMINISTIC_PAYOUT_FAILURE)' };
    }
    return { status: 'COMPLETED', providerMessage: 'Payout completed by simulated provider' };
}

module.exports = { submitPayout, getTransferStatus };
