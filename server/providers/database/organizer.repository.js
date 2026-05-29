const firebaseOrganizerRepository = require('./firebase.organizer.repository');
const postgresOrganizerRepository = require('./postgres.organizer.repository');

const repositories = {
  firebase: firebaseOrganizerRepository,
  postgres: postgresOrganizerRepository,
};

const providerName = process.env.ORGANIZER_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
  throw new Error(`Database provider "${providerName}" is not supported for organizers.`);
}

module.exports = activeRepository;
