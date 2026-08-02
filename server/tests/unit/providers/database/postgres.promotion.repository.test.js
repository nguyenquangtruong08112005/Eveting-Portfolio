'use strict';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
const mockGetEventById = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
    transaction: mockTransaction,
}));

jest.mock('@/providers/database/postgres.event.repository', () => ({
    getEventById: mockGetEventById,
}));

const repo = require('@/providers/database/postgres.promotion.repository');

function promoRow(overrides = {}) {
    return {
        id: 'promo1',
        organizer_id: 'org1',
        code: 'SAVE10',
        event_id: 'ev1',
        valid_from: new Date('2025-01-01T00:00:00.000Z'),
        valid_until: new Date('2025-12-31T00:00:00.000Z'),
        usage_limit: 100,
        used_count: 10,
        ticket_usage_limit: 200,
        used_ticket_count: 20,
        per_user_limit: 1,
        min_ticket_quantity: 2,
        max_ticket_quantity: 5,
        discount_type: 'percent',
        discount_value: '10',
        max_discount: '50000',
        min_order: '100000',
        is_public: true,
        is_enabled: true,
        data: { customNote: 'n' },
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        ...overrides,
    };
}

function mappedPromo() {
    const row = promoRow();
    return {
        customNote: 'n',
        id: row.id,
        organizerId: row.organizer_id,
        code: row.code,
        eventId: row.event_id,
        validFrom: row.valid_from.getTime(),
        validUntil: row.valid_until.getTime(),
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        ticketUsageLimit: row.ticket_usage_limit,
        usedTicketCount: row.used_ticket_count,
        perUserLimit: row.per_user_limit,
        minTicketQuantity: row.min_ticket_quantity,
        maxTicketQuantity: row.max_ticket_quantity,
        discountType: 'percent',
        discountValue: 10,
        maxDiscount: 50000,
        minOrder: 100000,
        isPublic: row.is_public,
        isEnabled: row.is_enabled,
        createdAt: row.created_at.getTime(),
    };
}

