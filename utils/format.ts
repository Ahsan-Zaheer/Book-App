export function formatChapterText(text: string, doubleSpaceAfterPeriod = false): string {
  if (!text || typeof text !== "string") return text;

  let sanitized = text.replace(/\*\*/g, "").replace(/#/g, "");

  // Standardize spacing for "Chapter X" and "Part X"
  sanitized = sanitized
    .replace(/(Chapter)\s*[-:]?\s*(\d+)/gi, "$1 $2")

  // Ensure "Chapter" and "Part" headings are on new lines
  sanitized = sanitized.replace(/([^\n])(\s*)(Chapter\s+\d+)/gi, "$1\n\n$3");

  // ✅ Bold full Chapter headings
  sanitized = sanitized.replace(
    /\n?(Chapter\s*\d+\s*[:\-]?\s*[^\n]*)/gi,
    "\n**$1**\n"
  );


  if(doubleSpaceAfterPeriod) {

  sanitized = sanitized.replace(/\.([ \n]|$)/g, (m, p1) => `.  ${p1 === '\n' ? '' : ''}`);
  }

  return sanitized.trim();
}

// Add these functions to your utils/format.ts file

export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Remove markdown formatting and extra whitespace
  const cleanText = text
    .replace(/\*\*/g, '') // Remove bold formatting
    .replace(/#+/g, '') // Remove headers
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  // Split by whitespace and filter out empty strings
  return cleanText.split(/\s+/).filter(word => word.length > 0).length;
}

export function getExpectedWordCount(bookType: string): number {
  switch (bookType) {
    case 'Ebook':
      return 2800; // 700 × 4 parts
    case 'Short Book':
      return 4000; // 1000 × 4 parts
    case 'Full Length Book':
      return 6000; // 1500 × 4 parts
    default:
      return 2800;
  }
}

export function getWordsPerPart(bookType: string): number {
  switch (bookType) {
    case 'Ebook':
      return 700;
    case 'Short Book':
      return 1000;
    case 'Full Length Book':
      return 1500;
    default:
      return 700;
  }
}

export function validateChapterWordCount(text: string, bookType: string): {
  isValid: boolean;
  actualCount: number;
  expectedCount: number;
  difference: number;
} {
  const actualCount = countWords(text);
  const expectedCount = getExpectedWordCount(bookType);
  const difference = actualCount - expectedCount;
  const isValid = Math.abs(difference) <= 50; // Allow 50 words tolerance
  
  return {
    isValid,
    actualCount,
    expectedCount,
    difference
  };
}
