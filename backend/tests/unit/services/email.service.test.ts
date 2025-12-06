import { sendEmail } from '../../../services/email.service';

describe('email.service', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('logs email contents when not in test environment', async () => {
    // Set environment before importing the service
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    process.env.EMAIL_ENABLED = 'false';
    process.env.EMAIL_PROVIDER = 'console';

    // Clear the module cache to reinitialize the service with new env vars
    jest.resetModules();
    const { sendEmail: sendEmailReloaded } = await import(
      '../../../services/email.service'
    );

    const infoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);

    await sendEmailReloaded({
      to: 'test@example.com',
      subject: 'Hello',
      text: 'Sample email body',
    });

    // The email service logs: "[Email Service] 📧 Console Mode" and then "To: test@example.com"
    // Check that it was called with a string containing the email address
    const calls = infoSpy.mock.calls.flat();
    const hasEmailLog = calls.some(
      (call) =>
        typeof call === 'string' && call.includes('To: test@example.com')
    );
    expect(hasEmailLog).toBe(true);

    infoSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  it('does not log in test environment', async () => {
    process.env.NODE_ENV = 'test';
    const infoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);

    await sendEmail({
      to: 'test@example.com',
      subject: 'Hello',
      text: 'Sample email body',
    });

    expect(infoSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
