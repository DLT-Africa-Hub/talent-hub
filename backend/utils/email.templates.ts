import fs from 'fs';
import path from 'path';

export type EmailTemplateType = 'email-verification' | 'password-reset';

interface TemplateVariables {
  [key: string]: string | number;
}

/**
 * Load and render email template
 */
export function renderEmailTemplate(
  templateType: EmailTemplateType,
  variables: TemplateVariables
): { html: string; text: string } {
  // Use __dirname for CommonJS (TypeScript compiles to CommonJS)
  const templateDir = path.join(__dirname, '../templates');
  const htmlPath = path.join(templateDir, `${templateType}.html`);

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Email template not found: ${templateType}`);
  }

  let html = fs.readFileSync(htmlPath, 'utf-8');

  // Replace template variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    html = html.replace(regex, String(value));
  });

  // Generate plain text version (simple HTML to text conversion)
  const text = htmlToText(html);

  return { html, text };
}

/**
 * Convert HTML to plain text (simple implementation)
 */
function htmlToText(html: string): string {
  // Remove style and script tags
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Replace common HTML elements with text equivalents
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '$1\n\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '$1\n\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '$1\n');
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
  text = text.replace(/<ul[^>]*>/gi, '');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)');
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1');
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.trim();

  return text;
}

/**
 * Get template variables for email verification
 */
export function getEmailVerificationVariables(
  verificationLink: string
): TemplateVariables {
  return {
    verificationLink,
    currentYear: new Date().getFullYear(),
  };
}

/**
 * Get template variables for password reset
 */
export function getPasswordResetVariables(
  resetLink: string
): TemplateVariables {
  return {
    resetLink,
    currentYear: new Date().getFullYear(),
  };
}
