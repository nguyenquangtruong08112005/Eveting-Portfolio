const providerName = process.env.VENUE_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
    activeRepository = require('./postgres.venue.repository');
} else if (providerName === 'firebase') {
    activeRepository = require('./firebase.venue.repository');
} else {
    throw new Error(`Database provider "${providerName}" is not supported for venues.`);
}

const { validateAdapter } = require('./venue.contract');
validateAdapter(activeRepository);

module.exports = activeRepository;
