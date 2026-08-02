const {
  rowsToTicketTypesMap,
  normalizeTypePayload,
  minPriceFromMap,
  loadTicketTypesMap,
  loadTicketTypesForEvents,
  replaceTicketTypes,
  incrementAvailable,
  setAvailable,
  getTicketTypeRow,
} = require('@/providers/database/ticket-types.helper');

function makeClient() {
  return { query: jest.fn() };
}

const SELECT_SQL = `SELECT id, event_id, code, name, price, currency, capacity, available,
                sold_count, sort_order, is_active, raw_data
         FROM event_ticket_types
         WHERE event_id`;

describe('rowsToTicketTypesMap', () => {
  it('returns empty object for null rows', () => {
    expect(rowsToTicketTypesMap(null)).toEqual({});
  });

  it('returns empty object for undefined rows', () => {
    expect(rowsToTicketTypesMap(undefined)).toEqual({});
  });

  it('converts a single row to a map keyed by code', () => {
    const rows = [{ code: 'VIP', name: 'VIP', price: 500, currency: 'VND', capacity: 100, available: 50, sold_count: 50, is_active: true }];
    const result = rowsToTicketTypesMap(rows);
    expect(result.VIP).toEqual({
      id: undefined,
      name: 'VIP',
      price: 500,
      currency: 'VND',
      capacity: 100,
      available: 50,
      soldCount: 50,
      isActive: true,
    });
  });

  it('handles multiple rows', () => {
    const rows = [
      { code: 'VIP', price: 1000, capacity: 50, available: 25, sold_count: 25, is_active: true },
      { code: 'Normal', price: 500, capacity: 200, available: 150, sold_count: 50, is_active: true },
    ];
    const result = rowsToTicketTypesMap(rows);
    expect(Object.keys(result)).toEqual(['VIP', 'Normal']);
    expect(result.VIP.price).toBe(1000);
    expect(result.Normal.price).toBe(500);
  });

  it('falls back name to code when name is missing', () => {
    const rows = [{ code: 'GEN', price: 100, capacity: 10, available: 10, sold_count: 0 }];
    expect(rowsToTicketTypesMap(rows).GEN.name).toBe('GEN');
  });

  it('coerces null/missing price to 0', () => {
    const rows = [{ code: 'FREE', capacity: 10, available: 10, sold_count: 0 }];
    expect(rowsToTicketTypesMap(rows).FREE.price).toBe(0);
  });

  it('coerces null/missing capacity to 0', () => {
    const rows = [{ code: 'X', price: 100, available: 10, sold_count: 0 }];
    expect(rowsToTicketTypesMap(rows).X.capacity).toBe(0);
  });

  it('coerces null/missing available to 0', () => {
    const rows = [{ code: 'X', price: 100, capacity: 10, sold_count: 0 }];
    expect(rowsToTicketTypesMap(rows).X.available).toBe(0);
  });

  it('defaults isActive to true when missing', () => {
    const rows = [{ code: 'X', price: 100, capacity: 10, available: 10, sold_count: 0 }];
    expect(rowsToTicketTypesMap(rows).X.isActive).toBe(true);
  });

  it('respects is_active false', () => {
    const rows = [{ code: 'X', price: 100, capacity: 10, available: 10, sold_count: 0, is_active: false }];
    expect(rowsToTicketTypesMap(rows).X.isActive).toBe(false);
  });

  it('merges raw_data into the result', () => {
    const rows = [{ code: 'VIP', price: 500, capacity: 100, available: 50, sold_count: 50, raw_data: { color: 'gold' } }];
    expect(rowsToTicketTypesMap(rows).VIP.color).toBe('gold');
  });

  it('defaults currency to VND', () => {
    const rows = [{ code: 'X', price: 100, capacity: 10, available: 10, sold_count: 0 }];
    expect(rowsToTicketTypesMap(rows).X.currency).toBe('VND');
  });

  it('coerces price from string to number', () => {
    const rows = [{ code: 'VIP', price: '500', capacity: 10, available: 10, sold_count: 0 }];
    expect(rowsToTicketTypesMap(rows).VIP.price).toBe(500);
  });
});

