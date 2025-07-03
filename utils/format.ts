export function formatChapterText(text: string): string {
  if (!text || typeof text !== "string") return text;

  let sanitized = text.replace(/\*\*/g, "").replace(/#/g, "");

  // Standardise "Chapter X" and "Part X" spacing
  sanitized = sanitized
    .replace(/(Chapter)\s*[-:]?\s*(\d+)/gi, "$1 $2")
    .replace(/(Part)\s*[-:]?\s*(\d+)/gi, "$1 $2");

  // Bold chapter titles and ensure they start on a new line
  sanitized = sanitized.replace(
    /(Chapter\s*\d+\s*(?:[:\-])?\s*[^\n]+)/gi,
    "\n**$1**\n"
  );

  // Ensure each part heading begins on a new line
  sanitized = sanitized.replace(
    /(Part\s*\d+\s*(?:[:\-])?\s*[^\n]+)/gi,
    "\n$1\n"
  );

  return sanitized.trim();
}
