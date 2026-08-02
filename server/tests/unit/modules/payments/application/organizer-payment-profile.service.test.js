'use strict';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'fixed-uuid') }));

const mockProfileRepo = {
  getByOrganizerId: jest.fn(),
  upsert: jest.fn(),
  setVerificationStatus: jest.fn(),
  getInvoiceOrderContext: jest.fn(),
  createTaxInvoiceRequest: jest.fn(),
  listTaxInvoiceRequests: jest.fn(),
  runTransaction: jest.fn(),
};
jest.mock('@/modules/payments/infrastructure/organizer-payment-profile.repository', () => mockProfileRepo);

jest.mock('@/modules/payments/infrastructure/organizer-profile.crypto', () => {
  const actual = jest.requireActual('@/modules/payments/infrastructure/organizer-profile.crypto');
  return {
    ...actual,
    encryptBankAccount: jest.fn(() => ({
      encryptedBankAccount: 'iv-hex:auth-tag:cipher-hex',
      maskedBankAccount: 'XXXXXX4321',
      bankFingerprint: 'fingerprint-hex',
    })),
  };
});

jest.mock('@/shared/events/event-publisher', () => ({ publish: jest.fn() }));

const mockNotifications = { service: { createNotification: jest.fn() } };
jest.mock('@/modules/notifications', () => mockNotifications);

jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const service = require('@/modules/payments/application/organizer-payment-profile.service');
const profileRepo = require('@/modules/payments/infrastructure/organizer-payment-profile.repository');
const cryptoLib = require('@/modules/payments/infrastructure/organizer-profile.crypto');
const eventPublisher = require('@/shared/events/event-publisher');
const notificationService = require('@/modules/notifications').service;
const logger = require('@/shared/logger');
const { AppError, BadRequestError, ForbiddenError, NotFoundError } = require('@/shared/errors');

const sampleProfile = {
  organizerId: 'org_1',
  fullName: 'Alice',
  maskedBankAccount: 'XXXXXX4321',
  bankName: 'VCB',
  bankBranch: 'HCM',
  redInvoiceEnabled: true,
  businessType: 'company',
  address: '1 Main St',
  taxNumber: '123456789',
  verificationStatus: 'PENDING',
  kycRequired: true,
  kycRevision: 0,
  verifiedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

describe('getPaymentProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when no profile exists', async () => {
    profileRepo.getByOrganizerId.mockResolvedValue(null);

    await expect(service.getPaymentProfile('org_1')).resolves.toBeNull();
  });

  it('returns the public profile when a profile exists', async () => {
    profileRepo.getByOrganizerId.mockResolvedValue(sampleProfile);

    const result = await service.getPaymentProfile('org_1');

    expect(profileRepo.getByOrganizerId).toHaveBeenCalledWith('org_1');
    expect(result.organizerId).toBe('org_1');
    expect(result.bankAccountNumber).toBe('XXXXXX4321');
    expect(result.verificationStatus).toBe('PENDING');
    expect(result.kycRequired).toBe(true);
  });
});

