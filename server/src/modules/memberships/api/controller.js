const membershipService = require('../application/service');

const getMyMembership = async (req, res) => {
    try {
        const userId = req.user.uid;
        const result = await membershipService.getMyMembership(userId);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error getMyMembership: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getMyMembership
};
