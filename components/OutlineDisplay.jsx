import React from 'react';

export default function OutlineDisplay({ outline, onOutlineDecision }) {
  return (
    <div>
      <p>Here is a suggested outline for chapters and their contents:</p>
      <ol>
        {outline.map((ch, idx) => (
          <li key={idx}>
            <strong>{ch.title}</strong>
            <p className="mb-0">{ch.concept}</p>
          </li>
        ))}
      </ol>
      <div className="d-flex gap-2 mt-2">
        <button className="selection" onClick={() => onOutlineDecision(true, outline)}>
          Go ahead with this
        </button>
        <button className="selection" onClick={() => onOutlineDecision(false, null)}>
          Generate another suggestion
        </button>
      </div>
    </div>
  );
}
