import React from 'react';

export default function LoadingOverlay({ isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
    </div>
  );
}