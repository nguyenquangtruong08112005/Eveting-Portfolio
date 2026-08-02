const axios = require('axios');

const mockOnesignal = {
  appId: 'test-app-id',
  restApiKey: 'test-api-key',
  targetMode: 'subscription',
};

jest.mock('@/shared/config/env.config', () => ({
  onesignal: mockOnesignal,
}));

jest.mock('axios');

const {
  sendMulticast,
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
} = require('@/providers/notification/onesignal.provider');

const BASE = 'https://onesignal.com/api/v1';

let logSpy, errSpy;

beforeEach(() => {
  mockOnesignal.appId = 'test-app-id';
  mockOnesignal.restApiKey = 'test-api-key';
  mockOnesignal.targetMode = 'subscription';
  jest.clearAllMocks();
  logSpy = jest.spyOn(console, 'log').mockImplementation();
  errSpy = jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  logSpy.mockRestore();
  errSpy.mockRestore();
});

function expectHeaders(call) {
  expect(call[2].headers).toEqual({
    'Content-Type': 'application/json',
    Authorization: 'Key test-api-key',
  });
}

// ---- sendMulticast ----

describe('sendMulticast', () => {
  it('returns undefined when tokens is null', async () => {
    expect(await sendMulticast(null, 't', 'b')).toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('returns undefined when tokens is undefined', async () => {
    expect(await sendMulticast(undefined, 't', 'b')).toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('returns undefined when tokens is empty array', async () => {
    expect(await sendMulticast([], 't', 'b')).toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('throws when ONESIGNAL_APP_ID is missing', async () => {
    mockOnesignal.appId = undefined;
    await expect(sendMulticast('tok', 't', 'b')).rejects.toThrow('ONESIGNAL_APP_ID');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('throws when ONESIGNAL_REST_API_KEY is missing', async () => {
    mockOnesignal.restApiKey = undefined;
    await expect(sendMulticast('tok', 't', 'b')).rejects.toThrow('ONESIGNAL_REST_API_KEY');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('sends correct subscription-mode payload with single token string', async () => {
    axios.post.mockResolvedValue({ data: { id: 'n1', recipients: 1 } });
    await sendMulticast('tok1', 'Hello', 'Body', { k: 'v' });
    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, payload, opts] = axios.post.mock.calls[0];
    expect(url).toBe(`${BASE}/notifications`);
    expect(payload).toEqual({
      app_id: 'test-app-id',
      headings: { en: 'Hello' },
      contents: { en: 'Body' },
      data: { k: 'v' },
      include_subscription_ids: ['tok1'],
    });
    expectHeaders(axios.post.mock.calls[0]);
  });

  it('sends correct subscription-mode payload with token array', async () => {
    axios.post.mockResolvedValue({ data: { id: 'n2', recipients: 2 } });
    await sendMulticast(['tok1', 'tok2'], 'Hi', 'Msg');
    const payload = axios.post.mock.calls[0][1];
    expect(payload.include_subscription_ids).toEqual(['tok1', 'tok2']);
  });

  it('sends correct external-id mode payload', async () => {
    mockOnesignal.targetMode = 'external_id';
    axios.post.mockResolvedValue({ data: { id: 'n3', recipients: 5 } });
    await sendMulticast(['ext1', 'ext2'], 'Alert', 'Test');
    const payload = axios.post.mock.calls[0][1];
    expect(payload.include_aliases).toEqual({ external_id: ['ext1', 'ext2'] });
    expect(payload.target_channel).toBe('push');
    expect(payload.include_subscription_ids).toBeUndefined();
  });

  it('preserves data payload fields exactly', async () => {
    axios.post.mockResolvedValue({ data: { id: 'n4', recipients: 1 } });
    const data = { type: 'order', orderId: 42, deepLink: '/orders/42' };
    await sendMulticast('tok', 'Title', 'Body', data);
    expect(axios.post.mock.calls[0][1].data).toEqual(data);
  });

  it('adds Authorization header with Key prefix', async () => {
    axios.post.mockResolvedValue({ data: { id: 'n1', recipients: 1 } });
    await sendMulticast('tok', 't', 'b');
    expectHeaders(axios.post.mock.calls[0]);
  });

  it('logs success id and recipients on response', async () => {
    axios.post.mockResolvedValue({ data: { id: 'n99', recipients: 3 } });
    await sendMulticast('tok', 't', 'b');
    expect(logSpy).toHaveBeenCalledWith('OneSignal multicast sent. ID: n99, recipients: 3');
  });

  it('logs error response data on API error', async () => {
    const apiErr = new Error('Bad Request');
    apiErr.response = { data: { errors: ['invalid app_id'] } };
    axios.post.mockRejectedValue(apiErr);
    await sendMulticast('tok', 't', 'b');
    expect(errSpy).toHaveBeenCalledWith(
      'Error sending OneSignal multicast:',
      { errors: ['invalid app_id'] },
    );
  });

  it('logs error.message on network failure (no response)', async () => {
    axios.post.mockRejectedValue(new Error('ECONNREFUSED'));
    await sendMulticast('tok', 't', 'b');
    expect(errSpy).toHaveBeenCalledWith(
      'Error sending OneSignal multicast:',
      'ECONNREFUSED',
    );
  });

  it('handles malformed success response (response.data is {})', async () => {
    axios.post.mockResolvedValue({ data: {} });
    await sendMulticast('tok', 't', 'b');
    expect(logSpy).toHaveBeenCalledWith('OneSignal multicast sent. ID: undefined, recipients: undefined');
  });
});

// ---- sendToTopic ----

describe('sendToTopic', () => {
  it('throws when appId missing', async () => {
    mockOnesignal.appId = undefined;
    await expect(sendToTopic('news', 't', 'b')).rejects.toThrow('ONESIGNAL_APP_ID');
  });

  it('skips and logs when externalIdMode is active', async () => {
    mockOnesignal.targetMode = 'external_id';
    await sendToTopic('news', 't', 'b');
    expect(logSpy).toHaveBeenCalledWith('OneSignal topic "news" skipped because external id targeting is active.');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('sends correct payload with filters', async () => {
    axios.post.mockResolvedValue({ data: { id: 't1', recipients: 10 } });
    await sendToTopic('promotions', 'Sale', '50% off', { ref: 'summer' });
    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, payload] = axios.post.mock.calls[0];
    expect(url).toBe(`${BASE}/notifications`);
    expect(payload).toEqual({
      app_id: 'test-app-id',
      headings: { en: 'Sale' },
      contents: { en: '50% off' },
      data: { ref: 'summer' },
      filters: [
        { field: 'tag', key: 'topic_promotions', relation: 'exists' },
      ],
    });
  });

  it('adds Authorization header', async () => {
    axios.post.mockResolvedValue({ data: { id: 't2', recipients: 0 } });
    await sendToTopic('test', 't', 'b');
    expectHeaders(axios.post.mock.calls[0]);
  });

  it('logs success on response', async () => {
    axios.post.mockResolvedValue({ data: { id: 't3', recipients: 7 } });
    await sendToTopic('topic1', 'T', 'B');
    expect(logSpy).toHaveBeenCalledWith('OneSignal topic "topic1" sent. ID: t3, recipients: 7');
  });

  it('logs error with response data on API error', async () => {
    const apiErr = new Error('Forbidden');
    apiErr.response = { data: { message: 'auth failed' } };
    axios.post.mockRejectedValue(apiErr);
    await sendToTopic('secure', 'T', 'B');
    expect(errSpy).toHaveBeenCalledWith(
      'Error sending OneSignal to topic "secure":',
      { message: 'auth failed' },
    );
  });

  it('logs error.message when no error response', async () => {
    axios.post.mockRejectedValue(new Error('ETIMEDOUT'));
    await sendToTopic('slow', 'T', 'B');
    expect(errSpy).toHaveBeenCalledWith(
      'Error sending OneSignal to topic "slow":',
      'ETIMEDOUT',
    );
  });
});

// ---- subscribeToTopic ----

describe('subscribeToTopic', () => {
  it('returns undefined when tokens is null', async () => {
    expect(await subscribeToTopic(null, 'topic1')).toBeUndefined();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('returns undefined when tokens is empty array', async () => {
    expect(await subscribeToTopic([], 'topic1')).toBeUndefined();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('throws when appId missing', async () => {
    mockOnesignal.appId = undefined;
    await expect(subscribeToTopic('tok', 't')).rejects.toThrow('ONESIGNAL_APP_ID');
  });

  it('skips and logs when externalIdMode is active', async () => {
    mockOnesignal.targetMode = 'external_id';
    await subscribeToTopic('tok', 'news');
    expect(logSpy).toHaveBeenCalledWith(
      'OneSignal subscribeToTopic "news" skipped because external id targeting is active.',
    );
    expect(axios.put).not.toHaveBeenCalled();

  });

  it('calls axios.put once per token with correct payload', async () => {
    axios.put.mockResolvedValue({ data: { success: true } });
    await subscribeToTopic(['tok1', 'tok2'], 'promos');
    expect(axios.put).toHaveBeenCalledTimes(2);
    const [url1, payload1] = axios.put.mock.calls[0];
    expect(url1).toBe(`${BASE}/players/tok1`);
    expect(payload1).toEqual({
      app_id: 'test-app-id',
      tags: { topic_promos: true },
    });
    expectHeaders(axios.put.mock.calls[0]);

    const [url2, payload2] = axios.put.mock.calls[1];
    expect(url2).toBe(`${BASE}/players/tok2`);
    expect(payload2).toEqual({
      app_id: 'test-app-id',
      tags: { topic_promos: true },
    });
  });

  it('wraps single string token into array', async () => {
    axios.put.mockResolvedValue({ data: { success: true } });
    await subscribeToTopic('singletok', 't');
    expect(axios.put).toHaveBeenCalledTimes(1);
    expect(axios.put.mock.calls[0][0]).toBe(`${BASE}/players/singletok`);
  });

  it('logs success count when all fulfilled', async () => {

    axios.put.mockResolvedValue({ data: { success: true } });
    await subscribeToTopic(['a', 'b'], 't');
    expect(logSpy).toHaveBeenCalledWith('OneSignal subscribeToTopic "t": 2 succeeded, 0 failed');
  });

  it('logs error for each failed token when some reject', async () => {
    axios.put
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce(new Error('not found'));
    await subscribeToTopic(['ok', 'bad'], 't');
    expect(errSpy).toHaveBeenCalledWith(
      'OneSignal subscribeToTopic failed for token bad:',
      'not found',
    );
  });

  it('logs partial success/failure counts', async () => {
    axios.put
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce(new Error('fail'));
    await subscribeToTopic(['a', 'b', 'c'], 't');
    expect(logSpy).toHaveBeenCalledWith('OneSignal subscribeToTopic "t": 2 succeeded, 1 failed');
  });

  it('logs error.response.data when available on rejected', async () => {
    const apiErr = new Error('Bad');
    apiErr.response = { data: { error: 'invalid token' } };
    axios.put.mockRejectedValue(apiErr);
    await subscribeToTopic(['bad'], 't');
    expect(errSpy).toHaveBeenCalledWith(
      'OneSignal subscribeToTopic failed for token bad:',
      { error: 'invalid token' },
    );
  });
});

// ---- unsubscribeFromTopic ----

describe('unsubscribeFromTopic', () => {
  it('returns undefined when tokens is null', async () => {
    expect(await unsubscribeFromTopic(null, 't')).toBeUndefined();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('returns undefined when tokens is empty array', async () => {
    expect(await unsubscribeFromTopic([], 't')).toBeUndefined();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('throws when restApiKey missing', async () => {
    mockOnesignal.restApiKey = undefined;
    await expect(unsubscribeFromTopic('tok', 't')).rejects.toThrow('ONESIGNAL_REST_API_KEY');
  });

  it('skips and logs when externalIdMode is active', async () => {
    mockOnesignal.targetMode = 'external_id';

    await unsubscribeFromTopic('tok', 'news');
    expect(logSpy).toHaveBeenCalledWith(
      'OneSignal unsubscribeFromTopic "news" skipped because external id targeting is active.',
    );
    expect(axios.put).not.toHaveBeenCalled();

  });

  it('calls axios.put with empty-string tag value', async () => {
    axios.put.mockResolvedValue({ data: { success: true } });
    await unsubscribeFromTopic('tok', 'promos');
    expect(axios.put).toHaveBeenCalledTimes(1);
    const [url, payload] = axios.put.mock.calls[0];
    expect(url).toBe(`${BASE}/players/tok`);
    expect(payload).toEqual({
      app_id: 'test-app-id',
      tags: { topic_promos: '' },
    });
  });

  it('logs success count when all fulfilled', async () => {

    axios.put.mockResolvedValue({ data: { success: true } });
    await unsubscribeFromTopic(['a', 'b', 'c'], 't');
    expect(logSpy).toHaveBeenCalledWith('OneSignal unsubscribeFromTopic "t": 3 succeeded, 0 failed');

  });

  it('logs errors for failed tokens', async () => {

    axios.put
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce(new Error('fail'));
    await unsubscribeFromTopic(['ok', 'bad'], 't');
    expect(errSpy).toHaveBeenCalledWith(
      'OneSignal unsubscribeFromTopic failed for token bad:',
      'fail',
    );

  });
});
