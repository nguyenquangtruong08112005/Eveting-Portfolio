const adminService = require('@/modules/admin/application/service');

const getPendingEvents = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const events = await adminService.getPendingEvents(page, limit);
        res.status(200).json(events);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

const approveEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await adminService.approveEvent(id);
        res.status(200).json(result);
    } catch (error) {
        console.log(error.message);

        res.status(500).send({ error: error.message });
    }
};

const rejectEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const result = await adminService.rejectEvent(id, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

module.exports = { getPendingEvents, approveEvent, rejectEvent };
