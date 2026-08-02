const PROVIDER_METHODS = ['sendMulticast', 'sendToTopic', 'subscribeToTopic', 'unsubscribeFromTopic'];

let originalProvider;

beforeEach(() => {
  originalProvider = process.env.NOTIFICATION_PROVIDER;
  jest.resetModules();
});

afterEach(() => {
  if (originalProvider === undefined) delete process.env.NOTIFICATION_PROVIDER;
  else process.env.NOTIFICATION_PROVIDER = originalProvider;
});

describe('providers/notification/index', () => {
  it('defaults to the onesignal provider when NOTIFICATION_PROVIDER is unset', () => {
    delete process.env.NOTIFICATION_PROVIDER;

    const mod = require('@/providers/notification/index');

    PROVIDER_METHODS.forEach((method) => expect(typeof mod[method]).toBe('function'));
  });

  it('exports the onesignal provider when NOTIFICATION_PROVIDER=onesignal', () => {
    process.env.NOTIFICATION_PROVIDER = 'onesignal';

    const mod = require('@/providers/notification/index');

    PROVIDER_METHODS.forEach((method) => expect(typeof mod[method]).toBe('function'));
  });

  it('throws when NOTIFICATION_PROVIDER is unsupported', () => {
    process.env.NOTIFICATION_PROVIDER = 'firebase';

    expect(() => require('@/providers/notification/index')).toThrow(
      'Notification provider "firebase" is not supported. Only "onesignal" is available.',
    );
  });
});
