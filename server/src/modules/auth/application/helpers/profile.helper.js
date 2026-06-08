const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const authRepository = require('@/providers/database/postgres.auth.repository');
const userProfileRepository = require('@/providers/database/postgres.user.repository');

async function provisionAuthUserFromProfile(profile, requestedRole) {
  var profileRoles = profile.roles || ['attendee'];
  var authRoles = profileRoles.map(function (r) { return r === 'attendee' ? 'user' : r; });
  var safeRole = requestedRole || 'user';
  if (safeRole !== 'user' && authRoles.indexOf(safeRole) === -1) {
    authRoles.push(safeRole);
  }
  var unusablePassword = 'migrated:' + profile._id + ':' + Date.now() + ':' + Math.random();
  var passwordHash = await backendAuthProvider.hashPassword(unusablePassword);
  var uid = await authRepository.createUser({
    id: profile._id,
    email: profile.email,
    name: profile.name || '',
    passwordHash: passwordHash,
    roles: authRoles,
  });
  if (uid) {
    return await authRepository.findUserById(uid);
  }
  return await authRepository.findUserByEmail(profile.email);
}

async function ensureUserProfileForAuthUser(_a) {
  var id = _a.id, email = _a.email, name = _a.name, roles = _a.roles;
  var existing = await userProfileRepository.getUserDataById(id);
  if (existing) return;
  var profileRoles = (roles || []).map(function (r) { return r === 'user' ? 'attendee' : r; });
  await userProfileRepository.createUser(id, {
    id: id,
    email: email,
    name: name || '',
    profilePicUrl: '',
    coverPhotoUrl: null,
    bio: '',
    birthDate: null,
    roles: profileRoles,
    createdAt: Date.now(),
    followedProfileIds: [],
    historyEventIds: [],
    followersCount: 0,
    followingCount: 0,
    points: 0,
    level: 'bronze',
    matchingPreferences: { interests: [], ageRange: '18-25' },
    sharedMedia: [],
    fcmTokens: [],
  });
}

module.exports = { provisionAuthUserFromProfile, ensureUserProfileForAuthUser };
