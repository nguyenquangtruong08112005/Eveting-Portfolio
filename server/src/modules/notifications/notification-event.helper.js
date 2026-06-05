const { v4: uuidv4 } = require('uuid');
const userRepository = require('../../providers/database/user.repository');

const TOPIC_PREFIX = { artist: 'artist_', organizer: 'organizer_', event: 'event_' };

const buildTopicName = (prefix, id) => {
  const p = TOPIC_PREFIX[prefix];
  return p ? `${p}${id}` : id;
};

const buildPayloadData = (type, eventId, extra = {}) => {
  return { eventId, type, ...extra };
};

const isOneSignalExternalId = () => {
  return process.env.NOTIFICATION_PROVIDER === 'onesignal' && process.env.ONESIGNAL_TARGET_MODE === 'external_id';
};

const shouldManageDeviceTopics = () => {
  return !isOneSignalExternalId();
};

const collectMessagingTargets = async (userIds) => {
  const result = await userRepository.getUsersFcmTokens(userIds);
  if (isOneSignalExternalId()) {
    return {
      recipientIds: result.recipientIds,
      tokens: result.recipientIds
    };
  }
  return result;
};

const collectTokens = async (userIds) => {
  const result = await userRepository.getUsersFcmTokens(userIds);
  if (isOneSignalExternalId()) {
    return result.recipientIds;
  }
  return result.tokens;
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
  buildNotificationDoc,
  isOneSignalExternalId,
  shouldManageDeviceTopics
};
