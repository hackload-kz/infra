import { marked } from 'marked';

// Configure marked for better HTML output
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
});

/**
 * Convert Markdown to HTML safely (client-side safe version)
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  try {
    // Convert markdown to HTML
    const rawHtml = marked(markdown) as string;
    
    // Basic sanitization by removing dangerous tags and attributes
    // This is a simplified version - for production, consider using a proper sanitizer
    const cleanHtml = rawHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
    
    return cleanHtml;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Fallback: return the original markdown with line breaks converted to <br>
    return markdown.replace(/\n/g, '<br>');
  }
}

/**
 * Convert HTML from WYSIWYG editor to Markdown
 * This is a basic conversion - for more complex HTML, consider using a library like turndown
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  
  try {
    // Basic HTML to Markdown conversion
    const markdown = html
      // Headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      
      // Text formatting
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
      .replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
      .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
      
      // Lists
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      
      // Links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      
      // Images
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
      
      // Blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      
      // Code
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```\n')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n')
      
      // Paragraphs and breaks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      
      // Horizontal rule
      .replace(/<hr[^>]*>/gi, '\n---\n')
      
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return markdown;
  } catch (error) {
    console.error('Error converting HTML to markdown:', error);
    // Fallback: strip HTML tags and return plain text
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

/**
 * Render markdown for email (with inline styles for better email client support)
 */
export function markdownToEmailHtml(markdown: string): string {
  const html = markdownToHtml(markdown);
  
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