var { query } = require('./postgres.client');
var socialHelper = require('./social.helper');
var { toDb, fromDb, nowDb } = require('./time.helper');

var FIELD_MAP = {
  name: 'name',
  profilePicUrl: 'profile_pic_url',
  coverPhotoUrl: 'cover_photo_url',
  bio: 'bio',
  birthDate: 'birth_date',
  createdAt: 'created_at',
  followersCount: 'followers_count',
  followingCount: 'following_count',
  points: 'points',
  level: 'level',
  organizerInfo: 'organizer_info',
  rawData: 'raw_data',
};

function rowToFirebaseDoc(row, includeId, extras) {
  if (!row) return null;
  extras = extras || {};
  var doc = {};
  if (includeId && row.id) doc.id = row.id;
  if (extras.email) doc.email = extras.email;
  if (row.name) doc.name = row.name;
  if (row.profile_pic_url) doc.profilePicUrl = row.profile_pic_url;
  if (row.cover_photo_url) doc.coverPhotoUrl = row.cover_photo_url;
  if (row.bio) doc.bio = row.bio;
  if (row.birth_date != null) doc.birthDate = fromDb(row.birth_date);
  if (extras.roles && extras.roles.length) doc.roles = extras.roles;
  if (row.created_at != null) doc.createdAt = fromDb(row.created_at);
  var followed = extras.followedProfileIds;
  if (followed && followed.length > 0) doc.followedProfileIds = followed;
  var history = extras.historyEventIds;
  if (history && history.length > 0) doc.historyEventIds = history;
  if (row.followers_count > 0) doc.followersCount = row.followers_count;
  if (row.following_count > 0) doc.followingCount = row.following_count;
  if (row.points > 0) doc.points = row.points;
  if (row.level && row.level !== 'bronze') doc.level = row.level;
  if (row.matching_preferences && typeof row.matching_preferences === 'object' && Object.keys(row.matching_preferences).length > 0) {
    doc.matchingPreferences = row.matching_preferences;
  }
  if (row.shared_media && Array.isArray(row.shared_media) && row.shared_media.length > 0) {
    doc.sharedMedia = row.shared_media;
  }
  var tokens = extras.fcmTokens;
  if (tokens && tokens.length > 0) doc.fcmTokens = tokens;
  if (row.organizer_info) doc.organizerInfo = row.organizer_info;
  if (row.raw_data) {
    doc = Object.assign({}, row.raw_data, doc);
  }
  return doc;
}

async function loadAuthExtras(userId) {
  var auth = await query('SELECT email, roles FROM auth_users WHERE id = $1', [userId]);
  if (auth.rows.length === 0) return { email: '', roles: [] };
  return {
    email: auth.rows[0].email || '',
    roles: auth.rows[0].roles || [],
  };
}

async function hydrateUserRow(row, includeId) {
  if (!row) return null;
  var client = { query: query };
  var followed = await socialHelper.loadFollowedProfileIds(client, row.id);
  var history = await socialHelper.loadHistoryEventIds(client, row.id);
  var tokens = await socialHelper.loadFcmTokens(client, row.id);
  var auth = await loadAuthExtras(row.id);
  return rowToFirebaseDoc(row, includeId, {
    followedProfileIds: followed,
    historyEventIds: history,
    fcmTokens: tokens,
    email: auth.email,
    roles: auth.roles,
  });
}

var getUserRoles = async function (userId) {
  var auth = await query('SELECT roles FROM auth_users WHERE id = $1', [userId]);
  if (auth.rows.length > 0 && auth.rows[0].roles && auth.rows[0].roles.length > 0) {
    return auth.rows[0].roles;
  }
  return [];
};

var getUsersFcmTokens = async function (userIds) {
  if (!userIds || userIds.length === 0) return { recipientIds: [], tokens: [] };
  var map = await socialHelper.loadFcmTokensForUsers({ query: query }, userIds);
  var recipientIds = [];
  var tokens = [];
  for (var i = 0; i < userIds.length; i++) {
    var uid = userIds[i];
    recipientIds.push(uid);
    var list = map[uid] || [];
    for (var k = 0; k < list.length; k++) tokens.push(list[k]);
  }
  return { recipientIds: recipientIds, tokens: tokens };
};

