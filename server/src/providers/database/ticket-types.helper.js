/**
 * Relational ticket types helpers (3NF N1).
 * API still exposes ticketTypes as { [code]: { price, available, capacity, ... } }.
 */
const { nowDb } = require('./time.helper');

function rowsToTicketTypesMap(rows) {
    const map = {};
    if (!rows) return map;
    for (const row of rows) {
        const extra = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
        map[row.code] = {
            id: row.id,
            name: row.name || row.code,
            price: row.price != null ? Number(row.price) : 0,
            currency: row.currency || 'VND',
            capacity: row.capacity != null ? Number(row.capacity) : 0,
            available: row.available != null ? Number(row.available) : 0,
            soldCount: row.sold_count != null ? Number(row.sold_count) : 0,
            isActive: row.is_active !== false,
            ...extra,
        };
    }
    return map;
}

async function loadTicketTypesMap(client, eventId) {
    const result = await client.query(
        `SELECT id, event_id, code, name, price, currency, capacity, available,
                sold_count, sort_order, is_active, raw_data
         FROM event_ticket_types
         WHERE event_id = $1
         ORDER BY sort_order ASC, code ASC`,
        [eventId]
    );
    return rowsToTicketTypesMap(result.rows);
}

async function loadTicketTypesForEvents(client, eventIds) {
    const byEvent = {};
    if (!eventIds || eventIds.length === 0) return byEvent;
    const result = await client.query(
        `SELECT id, event_id, code, name, price, currency, capacity, available,
                sold_count, sort_order, is_active, raw_data
         FROM event_ticket_types
         WHERE event_id = ANY($1::text[])
         ORDER BY sort_order ASC, code ASC`,
        [eventIds]
    );
    for (const row of result.rows) {
        if (!byEvent[row.event_id]) byEvent[row.event_id] = {};
        const map = rowsToTicketTypesMap([row]);
        Object.assign(byEvent[row.event_id], map);
    }
    return byEvent;
}

function normalizeTypePayload(code, data) {
    const d = data && typeof data === 'object' ? data : {};
    const capacity = d.capacity != null ? Number(d.capacity) : (d.quantity != null ? Number(d.quantity) : 0);
    let available = d.available != null ? Number(d.available) : capacity;
    if (Number.isNaN(available)) available = capacity;
    const price = d.price != null ? Number(d.price) : 0;
    const name = d.name || code;
    const id = d.id || null;
    const raw = { ...d };
    delete raw.id;
    delete raw.name;
    delete raw.price;
    delete raw.capacity;
    delete raw.available;
    delete raw.quantity;
    delete raw.soldCount;
    delete raw.isActive;
    delete raw.currency;
    return { id, code, name, price, capacity, available, raw };
}

async function replaceTicketTypes(client, eventId, ticketTypes) {
    await client.query('DELETE FROM event_ticket_types WHERE event_id = $1', [eventId]);
    if (!ticketTypes || typeof ticketTypes !== 'object' || Array.isArray(ticketTypes)) {
        return;
    }
    const now = nowDb();
    let sort = 0;
    for (const code of Object.keys(ticketTypes)) {
        const n = normalizeTypePayload(code, ticketTypes[code]);
        const id = n.id || `${eventId}:${code}`;
        await client.query(
            `INSERT INTO event_ticket_types (
                id, event_id, code, name, price, currency, capacity, available,
                sold_count, sort_order, is_active, created_at, updated_at, raw_data
             ) VALUES ($1,$2,$3,$4,$5,'VND',$6,$7,0,$8,true,$9,$9,$10::jsonb)`,
            [
                id,
                eventId,
                code,
                n.name,
                n.price,
                n.capacity,
                n.available,
                sort,
                now,
                JSON.stringify(n.raw || {}),
            ]
        );
        sort += 1;
    }
}

async function incrementAvailable(client, eventId, ticketTypeCode, incrementBy) {
    const result = await client.query(
        `UPDATE event_ticket_types
         SET available = available + $1,
             sold_count = GREATEST(sold_count - $1, 0),
             updated_at = $2
         WHERE event_id = $3 AND code = $4
         RETURNING id, available`,
        [incrementBy, nowDb(), eventId, ticketTypeCode]
    );
    return result.rows[0] || null;
}

async function setAvailable(client, eventId, ticketTypeCode, available) {
    await client.query(
        `UPDATE event_ticket_types
         SET available = $1, updated_at = $2
         WHERE event_id = $3 AND code = $4`,
        [available, nowDb(), eventId, ticketTypeCode]
    );
}

async function getTicketTypeRow(client, eventId, code) {
    const result = await client.query(
        `SELECT * FROM event_ticket_types WHERE event_id = $1 AND code = $2 LIMIT 1`,
        [eventId, code]
    );
    return result.rows[0] || null;
}

function minPriceFromMap(ticketTypes) {
    if (!ticketTypes || typeof ticketTypes !== 'object') return 0;
    const prices = Object.values(ticketTypes)
        .map((t) => (t && t.price != null ? Number(t.price) : NaN))
        .filter((p) => !Number.isNaN(p));
    if (prices.length === 0) return 0;
    return Math.min(...prices);
}

module.exports = {
    rowsToTicketTypesMap,
    loadTicketTypesMap,
    loadTicketTypesForEvents,
    replaceTicketTypes,
    incrementAvailable,
    setAvailable,
    getTicketTypeRow,
    minPriceFromMap,
    normalizeTypePayload,
};
