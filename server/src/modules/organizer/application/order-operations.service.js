const ExcelJS = require('exceljs');
const orderRepository = require('@/modules/organizer/infrastructure/order-operations.repository');
const eventPublisher = require('@/shared/events/event-publisher');
const paymentProfileService = require('@/modules/payments/application/organizer-payment-profile.service');
const { BadRequestError } = require('@/shared/errors');

function normalizeFilters(input) {
    const page = Math.max(1, Number(input.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20));
    return {
        page,
        limit,
        offset: (page - 1) * limit,
        search: input.search ? String(input.search).trim().slice(0, 200) : '',
        status: input.status ? String(input.status).trim().toLowerCase() : '',
    };
}

function escapeCsvFormula(value) {
    if (typeof value !== 'string' || !/^[=+\-@]/.test(value)) return value;
    return `'${value}`;
}

async function listOrders(eventId, input) {
    const filters = normalizeFilters(input);
    const result = await orderRepository.listOrders(eventId, filters);
    return { page: filters.page, limit: filters.limit, ...result };
}

async function exportOrders(eventId, input) {
    const filters = normalizeFilters(input);
    const orders = await orderRepository.listOrdersForExport(eventId, filters);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');
    worksheet.columns = [
        { header: 'Order ID', key: 'id' },
        { header: 'Created At', key: 'createdAt' },
        { header: 'Customer Name', key: 'customerName' },
        { header: 'Customer Email', key: 'customerEmail' },
        { header: 'Total Value', key: 'totalValue' },
        { header: 'Currency', key: 'currency' },
        { header: 'Payment Method', key: 'paymentMethod' },
        { header: 'Status', key: 'status' },
    ];
    worksheet.addRows(orders.map((order) => Object.fromEntries(
        Object.entries(order).map(([key, value]) => [key, escapeCsvFormula(value)])
    )));
    return workbook.csv.writeBuffer();
}

async function sendCustomerEmail(eventId, input) {
    const orderIds = input.orderIds || [];
    const recipients = await orderRepository.getOrderRecipients(eventId, orderIds);
    if (orderIds.length && recipients.length !== new Set(orderIds).size) {
        throw new BadRequestError(
            'One or more orders are not paid orders for the requested event'
        );
    }
    for (const recipient of recipients) {
        await eventPublisher.publish('notification', {
            channel: 'email',
            target: recipient.email,
            title: input.subject,
            body: input.message,
            data: {
                eventId,
                orderId: recipient.orderId,
                recipientUserId: recipient.userId,
            },
        });
    }
    return { queued: recipients.length };
}

async function listTaxInvoiceRequests(eventId, input) {
    return paymentProfileService.listTaxInvoiceRequests(eventId, input);
}

module.exports = {
    listOrders,
    exportOrders,
    sendCustomerEmail,
    listTaxInvoiceRequests,
};
