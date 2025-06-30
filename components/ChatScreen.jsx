'use client';

import React, { useState, useEffect, useRef } from 'react';
import '../stylesheets/style.css';
import { Icon } from '@iconify/react';

import { askQuestion, saveTitle, createBook, generateChapter } from '../utils/api';

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;


export default function ChatScreen() {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const keyPointRefs = useRef([]);


  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: generateId(), sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' },
  ]);
  const [step, setStep] = useState('bookType');
  const [keyPoints, setKeyPoints] = useState(['', '', '']);
  const [bookType, setBookType] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedBookType, setSelectedBookType] = useState('');
  const [chapterCount, setChapterCount] = useState(null);
  const [bookId, setBookId] = useState(null);
  const [titleOptions, setTitleOptions] = useState([]);
  const [summary, setSummary] = useState('');
  const [currentChapter, setCurrentChapter] = useState(1);
  const [chapterTitleOptions, setChapterTitleOptions] = useState([]);
  const [hasKeyPoints, setHasKeyPoints] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);


  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
    setIsMultiline(e.target.value.split("\n").length > 1);
  };






  const isFirstPrompt = messages.length === 1 && step === 'bookType';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { id: generateId(), sender: 'user', text: input };
    const currentInput = input;
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    if (step === 'bookType') {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            sender: 'bot',
            custom: (
              <div>
                <p>Great! To get started, I’ll need a brief book summary—just 3 to 6 sentences that describe the main message or journey you want to share in your book.</p>
                <p>Once you provide that, I’ll:</p>
                <ul className="d-flex flex-wrap gap-2">
                  <li>Refine your summary into a clean and compelling version.</li>
                  <li>Give you 10 title and subtitle suggestions to consider.</li>
                  <li>Help you develop chapter ideas and an outline if you’d like.</li>
                </ul>
                <p>👉 Please go ahead and type or paste your book summary when you're ready.</p>
              </div>
            ),
          },
        ]);
      }, 400);
      setStep('summary');
    } else if (step === 'summary') {
      setSummary(currentInput);
      const loadingId = generateId();
      setMessages((prev) => [
        ...prev,
        { id: loadingId, sender: 'bot', text: 'Generating title suggestions...' },
      ]);

      try {

        const created = await createBook(currentInput);
        const newBookId = created._id;
        setBookId(newBookId);

        const answer = await askQuestion(
          `Provide 10 book title suggestions with subtitles based on the following summary:\n${currentInput}`
        );
        const titles = answer
          .split(/\n|\r/)
          .map((t) => t.trim())
          .filter((t) => /^\d+\./.test(t))
          .map((t) => t.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim());
        setTitleOptions(titles);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  id: loadingId,
                  sender: 'bot',
                  custom: (
                    <div>
                      <p>Great! Based on your summary, here are some title ideas:</p>
                      <ul className="list-unstyled d-flex flex-wrap gap-2">
                        {titles.map((t, idx) => (
                          <li key={idx}>
                            <button className="selection" onClick={() => handleTitleSelect(t, newBookId)}>{t}</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                }
              : m
          )
        );
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId ? { id: loadingId, sender: 'bot', text: 'Failed to fetch suggestions.' } : m
          )
        );
      }
      setStep('title');
    } else if (step === 'title') {
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              sender: 'bot',
              text: `How many chapters do you want in your ${selectedBookType}? Usually this type has ${getChapterRange()} chapters.`,
            },
          ]);
          setStep('chapters');
        } else if (step === 'chapters') {
          const num = parseInt(currentInput);
          if (!isNaN(num) && num > 0 && num <= 50) {
            setChapterCount(num);
            const suggestions = await getChapterTitleSuggestions(1);
            setChapterTitleOptions(suggestions);
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                sender: 'bot',
                custom: (
                  <div>
                    <p>Awesome choice! Now, pick a name for Chapter 1:</p>
                    <ul className="list-unstyled d-flex flex-wrap gap-2">
                      {suggestions.map((t, idx) => (
                        <li key={idx}><button className="selection" onClick={() => handleChapterSelect(t)}>{t}</button></li>
                      ))}
                    </ul>
                  </div>
                ),
              },
            ]);
            setStep('chapterTitle');
          } else {
            setMessages((prev) => [
              ...prev,
              { id: generateId(), sender: 'bot', text: 'Please enter a valid number of chapters (1–50).' },
            ]);
          }
        } else if (step === 'chapterTitle') {
            const chapterTitle = selectedChapter || currentInput;
            if (!chapterTitle.trim()) return;
            if (!hasKeyPoints) {
              setSelectedChapter(chapterTitle);
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  sender: 'bot',
                  text: `Awesome! Now, please enter ${getRequiredKeyPoints()} key points you want to cover in your book.`,
                },
              ]);
              setKeyPoints(getInitialKeyPoints());
              setStep('keypoints');
            } else {
              setIsGenerating(true);
              await generateChapterContent(chapterTitle);
              setIsGenerating(false);
            }
          }
  };

