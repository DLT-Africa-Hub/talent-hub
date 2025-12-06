/**
 * Strips HTML tags and decodes HTML entities from a string
 * @param html - The HTML string to strip
 * @returns Plain text without HTML tags
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';

  let text = html;

  // First, decode HTML entities (handles &lt; &gt; &amp; &nbsp; etc.)
  const decodeEntities = (str: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };

  // Decode entities (converts &lt;p&gt; to <p>)
  text = decodeEntities(text);

  // Remove all HTML tags using regex (handles <p>, </p>, <strong>, etc.)
  text = text.replace(/<\/?[^>]+(>|$)/g, '');

  // Decode again in case there were nested entities
  text = decodeEntities(text);

  // Remove any remaining angle brackets that might be left
  text = text.replace(/[<>]/g, '');

  // Clean up whitespace (multiple spaces, newlines, etc.)
  text = text.replace(/\s+/g, ' ').trim();

  return text;
};

/**
 * Truncates text to a specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Strips HTML and truncates text in one operation
 * @param html - The HTML string to process
 * @param maxLength - Maximum length before truncation
 * @returns Plain text without HTML, truncated if needed
 */
export const stripHtmlAndTruncate = (
  html: string,
  maxLength: number = 150
): string => {
  const plainText = stripHtml(html);
  return truncateText(plainText, maxLength);
};
