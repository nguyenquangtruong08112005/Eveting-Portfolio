const firebaseUserRepository = require('./firebase.user.repository');

const repositories = {
  firebase: firebaseUserRepository,
};

const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
  throw new Error(`Database provider "${providerName}" is not supported for users.`);
}

module.exports = activeRepository;
