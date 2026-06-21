var { query } = require('./postgres.client');

var FIELD_MAP = {
  name: 'name',
  email: 'email',
  profilePicUrl: 'profile_pic_url',
  coverPhotoUrl: 'cover_photo_url',
  bio: 'bio',
  birthDate: 'birth_date',
  createdAt: 'created_at',
  followersCount: 'followers_count',
  followingCount: 'following_count',
  points: 'points',
  level: 'level',
  fcmTokens: 'fcm_tokens',
  followedProfileIds: 'followed_profile_ids',
  historyEventIds: 'history_event_ids',
  organizerInfo: 'organizer_info',
  rawData: 'raw_data',
};

function rowToFirebaseDoc(row, includeId) {
  if (!row) return null;
  var doc = {};
  if (includeId && row.id) doc.id = row.id;
  if (row.email) doc.email = row.email;
  if (row.name) doc.name = row.name;
  if (row.profile_pic_url) doc.profilePicUrl = row.profile_pic_url;
  if (row.cover_photo_url) doc.coverPhotoUrl = row.cover_photo_url;
  if (row.bio) doc.bio = row.bio;
  if (row.birth_date != null) doc.birthDate = Number(row.birth_date);
  if (row.roles && (row.roles.length !== 1 || row.roles[0] !== 'attendee')) doc.roles = row.roles;
  if (row.created_at != null) doc.createdAt = Number(row.created_at);
  if (row.followed_profile_ids && row.followed_profile_ids.length > 0) doc.followedProfileIds = row.followed_profile_ids;
  if (row.history_event_ids && row.history_event_ids.length > 0) doc.historyEventIds = row.history_event_ids;
  if (row.followers_count > 0) doc.followersCount = row.followers_count;
  if (row.following_count > 0) doc.followingCount = row.following_count;
  if (row.points > 0) doc.points = row.points;
  if (row.level && row.level !== 'bronze') doc.level = row.level;
  if (row.matching_preferences && typeof row.matching_preferences === 'object' && Object.keys(row.matching_preferences).length > 0) doc.matchingPreferences = row.matching_preferences;
  if (row.shared_media && Array.isArray(row.shared_media) && row.shared_media.length > 0) doc.sharedMedia = row.shared_media;
  if (row.fcm_tokens && row.fcm_tokens.length > 0) doc.fcmTokens = row.fcm_tokens;
  if (row.organizer_info) doc.organizerInfo = row.organizer_info;
  if (row.raw_data) {
    doc = { ...doc, ...row.raw_data };
  }
  return doc;
}

