import React from 'react';

export default function BookTypeSelector({ selectedBookType, onTypeSelect }) {
  const bookTypes = [
    {
      type: 'Ebook',
      description: '(40–80 pages)',
      details: ['Up to 6 Chapters per Book', 'Up to 2,000 Words per Chapter']
    },
    {
      type: 'Short Book',
      description: '(80–125 pages)',
      details: ['Up to 10 Chapters per Book', 'Up to 3,000 Words per Chapter']
    },
    {
      type: 'Full Length Book',
      description: '(125–200 pages)',
      details: ['Up to 12 Chapters per Book', 'Up to 4,000 Words per Chapter']
    }
  ];

  return (
    <div className="d-flex flex-column justify-content-center align-items-center text-center flex-grow-1">
      <h2 className="mb-4 chatTitle">What kind of book do you want to write?</h2>
      
      <ul className="list-unstyled d-flex flex-wrap gap-2 typeList">
        {bookTypes.map(({ type, description, details }) => (
          <li key={type}>
            <button 
              className={`selection text-start ${selectedBookType === type ? 'selected' : ''}`} 
              onClick={() => onTypeSelect(type)}
            >
              <strong>{type}</strong> {description}<br />
              <small>
                {details.map((detail, idx) => (
                  <span key={idx}>• {detail}<br /></span>
                ))}
              </small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}