const getRequiredKeyPoints = () => {
  if (bookType === 'Ebook') return 8;
  if (bookType === 'Short Book') return 16;
  return 20; // Full Length Book
};

  const getChapterRange = () => {
    if (bookType === 'Ebook') return '4-6';
    if (bookType === 'Short Book') return '5-10';
    return '10-12';
  };

  const getInitialKeyPoints = () => {
    return Array(Math.max(3, getRequiredKeyPoints())).fill('');
  };


  const handleTitleSelect = async (title , bookIdArg) => {
    const cleanTitle = title.replace(/\*\*/g, '').trim();
    setSelectedTitle(cleanTitle);
    if (!bookIdArg) {
      console.error("Cannot save title: bookId is null");
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: generateId(), sender: 'user', text: `I like "${title}"` },
    ]);
    try {
      console.log("Saving title:", title);
      console.log("Book ID:", bookIdArg);
      await saveTitle(bookIdArg, title);

    } catch (e) {
      console.error(e);
    }
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        sender: 'bot',
        text: `How many chapters do you want in your ${selectedBookType}? Usually this type has ${getChapterRange()} chapters.`,
      },
    ]);
    setStep('chapters');
    setInput('');
    inputRef.current?.focus();
  };

  const handleChapterSelect = (chapterName) => {
    const cleanName = chapterName.replace(/\*\*/g, '').trim();
    setSelectedChapter(cleanName);
    setInput(cleanName);
    inputRef.current?.focus();
  };

  const handleTypeSelect = (type) => {
  setBookType(type);
  setInput(`I want to write a ${type}`);
  inputRef.current?.focus();
  };

  const getChapterTitleSuggestions = async (chapterIdx) => {
    const answer = await askQuestion(
      `Provide 5 title suggestions for chapter ${chapterIdx} of the ${bookType} \"${selectedTitle}\" based on this summary:\n${summary}`
    );
    const titles = answer
      .split(/\n|\r/)
      .map((t) => t.trim())
      .filter((t) => /^\d+\./.test(t))
      .map((t) => t.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim());
    return titles;
  };

  const generateChapterContent = async (chapterTitle) => {
    const loadingId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, sender: 'bot', text: `Generating Chapter ${currentChapter}...` },
    ]);

    try {
      const chapter = await generateChapter({
        bookId,
        bookType,
        summary,
        title: selectedTitle,
        chapterIndex: currentChapter,
        chapterTitle,
        keyPoints,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId ? { id: loadingId, sender: 'bot', text: chapter } : m
        )
      );

      const next = currentChapter + 1;
      if (next <= chapterCount) {
        const suggestions = await getChapterTitleSuggestions(next);
        setChapterTitleOptions(suggestions);
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            sender: 'bot',
            custom: (
              <div>
                <p>Great! Pick a title for Chapter {next}:</p>
                <ul className="list-unstyled d-flex flex-wrap gap-2">
                  {suggestions.map((t, idx) => (
                    <li key={idx}><button className="selection" onClick={() => handleChapterSelect(t)}>{t}</button></li>
                  ))}
                </ul>
              </div>
            ),
          },
        ]);
        setCurrentChapter(next);
        setHasKeyPoints(false);
        setKeyPoints(getInitialKeyPoints());
        setStep('chapterTitle');
      } else {
        setMessages((prev) => [
          ...prev,
          { id: generateId(), sender: 'bot', text: '🎉 Book generation complete!' },
        ]);
        setStep('content');
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId ? { id: loadingId, sender: 'bot', text: 'Failed to generate chapter.' } : m
        )
      );
    }
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


  const handleSubmitKeyPoints = async () => {
      const filled = keyPoints.filter((p) => p.trim() !== '');
      if (filled.length < getRequiredKeyPoints()) {
        setMessages((prev) => [
          ...prev,
          { id: generateId(), sender: 'bot', text: `Please enter at least ${getRequiredKeyPoints()} key points.` },
        ]);
        return;
      }

      const formattedKeyPoints = filled.map((kp, i) => `${i + 1}. ${kp}`).join('\n');
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          sender: 'user',
          text: `Here are my key points:\n${formattedKeyPoints}`,
        },
      ]);

      setHasKeyPoints(true);
      setKeyPoints(filled);
      setIsGenerating(true);
      await generateChapterContent(selectedChapter || input);
      setIsGenerating(false);
    };


  const handleClearChat = () => {
    setMessages([
      { id: generateId(), sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' },
    ]);
     setInput('');
    setStep('bookType');
    setKeyPoints(getInitialKeyPoints());
    setSelectedBookType('');
    setSelectedTitle('');
    setSelectedChapter('');
    setBookType('');
    setChapterCount(null);
    setBookId(null);
    setSummary('');
    setTitleOptions([]);
    setChapterTitleOptions([]);
    setCurrentChapter(1);
    setHasKeyPoints(false);
    setIsGenerating(false);
    setIsMultiline(false);

  };
  const formatMessageText = (text) => {
    if (!text || typeof text !== 'string') return text;

    // Remove Markdown-style bold markers
    const sanitized = text.replace(/\*\*/g, '');

    // Match lines that start with "1. ", "2. ", etc.
    const numberedListRegex = /^(\d+\.\s.*)$/gm;
    const parts = sanitized.split(numberedListRegex);

    return (
      <>
        {parts.map((part, idx) =>
          part.match(numberedListRegex) ? (
            <React.Fragment key={idx}>
              {part}
              <br />
            </React.Fragment>
          ) : (
            part.split(/\n/).map((line, jdx) => {
              if (!line.trim()) return null;
              return /^Part\s*\d+/i.test(line) ? (
                <React.Fragment key={`${idx}-${jdx}`}>
                  <strong>{line.trim()}</strong>
                  <br />
                </React.Fragment>
              ) : (
                <React.Fragment key={`${idx}-${jdx}`}>
                  {line}
                  <br />
                </React.Fragment>
              );
            })
          )
        )}
      </>
    );
  };

    



  return (
    <div className="d-flex flex-column chatScreen" style={{ height: '100vh' }}>
      {isFirstPrompt ? (
        <div className="d-flex flex-column justify-content-center align-items-center text-center flex-grow-1">
          <h2 className="mb-4 text-light"> What kind of book do you want to write?</h2>
          <ul className="list-unstyled d-flex flex-wrap gap-2">
                  <li>
                    <button  className={`selection text-start ${selectedBookType === 'Ebook' ? 'selected' : ''}`} onClick={() =>
                      {
                         handleTypeSelect('Ebook');
                         setSelectedBookType('Ebook');
                    }}>
                    <strong>Ebook</strong>
                     (40–80 pages)<br />
                     <small>• 6 chapters<br />• ~700 words per chapter part</small>
                    </button></li>
                  <li>
                    <button  className={`selection text-start ${selectedBookType === 'Short Book' ? 'selected' : ''}`} onClick={() => {
                      handleTypeSelect('Short Book');
                      setSelectedBookType('Short Book');
                    }}>
                      <strong>Short Book</strong> (80–125 pages)<br />
                      <small>• 10 chapters<br />• ~1,000 words per chapter part</small>
                    </button></li>
                  <li>
                    <button  className={`selection text-start ${selectedBookType === 'Full Length Book' ? 'selected' : ''}`} onClick={() => {
                      handleTypeSelect('Full Length Book');
                      setSelectedBookType('Full Length Book');

                    }}>
                      <strong>Full Length Book</strong> (125–200 pages)<br />
                      <small>• 12 chapters<br />• ~1,500 words per chapter part</small>
                    </button></li>
         </ul>
          <div className={`chatInputBg${isMultiline ? " multiline" : ""}`}>
            <textarea
              ref={inputRef}
              className="chatInput"
              placeholder="Is it Ebook, Short Length Book or Full Length Book..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              rows={1}
            />
            <button className="btn-chat" onClick={sendMessage}>
              <Icon icon="fa:send-o" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="overflow-auto p-3 messages flex-grow-1 pt-5 mt-5">
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
          {step === 'keypoints' && !isGenerating ? (
            <div className="p-3 keypointBg">
              <p className="text-light mb-2">Please enter {getRequiredKeyPoints()} key points you'd like to include in your book:</p>
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
                <div className={`chatInputBg${isMultiline ? " multiline" : ""} d-flex align-items-center gap-2`}>
                  <textarea
                    ref={inputRef}
                    className="chatInput"
                    placeholder="Type your message..."
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    rows={1}
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
        {/* Top Notch-like Title Bar */}
        <div className="floating-title-bar">
          Your Book id: <strong>{bookId}</strong>
        </div>



        </>
      )}
    </div>
  );
}
