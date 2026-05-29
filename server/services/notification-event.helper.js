const { v4: uuidv4 } = require('uuid');
const userRepository = require('../providers/database/user.repository');

const TOPIC_PREFIX = { artist: 'artist_', organizer: 'organizer_', event: 'event_' };

const buildTopicName = (prefix, id) => {
  const p = TOPIC_PREFIX[prefix];
  return p ? `${p}${id}` : id;
};

const buildPayloadData = (type, eventId, extra = {}) => {
  return { eventId, type, ...extra };
};

const collectMessagingTargets = async (userIds) => {
  return userRepository.getUsersFcmTokens(userIds);
};

const collectTokens = async (userIds) => {
  const { tokens } = await userRepository.getUsersFcmTokens(userIds);
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
