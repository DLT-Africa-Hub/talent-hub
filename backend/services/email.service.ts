import nodemailer, { Transporter } from 'nodemailer';
import { emailConfig } from '../config/secrets';
import {
  renderEmailTemplate,
  getEmailVerificationVariables,
  getPasswordResetVariables,
  type EmailTemplateType,
} from '../utils/email.templates';

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  template?: EmailTemplateType;
  templateVariables?: Record<string, string | number>;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private initialized = false;

/**
   * Initialize email transporter
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!emailConfig.enabled || emailConfig.provider === 'console') {
      this.initialized = true;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.auth.user,
          pass: emailConfig.smtp.auth.pass,
        },
        connectionTimeout: emailConfig.timeoutMs,
        greetingTimeout: emailConfig.timeoutMs,
        socketTimeout: emailConfig.timeoutMs,
      });

      // Verify connection
      await this.transporter.verify();
      console.log('[Email Service] ✅ SMTP connection verified');
      this.initialized = true;
    } catch (error) {
      console.error('[Email Service] ❌ Failed to initialize SMTP:', error);
      // Fall back to console mode
      this.transporter = null;
      this.initialized = true;
    }
  }

  /**
   * Send email with retry logic
   */
  private async sendWithRetry(
    message: EmailMessage,
    attempt = 1
  ): Promise<void> {
    await this.initialize();

    // Console mode (development/testing)
    if (!emailConfig.enabled || emailConfig.provider === 'console' || !this.transporter) {
      if (process.env.NODE_ENV !== 'test') {
        console.info('[Email Service] 📧 Console Mode');
        console.info(`To: ${message.to}`);
        console.info(`Subject: ${message.subject}`);
        if (message.text) {
          console.info(`Text:\n${message.text}`);
        }
        if (message.html) {
          console.info(`HTML: [HTML content]`);
        }
      }
      return;
    }

    try {
      const mailOptions = {
        from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email Service] ✅ Email sent: ${info.messageId}`);
    } catch (error: any) {
      const isLastAttempt = attempt >= emailConfig.retry.maxAttempts;

      console.error(
        `[Email Service] ❌ Email send failed (attempt ${attempt}/${emailConfig.retry.maxAttempts}):`,
        error.message
      );

      if (isLastAttempt) {
        // Log error details for monitoring
        console.error('[Email Service] Final error details:', {
          code: error.code,
          command: error.command,
          response: error.response,
          to: message.to,
          subject: message.subject,
        });
        throw new Error(
          `Failed to send email after ${emailConfig.retry.maxAttempts} attempts: ${error.message}`
        );
      }

      // Wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, emailConfig.retry.delayMs * attempt)
      );

      // Retry
      return this.sendWithRetry(message, attempt + 1);
    }
  }

  /**
   * Send email (public API)
   */
  async sendEmail(message: EmailMessage): Promise<void> {
    try {
      await this.sendWithRetry(message);
    } catch (error) {
      // Log error but don't throw to avoid breaking the application flow
      // In production, you might want to queue failed emails for retry
      console.error('[Email Service] Email send error (non-blocking):', error);
    }
  }

  /**
   * Send email using template
   */
  async sendTemplatedEmail(options: EmailOptions): Promise<void> {
    let text = options.text;
    let html = options.html;

    // Render template if provided
    if (options.template && options.templateVariables) {
      const rendered = renderEmailTemplate(
        options.template,
        options.templateVariables
      );
      html = rendered.html;
      text = rendered.text;
    }

    if (!text && !html) {
      throw new Error('Either template, text, or html must be provided');
    }

    await this.sendEmail({
      to: options.to,
      subject: options.subject,
      text,
      html,
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(
    to: string,
    verificationLink: string
  ): Promise<void> {
    const variables = getEmailVerificationVariables(verificationLink);
    await this.sendTemplatedEmail({
      to,
      subject: 'Verify your Talent Hub email',
      template: 'email-verification',
      templateVariables: variables,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const variables = getPasswordResetVariables(resetLink);
    await this.sendTemplatedEmail({
      to,
      subject: 'Reset your Talent Hub password',
      template: 'password-reset',
      templateVariables: variables,
    });
  }
}

// Singleton instance
const emailService = new EmailService();

/**
 * Send email (backward compatible function)
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  return emailService.sendEmail(message);
}

/**
 * Send templated email
 */
export async function sendTemplatedEmail(
  options: EmailOptions
): Promise<void> {
  return emailService.sendTemplatedEmail(options);
}

/**
 * Send email verification
 */
export async function sendEmailVerification(
  to: string,
  verificationLink: string
): Promise<void> {
  return emailService.sendEmailVerification(to, verificationLink);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(
  to: string,
  resetLink: string
): Promise<void> {
  return emailService.sendPasswordReset(to, resetLink);
  }

export default emailService;
