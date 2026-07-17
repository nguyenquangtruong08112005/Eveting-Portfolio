const { query, transaction } = require('./postgres.client');
const { toDb, fromDb, nowDb } = require('./time.helper');

const FIELD_MAP = {
    eventId: 'event_id',
    userId: 'user_id',
    organizerId: 'organizer_id',
    type: 'type',
    price: 'price',
    originalPrice: 'original_price',
    quantity: 'quantity',
    unitPrice: 'unit_price',
    appliedPromoCode: 'applied_promo_code',
    seat: 'seat',
    qrCode: 'qr_code',
    status: 'status',
    purchaseDate: 'purchase_date',
    groupId: 'group_id',
    checkInCount: 'check_in_count',
    lastCheckInAt: 'last_check_in_at',
    checkedInAt: 'checked_in_at',
    paymentTime: 'payment_time',
    updatedAt: 'updated_at'
};

function rowToTicket(row, includeDocId) {
    if (!row) return null;
    let ticket;
    if (row.raw_data && Object.keys(row.raw_data).length > 0) {
        ticket = { ...row.raw_data };
    } else {
        ticket = {};
        ticket.eventId = row.event_id;
        ticket.userId = row.user_id;
        ticket.organizerId = row.organizer_id;
        ticket.type = row.type;
        
        if (row.price != null) ticket.price = Number(row.price);
        if (row.original_price != null) ticket.originalPrice = Number(row.original_price);
        if (row.quantity != null) ticket.quantity = Number(row.quantity);
        if (row.unit_price != null) ticket.unitPrice = Number(row.unit_price);
        if (row.unit_price == null && row.unitPrice != null) ticket.unitPrice = Number(row.unitPrice);
        
        ticket.appliedPromoCode = row.applied_promo_code;
        ticket.seat = row.seat;
        ticket.qrCode = row.qr_code;
        ticket.status = row.status;
        if (row.purchase_date != null) ticket.purchaseDate = fromDb(row.purchase_date);
        ticket.groupId = row.group_id;
        if (row.check_in_count != null) ticket.checkInCount = Number(row.check_in_count);
        if (row.last_check_in_at != null) ticket.lastCheckInAt = fromDb(row.last_check_in_at);
        if (row.checked_in_at != null) ticket.checkedInAt = fromDb(row.checked_in_at);
        if (row.payment_time != null) ticket.paymentTime = fromDb(row.payment_time);
        if (row.updated_at != null) ticket.updatedAt = fromDb(row.updated_at);
    }
    
    if (includeDocId) {
        ticket.id = row.id;
    }
    return ticket;
}

const getTicketById = async (ticketId) => {
    const result = await query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (result.rows.length === 0) return null;
    return rowToTicket(result.rows[0], true);
};

const updateTicket = async (ticketId, updates, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const keys = Object.keys(updates);
    if (keys.length === 0) return;

    const sets = [];
    const params = [];
    let idx = 1;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key === 'id') continue;

        if (key in FIELD_MAP) {
            sets.push(`${FIELD_MAP[key]} = $${idx}`);
            const col = FIELD_MAP[key];
            if (['purchase_date', 'last_check_in_at', 'checked_in_at', 'payment_time', 'updated_at'].includes(col)) {
                params.push(toDb(updates[key]));
            } else {
                params.push(updates[key]);
            }
            idx++;
        } else {
            const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
            sets.push(`${snake} = $${idx}`);
            params.push(updates[key]);
            idx++;
        }
    }

    const rawMerge = {};
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key === 'id') continue;
        rawMerge[key] = updates[key];
    }

    if (Object.keys(rawMerge).length > 0) {
        sets.push(`raw_data = COALESCE(raw_data, '{}'::jsonb) || $${idx}::jsonb`);
        params.push(JSON.stringify(rawMerge));
        idx++;
    }

    if (sets.length === 0) return;

    params.push(ticketId);
    await client.query(
        `UPDATE tickets SET ${sets.join(', ')} WHERE id = $${idx}`,
        params
    );
};

const getPaidTicketsByEventId = async (eventId) => {
    const result = await query(
        'SELECT * FROM tickets WHERE event_id = $1 AND status = $2',
        [eventId, 'paid']
    );
    return result.rows.map(row => rowToTicket(row, false));
};

const runTransaction = async (callback) => {
    return transaction(callback);
};

const getTicketsByUserId = async (userId) => {
    const result = await query(
        'SELECT * FROM tickets WHERE user_id = $1',
        [userId]
    );
    return result.rows.map(row => rowToTicket(row, true));
};

const getTicketInTransaction = async (transaction, ticketId) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const result = await client.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (result.rows.length === 0) return null;
    return rowToTicket(result.rows[0], true);
};

const createTicketInTransaction = async (transaction, ticketId, ticketData) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const rawData = { ...ticketData };
    await client.query(
        `INSERT INTO tickets (
            id, event_id, user_id, organizer_id, type, price, original_price,
            quantity, unit_price, applied_promo_code, seat, qr_code, status,
            purchase_date, group_id, check_in_count, last_check_in_at, checked_in_at,
            payment_time, updated_at, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            user_id = EXCLUDED.user_id,
            organizer_id = EXCLUDED.organizer_id,
            type = EXCLUDED.type,
            price = EXCLUDED.price,
            original_price = EXCLUDED.original_price,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            applied_promo_code = EXCLUDED.applied_promo_code,
            seat = EXCLUDED.seat,
            qr_code = EXCLUDED.qr_code,
            status = EXCLUDED.status,
            purchase_date = EXCLUDED.purchase_date,
            group_id = EXCLUDED.group_id,
            check_in_count = EXCLUDED.check_in_count,
            last_check_in_at = EXCLUDED.last_check_in_at,
            checked_in_at = EXCLUDED.checked_in_at,
            payment_time = EXCLUDED.payment_time,
            updated_at = EXCLUDED.updated_at,
            raw_data = EXCLUDED.raw_data`,
        [
            ticketId,
            ticketData.eventId,
            ticketData.userId,
            ticketData.organizerId || null,
            ticketData.type,
            ticketData.price || 0,
            ticketData.originalPrice || 0,
            ticketData.quantity || 1,
            ticketData.unitPrice || ticketData.unit_price || 0,
            ticketData.appliedPromoCode || null,
            ticketData.seat || null,
            ticketData.qrCode || null,
            ticketData.status || 'pending',
            toDb(ticketData.purchaseDate) || nowDb(),
            ticketData.groupId || null,
            ticketData.checkInCount || 0,
            toDb(ticketData.lastCheckInAt),
            toDb(ticketData.checkedInAt),
            toDb(ticketData.paymentTime),
            toDb(ticketData.updatedAt) || nowDb(),
            JSON.stringify(rawData)
        ]
    );
};

const createTicket = async (ticketId, ticketData) => {
    return createTicketInTransaction(null, ticketId, ticketData);
};

const updateTicketInTransaction = async (transaction, ticketId, updates) => {
    return updateTicket(ticketId, updates, transaction);
};

const getAttendeeTicketsByEventId = async (eventId) => {
    const result = await query(
        'SELECT * FROM tickets WHERE event_id = $1 AND status IN ($2, $3)',
        [eventId, 'paid', 'checkedIn']
    );
    return result.rows.map(row => rowToTicket(row, false));
};

module.exports = {
    getTicketById,
    updateTicket,
    getPaidTicketsByEventId,
    runTransaction,
    getTicketsByUserId,
    getTicketInTransaction,
    createTicketInTransaction,
    createTicket,
    updateTicketInTransaction,
    getAttendeeTicketsByEventId,
};
