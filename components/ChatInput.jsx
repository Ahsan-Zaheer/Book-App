import React from 'react';
import { Icon } from '@iconify/react';

export default function ChatInput({ 
  input, 
  inputRef, 
  placeholder, 
  isMultiline, 
  onChange, 
  onSend,
  showSkipButton = false,
  onSkip,
  skipButtonText = "Skip this step",
  bookType 
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-3">
      <div className={`chatInputBg${isMultiline ? " multiline" : ""} d-flex align-items-center gap-2`}>
        <textarea
          ref={inputRef}
          className="chatInput"
          placeholder={placeholder}
          value={input}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button className="btn-chat" onClick={onSend}>
          <Icon icon="fa:send-o" />
        </button>
      </div>
      {showSkipButton && bookType === "Ebook" && (
        <div className="mt-2 text-end">
          <button className="btn-toggle-input" onClick={onSkip}>
            {skipButtonText}
          </button>
        </div>
      )}
    </div>
  );
}