function makeTx() {
    const txQuery = jest.fn();
    return { client: { query: txQuery }, txQuery };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('rowToPromotion', () => {
    it('returns null for a missing row', () => {
        expect(repo.rowToPromotion(null)).toBeNull();
        expect(repo.rowToPromotion(undefined)).toBeNull();
    });

    it('maps first-class columns and spreads the data bag', () => {
        expect(repo.rowToPromotion(promoRow())).toEqual(mappedPromo());
    });

    it('maps fixed discount_type to amount', () => {
        const result = repo.rowToPromotion(promoRow({ discount_type: 'fixed', discount_value: '1000' }));
        expect(result.discountType).toBe('amount');
        expect(result.discountValue).toBe(1000);
    });

    it('derives discountType from data.discountType', () => {
        const result = repo.rowToPromotion(promoRow({ discount_type: null, discount_value: null, data: { discountType: 'percent', discountValue: '15' } }));
        expect(result.discountType).toBe('percent');
        expect(result.discountValue).toBe(15);
    });

    it('derives discountType from data.discount_type', () => {
        const result = repo.rowToPromotion(promoRow({ discount_type: null, discount_value: null, data: { discount_type: 'fixed', discountValue: 300 } }));
        expect(result.discountType).toBe('amount');
        expect(result.discountValue).toBe(300);
    });

    it('derives percent type and divided value from legacy data.discountPercent', () => {
        const result = repo.rowToPromotion(promoRow({ discount_type: null, discount_value: null, data: { discountPercent: 20 } }));
        expect(result.discountType).toBe('percent');
        expect(result.discountValue).toBe(0.2);
    });

    it('derives percent from legacy data.discount_percent', () => {
        const result = repo.rowToPromotion(promoRow({ discount_type: null, discount_value: null, data: { discount_percent: 25 } }));
        expect(result.discountType).toBe('percent');
        expect(result.discountValue).toBe(0.25);
    });

    it('derives amount type from legacy data.fixedDiscountVnd', () => {
        const result = repo.rowToPromotion(promoRow({ discount_type: null, discount_value: null, data: { fixedDiscountVnd: 50000 } }));
        expect(result.discountType).toBe('amount');
        expect(result.discountValue).toBe(50000);
    });

    it('prefers data.discountValue over legacy fields', () => {
        const result = repo.rowToPromotion(promoRow({ discount_type: null, discount_value: null, data: { discountValue: 42, discountPercent: 20 } }));
        expect(result.discountType).toBe('percent');
        expect(result.discountValue).toBe(42);
    });

    it('falls back to null discountType when neither column nor legacy data exists', () => {
        const result = repo.rowToPromotion(promoRow({ discount_type: null, discount_value: null, data: { discountValue: 42 } }));
        expect(result.discountType).toBeNull();
        expect(result.discountValue).toBe(42);
    });

    it('skips empty legacy strings while picking the next key', () => {
        const result = repo.rowToPromotion(promoRow({ discount_type: null, discount_value: null, data: { discountPercent: '', discount_percent: 15 } }));
        expect(result.discountType).toBe('percent');
        expect(result.discountValue).toBe(0.15);
    });

    it('defaults minTicketQuantity to 1 and honors row, data, and snake_case fallbacks', () => {
        expect(repo.rowToPromotion(promoRow({ min_ticket_quantity: null, data: {} })).minTicketQuantity).toBe(1);
        expect(repo.rowToPromotion(promoRow({ min_ticket_quantity: null, data: { minTicketQuantity: 3 } })).minTicketQuantity).toBe(3);
        expect(repo.rowToPromotion(promoRow({ min_ticket_quantity: null, data: { min_ticket_quantity: 4 } })).minTicketQuantity).toBe(4);
        expect(repo.rowToPromotion(promoRow({ min_ticket_quantity: 2, data: { minTicketQuantity: 3 } })).minTicketQuantity).toBe(2);
    });

    it('returns null maxTicketQuantity when absent', () => {
        expect(repo.rowToPromotion(promoRow({ max_ticket_quantity: null, data: {} })).maxTicketQuantity).toBeNull();
    });

    it('coerces minOrder from row, then data, then 0', () => {
        expect(repo.rowToPromotion(promoRow({ min_order: '0', data: {} })).minOrder).toBe(0);
        expect(repo.rowToPromotion(promoRow({ min_order: null, data: { minOrder: 5 } })).minOrder).toBe(5);
        expect(repo.rowToPromotion(promoRow({ min_order: null, data: { min_order: '6' } })).minOrder).toBe(6);
        expect(repo.rowToPromotion(promoRow({ min_order: null, data: {} })).minOrder).toBe(0);
    });

    it('maps null usage counts and limits through numberOrNull', () => {
        const result = repo.rowToPromotion(promoRow({
            usage_limit: null,
            used_count: null,
            ticket_usage_limit: null,
            used_ticket_count: null,
            per_user_limit: null,
            max_discount: null,
        }));
        expect(result.usageLimit).toBeNull();
        expect(result.usedCount).toBe(0);
        expect(result.ticketUsageLimit).toBeNull();
        expect(result.usedTicketCount).toBe(0);
        expect(result.perUserLimit).toBeNull();
        expect(result.maxDiscount).toBeNull();
    });

    it('defaults isEnabled to true and honors explicit false', () => {
        expect(repo.rowToPromotion(promoRow({ is_enabled: undefined })).isEnabled).toBe(true);
        expect(repo.rowToPromotion(promoRow({ is_enabled: false })).isEnabled).toBe(false);
    });

    it('converts timestamps to millisecond numbers', () => {
        const result = repo.rowToPromotion(promoRow({
            valid_from: new Date('2025-06-01T00:00:00.000Z'),
            valid_until: new Date('2025-06-02T00:00:00.000Z'),
            created_at: new Date('2025-06-03T00:00:00.000Z'),
        }));
        expect(result.validFrom).toBe(new Date('2025-06-01T00:00:00.000Z').getTime());
        expect(result.validUntil).toBe(new Date('2025-06-02T00:00:00.000Z').getTime());
        expect(result.createdAt).toBe(new Date('2025-06-03T00:00:00.000Z').getTime());
    });

    it('returns null timestamps when the row has none', () => {
        const result = repo.rowToPromotion(promoRow({ valid_from: null, valid_until: null, created_at: null }));
        expect(result.validFrom).toBeNull();
        expect(result.validUntil).toBeNull();
        expect(result.createdAt).toBeNull();
    });
});

describe('getActivePromotions', () => {
    it('filters active, enabled, in-window, in-usage-limit promotions', async () => {
        mockQuery.mockResolvedValue({ rows: [promoRow()] });

        const result = await repo.getActivePromotions();

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('FROM promotions');
        expect(sql).toContain('is_public = true');
        expect(sql).toContain('is_enabled = true');
        expect(sql).toContain('valid_from <= $1');
        expect(sql).toContain('valid_until > $1');
        expect(sql).toContain('(usage_limit IS NULL OR used_count < usage_limit)');
        expect(sql).toContain('(ticket_usage_limit IS NULL OR used_ticket_count < ticket_usage_limit)');
        expect(sql).toContain('ORDER BY created_at DESC');
        expect(params).toHaveLength(1);
        expect(params[0]).toBeInstanceOf(Date);
        expect(result).toEqual([mappedPromo()]);
    });

    it('returns an empty list when no promotions are active', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getActivePromotions()).resolves.toEqual([]);
    });
});

