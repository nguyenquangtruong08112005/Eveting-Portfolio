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

module.exports = {
    getTicketById,
    updateTicket,
};