describe('savePaymentProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an account number shorter than 6 digits', async () => {
    await expect(service.savePaymentProfile('org_1', { bankAccountNumber: '12345' }))
      .rejects.toBeInstanceOf(BadRequestError);
    expect(profileRepo.upsert).not.toHaveBeenCalled();
  });

  it('rejects an account number longer than 24 digits', async () => {
    await expect(service.savePaymentProfile('org_1', { bankAccountNumber: '1'.repeat(25) }))
      .rejects.toThrow('6 to 24 digits');
  });

  it('rejects a non-numeric account number', async () => {
    await expect(service.savePaymentProfile('org_1', { bankAccountNumber: 'abc123' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejects when redInvoiceEnabled is true but taxNumber is missing', async () => {
    await expect(service.savePaymentProfile('org_1', {
      bankAccountNumber: '123456789',
      redInvoiceEnabled: true,
    })).rejects.toThrow('taxNumber is required when redInvoiceEnabled is true');
  });

  it('normalizes whitespace and persists a valid profile', async () => {
    profileRepo.upsert.mockResolvedValue(sampleProfile);

    const result = await service.savePaymentProfile('org_1', {
      bankAccountNumber: ' 123 456 789 ',
      bankName: ' VCB ',
      fullName: ' Alice ',
      redInvoiceEnabled: false,
      businessType: ' Company ',
      address: ' 1 Main St ',
    });

    expect(cryptoLib.encryptBankAccount).toHaveBeenCalledWith('org_1', '123456789', ' VCB ');
    expect(profileRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
      organizerId: 'org_1',
      fullName: 'Alice',
      encryptedBankAccount: 'iv-hex:auth-tag:cipher-hex',
      maskedBankAccount: 'XXXXXX4321',
      bankFingerprint: 'fingerprint-hex',
      bankName: 'VCB',
      bankBranch: '',
      redInvoiceEnabled: false,
      businessType: 'company',
      address: '1 Main St',
      taxNumber: '',
    }));
    expect(result.organizerId).toBe('org_1');
  });

  it('accepts redInvoiceEnabled together with a taxNumber', async () => {
    profileRepo.upsert.mockResolvedValue(sampleProfile);

    const result = await service.savePaymentProfile('org_1', {
      bankAccountNumber: '123456789',
      bankName: 'VCB',
      fullName: 'Alice',
      redInvoiceEnabled: true,
      taxNumber: ' 999999999 ',
    });

    expect(profileRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
      redInvoiceEnabled: true,
      taxNumber: '999999999',
    }));
    expect(result.taxNumber).toBe('123456789');
  });

  it('maps a bank fingerprint conflict to AppError 409 BANK_ACCOUNT_ALREADY_REGISTERED', async () => {
    profileRepo.upsert.mockRejectedValue({
      code: '23505',
      constraint: 'idx_organizer_payment_profile_bank_fingerprint',
    });

    const err = await service.savePaymentProfile('org_1', {
      bankAccountNumber: '123456789',
      bankName: 'VCB',
      fullName: 'Alice',
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('BANK_ACCOUNT_ALREADY_REGISTERED');
  });

  it('rethrows a 23505 with a different constraint', async () => {
    const dup = { code: '23505', constraint: 'some_other_constraint' };
    profileRepo.upsert.mockRejectedValue(dup);

    await expect(service.savePaymentProfile('org_1', {
      bankAccountNumber: '123456789',
      bankName: 'VCB',
      fullName: 'Alice',
    })).rejects.toBe(dup);
  });

  it('rethrows unrelated repository errors', async () => {
    const boom = new Error('db down');
    profileRepo.upsert.mockRejectedValue(boom);

    await expect(service.savePaymentProfile('org_1', {
      bankAccountNumber: '123456789',
      bankName: 'VCB',
      fullName: 'Alice',
    })).rejects.toBe(boom);
  });
});

describe('setVerificationStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an empty verification status', async () => {
    await expect(service.setVerificationStatus('org_1', '', 'note'))
      .rejects.toBeInstanceOf(BadRequestError);
    expect(profileRepo.setVerificationStatus).not.toHaveBeenCalled();
  });

  it('rejects an unknown verification status', async () => {
    await expect(service.setVerificationStatus('org_1', 'BOGUS', 'note'))
      .rejects.toBeInstanceOf(BadRequestError);
    expect(profileRepo.setVerificationStatus).not.toHaveBeenCalled();
  });

  it('normalizes a lowercase status to uppercase and returns the public profile', async () => {
    profileRepo.setVerificationStatus.mockResolvedValue(sampleProfile);

    const result = await service.setVerificationStatus('org_1', 'verified', 'note');

    expect(profileRepo.setVerificationStatus).toHaveBeenCalledWith('org_1', 'VERIFIED', 'note');
    expect(result.verificationStatus).toBe('PENDING');
  });

  it('throws NotFoundError when the profile does not exist', async () => {
    profileRepo.setVerificationStatus.mockResolvedValue(null);

    await expect(service.setVerificationStatus('org_1', 'REJECTED'))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});

