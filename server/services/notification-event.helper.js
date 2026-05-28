const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase.config');
const admin = require('firebase-admin');

const TOPIC_PREFIX = { artist: 'artist_', organizer: 'organizer_', event: 'event_' };

const buildTopicName = (prefix, id) => {
  const p = TOPIC_PREFIX[prefix];
  return p ? `${p}${id}` : id;
};

const buildPayloadData = (type, eventId, extra = {}) => {
  return { eventId, type, ...extra };
};

const collectMessagingTargets = async (userIds) => {
  const tokens = [];
  const recipientIds = [];
  const CHUNK_SIZE = 10;
  for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + CHUNK_SIZE);
    const userDocs = await db.collection('Users')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    userDocs.forEach(doc => {
      recipientIds.push(doc.id);
      const d = doc.data();
      if (d.fcmTokens && Array.isArray(d.fcmTokens)) tokens.push(...d.fcmTokens);
      else if (d.fcmToken) tokens.push(d.fcmToken);
    });
  }
  return { recipientIds, tokens };
};

const collectTokens = async (userIds) => {
  const { tokens } = await collectMessagingTargets(userIds);
  return tokens;
};

const buildNotificationDoc = (userId, title, message, type, eventId = null) => ({
  id: `notif_${uuidv4()}`,
  userId,
  title,
  message,
  type,
  eventId,
  isRead: false,
  createdAt: new Date().getTime()
});

module.exports = {
  buildTopicName,
  buildPayloadData,
  collectMessagingTargets,
  collectTokens,
  buildNotificationDoc
};
