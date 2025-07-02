export function formatChapterText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Remove markdown artefacts that might slip through
  let sanitized = text.replace(/\*\*/g, '').replace(/#/g, '');

  // Standardise "Chapter X" and "Part X" spacing
  sanitized = sanitized
    .replace(/(Chapter)\s*[-:]?\s*(\d+)/gi, '$1 $2')
    .replace(/(Part)\s*[-:]?\s*(\d+)/gi, '$1 $2');

  // Ensure chapter and part headings start on their own lines
  sanitized = sanitized.replace(/\s*(Chapter\s*\d+\s*(?:[:\-])?\s*[^\n]*)\s*/gi, '\n$1\n');
  sanitized = sanitized.replace(/\s*(Part\s*\d+\s*(?:[:\-])?\s*[^\n]*)\s*/gi, '\n$1\n');

  // Bold the titles following chapter/part headings
  sanitized = sanitized.replace(/(Chapter\s*\d+\s*[:\-]\s*)([^\n]*)/gi, (_m, p1, p2) => `${p1}**${p2.trim()}**`);
  sanitized = sanitized.replace(/(Part\s*\d+\s*[:\-]\s*)([^\n]*)/gi, (_m, p1, p2) => `${p1}**${p2.trim()}**`);

  // Insert a space between camel case words for readability
  sanitized = sanitized.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Collapse excessive newlines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();

  return sanitized;
}