describe('getPromotionsByOrganizer', () => {
    it('filters by organizer id and maps rows', async () => {
        mockQuery.mockResolvedValue({ rows: [promoRow()] });

        const result = await repo.getPromotionsByOrganizer('org1');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('WHERE organizer_id = $1');
        expect(sql).toContain('ORDER BY created_at DESC');
        expect(params).toEqual(['org1']);
        expect(result).toEqual([mappedPromo()]);
    });
});

describe('findByCode', () => {
    it('queries with case-insensitive code and scope filters', async () => {
        mockQuery.mockResolvedValue({ rows: [promoRow()] });

        const result = await repo.findByCode('save10', { organizerId: 'org1', eventId: 'ev1' });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('UPPER(code) = UPPER($1)');
        expect(sql).toContain('($2::text IS NULL OR organizer_id = $2)');
        expect(sql).toContain('($3::text IS NULL OR event_id IS NULL OR event_id = $3)');
        expect(sql).toContain('ORDER BY CASE WHEN event_id = $3 THEN 0 ELSE 1 END, created_at DESC');
        expect(sql).toContain('LIMIT 1');
        expect(params).toEqual(['save10', 'org1', 'ev1']);
        expect(result).toEqual(mappedPromo());
    });

    it('passes nulls for an empty scope', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.findByCode('SAVE10');

        expect(mockQuery.mock.calls[0][1]).toEqual(['SAVE10', null, null]);
    });

    it('returns null when no promotion matches', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findByCode('NOPE', { organizerId: 'org1' })).resolves.toBeNull();
    });

    it('returns null when the row is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [undefined] });

        await expect(repo.findByCode('SAVE10')).resolves.toBeNull();
    });
});

describe('getEventById', () => {
    it('delegates to the event repository', async () => {
        mockGetEventById.mockResolvedValue({ id: 'ev1', name: 'Event' });

        const result = await repo.getEventById('ev1');

        expect(mockGetEventById).toHaveBeenCalledWith('ev1');
        expect(result).toEqual({ id: 'ev1', name: 'Event' });
    });

    it('propagates errors from the event repository', async () => {
        mockGetEventById.mockRejectedValue(new Error('event db down'));

        await expect(repo.getEventById('ev1')).rejects.toThrow('event db down');
    });
});

describe('getPromotionById', () => {
    it('returns the mapped promotion when found', async () => {
        mockQuery.mockResolvedValue({ rows: [promoRow()] });

        const result = await repo.getPromotionById('promo1');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('FROM promotions WHERE id = $1'),
            ['promo1']
        );
        expect(result).toEqual(mappedPromo());
    });

    it('returns null when not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getPromotionById('missing')).resolves.toBeNull();
    });
});

