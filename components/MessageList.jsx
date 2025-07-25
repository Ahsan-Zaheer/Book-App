import React from 'react';
import { formatMessageText } from '../utils/messageFormatter';

export default function MessageList({ messages, bottomRef }) {
  return (
    <div className="overflow-auto p-3 messages flex-grow-1 pt-5 mt-5">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
        >
          <div className={`p-3 rounded message ${msg.sender === 'user' ? 'userMsg' : 'botMsg'}`}>
            {msg.custom ? msg.custom : formatMessageText(msg.text)}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}