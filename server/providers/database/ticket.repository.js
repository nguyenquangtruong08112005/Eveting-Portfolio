const providerName = process.env.TICKET_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
    activeRepository = require('./postgres.ticket.repository');
} else if (providerName === 'firebase') {
    activeRepository = require('./firebase.ticket.repository');
} else {
    throw new Error(`Database provider "${providerName}" is not supported for tickets.`);
}

module.exports = activeRepository;
