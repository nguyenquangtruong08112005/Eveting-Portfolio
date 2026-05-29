const firebaseTicketRepository = require('./firebase.ticket.repository');
const postgresTicketRepository = require('./postgres.ticket.repository');

const repositories = {
    firebase: firebaseTicketRepository,
    postgres: postgresTicketRepository,
};

const providerName = process.env.TICKET_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for tickets.`);
}

module.exports = activeRepository;