var getUserRoles = async function (userId) {
  var result = await query(
    'SELECT roles FROM user_profiles WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) return [];
  var roles = result.rows[0].roles;
  return roles && roles.length > 0 ? roles : [];
};

var getUsersFcmTokens = async function (userIds) {
  if (!userIds || userIds.length === 0) return { recipientIds: [], tokens: [] };
  var placeholders = [];
  var params = [];
  for (var i = 0; i < userIds.length; i++) {
    placeholders.push('$' + (i + 1));
    params.push(userIds[i]);
  }
  var result = await query(
    'SELECT id, fcm_tokens FROM user_profiles WHERE id IN (' + placeholders.join(',') + ')',
    params
  );
  var recipientIds = [];
  var tokens = [];
  for (var j = 0; j < result.rows.length; j++) {
    var row = result.rows[j];
    recipientIds.push(row.id);
    if (row.fcm_tokens && row.fcm_tokens.length > 0) {
      for (var k = 0; k < row.fcm_tokens.length; k++) {
        tokens.push(row.fcm_tokens[k]);
      }
    }
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
  await query(
    `INSERT INTO user_profiles
       (id, email, name, profile_pic_url, cover_photo_url, bio, birth_date,
        roles, created_at, followed_profile_ids, history_event_ids,
        followers_count, following_count, points, level,
        matching_preferences, shared_media, fcm_tokens, organizer_info, raw_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7,
             $8, $9, $10, $11,
             $12, $13, $14, $15,
             $16, $17, $18, $19, $20)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       profile_pic_url = EXCLUDED.profile_pic_url,
       cover_photo_url = EXCLUDED.cover_photo_url,
       bio = EXCLUDED.bio,
       birth_date = EXCLUDED.birth_date,
       roles = EXCLUDED.roles,
       followed_profile_ids = EXCLUDED.followed_profile_ids,
       history_event_ids = EXCLUDED.history_event_ids,
       followers_count = EXCLUDED.followers_count,
       following_count = EXCLUDED.following_count,
       points = EXCLUDED.points,
       level = EXCLUDED.level,
       matching_preferences = EXCLUDED.matching_preferences,
       shared_media = EXCLUDED.shared_media,
       fcm_tokens = EXCLUDED.fcm_tokens,
       organizer_info = EXCLUDED.organizer_info,
       raw_data = EXCLUDED.raw_data,
       updated_at = NOW()`,
    [
      uid,
      userData.email || '',
      userData.name || '',
      userData.profilePicUrl || '',
      userData.coverPhotoUrl || '',
      userData.bio || '',
      userData.birthDate != null ? Number(userData.birthDate) : null,
      userData.roles || ['attendee'],
      userData.createdAt != null ? Number(userData.createdAt) : Date.now(),
      followedIds,
      historyIds,
      userData.followersCount != null ? Number(userData.followersCount) : 0,
      userData.followingCount != null ? Number(userData.followingCount) : 0,
      userData.points != null ? Number(userData.points) : 0,
      userData.level || 'bronze',
      JSON.stringify(matchingPrefs),
      JSON.stringify(sharedMedia),
      fcmTokens,
      userData.organizerInfo ? JSON.stringify(userData.organizerInfo) : null,
      JSON.stringify(rawData),
    ]
  );
};

var getUserDataById = async function (userId) {
  var result = await query('SELECT * FROM user_profiles WHERE id = $1', [userId]);
  if (result.rows.length === 0) return null;
  return rowToFirebaseDoc(result.rows[0], true);
};

var updateUser = async function (userId, updateData, fcmToken) {
  var sets = [];
  var params = [];
  var idx = 1;

  for (var key in updateData) {
    if (key === 'matchingPreferences.interests') {
      sets.push('matching_preferences = jsonb_set(COALESCE(matching_preferences, \'{}\'::jsonb), \'{interests}\', $' + idx + '::jsonb)');
      params.push(JSON.stringify(updateData[key]));
      idx++;
    } else if (key === 'matchingPreferences') {
      sets.push('matching_preferences = $' + idx);
      params.push(JSON.stringify(updateData[key]));
      idx++;
    } else if (key in FIELD_MAP) {
      sets.push(FIELD_MAP[key] + ' = $' + idx);
      params.push(updateData[key]);
      idx++;
    } else if (key === 'id') {
      continue;
    } else if (key === 'address') {
      // raw_data-only field, no column update needed
    } else {
      // attempt direct snake_case conversion
      var snake = key.replace(/[A-Z]/g, function (m) { return '_' + m.toLowerCase(); });
      if (!/^[a-z0-9_]+$/.test(snake)) {
        throw new Error('Invalid column name: ' + key);
      }
      sets.push(snake + ' = $' + idx);
      params.push(updateData[key]);
      idx++;
    }
  }

  if (fcmToken) {
    sets.push('fcm_tokens = array_append(COALESCE(fcm_tokens, ARRAY[]::text[]), $' + idx + ')');
    params.push(fcmToken);
    idx++;
  }

  var rawMerge = {};
  for (var key in updateData) {
    if (key === 'id') continue;
    rawMerge[key] = updateData[key];
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
  await query(
    'UPDATE user_profiles SET fcm_tokens = array_append(COALESCE(fcm_tokens, ARRAY[]::text[]), $1), updated_at = NOW() WHERE id = $2',
    [token, userId]
  );
};

var removeFcmToken = async function (userId, token) {
  await query(
    'UPDATE user_profiles SET fcm_tokens = array_remove(COALESCE(fcm_tokens, ARRAY[]::text[]), $1), updated_at = NOW() WHERE id = $2',
    [token, userId]
  );
};

var getEventsByIds = async function (eventIds) {
  if (!eventIds || eventIds.length === 0) return [];
  return [];
};

var followProfile = async function (userId, profileId) {
  var userResult = await query('SELECT followed_profile_ids FROM user_profiles WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) throw new Error('User not found.');
  var followed = userResult.rows[0].followed_profile_ids || [];
  if (followed.indexOf(profileId) !== -1) {
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
  await query(
    'UPDATE user_profiles SET followed_profile_ids = array_append(followed_profile_ids, $1), following_count = following_count + 1, updated_at = NOW() WHERE id = $2',
    [profileId, userId]
  );
  if (isFeatured) {
    await query(
      'UPDATE featured_profiles SET follower_count = follower_count + 1, updated_at = NOW() WHERE id = $1',
      [profileId]
    );
  } else {
    await query(
      'UPDATE user_profiles SET followers_count = followers_count + 1, updated_at = NOW() WHERE id = $1',
      [profileId]
    );
  }
  return { alreadyFollowing: false };
};

var unfollowProfile = async function (userId, profileId) {
  var userResult = await query('SELECT followed_profile_ids FROM user_profiles WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) throw new Error('User not found.');
  var followed = userResult.rows[0].followed_profile_ids || [];
  if (followed.indexOf(profileId) === -1) {
    return { notFollowing: true };
  }
  await query(
    'UPDATE user_profiles SET followed_profile_ids = array_remove(followed_profile_ids, $1), following_count = GREATEST(following_count - 1, 0), updated_at = NOW() WHERE id = $2',
    [profileId, userId]
  );
  var profileResult = await query('SELECT id FROM featured_profiles WHERE id = $1', [profileId]);
  if (profileResult.rows.length > 0) {
    await query(
      'UPDATE featured_profiles SET follower_count = GREATEST(follower_count - 1, 0), updated_at = NOW() WHERE id = $1',
      [profileId]
    );
  } else {
    profileResult = await query('SELECT id FROM user_profiles WHERE id = $1', [profileId]);
    if (profileResult.rows.length > 0) {
      await query(
        'UPDATE user_profiles SET followers_count = GREATEST(followers_count - 1, 0), updated_at = NOW() WHERE id = $1',
        [profileId]
      );
    }
  }
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
    var doc = rowToFirebaseDoc(result.rows[j], false);
    map[result.rows[j].id] = doc;
  }
  return map;
};

var findUserByEmail = async function (email) {
  var result = await query(
    'SELECT * FROM user_profiles WHERE email = $1 LIMIT 1',
    [email]
  );
  if (result.rows.length === 0) return null;
  var row = result.rows[0];
  return { _id: row.id, ...rowToFirebaseDoc(row, false) };
};

var getRawUserDataById = async function (userId) {
  var result = await query('SELECT * FROM user_profiles WHERE id = $1', [userId]);
  if (result.rows.length === 0) return null;
  return rowToFirebaseDoc(result.rows[0], false);
};

var addOrganizerRoleToUser = async function (userId, organizerData) {
  var result = await query('SELECT roles, raw_data, organizer_info FROM user_profiles WHERE id = $1', [userId]);
  if (result.rows.length === 0) return null;
  var row = result.rows[0];

  var roles = row.roles || [];
  if (roles.indexOf('organizer') === -1) {
    roles.push('organizer');
  }
  roles = roles.filter(function (item, pos, self) {
    return self.indexOf(item) === pos;
  });

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
    var rawData = { ...row.raw_data };
    var rawRoles = rawData.roles || [];
    if (rawRoles.indexOf('organizer') === -1) {
      rawRoles.push('organizer');
    }
    rawRoles = rawRoles.filter(function (item, pos, self) {
      return self.indexOf(item) === pos;
    });
    rawData.roles = rawRoles;
    rawData.organizerInfo = { ...organizerInfo };

    await query(
      `UPDATE user_profiles
       SET roles = $1,
           organizer_info = $2,
           raw_data = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [roles, JSON.stringify(organizerInfo), JSON.stringify(rawData), userId]
    );
  } else {
    await query(
      `UPDATE user_profiles
       SET roles = $1,
           organizer_info = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [roles, JSON.stringify(organizerInfo), userId]
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

  var updated = await getUserDataById(userId);
  return updated;
};

var updateUserFields = async function (userId, updateData) {
  var keys = Object.keys(updateData);
  if (keys.length === 0) return;
  var sets = [];
  var params = [];
  var idx = 1;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    // Handle Firestore-style dot notation for JSONB fields, e.g. organizerInfo.description
    var dotIdx = key.indexOf('.');
    if (dotIdx > 0) {
      var topKey = key.substring(0, dotIdx);
      var nestedKey = key.substring(dotIdx + 1);
      if (topKey in FIELD_MAP) {
        var col = FIELD_MAP[topKey];
        var path = '{' + nestedKey.split('.').join(',') + '}';
        sets.push(col + ' = jsonb_set(COALESCE(' + col + ', \'{}\'::jsonb), \'' + path + '\', $' + idx + '::jsonb)');
        params.push(JSON.stringify(updateData[key]));
        idx++;
      }
      continue;
    }
    if (key in FIELD_MAP) {
      sets.push(FIELD_MAP[key] + ' = $' + idx);
      params.push(updateData[key]);
    } else if (key === 'id' || key === 'address') {
      // id is excluded from rawMerge, address is raw_data-only
      continue;
    } else {
      var snake = key.replace(/[A-Z]/g, function (m) { return '_' + m.toLowerCase(); });
      if (!/^[a-z0-9_]+$/.test(snake)) {
        throw new Error('Invalid column name: ' + key);
      }
      sets.push(snake + ' = $' + idx);
      params.push(updateData[key]);
    }
    idx++;
  }
  var rawMerge = {};
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key === 'id' || key.indexOf('.') > 0) continue;
    rawMerge[key] = updateData[key];
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

var appendRoleToProfile = async function (userId, role) {
  await query(
    `UPDATE user_profiles
     SET roles = CASE
       WHEN $2 = ANY(roles) THEN roles
       ELSE array_append(roles, $2)
     END,
     updated_at = NOW()
     WHERE id = $1`,
    [userId, role]
  );
};

var addHistoryEventIdInTransaction = async function (transaction, userId, eventId) {
  await query(
    `UPDATE user_profiles
     SET history_event_ids = array_append(COALESCE(history_event_ids, ARRAY[]::text[]), $1),
         updated_at = NOW()
     WHERE id = $2`,
    [eventId, userId]
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
