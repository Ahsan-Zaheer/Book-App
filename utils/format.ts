export function formatChapterText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let sanitized = text.replace(/\*\*/g, '').replace(/#/g, '');
  sanitized = sanitized
    .replace(/(Chapter)\s*[-:]?\s*(\d+)/gi, '$1 $2')
    .replace(/(Part)\s*[-:]?\s*(\d+)/gi, '$1 $2');
  sanitized = sanitized.replace(/\s*(Chapter\s*\d+\s*(?:[:\-])?\s*[^\n]*)\s*/gi, '\n$1\n');
  sanitized = sanitized.replace(/\s*(Part\s*\d+\s*(?:[:\-])?\s*[^\n]*)\s*/gi, '\n$1\n');
  sanitized = sanitized.replace(/([a-z])([A-Z])/g, '$1 $2');
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();

  return sanitized;
}