const invoiceContext = {
  order_id: 'ord_1',
  requester_user_id: 'user_1',
  event_id: 'evt_1',
  organizer_id: 'org_1',
  red_invoice_enabled: true,
  organizer_email: 'org@example.com',
};

const invoiceInput = {
  companyName: '  Acme Corp ',
  taxNumber: ' 123 ',
  billingAddress: ' 1 St ',
  recipientEmail: ' BOB@example.com ',
};

describe('requestTaxInvoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    profileRepo.getInvoiceOrderContext.mockResolvedValue(invoiceContext);
  });

  it('throws NotFoundError when the order context is missing', async () => {
    profileRepo.getInvoiceOrderContext.mockResolvedValue(null);

    await expect(service.requestTaxInvoice('user_1', 'ord_1', invoiceInput))
      .rejects.toBeInstanceOf(NotFoundError);
    expect(profileRepo.createTaxInvoiceRequest).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when the order belongs to another user', async () => {
    profileRepo.getInvoiceOrderContext.mockResolvedValue({
      ...invoiceContext,
      requester_user_id: 'user_other',
    });

    await expect(service.requestTaxInvoice('user_1', 'ord_1', invoiceInput))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws BadRequestError when the organizer does not accept VAT invoices', async () => {
    profileRepo.getInvoiceOrderContext.mockResolvedValue({
      ...invoiceContext,
      red_invoice_enabled: false,
    });

    await expect(service.requestTaxInvoice('user_1', 'ord_1', invoiceInput))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  it('creates the request, publishes an email event and notifies the organizer', async () => {
    const tx = { query: jest.fn() };
    profileRepo.runTransaction.mockImplementation(async (fn) => fn(tx));
    const created = { id: 'tir_fixed-uuid', companyName: 'Acme Corp' };
    profileRepo.createTaxInvoiceRequest.mockResolvedValue(created);
    eventPublisher.publish.mockResolvedValue('out_1');
    notificationService.createNotification.mockResolvedValue({});

    const result = await service.requestTaxInvoice('user_1', 'ord_1', invoiceInput);

    expect(profileRepo.createTaxInvoiceRequest).toHaveBeenCalledWith(expect.objectContaining({
      id: 'tir_fixed-uuid',
      orderId: 'ord_1',
      eventId: 'evt_1',
      organizerId: 'org_1',
      requesterUserId: 'user_1',
      companyName: 'Acme Corp',
      taxNumber: '123',
      billingAddress: '1 St',
      recipientEmail: 'bob@example.com',
    }), tx);
    expect(eventPublisher.publish).toHaveBeenCalledWith('notification', expect.objectContaining({
      channel: 'email',
      target: 'org@example.com',
      title: 'VAT invoice requested for order ord_1',
      data: { invoiceRequestId: 'tir_fixed-uuid', orderId: 'ord_1', eventId: 'evt_1' },
    }), tx);
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      'org_1',
      'VAT invoice request',
      'Order ord_1 requires a VAT invoice.',
      'system',
      'evt_1'
    );
    expect(result).toBe(created);
  });

  it('maps a duplicate request to AppError 409 TAX_INVOICE_ALREADY_REQUESTED', async () => {
    profileRepo.runTransaction.mockRejectedValue({ code: '23505' });

    const err = await service.requestTaxInvoice('user_1', 'ord_1', invoiceInput).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('TAX_INVOICE_ALREADY_REQUESTED');
  });

  it('rethrows non-unique-constraint errors', async () => {
    const boom = new Error('transaction failed');
    profileRepo.runTransaction.mockRejectedValue(boom);

    await expect(service.requestTaxInvoice('user_1', 'ord_1', invoiceInput)).rejects.toBe(boom);
  });

  it('logs a warning and still returns when the in-app notification fails', async () => {
    const tx = { query: jest.fn() };
    profileRepo.runTransaction.mockImplementation(async (fn) => fn(tx));
    const created = { id: 'tir_fixed-uuid', companyName: 'Acme Corp' };
    profileRepo.createTaxInvoiceRequest.mockResolvedValue(created);
    eventPublisher.publish.mockResolvedValue('out_1');
    notificationService.createNotification.mockRejectedValue(new Error('push down'));

    const result = await service.requestTaxInvoice('user_1', 'ord_1', invoiceInput);

    expect(result).toBe(created);
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to create in-app VAT invoice notification',
      expect.objectContaining({
        invoiceRequestId: 'tir_fixed-uuid',
        organizerId: 'org_1',
        error: 'push down',
      })
    );
  });
});

