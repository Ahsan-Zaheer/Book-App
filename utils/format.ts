export function formatChapterText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let sanitized = text.replace(/\*\*/g, '').replace(/#/g, '');

  // Standardise "Chapter X" and "Part X" spacing
  sanitized = sanitized
    .replace(/(Chapter)\s*[-:]?\s*(\d+)/gi, '$1 $2')
  .replace(/(Part)\s*[-:]?\s*(\d+)/gi, '$1 $2');

  sanitized = sanitized.replace(
  /(Chapter\s*\d+\s*(?:[:\-])?\s*[^\n]+)/gi,
    '\n$1\n'
  );

  sanitized = sanitized.replace(
  /(Chapter\s*\d+\s*(?:[:\-])?\s*[^\n]+)/gi,
  '\n$1\n'
  );

  return sanitized;
}
