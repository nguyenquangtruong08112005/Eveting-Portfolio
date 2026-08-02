'use strict';

const mockFindByCode = jest.fn();

jest.mock('@/providers/database/promotion.repository', () => ({
    findByCode: mockFindByCode,
}));

const repo = require('@/providers/database/postgres.voucher.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('findByCode', () => {
    it('delegates with code and scope and maps validUntil to validTo', async () => {
        mockFindByCode.mockResolvedValue({
            id: 'p1',
            code: 'SAVE10',
            validUntil: 1700000000000,
            discountType: 'percent',
            discountValue: 10,
        });

        const result = await repo.findByCode('save10', { organizerId: 'org1', eventId: 'e1' });

        expect(mockFindByCode).toHaveBeenCalledWith('save10', { organizerId: 'org1', eventId: 'e1' });
        expect(result).toEqual({
            id: 'p1',
            code: 'SAVE10',
            validUntil: 1700000000000,
            discountType: 'percent',
            discountValue: 10,
            validTo: 1700000000000,
        });
    });

    it('returns null when the underlying repository finds no promotion', async () => {
        mockFindByCode.mockResolvedValue(null);

        await expect(repo.findByCode('NOPE')).resolves.toBeNull();
        expect(mockFindByCode).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from the underlying repository', async () => {
        mockFindByCode.mockRejectedValue(new Error('db down'));

        await expect(repo.findByCode('SAVE10')).rejects.toThrow('db down');
    });
});

describe('incrementUsage', () => {
    it('throws, directing callers to the transaction reservation path', async () => {
        await expect(repo.incrementUsage()).rejects.toThrow(
            'promotionService.reserveDiscountInTransaction'
        );
    });
});