describe('listTaxInvoiceRequests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses default pagination when no filters are given', async () => {
    profileRepo.listTaxInvoiceRequests.mockResolvedValue({ total: 2, requests: [] });

    const result = await service.listTaxInvoiceRequests('evt_1');

    expect(profileRepo.listTaxInvoiceRequests).toHaveBeenCalledWith('evt_1', null, 20, 0);
    expect(result).toEqual({ page: 1, limit: 20, total: 2, requests: [] });
  });

  it('clamps a negative page to 1', async () => {
    profileRepo.listTaxInvoiceRequests.mockResolvedValue({ total: 0, requests: [] });

    await service.listTaxInvoiceRequests('evt_1', { page: -3 });

    expect(profileRepo.listTaxInvoiceRequests).toHaveBeenCalledWith('evt_1', null, 20, 0);
  });

  it('treats page 0 as page 1', async () => {
    profileRepo.listTaxInvoiceRequests.mockResolvedValue({ total: 0, requests: [] });

    await service.listTaxInvoiceRequests('evt_1', { page: 0 });

    expect(profileRepo.listTaxInvoiceRequests).toHaveBeenCalledWith('evt_1', null, 20, 0);
  });

  it('computes the offset from page and limit', async () => {
    profileRepo.listTaxInvoiceRequests.mockResolvedValue({ total: 9, requests: [] });

    const result = await service.listTaxInvoiceRequests('evt_1', { page: 3, limit: 30 });

    expect(profileRepo.listTaxInvoiceRequests).toHaveBeenCalledWith('evt_1', null, 30, 60);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(30);
  });

  it('caps the limit at 100', async () => {
    profileRepo.listTaxInvoiceRequests.mockResolvedValue({ total: 0, requests: [] });

    await service.listTaxInvoiceRequests('evt_1', { limit: 500 });

    expect(profileRepo.listTaxInvoiceRequests).toHaveBeenCalledWith('evt_1', null, 100, 0);
  });

  it('keeps limit 20 when limit is 0', async () => {
    profileRepo.listTaxInvoiceRequests.mockResolvedValue({ total: 0, requests: [] });

    await service.listTaxInvoiceRequests('evt_1', { limit: 0 });

    expect(profileRepo.listTaxInvoiceRequests).toHaveBeenCalledWith('evt_1', null, 20, 0);
  });

  it('raises a negative limit to 1', async () => {
    profileRepo.listTaxInvoiceRequests.mockResolvedValue({ total: 0, requests: [] });

    await service.listTaxInvoiceRequests('evt_1', { limit: -5 });

    expect(profileRepo.listTaxInvoiceRequests).toHaveBeenCalledWith('evt_1', null, 1, 0);
  });

  it('rejects an invalid status', async () => {
    await expect(service.listTaxInvoiceRequests('evt_1', { status: 'NOPE' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  it('normalizes a valid status to uppercase and forwards it', async () => {
    profileRepo.listTaxInvoiceRequests.mockResolvedValue({ total: 1, requests: [{}] });

    const result = await service.listTaxInvoiceRequests('evt_1', { status: 'processing', page: 2, limit: 10 });

    expect(profileRepo.listTaxInvoiceRequests).toHaveBeenCalledWith('evt_1', 'PROCESSING', 10, 10);
    expect(result.page).toBe(2);
    expect(result.requests).toHaveLength(1);
  });
});
