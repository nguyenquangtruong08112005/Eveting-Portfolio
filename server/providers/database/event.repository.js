const providerName = process.env.EVENT_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
    activeRepository = require('./postgres.event.repository');
} else if (providerName === 'firebase') {
    activeRepository = require('./firebase.event.repository');
} else {
    throw new Error(`Database provider "${providerName}" is not supported for events.`);
}

module.exports = activeRepository;