describe('createPromotion', () => {
    it('inserts all 21 parameters with transformed values and serialized extras', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const promoData = {
            organizerId: 'org1',
            code: 'NEWCODE',
            eventId: 'ev1',
            validFrom: new Date('2025-01-01T00:00:00.000Z'),
            validUntil: new Date('2025-02-01T00:00:00.000Z'),
            usageLimit: 10,
            usedCount: 2,
            ticketUsageLimit: 20,
            usedTicketCount: 3,
            perUserLimit: 2,
            minTicketQuantity: 2,
            maxTicketQuantity: 4,
            discountType: 'amount',
            discountValue: 10000,
            maxDiscount: 5000,
            minOrder: 100000,
            isPublic: true,
            isEnabled: true,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            customFlag: 'x',
        };

        await repo.createPromotion('p1', promoData);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO promotions');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
        expect(params).toEqual([
            'p1',
            'org1',
            'NEWCODE',
            'ev1',
            promoData.validFrom,
            promoData.validUntil,
            10,
            2,
            20,
            3,
            2,
            2,
            4,
            'fixed',
            10000,
            5000,
            100000,
            true,
            true,
            promoData.createdAt,
            JSON.stringify({ customFlag: 'x' }),
        ]);
    });

    it('applies defaults for missing optional values', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createPromotion('p1', { organizerId: 'org1', code: 'C', eventId: '' });

        const params = mockQuery.mock.calls[0][1];
        expect(params[0]).toBe('p1');
        expect(params[3]).toBeNull();
        expect(params[7]).toBe(0);
        expect(params[9]).toBe(0);
        expect(params[10]).toBe(1);
        expect(params[11]).toBe(1);
        expect(params[14]).toBeUndefined();
        expect(params[18]).toBe(true);
        expect(params[19]).toBeInstanceOf(Date);
        expect(params[20]).toBe('{}');
    });

    it('keeps percent discountType unchanged', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createPromotion('p1', { organizerId: 'org1', code: 'C', discountType: 'percent' });

        expect(mockQuery.mock.calls[0][1][13]).toBe('percent');
    });

    it('coerces isEnabled false through unchanged', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createPromotion('p1', { organizerId: 'org1', code: 'C', isEnabled: false });

        expect(mockQuery.mock.calls[0][1][18]).toBe(false);
    });
});

describe('updatePromotion', () => {
    it('maps known columns with transforms and unknown keys into the data bag', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updatePromotion('p1', {
            code: 'NEW',
            eventId: '',
            validFrom: '2025-01-01T00:00:00.000Z',
            discountType: 'amount',
            isPublic: false,
            unknownKey: 'bagValue',
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('UPDATE promotions SET');
        expect(sql).toContain('code = $1');
        expect(sql).toContain('event_id = $2');
        expect(sql).toContain('valid_from = $3');
        expect(sql).toContain('discount_type = $4');
        expect(sql).toContain('is_public = $5');
        expect(sql).toContain('data = data || $6::jsonb');
        expect(sql).toContain('WHERE id = $7');
        expect(params[0]).toBe('NEW');
        expect(params[1]).toBeNull();
        expect(params[2]).toEqual(new Date('2025-01-01T00:00:00.000Z'));
        expect(params[3]).toBe('fixed');
        expect(params[4]).toBe(false);
        expect(params[5]).toBe(JSON.stringify({ unknownKey: 'bagValue' }));
        expect(params[6]).toBe('p1');
    });

    it('skips the id key and applies column transforms', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updatePromotion('p1', { id: 'x', code: 'C', validUntil: '2025-06-01T00:00:00.000Z', minOrder: 5 });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('UPDATE promotions SET code = $1, valid_until = $2, min_order = $3');
        expect(sql).toContain('WHERE id = $4');
        expect(params[0]).toBe('C');
        expect(params[1]).toEqual(new Date('2025-06-01T00:00:00.000Z'));
        expect(params[2]).toBe(5);
        expect(params[3]).toBe('p1');
    });

    it('supports a data-bag-only update', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updatePromotion('p1', { note: 'hello' });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('data = data || $1::jsonb');
        expect(sql).toContain('WHERE id = $2');
        expect(params).toEqual([JSON.stringify({ note: 'hello' }), 'p1']);
    });

    it('returns without querying when there is nothing to update', async () => {
        await repo.updatePromotion('p1', {});
        await repo.updatePromotion('p1', { id: 'p1' });
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('propagates query errors', async () => {
        mockQuery.mockRejectedValue(new Error('update failed'));

        await expect(repo.updatePromotion('p1', { code: 'C' })).rejects.toThrow('update failed');
    });
});

describe('deletePromotion', () => {
    it('deletes the promotion by id', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.deletePromotion('p1');

        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM promotions WHERE id = $1',
            ['p1']
        );
    });
});

