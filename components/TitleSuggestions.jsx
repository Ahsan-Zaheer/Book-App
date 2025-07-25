import React from 'react';

export default function TitleSuggestions({ refinedSummary, titles, onTitleSelect }) {
  return (
    <div>
      <p>
        Great! Here is the refined version of your summary: <br /> <br /> 
        <span style={{fontStyle: 'italic'}}>"{refinedSummary}"</span><br /> <br /> 
        Based on your summary, here are some title ideas choose one or enter your own book title
      </p>
      <ul className="list-unstyled d-flex flex-wrap gap-2">
        {titles.map((t, idx) => (
          <li key={idx} className="title-suggestion">
            <button className="selection" onClick={() => onTitleSelect(t.title)}>
              <span className="main-title">Title: {t.title}</span>
              {t.subtitle && <div className="subtitle">Subtitle: {t.subtitle}</div>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
