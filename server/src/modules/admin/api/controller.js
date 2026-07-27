const asyncHandler = require('@/shared/middleware/asyncHandler');
const adminService = require('@/modules/admin/application/service');
const payoutRepository = require('@/providers/database/payout.repository');
const payoutService = require('@/modules/payments/application/payout.service');

const getPendingEvents = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const events = await adminService.getPendingEvents(page, limit);
        res.status(200).json({
            events: Array.isArray(events) ? events : [],
            page,
            limit,
            total: Array.isArray(events) ? events.length : 0,
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

const approveEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const adminUserId = req.user ? (req.user.uid || req.user.id) : 'system_admin';
        const result = await adminService.approveEvent(id, adminUserId, req.ip);
        res.status(200).json(result);
    } catch (error) {
        console.log(error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).send({ error: error.message });
    }
};

const rejectEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminUserId = req.user ? (req.user.uid || req.user.id) : 'system_admin';
        const result = await adminService.rejectEvent(id, reason, adminUserId, req.ip);
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).send({ error: error.message });
    }
};

const getPayoutList = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status || null;
    const result = await payoutRepository.getAllPayoutsPaginated(limit, offset, status);
    res.json({ page, limit, total: result.total, payouts: result.payouts });
});

const approvePayout = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await payoutService.adminApprovePayout(id, reason || null);
    res.json(result);
});

module.exports = { getPendingEvents, approveEvent, rejectEvent, getPayoutList, approvePayout };