describe('transaction client validation', () => {
    const cases = [
        [repo.findPromoByCodeInTransaction, ['C']],
        [repo.getEventScopeInTransaction, ['e1']],
        [repo.getUserActiveUsageCountInTransaction, ['p1', 'u1']],
        [repo.findUsageByOrderInTransaction, ['o1']],
        [repo.createUsageInTransaction, [{}]],
        [repo.markUsageRedeemedInTransaction, ['o1']],
        [repo.releaseUsageInTransaction, ['o1']],
        [repo.incrementPromotionUsedCountInTransaction, ['p1']],
        [repo.decrementPromotionUsedCountInTransaction, ['p1']],
    ];

    for (const [fn, args] of cases) {
        it(`${fn.name} rejects a missing transaction client`, async () => {
            await expect(fn(null, ...args)).rejects.toThrow(
                'A PostgreSQL transaction client is required.'
            );
            expect(mockQuery).not.toHaveBeenCalled();
        });
    }

    it('rejects a client without a query function', async () => {
        await expect(repo.findPromoByCodeInTransaction({}, 'C')).rejects.toThrow(
            'A PostgreSQL transaction client is required.'
        );
    });
});

describe('findPromoByCodeInTransaction', () => {
    it('queries scoped and returns the promotion with _id attached', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [promoRow()] });

        const result = await repo.findPromoByCodeInTransaction(client, 'save10', false, { organizerId: 'org1', eventId: 'ev1' });

        const [sql, params] = txQuery.mock.calls[0];
        expect(sql).toContain('UPPER(code) = UPPER($1)');
        expect(sql).not.toContain('FOR UPDATE');
        expect(params).toEqual(['save10', 'org1', 'ev1']);
        expect(result).toEqual({ ...mappedPromo(), _id: 'promo1' });
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('adds FOR UPDATE when the lock flag is set', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [promoRow()] });

        await repo.findPromoByCodeInTransaction(client, 'save10', true);

        expect(txQuery.mock.calls[0][0]).toContain('FOR UPDATE');
    });

    it('returns null when no promotion matches', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findPromoByCodeInTransaction(client, 'NOPE')).resolves.toBeNull();
    });
});

describe('getEventScopeInTransaction', () => {
    it('returns null without querying when eventId is missing', async () => {
        await expect(repo.getEventScopeInTransaction(makeTx().client, null)).resolves.toBeNull();
        await expect(repo.getEventScopeInTransaction(makeTx().client, undefined)).resolves.toBeNull();
    });

    it('returns null when the event does not exist', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getEventScopeInTransaction(client, 'ev1')).resolves.toBeNull();
        expect(txQuery).toHaveBeenCalledWith(
            'SELECT id, organizer_id FROM events WHERE id = $1 LIMIT 1',
            ['ev1']
        );
    });

    it('returns the event and organizer ids', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [{ id: 'ev1', organizer_id: 'org1' }] });

        const result = await repo.getEventScopeInTransaction(client, 'ev1');

        expect(result).toEqual({ eventId: 'ev1', organizerId: 'org1' });
    });
});

