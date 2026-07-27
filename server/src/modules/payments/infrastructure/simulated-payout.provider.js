const crypto = require('crypto');

async function submitPayout(organizerId, amount) {
    const providerRef = `sim_payout_${organizerId.slice(-8)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
        providerReference: providerRef,
        status: 'PROCESSING',
        providerMessage: 'Payout submitted to simulated provider for processing',
    };
}

module.exports = { submitPayout };
