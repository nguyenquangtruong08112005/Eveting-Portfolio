const { v4: uuidv4 } = require('uuid');
const profileRepository = require('@/modules/payments/infrastructure/organizer-payment-profile.repository');
const {
    normalizeAccountNumber,
    encryptBankAccount,
} = require('@/modules/payments/infrastructure/organizer-profile.crypto');
const eventPublisher = require('@/shared/events/event-publisher');
const { service: notificationService } = require('@/modules/notifications');
const logger = require('@/shared/logger');
const {
    AppError,
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} = require('@/shared/errors');

function publicProfile(profile) {
    if (!profile) return null;
    return {
        organizerId: profile.organizerId,
        fullName: profile.fullName,
        bankAccountNumber: profile.maskedBankAccount,
        bankName: profile.bankName,
        bankBranch: profile.bankBranch,
        redInvoiceEnabled: profile.redInvoiceEnabled,
        businessType: profile.businessType,
        address: profile.address,
        taxNumber: profile.taxNumber,
        verificationStatus: profile.verificationStatus,
        kycRequired: profile.kycRequired,
        kycRevision: profile.kycRevision,
        verifiedAt: profile.verifiedAt,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
    };
}

async function getPaymentProfile(organizerId) {
    return publicProfile(await profileRepository.getByOrganizerId(organizerId));
}

async function savePaymentProfile(organizerId, input) {
    const accountNumber = normalizeAccountNumber(input.bankAccountNumber);
    if (!/^[0-9]{6,24}$/.test(accountNumber)) {
        throw new BadRequestError('bankAccountNumber must contain 6 to 24 digits');
    }
    if (input.redInvoiceEnabled && !String(input.taxNumber || '').trim()) {
        throw new BadRequestError('taxNumber is required when redInvoiceEnabled is true');
    }
    const encrypted = encryptBankAccount(organizerId, accountNumber, input.bankName);
    try {
        const profile = await profileRepository.upsert({
            organizerId,
            fullName: String(input.fullName).trim(),
            ...encrypted,
            bankName: String(input.bankName).trim(),
            bankBranch: String(input.bankBranch || '').trim(),
            redInvoiceEnabled: Boolean(input.redInvoiceEnabled),
            businessType: String(input.businessType).trim().toLowerCase(),
            address: String(input.address).trim(),
            taxNumber: String(input.taxNumber || '').trim(),
        });
        return publicProfile(profile);
    } catch (error) {
        if (
            error.code === '23505' &&
            error.constraint === 'idx_organizer_payment_profile_bank_fingerprint'
        ) {
            throw new AppError(
                'This bank account is already registered',
                409,
                'BANK_ACCOUNT_ALREADY_REGISTERED'
            );
        }
        throw error;
    }
}

async function setVerificationStatus(organizerId, status, note) {
    const normalizedStatus = String(status || '').toUpperCase();
    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(normalizedStatus)) {
        throw new BadRequestError('Invalid verification status');
    }
    const profile = await profileRepository.setVerificationStatus(
        organizerId,
        normalizedStatus,
        note
    );
    if (!profile) throw new NotFoundError('Organizer payment profile not found');
    return publicProfile(profile);
}

async function requestTaxInvoice(requesterUserId, orderId, input) {
    const context = await profileRepository.getInvoiceOrderContext(orderId);
    if (!context) throw new NotFoundError('Order not found');
    if (context.requester_user_id !== requesterUserId) {
        throw new ForbiddenError('The order belongs to another user');
    }
    if (!context.red_invoice_enabled) {
        throw new BadRequestError('This organizer does not accept VAT invoice requests');
    }

    let invoiceRequest;
    try {
        invoiceRequest = await profileRepository.runTransaction(async (tx) => {
            const created = await profileRepository.createTaxInvoiceRequest(
                {
                    id: `tir_${uuidv4()}`,
                    orderId,
                    eventId: context.event_id,
                    organizerId: context.organizer_id,
                    requesterUserId,
                    companyName: String(input.companyName).trim(),
                    taxNumber: String(input.taxNumber).trim(),
                    billingAddress: String(input.billingAddress).trim(),
                    recipientEmail: String(input.recipientEmail).trim().toLowerCase(),
                },
                tx
            );
            await eventPublisher.publish(
                'notification',
                {
                    channel: 'email',
                    target: context.organizer_email,
                    title: `VAT invoice requested for order ${orderId}`,
                    body: `${created.companyName} requested a VAT invoice for order ${orderId}.`,
                    data: {
                        invoiceRequestId: created.id,
                        orderId,
                        eventId: context.event_id,
                    },
                },
                tx
            );
            return created;
        });
    } catch (error) {
        if (error.code === '23505') {
            throw new AppError(
                'A VAT invoice was already requested for this order',
                409,
                'TAX_INVOICE_ALREADY_REQUESTED'
            );
        }
        throw error;
    }

    try {
        await notificationService.createNotification(
            context.organizer_id,
            'VAT invoice request',
            `Order ${orderId} requires a VAT invoice.`,
            'system',
            context.event_id
        );
    } catch (error) {
        logger.warn('Failed to create in-app VAT invoice notification', {
            invoiceRequestId: invoiceRequest.id,
            organizerId: context.organizer_id,
            error: error.message,
        });
    }
    return invoiceRequest;
}

async function listTaxInvoiceRequests(eventId, filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const status = filters.status ? String(filters.status).toUpperCase() : null;
    if (status && !['REQUESTED', 'PROCESSING', 'ISSUED', 'REJECTED'].includes(status)) {
        throw new BadRequestError('Invalid tax invoice request status');
    }
    const result = await profileRepository.listTaxInvoiceRequests(
        eventId,
        status,
        limit,
        (page - 1) * limit
    );
    return { page, limit, ...result };
}

module.exports = {
    getPaymentProfile,
    savePaymentProfile,
    setVerificationStatus,
    requestTaxInvoice,
    listTaxInvoiceRequests,
};
