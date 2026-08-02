const mockSendEmail = jest.fn();
jest.mock('@/providers/email', () => ({ sendEmail: mockSendEmail }));

const { sendEmail } = require('@/modules/auth/application/helpers/email.helper');

describe('email.helper — sendEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the full options object to the shared email provider', async () => {
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'm1', mock: true });
    const opts = { to: 'a@b.com', subject: 'Hi', text: 'body', html: '<p>body</p>', from: 'noreply@x.com' };

    const result = await sendEmail(opts);

    expect(mockSendEmail).toHaveBeenCalledWith(opts);
    expect(result).toEqual({ success: true, messageId: 'm1', mock: true });
  });

  it('propagates provider rejection to the caller', async () => {
    mockSendEmail.mockRejectedValue(new Error('smtp down'));

    await expect(sendEmail({ to: 'a@b.com', subject: 'Hi' })).rejects.toThrow('smtp down');
  });
});