var createUser = async function (uid, userData) {
  var matchingPrefs = userData.matchingPreferences || {};
  var sharedMedia = userData.sharedMedia || [];
  var followedIds = userData.followedProfileIds || [];
  var historyIds = userData.historyEventIds || [];
  var fcmTokens = userData.fcmTokens || [];
  if (userData.fcmToken && fcmTokens.indexOf(userData.fcmToken) === -1) {
    fcmTokens.push(userData.fcmToken);
  }
  var rawData = Object.assign({}, userData);
  // strip auth-only fields from profile raw payload
  delete rawData.password;
  delete rawData.passwordHash;

  await query(
    `INSERT INTO user_profiles
       (id, name, profile_pic_url, cover_photo_url, bio, birth_date,
        created_at,
        followers_count, following_count, points, level,
        matching_preferences, shared_media, organizer_info, raw_data)
     VALUES ($1, $2, $3, $4, $5, $6,
             $7,
             $8, $9, $10, $11,
             $12, $13, $14, $15)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       profile_pic_url = EXCLUDED.profile_pic_url,
       cover_photo_url = EXCLUDED.cover_photo_url,
       bio = EXCLUDED.bio,
       birth_date = EXCLUDED.birth_date,
       followers_count = EXCLUDED.followers_count,
       following_count = EXCLUDED.following_count,
       points = EXCLUDED.points,
       level = EXCLUDED.level,
       matching_preferences = EXCLUDED.matching_preferences,
       shared_media = EXCLUDED.shared_media,
       organizer_info = EXCLUDED.organizer_info,
       raw_data = EXCLUDED.raw_data,
       updated_at = NOW()`,
    [
      uid,
      userData.name || '',
      userData.profilePicUrl || '',
      userData.coverPhotoUrl || '',
      userData.bio || '',
      toDb(userData.birthDate),
      toDb(userData.createdAt) || nowDb(),
      userData.followersCount != null ? Number(userData.followersCount) : 0,
      userData.followingCount != null ? Number(userData.followingCount) : 0,
      userData.points != null ? Number(userData.points) : 0,
      userData.level || 'bronze',
      JSON.stringify(matchingPrefs),
      JSON.stringify(sharedMedia),
      userData.organizerInfo ? JSON.stringify(userData.organizerInfo) : null,
      JSON.stringify(rawData),
    ]
  );

  // roles SoT is auth_users
  if (userData.roles && userData.roles.length) {
    var authRoles = userData.roles.map(function (r) { return r === 'attendee' ? 'user' : r; });
    await query(
      `UPDATE auth_users SET roles = $1, updated_at = NOW() WHERE id = $2`,
      [authRoles, uid]
    );
  }

  var client = { query: query };
  if (followedIds.length) await socialHelper.replaceFollows(client, uid, followedIds);
  if (historyIds.length) await socialHelper.replaceHistory(client, uid, historyIds);
  if (fcmTokens.length) await socialHelper.replaceDevices(client, uid, fcmTokens);
};

var getUserDataById = async function (userId) {
  var result = await query('SELECT * FROM user_profiles WHERE id = $1', [userId]);
  if (result.rows.length === 0) return null;
  return hydrateUserRow(result.rows[0], true);
};

