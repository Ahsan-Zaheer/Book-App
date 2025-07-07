export function formatChapterText(text: string, doubleSpaceAfterPeriod = false): string {
  if (!text || typeof text !== "string") return text;

  let sanitized = text.replace(/\*\*/g, "").replace(/#/g, "");

  // Standardize spacing for "Chapter X" and "Part X"
  sanitized = sanitized
    .replace(/(Chapter)\s*[-:]?\s*(\d+)/gi, "$1 $2")
    .replace(/(Part)\s*[-:]?\s*(\d+)/gi, "$1 $2");

  // Ensure "Chapter" and "Part" headings are on new lines
  sanitized = sanitized.replace(/([^\n])(\s*)(Chapter\s+\d+)/gi, "$1\n\n$3");
  sanitized = sanitized.replace(/([^\n])(\s*)(Part\s+\d+)/gi, "$1\n\n$3");

  // ✅ Bold full Chapter headings
  sanitized = sanitized.replace(
    /\n?(Chapter\s*\d+\s*[:\-]?\s*[^\n]*)/gi,
    "\n**$1**\n"
  );

  // ✅ Bold full Part headings (same format as Chapter)
  sanitized = sanitized.replace(
    /\n?(Part\s*\d+\s*[:\-]?\s*[^\n]*)/gi,
    "\n**$1**\n"
  );

  if(doubleSpaceAfterPeriod) {
  // ✅ Add triple space after the last colon in Part titles
  sanitized = sanitized.replace(/(Part\s+\d+:[^:]*:)(\s*)/g, "$1  ");

  sanitized = sanitized.replace(/\.([ \n]|$)/g, (m, p1) => `.  ${p1 === '\n' ? '' : ''}`);
  }

  return sanitized.trim();
}
