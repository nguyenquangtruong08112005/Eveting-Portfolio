const { db } = require('../../config/firebase.config');

const getTicketById = async (ticketId) => {
    const ticketRef = db.collection('Tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();
    if (!ticketDoc.exists) return null;
    return { id: ticketDoc.id, ...ticketDoc.data() };
};

const updateTicket = async (ticketId, updates) => {
    const ticketRef = db.collection('Tickets').doc(ticketId);
    await ticketRef.update(updates);
};

const getPaidTicketsByEventId = async (eventId) => {
    const snapshot = await db.collection('Tickets')
        .where('eventId', '==', eventId)
        .where('status', '==', 'paid')
        .get();
    return snapshot.docs.map(doc => doc.data());
};

const runTransaction = (callback) => {
    return db.runTransaction(callback);
};

const getTicketsByUserId = async (userId) => {
    const snapshot = await db.collection('Tickets')
        .where('userId', '==', userId)
        .get();
    const tickets = [];
    snapshot.forEach(doc => {
        tickets.push({ id: doc.id, ...doc.data() });
    });
    return tickets;
};

const getTicketInTransaction = async (transaction, ticketId) => {
    const doc = await transaction.get(db.collection('Tickets').doc(ticketId));
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
};

const createTicketInTransaction = (transaction, ticketId, ticketData) => {
    transaction.set(db.collection('Tickets').doc(ticketId), ticketData);
};

const updateTicketInTransaction = (transaction, ticketId, updates) => {
    transaction.update(db.collection('Tickets').doc(ticketId), updates);
};

module.exports = {
    getTicketById,
    updateTicket,
    getPaidTicketsByEventId,
    runTransaction,
    getTicketsByUserId,
    getTicketInTransaction,
    createTicketInTransaction,
    updateTicketInTransaction,
};
