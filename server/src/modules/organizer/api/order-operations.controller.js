const asyncHandler = require('@/shared/middleware/asyncHandler');
const orderOperationsService = require('@/modules/organizer/application/order-operations.service');

const listOrders = asyncHandler(async (req, res) => {
    const result = await orderOperationsService.listOrders(req.params.eventId, req.query);
    res.status(200).json(result);
});

const exportOrders = asyncHandler(async (req, res) => {
    const buffer = await orderOperationsService.exportOrders(
        req.params.eventId,
        req.query
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename=orders_${req.params.eventId}.csv`
    );
    res.status(200).send(buffer);
});

const sendCustomerEmail = asyncHandler(async (req, res) => {
    const result = await orderOperationsService.sendCustomerEmail(
        req.params.eventId,
        req.body
    );
    res.status(202).json(result);
});

const listTaxInvoiceRequests = asyncHandler(async (req, res) => {
    const result = await orderOperationsService.listTaxInvoiceRequests(
        req.params.eventId,
        req.query
    );
    res.status(200).json(result);
});

module.exports = {
    listOrders,
    exportOrders,
    sendCustomerEmail,
    listTaxInvoiceRequests,
};