describe('getUserActiveUsageCountInTransaction', () => {
    it('returns 0 without querying when userId is missing', async () => {
        const { client } = makeTx();

        await expect(repo.getUserActiveUsageCountInTransaction(client, 'p1', null)).resolves.toBe(0);
        await expect(repo.getUserActiveUsageCountInTransaction(client, 'p1', undefined)).resolves.toBe(0);
    });

    it('counts reserved and redeemed usages for the promotion and user', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [{ count: 3 }] });

        const result = await repo.getUserActiveUsageCountInTransaction(client, 'p1', 'u1');

        const [sql, params] = txQuery.mock.calls[0];
        expect(sql).toContain('FROM voucher_usages');
        expect(sql).toContain("status IN ('reserved', 'redeemed')");
        expect(sql).toContain('promotion_id = $1');
        expect(params).toEqual(['p1', 'u1']);
        expect(result).toBe(3);
    });

    it('returns 0 when the count is null', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [{ count: null }] });

        await expect(repo.getUserActiveUsageCountInTransaction(client, 'p1', 'u1')).resolves.toBe(0);
    });
});

describe('findUsageByOrderInTransaction', () => {
    it('returns the usage row for an order', async () => {
        const { client, txQuery } = makeTx();
        const usage = { id: 'u1', order_id: 'o1', status: 'reserved' };
        txQuery.mockResolvedValue({ rows: [usage] });

        const result = await repo.findUsageByOrderInTransaction(client, 'o1');

        expect(txQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE order_id = $1'),
            ['o1']
        );
        expect(result).toEqual(usage);
    });

    it('returns null when no usage matches', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findUsageByOrderInTransaction(client, 'o1')).resolves.toBeNull();
    });

    it('adds FOR UPDATE when the lock flag is set', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        await repo.findUsageByOrderInTransaction(client, 'o1', true);

        expect(txQuery.mock.calls[0][0]).toContain('FOR UPDATE');
    });
});

describe('createUsageInTransaction', () => {
    it('increments guarded counts, inserts the usage, and returns the inserted row', async () => {
        const { client, txQuery } = makeTx();
        txQuery
            .mockResolvedValueOnce({ rows: [{ used_count: 5, used_ticket_count: 8 }] })
            .mockResolvedValueOnce({ rows: [{ id: 'u1', status: 'reserved' }] });

        const usage = {
            id: 'u1',
            promotionId: 'p1',
            userId: 'user1',
            orderId: 'o1',
            eventId: 'e1',
            organizerId: 'org1',
            ticketQuantity: 3,
            subtotalAmount: 300000,
            discountAmount: 50000,
            totalAmount: 250000,
        };

        const result = await repo.createUsageInTransaction(client, usage);

        expect(txQuery).toHaveBeenCalledTimes(2);
        const [updateSql, updateParams] = txQuery.mock.calls[0];
        expect(updateSql).toContain('UPDATE promotions');
        expect(updateSql).toContain('used_count = used_count + 1');
        expect(updateSql).toContain('used_ticket_count = used_ticket_count + $2');
        expect(updateSql).toContain('(usage_limit IS NULL OR used_count < usage_limit)');
        expect(updateSql).toContain('RETURNING used_count, used_ticket_count');
        expect(updateParams).toEqual(['p1', 3]);

        const [insertSql, insertParams] = txQuery.mock.calls[1];
        expect(insertSql).toContain('INSERT INTO voucher_usages');
        expect(insertSql).toContain("'reserved', NOW(), NOW()");
        expect(insertParams).toEqual([
            'u1', 'p1', 'user1', 'o1', 'e1', 'org1', 3, 300000, 50000, 250000,
        ]);
        expect(result).toEqual({ id: 'u1', status: 'reserved' });
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns null and skips the insert when the guarded update affects no rows', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        const result = await repo.createUsageInTransaction(client, { promotionId: 'p1', ticketQuantity: 3 });

        expect(result).toBeNull();
        expect(txQuery).toHaveBeenCalledTimes(1);
    });
});

