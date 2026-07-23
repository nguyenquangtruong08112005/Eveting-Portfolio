const { fcmService, helper: notifHelper } = require('@/modules/notifications');

const extractFcmTokens = (userData) => {
  let tokens = [];
  if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
    tokens = userData.fcmTokens;
  } else if (userData.fcmToken) {
    tokens.push(userData.fcmToken);
  }
  return tokens;
};

const syncTokenTopics = async (fcmToken, followedIds) => {
    if (notifHelper.shouldManageDeviceTopics()) {
        if (followedIds.length > 0) {
            const promises = followedIds.map(profileId => {
                const topicName = `artist_${profileId}`;
                return fcmService.subscribeToTopic(fcmToken, topicName);
            });
            await Promise.all(promises);
            console.log(`[Sync] Subscribed new token to ${followedIds.length} topics.`);
        }
    } else {
        console.log("[Sync] Skipped device topic sync because notification provider uses external id targeting.");
    }
};

const subscribeTokensToTopic = async (tokens, profileId) => {
    if (tokens.length > 0 && notifHelper.shouldManageDeviceTopics()) {
        const topicName = `artist_${profileId}`;
        await fcmService.subscribeToTopic(tokens, topicName);
    } else if (tokens.length > 0) {
        console.log(`[Follow] Skipped topic subscription for profile ${profileId}; external id targeting is active.`);
    }
};

const unsubscribeTokensFromTopic = async (tokens, profileId) => {
    if (tokens.length > 0 && notifHelper.shouldManageDeviceTopics()) {
        const topicName = `artist_${profileId}`;
        await fcmService.unsubscribeFromTopic(tokens, topicName);
    } else if (tokens.length > 0) {
        console.log(`[Unfollow] Skipped topic unsubscription for profile ${profileId}; external id targeting is active.`);
    }
};

module.exports = { extractFcmTokens, syncTokenTopics, subscribeTokensToTopic, unsubscribeTokensFromTopic };
