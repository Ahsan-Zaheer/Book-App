export const getRequiredKeyPoints = (bookType) => {
  if (bookType === 'Ebook') return 8;
  if (bookType === 'Short Book') return 16;
  return 20; // Full Length Book
};

export const getChapterRange = (bookType) => {
  if (bookType === 'Ebook') return '4-6';
  if (bookType === 'Short Book') return '5-10';
  return '10-12';
};

export const getInitialKeyPoints = (bookType) => {
  return Array(Math.max(3, getRequiredKeyPoints(bookType))).fill('');
};

export const ensureTitleInStorage = (id, title) => {
  if (!id || !title) return;
  const list = JSON.parse(localStorage.getItem('book_titles') || '[]');
  if (!list.find((b) => b.id === id)) {
    list.push({ id, title });
    localStorage.setItem('book_titles', JSON.stringify(list));
    window.dispatchEvent(new Event('titlesUpdated'));
  }
};