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

    // In test environment, skip SMTP initialization
    if (process.env.NODE_ENV === 'test') {
      this.initialized = true;
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
    // In test environment, log instead of sending (check BEFORE initialize)
    // This check must happen first, even if transporter is already initialized
    if (process.env.NODE_ENV === 'test') {
      console.log('[Email Service] 📧 TEST MODE - Email logged (not sent):');
      console.log(`  To: ${message.to}`);
      console.log(`  Subject: ${message.subject}`);
      if (message.text) {
        console.log(
          `  Text: ${message.text.substring(0, 200)}${message.text.length > 200 ? '...' : ''}`
        );
      }
      if (message.html) {
        console.log(`  HTML: [${message.html.length} characters]`);
      }
      return;
    }

    await this.initialize();

    // Console mode (development)
    if (
      !emailConfig.enabled ||
      emailConfig.provider === 'console' ||
      !this.transporter
    ) {
      console.info('[Email Service] 📧 Console Mode');
      console.info(`To: ${message.to}`);
      console.info(`Subject: ${message.subject}`);
      if (message.text) {
        // Remove CR/LF to prevent log injection from user-controlled content
        console.info(`Text: ${message.text.replace(/[\r\n]+/g, ' ')}`);
      }
      if (message.html) {
        console.info(`HTML: [HTML content]`);
      }
      return;
    }

    // Double-check test environment before sending (in case transporter was initialized before NODE_ENV was set)
    if (process.env.NODE_ENV === 'test') {
      console.log('[Email Service] 📧 TEST MODE - Email logged (not sent):');
      console.log(`  To: ${message.to}`);
      console.log(`  Subject: ${message.subject}`);
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
    } catch (error) {
      const isLastAttempt = attempt >= emailConfig.retry.maxAttempts;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      console.error(
        `[Email Service] ❌ Email send failed (attempt ${attempt}/${emailConfig.retry.maxAttempts}):`,
        errorMessage
      );

      if (isLastAttempt) {
        // Log error details for monitoring
        interface NodemailerError extends Error {
          code?: string;
          command?: string;
          response?: string;
        }
        const nodemailerError = error as NodemailerError;
        console.error('[Email Service] Final error details:', {
          code: nodemailerError.code,
          command: nodemailerError.command,
          response: nodemailerError.response,
          to: message.to,
          subject: message.subject,
        });
        throw new Error(
          `Failed to send email after ${emailConfig.retry.maxAttempts} attempts: ${errorMessage}`
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
      subject: 'Verify your Recruita email',
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
      subject: 'Reset your Recruita password',
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
export async function sendTemplatedEmail(options: EmailOptions): Promise<void> {
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
