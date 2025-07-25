import React from 'react';
import { formatChapterText } from './format';

export const formatMessageText = (text, doubleSpace = false) => {
  if (!text || typeof text !== 'string') return text;

  const sanitized = formatChapterText(text, doubleSpace);
  const numberedListRegex = /^(\d+\.\s.*)$/gm;
  const parts = sanitized.split(numberedListRegex);
  const isNumberedItem = /^\d+\.\s.*$/;

  return (
    <>
      {parts.map((part, idx) =>
        isNumberedItem.test(part.trim()) ? (
          <React.Fragment key={idx}>
            {part}
            <br />
          </React.Fragment>
        ) : (
          part.split(/\n/).map((line, jdx) => {
            if (!line.trim()) return null;
            const cleaned = line.replace(/\*\*/g, '').trim();
            if (/^Chapter\s*\d+/i.test(cleaned)) {
              return (
                <React.Fragment key={`${idx}-${jdx}`}>
                  <strong>{cleaned}</strong>
                  <br />
                </React.Fragment>
              );
            }
            if (/^Part\s*\d+/i.test(cleaned)) {
              return (
                <React.Fragment key={`${idx}-${jdx}`}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{cleaned}</span>
                  <br />
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={`${idx}-${jdx}`}>
                <span style={{ whiteSpace: 'pre-wrap' }}>{cleaned}</span>
                <br />
              </React.Fragment>
            );
          })
        )
      )}
    </>
  );
};