describe('normalizeTypePayload', () => {
  it('returns normalized object with code and name', () => {
    const result = normalizeTypePayload('VIP', { price: 1000, capacity: 50 });
    expect(result).toMatchObject({ code: 'VIP', name: 'VIP', price: 1000, capacity: 50 });
  });

  it('falls back to code for name when name is missing', () => {
    const result = normalizeTypePayload('GEN', { price: 100 });
    expect(result.name).toBe('GEN');
  });

  it('uses quantity as capacity fallback', () => {
    const result = normalizeTypePayload('VIP', { price: 500, quantity: 100 });
    expect(result.capacity).toBe(100);
  });

  it('defaults capacity to 0 when both capacity and quantity missing', () => {
    const result = normalizeTypePayload('VIP', { price: 500 });
    expect(result.capacity).toBe(0);
  });

  it('defaults price to 0 when missing', () => {
    const result = normalizeTypePayload('FREE', {});
    expect(result.price).toBe(0);
  });

  it('coerces string price to number', () => {
    const result = normalizeTypePayload('VIP', { price: '1000', capacity: 10 });
    expect(result.price).toBe(1000);
  });

  it('coerces string capacity to number', () => {
    const result = normalizeTypePayload('VIP', { price: 100, capacity: '50' });
    expect(result.capacity).toBe(50);
  });

  it('strips known keys from raw', () => {
    const result = normalizeTypePayload('VIP', { price: 100, capacity: 50, name: 'VIP', available: 30, quantity: 100, soldCount: 10, isActive: true, currency: 'USD', extraField: 'keep' });
    expect(result.raw).toEqual({ extraField: 'keep' });
  });

  it('handles null data', () => {
    const result = normalizeTypePayload('VIP', null);
    expect(result).toMatchObject({ code: 'VIP', price: 0, capacity: 0, raw: {} });
  });

  it('handles undefined data', () => {
    const result = normalizeTypePayload('VIP', undefined);
    expect(result).toMatchObject({ code: 'VIP', price: 0, capacity: 0, raw: {} });
  });

  it('handles NaN available by falling back to capacity', () => {
    const result = normalizeTypePayload('VIP', { price: 100, capacity: 50, available: NaN });
    expect(result.available).toBe(50);
  });

  it('returns id from input', () => {
    const result = normalizeTypePayload('VIP', { id: 'custom-id', price: 100, capacity: 10 });
    expect(result.id).toBe('custom-id');
  });
});

describe('minPriceFromMap', () => {
  it('returns 0 for null', () => {
    expect(minPriceFromMap(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(minPriceFromMap(undefined)).toBe(0);
  });

  it('returns 0 for non-object', () => {
    expect(minPriceFromMap('bad')).toBe(0);
  });

  it('returns 0 for empty object', () => {
    expect(minPriceFromMap({})).toBe(0);
  });

  it('returns 0 when no types have numeric price', () => {
    expect(minPriceFromMap({ VIP: { price: null } })).toBe(0);
  });

  it('returns the single price', () => {
    expect(minPriceFromMap({ VIP: { price: 500 } })).toBe(500);
  });

  it('returns the minimum price', () => {
    expect(minPriceFromMap({ VIP: { price: 1000 }, Normal: { price: 300 } })).toBe(300);
  });

  it('handles zero price', () => {
    expect(minPriceFromMap({ Free: { price: 0 }, VIP: { price: 500 } })).toBe(0);
  });

  it('ignores null price and considers numeric ones', () => {
    expect(minPriceFromMap({ A: { price: null }, B: { price: 100 } })).toBe(100);
  });
});

describe('loadTicketTypesMap', () => {
  it('queries by event_id and converts rows to a map keyed by code', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({
      rows: [
        { id: 't1', code: 'VIP', name: 'VIP', price: 500, currency: 'VND', capacity: 100, available: 50, sold_count: 50, is_active: true },
        { id: 't2', code: 'GA', name: 'GA', price: 200, capacity: 200, available: 100, sold_count: 100, is_active: true },
      ],
    });

    const result = await loadTicketTypesMap(client, 'e1');

    expect(client.query).toHaveBeenCalledWith(
      `${SELECT_SQL} = $1
         ORDER BY sort_order ASC, code ASC`,
      ['e1']
    );
    expect(Object.keys(result)).toEqual(['VIP', 'GA']);
    expect(result.VIP.id).toBe('t1');
    expect(result.VIP.price).toBe(500);
    expect(result.GA.id).toBe('t2');
  });

  it('returns an empty map when there are no rows', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await expect(loadTicketTypesMap(client, 'e1')).resolves.toEqual({});
  });
});

describe('loadTicketTypesForEvents', () => {
  it('returns an empty object without querying when eventIds is empty', async () => {
    const client = makeClient();

    await expect(loadTicketTypesForEvents(client, [])).resolves.toEqual({});
    await expect(loadTicketTypesForEvents(client, null)).resolves.toEqual({});
    await expect(loadTicketTypesForEvents(client, undefined)).resolves.toEqual({});
    expect(client.query).not.toHaveBeenCalled();
  });

  it('queries with ANY($1::text[]) and groups ticket type maps per event', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({
      rows: [
        { id: 't1', event_id: 'e1', code: 'VIP', name: 'VIP', price: 500, capacity: 100, available: 50, sold_count: 50 },
        { id: 't2', event_id: 'e1', code: 'GA', name: 'GA', price: 200, capacity: 200, available: 100, sold_count: 100 },
        { id: 't3', event_id: 'e2', code: 'GA', name: 'GA', price: 300, capacity: 50, available: 25, sold_count: 25 },
      ],
    });

    const result = await loadTicketTypesForEvents(client, ['e1', 'e2']);

    expect(client.query).toHaveBeenCalledWith(
      `${SELECT_SQL} = ANY($1::text[])
         ORDER BY sort_order ASC, code ASC`,
      [['e1', 'e2']]
    );
    expect(Object.keys(result)).toEqual(['e1', 'e2']);
    expect(Object.keys(result.e1)).toEqual(['VIP', 'GA']);
    expect(result.e1.VIP.price).toBe(500);
    expect(result.e1.GA.price).toBe(200);
    expect(result.e2.GA.price).toBe(300);
  });
});

