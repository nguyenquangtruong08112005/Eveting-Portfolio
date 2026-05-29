const firebaseTicketRepository = require('./firebase.ticket.repository');

const repositories = {
    firebase: firebaseTicketRepository,
};

const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for tickets.`);
}

module.exports = activeRepository;
