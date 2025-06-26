'use client';

import React, { useState, useEffect, useRef } from 'react';
import '../stylesheets/style.css';
import { Icon } from "@iconify/react";

export default function ChatScreen() {
  const bottomRef = useRef(null);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' },
  ]);
  const [step, setStep] = useState('summary');

  const isFirstPrompt = messages.length === 1 && step === 'summary';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      if (step === 'summary') {
        const botResponse = {
          id: Date.now() + 1,
          sender: 'bot',
          custom: (
            <div>
              <p>Great! Based on that, here are a few title ideas:</p>
              <ul className="list-unstyled d-flex flex-wrap gap-2">
                <li>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleTitleSelect('Dreams of Tomorrow')}>Dreams of Tomorrow</button>
                </li>
                <li>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleTitleSelect('Code of the Future')}>Code of the Future</button>
                </li>
                <li>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleTitleSelect('The Final Algorithm')}>The Final Algorithm</button>
                </li>
              </ul>
            </div>
          )
        };
        setMessages((prev) => [...prev, botResponse]);
        setStep('title');
      }

      if (step === 'content') {
        const botResponse = {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Chapter 1: A dim room flickered with code and caffeine. Zoe stared at her terminal. Outside, a cyberwar brewed. She had one chance left...'
        };
        setMessages((prev) => [...prev, botResponse]);
        setStep('done');
      }
    }, 800);
  };

  const handleTitleSelect = (title) => {
    const userChoice = { id: Date.now(), sender: 'user', text: `I like "${title}"` };
    setMessages((prev) => [...prev, userChoice]);

    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        sender: 'bot',
        custom: (
          <div>
            <p>Awesome choice! Now, pick a name for Chapter 1:</p>
            <ul className="list-unstyled d-flex flex-wrap gap-2">
              <li><button className="btn btn-sm btn-outline-success" onClick={() => handleChapterSelect('The Awakening')}>The Awakening</button></li>
              <li><button className="btn btn-sm btn-outline-success" onClick={() => handleChapterSelect('The Terminal')}>The Terminal</button></li>
              <li><button className="btn btn-sm btn-outline-success" onClick={() => handleChapterSelect('Lines of Destiny')}>Lines of Destiny</button></li>
            </ul>
          </div>
        )
      };
      setMessages((prev) => [...prev, botResponse]);
      setStep('chapter');
    }, 800);
  };

  const handleChapterSelect = (chapterName) => {
    const userChoice = { id: Date.now(), sender: 'user', text: `Let's go with "${chapterName}"` };
    setMessages((prev) => [...prev, userChoice]);

    setTimeout(() => {
      const botIntro = {
        id: Date.now() + 1,
        sender: 'bot',
        text: "Great choice! Here's the opening chapter. 📖"
      };
      setMessages((prev) => [...prev, botIntro]);
      setStep('content');
    }, 800);
  };

  return (
    <div className="d-flex flex-column chatScreen" style={{ height: '100vh' }}>
      {/* Centered layout for first prompt */}
      {isFirstPrompt ? (
        <div className="d-flex flex-column justify-content-center align-items-center text-center flex-grow-1">
          <h2 className="mb-4">Got a story in mind? Share a brief summary of your book!</h2>
          <div className="chatInputBg">
            <input
              type="text"
              className="chatInput"
              placeholder="Start typing your summary..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button className="btn-chat" onClick={sendMessage}>
              <Icon icon="fa:send-o" />
          
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages area */}
          <div className="overflow-auto p-3 messages flex-grow-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                <div
                  className={`p-3 rounded ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white border'}`}
                  style={{ maxWidth: '70%' }}
                >
                  {msg.custom ? msg.custom : msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input at bottom */}
          {step !== 'title' && step !== 'chapter' && (
            <div className="p-3 ">
              <div className="chatInputBg d-flex align-items-center gap-2">
                <input
                  type="text"
                  className="chatInput"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button className=" btn-chat" onClick={sendMessage}>
                  <Icon icon="fa:send-o" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
