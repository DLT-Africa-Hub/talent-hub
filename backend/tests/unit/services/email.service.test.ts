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
    process.env.NODE_ENV = 'development';
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    await sendEmail({
      to: 'test@example.com',
      subject: 'Hello',
      text: 'Sample email body',
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Email] To: test@example.com'),
    );

    infoSpy.mockRestore();
  });

  it('does not log in test environment', async () => {
    process.env.NODE_ENV = 'test';
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    await sendEmail({
      to: 'test@example.com',
      subject: 'Hello',
      text: 'Sample email body',
    });

    expect(infoSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});



