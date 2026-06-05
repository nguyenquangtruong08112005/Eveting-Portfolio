// providers/notification/onesignal.provider.js
// Android still requires FCM transport configured inside OneSignal dashboard.
// This removes direct backend FCM coupling only; the OneSignal SDK on Android
// still relies on FCM for delivery. iOS uses APNs via OneSignal directly.
const axios = require('axios');

const ONESIGNAL_BASE_URL = 'https://onesignal.com/api/v1';

const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
});

const validateEnv = () => {
    if (!process.env.ONESIGNAL_APP_ID) {
        throw new Error('ONESIGNAL_APP_ID environment variable is required');
    }
    if (!process.env.ONESIGNAL_REST_API_KEY) {
        throw new Error('ONESIGNAL_REST_API_KEY environment variable is required');
    }
};

const isExternalIdMode = () => {
    return (process.env.ONESIGNAL_TARGET_MODE || 'subscription') === 'external_id';
};

const sendMulticast = async (tokens, title, body, data = {}) => {
    if (!tokens) return;
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    if (tokenList.length === 0) return;
    validateEnv();

    const targetMode = process.env.ONESIGNAL_TARGET_MODE || 'subscription';

    const payload = {
        app_id: process.env.ONESIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: body },
        data,
    };

    if (targetMode === 'external_id') {
        payload.include_aliases = { external_id: tokenList };
        payload.target_channel = 'push';
    } else {
        payload.include_subscription_ids = tokenList;
    }

    try {
        const response = await axios.post(`${ONESIGNAL_BASE_URL}/notifications`, payload, { headers: headers() });
        console.log(`OneSignal multicast sent. ID: ${response.data.id}, recipients: ${response.data.recipients}`);
    } catch (error) {
        console.error('Error sending OneSignal multicast:', error.response?.data || error.message);
    }
};

const sendToTopic = async (topic, title, body, data = {}) => {
    validateEnv();

    if (isExternalIdMode()) {
        console.log(`OneSignal topic "${topic}" skipped because external id targeting is active.`);
        return;
    }

    const payload = {
        app_id: process.env.ONESIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: body },
        data,
        filters: [
            { field: 'tag', key: `topic_${topic}`, relation: 'exists' },
        ],
    };

    try {
        const response = await axios.post(`${ONESIGNAL_BASE_URL}/notifications`, payload, { headers: headers() });
        console.log(`OneSignal topic "${topic}" sent. ID: ${response.data.id}, recipients: ${response.data.recipients}`);
    } catch (error) {
        console.error(`Error sending OneSignal to topic "${topic}":`, error.response?.data || error.message);
    }
};

const subscribeToTopic = async (tokens, topic) => {
    if (!tokens) return;
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    if (tokenList.length === 0) return;
    validateEnv();

    if (isExternalIdMode()) {
        console.log(`OneSignal subscribeToTopic "${topic}" skipped because external id targeting is active.`);
        return;
    }

    const results = await Promise.allSettled(tokenList.map(token =>
        axios.put(`${ONESIGNAL_BASE_URL}/players/${token}`, {
            app_id: process.env.ONESIGNAL_APP_ID,
            tags: { [`topic_${topic}`]: true },
        }, { headers: headers() })
    ));

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;
    if (failures > 0) {
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'rejected') {
                console.error(`OneSignal subscribeToTopic failed for token ${tokenList[i]}:`, results[i].reason.response?.data || results[i].reason.message);
            }
        }
    }
    console.log(`OneSignal subscribeToTopic "${topic}": ${successes} succeeded, ${failures} failed`);
};

const unsubscribeFromTopic = async (tokens, topic) => {
    if (!tokens) return;
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    if (tokenList.length === 0) return;
    validateEnv();

    if (isExternalIdMode()) {
        console.log(`OneSignal unsubscribeFromTopic "${topic}" skipped because external id targeting is active.`);
        return;
    }

    const results = await Promise.allSettled(tokenList.map(token =>
        axios.put(`${ONESIGNAL_BASE_URL}/players/${token}`, {
            app_id: process.env.ONESIGNAL_APP_ID,
            tags: { [`topic_${topic}`]: '' },
        }, { headers: headers() })
    ));

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;
    if (failures > 0) {
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'rejected') {
                console.error(`OneSignal unsubscribeFromTopic failed for token ${tokenList[i]}:`, results[i].reason.response?.data || results[i].reason.message);
            }
        }
    }
    console.log(`OneSignal unsubscribeFromTopic "${topic}": ${successes} succeeded, ${failures} failed`);
};

module.exports = {
    sendMulticast,
    sendToTopic,
    subscribeToTopic,
    unsubscribeFromTopic,
};