describe('markUsageRedeemedInTransaction', () => {
    it('returns null when no usage exists for the order', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        await expect(repo.markUsageRedeemedInTransaction(client, 'o1')).resolves.toBeNull();
        expect(txQuery).toHaveBeenCalledTimes(1);
    });

    it('returns the usage untouched when it is not reserved', async () => {
        const { client, txQuery } = makeTx();
        const usage = { id: 'u1', order_id: 'o1', status: 'released' };
        txQuery.mockResolvedValue({ rows: [usage] });

        const result = await repo.markUsageRedeemedInTransaction(client, 'o1');

        expect(result).toEqual(usage);
        expect(txQuery).toHaveBeenCalledTimes(1);
    });

    it('updates a reserved usage to redeemed and returns the row', async () => {
        const { client, txQuery } = makeTx();
        txQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1', order_id: 'o1', status: 'reserved' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'u1', status: 'redeemed' }] });

        const result = await repo.markUsageRedeemedInTransaction(client, 'o1');

        expect(txQuery).toHaveBeenCalledTimes(2);
        const [sql, params] = txQuery.mock.calls[1];
        expect(sql).toContain("SET status = 'redeemed'");
        expect(sql).toContain("status = 'reserved'");
        expect(params).toEqual(['o1']);
        expect(result).toEqual({ id: 'u1', status: 'redeemed' });
    });
});

describe('releaseUsageInTransaction', () => {
    it('returns null when no usage exists for the order', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        await expect(repo.releaseUsageInTransaction(client, 'o1')).resolves.toBeNull();
        expect(txQuery).toHaveBeenCalledTimes(1);
    });

    it('returns the usage untouched when it is not reserved', async () => {
        const { client, txQuery } = makeTx();
        const usage = { id: 'u1', order_id: 'o1', status: 'released' };
        txQuery.mockResolvedValue({ rows: [usage] });

        const result = await repo.releaseUsageInTransaction(client, 'o1');

        expect(result).toEqual(usage);
        expect(txQuery).toHaveBeenCalledTimes(1);
    });

    it('marks the usage released and decrements the promotion counts', async () => {
        const { client, txQuery } = makeTx();
        txQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1', order_id: 'o1', promotion_id: 'p1', ticket_quantity: 3, status: 'reserved' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.releaseUsageInTransaction(client, 'o1');

        expect(txQuery).toHaveBeenCalledTimes(3);
        const [releaseSql, releaseParams] = txQuery.mock.calls[1];
        expect(releaseSql).toContain("SET status = 'released'");
        expect(releaseParams).toEqual(['u1']);

        const [decrementSql, decrementParams] = txQuery.mock.calls[2];
        expect(decrementSql).toContain('UPDATE promotions');
        expect(decrementSql).toContain('GREATEST(used_count - 1, 0)');
        expect(decrementSql).toContain('GREATEST(used_ticket_count - $2, 0)');
        expect(decrementParams).toEqual(['p1', 3]);
        expect(result).toEqual({
            id: 'u1',
            order_id: 'o1',
            promotion_id: 'p1',
            ticket_quantity: 3,
            status: 'released',
        });
    });

    it('coerces a missing ticket quantity to 0 when decrementing', async () => {
        const { client, txQuery } = makeTx();
        txQuery
            .mockResolvedValueOnce({ rows: [{ id: 'u1', promotion_id: 'p1', ticket_quantity: null, status: 'reserved' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.releaseUsageInTransaction(client, 'o1');

        expect(txQuery.mock.calls[2][1]).toEqual(['p1', 0]);
    });
});

describe('incrementPromotionUsedCountInTransaction', () => {
    it('returns true when the guarded update affects a row', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [{ used_count: 1 }] });

        const result = await repo.incrementPromotionUsedCountInTransaction(client, 'p1');

        expect(txQuery).toHaveBeenCalledWith(
            expect.stringContaining('RETURNING used_count'),
            ['p1']
        );
        expect(result).toBe(true);
    });

    it('returns false when the guarded update affects no rows', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        await expect(repo.incrementPromotionUsedCountInTransaction(client, 'p1')).resolves.toBe(false);
    });
});

describe('decrementPromotionUsedCountInTransaction', () => {
    it('decrements the used count floor at zero', async () => {
        const { client, txQuery } = makeTx();
        txQuery.mockResolvedValue({ rows: [] });

        await repo.decrementPromotionUsedCountInTransaction(client, 'p1');

        expect(txQuery).toHaveBeenCalledWith(
            'UPDATE promotions SET used_count = GREATEST(used_count - 1, 0) WHERE id = $1',
            ['p1']
        );
    });
});

describe('withTransaction', () => {
    it('exposes the client transaction function', () => {
        expect(repo.withTransaction).toBe(mockTransaction);
    });
});
