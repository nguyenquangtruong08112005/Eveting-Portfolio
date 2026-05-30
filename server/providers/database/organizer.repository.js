const providerName = process.env.ORGANIZER_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
  activeRepository = require('./postgres.organizer.repository');
} else if (providerName === 'firebase') {
  activeRepository = require('./firebase.organizer.repository');
} else {
  throw new Error(`Database provider "${providerName}" is not supported for organizers.`);
}

module.exports = activeRepository;