describe('replaceTicketTypes', () => {
  it('only deletes when ticketTypes is null, undefined or an array', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await replaceTicketTypes(client, 'e1', null);
    await replaceTicketTypes(client, 'e1', undefined);
    await replaceTicketTypes(client, 'e1', []);

    expect(client.query).toHaveBeenCalledTimes(3);
    for (const call of client.query.mock.calls) {
      expect(call).toEqual(['DELETE FROM event_ticket_types WHERE event_id = $1', ['e1']]);
    }
  });

  it('deletes then inserts each code with a derived id and raw jsonb', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await replaceTicketTypes(client, 'e1', {
      VIP: { name: 'VIP', price: 500, capacity: 100, available: 50, color: 'gold' },
      GA: { price: 200, quantity: 200 },
    });

    expect(client.query).toHaveBeenCalledTimes(3);
    expect(client.query.mock.calls[0]).toEqual([
      'DELETE FROM event_ticket_types WHERE event_id = $1',
      ['e1'],
    ]);
    const [sqlVip, paramsVip] = client.query.mock.calls[1];
    expect(sqlVip).toContain('INSERT INTO event_ticket_types');
    expect(paramsVip).toEqual([
      'e1:VIP',
      'e1',
      'VIP',
      'VIP',
      500,
      100,
      50,
      0,
      expect.any(Date),
      JSON.stringify({ color: 'gold' }),
    ]);
    const [sqlGa, paramsGa] = client.query.mock.calls[2];
    expect(sqlGa).toContain('INSERT INTO event_ticket_types');
    expect(paramsGa).toEqual([
      'e1:GA',
      'e1',
      'GA',
      'GA',
      200,
      200,
      200,
      1,
      expect.any(Date),
      '{}',
    ]);
  });

  it('uses an explicit id and keeps sort_order incrementing across codes', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await replaceTicketTypes(client, 'e1', {
      VIP: { id: 'custom-vip', price: 500, capacity: 10 },
      GA: { price: 100, capacity: 10 },
    });

    const vipParams = client.query.mock.calls[1][1];
    const gaParams = client.query.mock.calls[2][1];
    expect(vipParams[0]).toBe('custom-vip');
    expect(vipParams[7]).toBe(0);
    expect(gaParams[0]).toBe('e1:GA');
    expect(gaParams[7]).toBe(1);
  });
});

describe('incrementAvailable', () => {
  it('updates available and clamps sold_count, returning the updated row', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [{ id: 't1', available: 60 }] });

    const result = await incrementAvailable(client, 'e1', 'VIP', 10);

    expect(client.query.mock.calls[0][0]).toContain('GREATEST(sold_count - $1, 0)');
    expect(client.query.mock.calls[0][0]).toContain('RETURNING id, available');
    expect(client.query.mock.calls[0][1]).toEqual([10, expect.any(Date), 'e1', 'VIP']);
    expect(result).toEqual({ id: 't1', available: 60 });
  });

  it('returns null when no row matches', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await expect(incrementAvailable(client, 'e1', 'GHOST', -5)).resolves.toBeNull();
  });
});

describe('setAvailable', () => {
  it('updates available for the matching event and code', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await setAvailable(client, 'e1', 'VIP', 25);

    expect(client.query).toHaveBeenCalledWith(
      `UPDATE event_ticket_types
         SET available = $1, updated_at = $2
         WHERE event_id = $3 AND code = $4`,
      [25, expect.any(Date), 'e1', 'VIP']
    );
  });
});

describe('getTicketTypeRow', () => {
  it('returns the first matching row', async () => {
    const client = makeClient();
    const row = { id: 't1', code: 'VIP' };
    client.query.mockResolvedValue({ rows: [row] });

    await expect(getTicketTypeRow(client, 'e1', 'VIP')).resolves.toBe(row);

    expect(client.query).toHaveBeenCalledWith(
      'SELECT * FROM event_ticket_types WHERE event_id = $1 AND code = $2 LIMIT 1',
      ['e1', 'VIP']
    );
  });

  it('returns null when no row matches', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await expect(getTicketTypeRow(client, 'e1', 'VIP')).resolves.toBeNull();
  });
});
