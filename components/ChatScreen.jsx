'use client';

import React, { useState, useEffect, useRef } from 'react';
import '../stylesheets/style.css';
import { Icon } from '@iconify/react';

export default function ChatScreen() {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const keyPointRefs = useRef([]);


  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' },
  ]);
  const [step, setStep] = useState('summary');
  const [keyPoints, setKeyPoints] = useState(['', '', '']);


  const isFirstPrompt = messages.length === 1 && step === 'summary';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: input };
    const currentInput = input;
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      if (step === 'summary') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            custom: (
              <div>
                <p>Awesome! What type of book would you like to write?</p>
                <ul className="list-unstyled d-flex flex-wrap gap-2">
                  <li><button className="selection" onClick={() => handleTypeSelect('Ebook')}>Ebook (40–80 pages)</button></li>
                  <li><button className="selection" onClick={() => handleTypeSelect('Short Book')}>Short Book (80–125 pages)</button></li>
                  <li><button className="selection" onClick={() => handleTypeSelect('Full Length Book')}>Full Length Book (125–200 pages)</button></li>
                </ul>
              </div>
            ),
          },
        ]);
        setStep('type');
      } else if (step === 'type') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            custom: (
              <div>
                <p>Great! Based on that, here are a few title ideas:</p>
                <ul className="list-unstyled d-flex flex-wrap gap-2">
                  <li><button className="selection" onClick={() => handleTitleSelect('Dreams of Tomorrow')}>Dreams of Tomorrow</button></li>
                  <li><button className="selection" onClick={() => handleTitleSelect('Code of the Future')}>Code of the Future</button></li>
                  <li><button className="selection" onClick={() => handleTitleSelect('The Final Algorithm')}>The Final Algorithm</button></li>
                </ul>
              </div>
            ),
          },
        ]);
        setStep('title');
      } else if (step === 'title') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            custom: (
              <div>
                <p>Awesome choice! Now, pick a name for Chapter 1:</p>
                <ul className="list-unstyled d-flex flex-wrap gap-2">
                  <li><button className="selection" onClick={() => handleChapterSelect('The Awakening')}>The Awakening</button></li>
                  <li><button className="selection" onClick={() => handleChapterSelect('The Terminal')}>The Terminal</button></li>
                  <li><button className="selection" onClick={() => handleChapterSelect('Lines of Destiny')}>Lines of Destiny</button></li>
                </ul>
              </div>
            ),
          },
        ]);
        setStep('chapter');
      }  else if (step === 'chapter') {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 1,
                sender: 'bot',
                text: 'Awesome! Now, please enter 20 key points you want to cover in your book.',
              },
            ]);
            setStep('keypoints');
          }

    }, 800);
  };

  const handleTitleSelect = (title) => {
    setInput(`I like "${title}"`);
    inputRef.current?.focus();
  };

  const handleChapterSelect = (chapterName) => {
    setInput(`Let's go with "${chapterName}"`);
    inputRef.current?.focus();
  };

  const handleTypeSelect = (type) => {
    setInput(`I want to write a ${type}`);
    inputRef.current?.focus();
  };

  const handleKeyPointChange = (e, index) => {
    const newPoints = [...keyPoints];
    newPoints[index] = e.target.value;
    setKeyPoints(newPoints);
  };

  const handleKeyPointEnter = (e, index) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        const newPoints = [...keyPoints];
        if (keyPoints.length < 20 && index === keyPoints.length - 1) {
          newPoints.push('');
          setKeyPoints(newPoints);

          // Slight delay ensures new input is rendered before focusing
          setTimeout(() => {
            keyPointRefs.current[index + 1]?.focus();
          }, 50);
        } else if (keyPointRefs.current[index + 1]) {
          keyPointRefs.current[index + 1].focus();
        }
      }
    };


  const handleSubmitKeyPoints = () => {
      const filled = keyPoints.filter((p) => p.trim() !== '');
      if (filled.length < 15) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), sender: 'bot', text: 'Please enter at least 15 key points.' },
        ]);
        return;
      }

      // Add key points as a single user message
      const formattedKeyPoints = filled.map((kp, i) => `${i + 1}. ${kp}`).join('\n');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'user',
          text: `Here are my key points:\n${formattedKeyPoints}`,
        },
      ]);

      // Then respond with bot message
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: "Great choice! Here's the opening chapter. 📖",
          },
        ]);

        setStep('content');

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 2,
              sender: 'bot',
              text:
                'Chapter 1: A dim room flickered with code and caffeine. Zoe stared at her terminal. Outside, a cyberwar brewed. She had one chance left...',
            },
          ]);
        }, 800);
      }, 400);
    };


  const handleClearChat = () => {
    setMessages([
      { id: 1, sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' },
    ]);
    setInput('');
    setStep('summary');
    setKeyPoints(['']);
  };
  const formatMessageText = (text) => {
      if (!text || typeof text !== 'string') return text;

      // Match lines that start with "1. ", "2. ", etc.
      const numberedListRegex = /^(\d+\.\s.*)$/gm;
      const parts = text.split(numberedListRegex);

      return (
        <>
          {parts.map((part, idx) => (
            part.match(numberedListRegex) ? (
              <React.Fragment key={idx}>
                {part}
                <br />
              </React.Fragment>
            ) : (
              <React.Fragment key={idx}>
                {part}
              </React.Fragment>
            )
          ))}
        </>
      );
    };



  return (
    <div className="d-flex flex-column chatScreen" style={{ height: '100vh' }}>
      {isFirstPrompt ? (
        <div className="d-flex flex-column justify-content-center align-items-center text-center flex-grow-1">
          <h2 className="mb-4 text-light">Got a story in mind? Share a brief summary of your book!</h2>
          <div className="chatInputBg">
            <input
              ref={inputRef}
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
          {/* Messages */}
          <div className="overflow-auto p-3 messages flex-grow-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                <div
                  className={`p-3 rounded ${msg.sender === 'user' ? 'userMsg' : 'botMsg'}`}
                  style={{ maxWidth: '70%' }}
                >
                 {msg.custom ? msg.custom : formatMessageText(msg.text)}

                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input Section */}
          {step === 'keypoints' ? (
            <div className="p-3 keypointBg">
              <p className="text-light mb-2">Please enter 20 key points you'd like to include in your book:</p>
              <div className="scrollable-keypoints mb-2">
                {keyPoints.map((point, idx) => (
                  <input
                    key={idx}
                    type="text"
                    className="keypoint-input"
                    value={point}
                    placeholder={`Key Point ${idx + 1}`}
                    onChange={(e) => handleKeyPointChange(e, idx)}
                    onKeyDown={(e) => handleKeyPointEnter(e, idx)}
                    ref={(el) => (keyPointRefs.current[idx] = el)}
                  />
                ))}

              </div>
              <button className="btn-chat" onClick={handleSubmitKeyPoints}>
                Submit Key Points
              </button>
            </div>
          ) : <div className="p-3">
                <div className="chatInputBg d-flex align-items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    className="chatInput"
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button className="btn-chat" onClick={sendMessage}>
                    <Icon icon="fa:send-o" />
                  </button>
                </div>
            </div>}

          {/* Clear Chat */}
         <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 1000 }}>
          <button className="btn-clear-chat" onClick={handleClearChat}>
            🧹 Clear Chat
          </button>
        </div>

        </>
      )}
    </div>
  );
}
