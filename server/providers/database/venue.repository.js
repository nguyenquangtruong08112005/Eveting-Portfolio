const firebaseVenueRepository = require('./firebase.venue.repository');
const { validateAdapter } = require('./venue.contract');

const repositories = {
    firebase: firebaseVenueRepository,
};

const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for venues.`);
}

validateAdapter(activeRepository);

module.exports = activeRepository;
