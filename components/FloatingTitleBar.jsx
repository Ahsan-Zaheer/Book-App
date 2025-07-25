import React from 'react';

export default function FloatingTitleBar({ bookId }) {
  if (!bookId) return null;

  return (
    <div className="floating-title-bar">
      Your Book id: <strong>{bookId}</strong>
    </div>
  );
}