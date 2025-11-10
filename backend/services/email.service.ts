interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Simple email service placeholder.
 * Replace with real provider integration (e.g., SES, SendGrid, Mailgun).
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    console.info(
      `[Email] To: ${message.to} | Subject: ${message.subject}\n${message.text}`
    );
  }
}