var updateUser = async function (userId, updateData, fcmToken) {
  var sets = [];
  var params = [];
  var idx = 1;
  var client = { query: query };

  if (updateData && updateData.followedProfileIds) {
    await socialHelper.replaceFollows(client, userId, updateData.followedProfileIds);
  }
  if (updateData && updateData.historyEventIds) {
    await socialHelper.replaceHistory(client, userId, updateData.historyEventIds);
  }
  if (updateData && updateData.fcmTokens) {
    await socialHelper.replaceDevices(client, userId, updateData.fcmTokens);
  }

  // email / roles go to auth_users only
  if (updateData && updateData.email != null) {
    await query('UPDATE auth_users SET email = $1, updated_at = NOW() WHERE id = $2', [updateData.email, userId]);
  }
  if (updateData && updateData.roles) {
    var roles = updateData.roles.map(function (r) { return r === 'attendee' ? 'user' : r; });
    await query('UPDATE auth_users SET roles = $1, updated_at = NOW() WHERE id = $2', [roles, userId]);
  }

  for (var key in updateData) {
    if (key === 'followedProfileIds' || key === 'historyEventIds' || key === 'fcmTokens' || key === 'fcmToken' || key === 'email' || key === 'roles') {
      continue;
    }
    if (key === 'matchingPreferences.interests') {
      sets.push('matching_preferences = jsonb_set(COALESCE(matching_preferences, \'{}\'::jsonb), \'{interests}\', $' + idx + '::jsonb)');
      params.push(JSON.stringify(updateData[key]));
      idx++;
    } else if (key === 'matchingPreferences') {
      sets.push('matching_preferences = $' + idx);
      params.push(JSON.stringify(updateData[key]));
      idx++;
    } else if (key in FIELD_MAP) {
      var col = FIELD_MAP[key];
      sets.push(col + ' = $' + idx);
      if (col === 'birth_date' || col === 'created_at') {
        params.push(toDb(updateData[key]));
      } else {
        params.push(updateData[key]);
      }
      idx++;
    } else if (key === 'id' || key === 'address') {
      continue;
    } else {
      var snake = key.replace(/[A-Z]/g, function (m) { return '_' + m.toLowerCase(); });
      if (!/^[a-z0-9_]+$/.test(snake)) {
        throw new Error('Invalid column name: ' + key);
      }
      if (snake === 'email' || snake === 'roles' || snake === 'followed_profile_ids' || snake === 'history_event_ids' || snake === 'fcm_tokens') continue;
      sets.push(snake + ' = $' + idx);
      params.push(updateData[key]);
      idx++;
    }
  }

  if (fcmToken) {
    var existing = await socialHelper.loadFcmTokens(client, userId);
    if (existing.indexOf(fcmToken) === -1) existing.push(fcmToken);
    await socialHelper.replaceDevices(client, userId, existing);
  }

  var rawMerge = {};
  for (var key2 in updateData) {
    if (key2 === 'id') continue;
    rawMerge[key2] = updateData[key2];
  }
  if (Object.keys(rawMerge).length > 0) {
    sets.push('raw_data = COALESCE(raw_data, \'{}\'::jsonb) || $' + idx + '::jsonb');
    params.push(JSON.stringify(rawMerge));
    idx++;
  }

  if (sets.length === 0) return;

  sets.push('updated_at = NOW()');
  params.push(userId);
  await query(
    'UPDATE user_profiles SET ' + sets.join(', ') + ' WHERE id = $' + idx,
    params
  );
};

var addFcmToken = async function (userId, token) {
  var client = { query: query };
  var existing = await socialHelper.loadFcmTokens(client, userId);
  if (existing.indexOf(token) === -1) existing.push(token);
  await socialHelper.replaceDevices(client, userId, existing);
};

var removeFcmToken = async function (userId, token) {
  var client = { query: query };
  var existing = await socialHelper.loadFcmTokens(client, userId);
  existing = existing.filter(function (t) { return t !== token; });
  await socialHelper.replaceDevices(client, userId, existing);
};

var getEventsByIds = async function () {
  return [];
};

