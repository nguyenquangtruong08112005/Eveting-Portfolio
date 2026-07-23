const membershipRepository = require('@/providers/database/membership.repository');

const getMyMembership = async (userId) => {
    const membership = await membershipRepository.getUserMembershipInTransaction(null, userId);
    const ledger = await membershipRepository.getUserPointsLedger(userId);
    return {
        ...membership,
        ledger
    };
};

module.exports = {
    getMyMembership
};
