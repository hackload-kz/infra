import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Configure marked for better HTML output
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
});

// Create a JSDOM window for server-side DOMPurify
const window = new JSDOM('').window;
const createDOMPurify = DOMPurify(window as unknown as Window);

/**
 * Convert Markdown to HTML safely (server-side only with full sanitization)
 */
export function markdownToHtmlServer(markdown: string): string {
  if (!markdown) return '';
  
  try {
    // Convert markdown to HTML
    const rawHtml = marked(markdown) as string;
    
    // Sanitize HTML to prevent XSS attacks
    const cleanHtml = createDOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr', 'div', 'span'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id',
        'target', 'rel', 'style'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
    });
    
    return cleanHtml;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Fallback: return the original markdown with line breaks converted to <br>
    return markdown.replace(/\n/g, '<br>');
  }
}

/**
 * Render markdown for email (with inline styles for better email client support)
 */
export function markdownToEmailHtml(markdown: string): string {
  const html = markdownToHtmlServer(markdown);
  
  // Add inline styles for better email client compatibility
  return html
    .replace(/<h1>/g, '<h1 style="color: #1a202c; font-size: 28px; font-weight: bold; margin: 20px 0 10px 0;">')
    .replace(/<h2>/g, '<h2 style="color: #2d3748; font-size: 24px; font-weight: bold; margin: 18px 0 8px 0;">')
    .replace(/<h3>/g, '<h3 style="color: #2d3748; font-size: 20px; font-weight: bold; margin: 16px 0 6px 0;">')
    .replace(/<h4>/g, '<h4 style="color: #2d3748; font-size: 18px; font-weight: bold; margin: 14px 0 4px 0;">')
    .replace(/<h5>/g, '<h5 style="color: #2d3748; font-size: 16px; font-weight: bold; margin: 12px 0 2px 0;">')
    .replace(/<h6>/g, '<h6 style="color: #2d3748; font-size: 14px; font-weight: bold; margin: 10px 0 2px 0;">')
    .replace(/<p>/g, '<p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 12px 0;">')
    .replace(/<strong>/g, '<strong style="font-weight: bold;">')
    .replace(/<em>/g, '<em style="font-style: italic;">')
    .replace(/<a /g, '<a style="color: #2563eb; text-decoration: underline;" ')
    .replace(/<ul>/g, '<ul style="margin: 12px 0; padding-left: 20px;">')
    .replace(/<ol>/g, '<ol style="margin: 12px 0; padding-left: 20px;">')
    .replace(/<li>/g, '<li style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 4px 0;">')
    .replace(/<blockquote>/g, '<blockquote style="border-left: 4px solid #e2e8f0; padding-left: 16px; margin: 16px 0; color: #718096; font-style: italic;">')
    .replace(/<code>/g, '<code style="background-color: #f7fafc; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 13px;">')
    .replace(/<pre>/g, '<pre style="background-color: #f7fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 13px; line-height: 1.4; margin: 16px 0;">');
}