var followProfile = async function (userId, profileId) {
  var userResult = await query('SELECT id FROM user_profiles WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) throw new Error('User not found.');

  var existing = await query(
    'SELECT 1 FROM user_follows WHERE follower_id = $1 AND followee_id = $2',
    [userId, profileId]
  );
  if (existing.rows.length > 0) {
    return { alreadyFollowing: true };
  }

  var isFeatured = false;
  var profileResult = await query('SELECT id FROM featured_profiles WHERE id = $1', [profileId]);
  if (profileResult.rows.length > 0) {
    isFeatured = true;
  } else {
    profileResult = await query('SELECT id FROM user_profiles WHERE id = $1', [profileId]);
    if (profileResult.rows.length === 0) {
      throw new Error('Profile not found.');
    }
  }

  // Counters updated by DB trigger trg_user_follows_* (migration 052)
  await query(
    `INSERT INTO user_follows (follower_id, followee_id, created_at)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [userId, profileId, nowDb()]
  );
  return { alreadyFollowing: false };
};

var unfollowProfile = async function (userId, profileId) {
  var userResult = await query('SELECT id FROM user_profiles WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) throw new Error('User not found.');

  var existing = await query(
    'SELECT 1 FROM user_follows WHERE follower_id = $1 AND followee_id = $2',
    [userId, profileId]
  );
  if (existing.rows.length === 0) {
    return { notFollowing: true };
  }

  // Counters updated by DB trigger trg_user_follows_* (migration 052)
  await query(
    'DELETE FROM user_follows WHERE follower_id = $1 AND followee_id = $2',
    [userId, profileId]
  );
  return { notFollowing: false };
};

var getUsersByIds = async function (userIds) {
  if (!userIds || userIds.length === 0) return {};
  var placeholders = [];
  var params = [];
  for (var i = 0; i < userIds.length; i++) {
    placeholders.push('$' + (i + 1));
    params.push(userIds[i]);
  }
  var result = await query(
    'SELECT * FROM user_profiles WHERE id IN (' + placeholders.join(',') + ')',
    params
  );
  var map = {};
  for (var j = 0; j < result.rows.length; j++) {
    map[result.rows[j].id] = await hydrateUserRow(result.rows[j], false);
  }
  return map;
};

var findUserByEmail = async function (email) {
  var auth = await query(
    'SELECT id FROM auth_users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  if (auth.rows.length === 0) return null;
  var profile = await getUserDataById(auth.rows[0].id);
  if (!profile) {
    return { _id: auth.rows[0].id, email: email };
  }
  return Object.assign({ _id: auth.rows[0].id }, profile);
};

var getRawUserDataById = async function (userId) {
  return getUserDataById(userId);
};

var addOrganizerRoleToUser = async function (userId, organizerData) {
  var result = await query('SELECT raw_data, organizer_info FROM user_profiles WHERE id = $1', [userId]);
  if (result.rows.length === 0) return null;
  var row = result.rows[0];

  var existingCreatedAt = (row.organizer_info && row.organizer_info.createdAt) ||
                          (row.raw_data && row.raw_data.organizerInfo && row.raw_data.organizerInfo.createdAt);
  var createdAt = organizerData.createdAt || existingCreatedAt;

  var organizerInfo = {
    companyName: organizerData.companyName,
    taxCode: organizerData.taxCode || '',
    description: organizerData.description || '',
    website: organizerData.website || '',
  };
  if (createdAt !== undefined) {
    organizerInfo.createdAt = createdAt;
  }

  if (row.raw_data) {
    var rawData = Object.assign({}, row.raw_data);
    rawData.organizerInfo = Object.assign({}, organizerInfo);
    await query(
      `UPDATE user_profiles
       SET organizer_info = $1,
           raw_data = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(organizerInfo), JSON.stringify(rawData), userId]
    );
  } else {
    await query(
      `UPDATE user_profiles
       SET organizer_info = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(organizerInfo), userId]
    );
  }

  await query(
    `UPDATE auth_users
     SET roles = CASE
       WHEN 'organizer' = ANY(roles) THEN roles
       ELSE array_append(roles, 'organizer')
     END,
     updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );

  return getUserDataById(userId);
};

var updateUserFields = async function (userId, updateData) {
  return updateUser(userId, updateData);
};

var appendRoleToProfile = async function (userId, role) {
  var authRole = role === 'attendee' ? 'user' : role;
  await query(
    `UPDATE auth_users
     SET roles = CASE
       WHEN $2 = ANY(roles) THEN roles
       ELSE array_append(roles, $2)
     END,
     updated_at = NOW()
     WHERE id = $1`,
    [userId, authRole]
  );
};

var addHistoryEventIdInTransaction = async function (transaction, userId, eventId) {
  var client = (transaction && typeof transaction.query === 'function') ? transaction : { query: query };
  await client.query(
    `INSERT INTO user_event_history (user_id, event_id, source, attended_at)
     VALUES ($1, $2, 'attended', $3)
     ON CONFLICT (user_id, event_id) DO NOTHING`,
    [userId, eventId, nowDb()]
  );
};

module.exports = {
  getUserRoles: getUserRoles,
  getUsersFcmTokens: getUsersFcmTokens,
  createUser: createUser,
  getUserDataById: getUserDataById,
  updateUser: updateUser,
  addFcmToken: addFcmToken,
  removeFcmToken: removeFcmToken,
  getEventsByIds: getEventsByIds,
  followProfile: followProfile,
  unfollowProfile: unfollowProfile,
  getUsersByIds: getUsersByIds,
  findUserByEmail: findUserByEmail,
  getRawUserDataById: getRawUserDataById,
  addOrganizerRoleToUser: addOrganizerRoleToUser,
  updateUserFields: updateUserFields,
  appendRoleToProfile: appendRoleToProfile,
  addHistoryEventIdInTransaction: addHistoryEventIdInTransaction,
};
