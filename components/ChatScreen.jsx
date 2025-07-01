'use client';

import React, { useState, useEffect, useRef } from 'react';
import '../stylesheets/style.css';
import { Icon } from '@iconify/react';

import { askQuestion, saveTitle, createBook, generateChapter, loadChatState, saveChatState } from '../utils/api';

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;


export default function ChatScreen({ initialBookId = null }) {
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
  const [refinedSummary, setRefinedSummary] = useState('');
  const [summary, setSummary] = useState('');
  const [currentChapter, setCurrentChapter] = useState(1);
  const [chapterTitleOptions, setChapterTitleOptions] = useState([]);
  const [hasKeyPoints, setHasKeyPoints] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [outline, setOutline] = useState([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [useSimpleInput, setUseSimpleInput] = useState(false);

  const createTitleSuggestionMessage = (id, refined, titles, bookIdArg) => ({
    id,
    sender: 'bot',
    customType: 'titleSuggestions',
    data: { refinedSummary: refined, titles },
    custom: (
      <div>
        <p>
          Great! {refined} Based on your summary, here are some title ideas:
        </p>
        <ul className="list-unstyled d-flex flex-wrap gap-2">
          {titles.map((t, idx) => (
            <li key={idx}>
              <button className="selection" onClick={() => handleTitleSelect(t, bookIdArg)}>{t}</button>
            </li>
          ))}
        </ul>
      </div>
    ),
  });

  const createOutlineMessage = (id, outlineData) => ({
    id,
    sender: 'bot',
    customType: 'outline',
    data: { outline: outlineData },
    custom: (
      <div>
        <p>Here is a suggested outline:</p>
        <ol>
          {outlineData.map((ch, idx) => (
            <li key={idx}>
              <strong>{ch.title}</strong>
              <ul>
                {ch.subheadings.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <div className="d-flex gap-2 mt-2">
          <button className="selection" onClick={() => handleOutlineDecision(true, outlineData)}>Go ahead with this</button>
          <button className="selection" onClick={() => handleOutlineDecision(false)}>Generate another suggestion</button>
        </div>
      </div>
    ),
  });

  const restoreMessage = (msg, bookIdArg) => {
    if (msg.customType === 'titleSuggestions' && msg.data) {
      setRefinedSummary(msg.data.refinedSummary || '');
      setTitleOptions(msg.data.titles || []);
      return createTitleSuggestionMessage(msg.id, msg.data.refinedSummary, msg.data.titles || [], bookIdArg);
    }
    if (msg.customType === 'outline' && msg.data) {
      setOutline(msg.data.outline || []);
      return createOutlineMessage(msg.id, msg.data.outline || []);
    }
    return msg;
  };

  // Load stored chat when an initial book id is provided
  useEffect(() => {
    const load = async () => {
      if (!initialBookId) return;
      setIsLoadingChat(true);
      try {
        const stored = await loadChatState(initialBookId);
        if (stored) {
          if (stored.step) setStep(stored.step);
          if (stored.bookType) setBookType(stored.bookType);
          if (stored.selectedBookType) setSelectedBookType(stored.selectedBookType);
          if (stored.selectedTitle) {
            setSelectedTitle(stored.selectedTitle);
            ensureTitleInStorage(initialBookId, stored.selectedTitle);
          }
          if (stored.selectedChapter) setSelectedChapter(stored.selectedChapter);
          if (typeof stored.chapterCount !== 'undefined') setChapterCount(stored.chapterCount);
          if (stored.summary) setSummary(stored.summary);
          if (typeof stored.currentChapter !== 'undefined') setCurrentChapter(stored.currentChapter);
          if (Array.isArray(stored.keyPoints)) setKeyPoints(stored.keyPoints);
          if (typeof stored.hasKeyPoints === 'boolean') setHasKeyPoints(stored.hasKeyPoints);
          if (Array.isArray(stored.outline)) setOutline(stored.outline);
          if (stored.refinedSummary) setRefinedSummary(stored.refinedSummary);
          if (Array.isArray(stored.titleOptions)) setTitleOptions(stored.titleOptions);

          let restoredMessages = Array.isArray(stored.messages)
            ? stored.messages.map((m) => restoreMessage(m, initialBookId))
            : [];

          setMessages(restoredMessages);
        }
        setBookId(initialBookId);
      } catch (e) {
        console.error('Failed to load stored chat', e);
      } finally {
        setIsLoadingChat(false);
        setUseSimpleInput(false);
      }
    };
    load();
  }, [initialBookId]);


  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
    // Apply multiline style as soon as the user starts typing
    setIsMultiline(value.trim().length > 0);
  };






  const isFirstPrompt = messages.length === 1 && step === 'bookType';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist chat history and state whenever relevant data changes
  useEffect(() => {
    if (bookId) {
      const serializableMessages = messages.map((msg) => {
        if (msg.customType) {
          return { id: msg.id, sender: msg.sender, customType: msg.customType, data: msg.data };
        }
        const { id, sender, text } = msg;
        return { id, sender, text };
      });
      const data = {
        messages: serializableMessages,
        step,
        bookType,
        selectedBookType,
        selectedTitle,
        selectedChapter,
        chapterCount,
        summary,
        refinedSummary,
        titleOptions,
        currentChapter,
        keyPoints,
        hasKeyPoints,
        outline,
      };
      saveChatState(bookId, data).catch((e) => console.error('Failed to save chat', e));
    }
  }, [
    messages,
    bookId,
    step,
    bookType,
    selectedBookType,
    selectedTitle,
    selectedChapter,
    chapterCount,
    summary,
    refinedSummary,
    titleOptions,
    currentChapter,
    keyPoints,
    hasKeyPoints,
    outline,
  ]);


  // Listen for requests to load a previous chat
  useEffect(() => {
    const handler = async (e) => {
      const id = e.detail?.bookId;
      if (!id) return;
      setIsLoadingChat(true);
      try {
        const stored = await loadChatState(id);
        if (stored) {
          if (stored.step) setStep(stored.step);
          if (stored.bookType) setBookType(stored.bookType);
          if (stored.selectedBookType) setSelectedBookType(stored.selectedBookType);
          if (stored.selectedTitle) {
            setSelectedTitle(stored.selectedTitle);
            ensureTitleInStorage(id, stored.selectedTitle);
          }
          if (stored.selectedChapter) setSelectedChapter(stored.selectedChapter);
          if (typeof stored.chapterCount !== 'undefined') setChapterCount(stored.chapterCount);
          if (stored.summary) setSummary(stored.summary);
          if (typeof stored.currentChapter !== 'undefined') setCurrentChapter(stored.currentChapter);
          if (Array.isArray(stored.keyPoints)) setKeyPoints(stored.keyPoints);
          if (typeof stored.hasKeyPoints === 'boolean') setHasKeyPoints(stored.hasKeyPoints);
          if (Array.isArray(stored.outline)) setOutline(stored.outline);
          if (stored.refinedSummary) setRefinedSummary(stored.refinedSummary);
          if (Array.isArray(stored.titleOptions)) setTitleOptions(stored.titleOptions);

          const restoredMessages = Array.isArray(stored.messages)
            ? stored.messages.map((m) => restoreMessage(m, id))
            : [];

          setMessages(restoredMessages);
        }
        setBookId(id);
      } catch (err) {
        console.error('Failed to load stored chat', err);
      } finally {
        setIsLoadingChat(false);
      }
    };
    window.addEventListener('loadChat', handler);
    return () => window.removeEventListener('loadChat', handler);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { id: generateId(), sender: 'user', text: input };
    const currentInput = input;
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    if (step === 'outline') {
      setMessages((prev) => [
        ...prev,
        { id: generateId(), sender: 'bot', text: 'Please use the buttons above to continue.' },
      ]);
      return;
    }

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

        const refined = await askQuestion(
          `Rewrite the following book summary in a single polished paragraph:\n${currentInput}`
        );
        setRefinedSummary(refined);

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
              ? createTitleSuggestionMessage(loadingId, refined, titles, newBookId)
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
            const loadingId = generateId();
            setMessages((prev) => [
              ...prev,
              { id: loadingId, sender: 'bot', text: 'Generating outline...' },
            ]);
            try {
              const outlineData = await getOutlineSuggestions(num);
              setOutline(outlineData);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === loadingId
                    ? createOutlineMessage(loadingId, outlineData)
                    : m
                )
              );
              setStep('outline');
            } catch (e) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === loadingId ? { id: loadingId, sender: 'bot', text: 'Failed to generate outline.' } : m
                )
              );
            }
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
              setUseSimpleInput(false);
            } else {
              setIsGenerating(true);
              await generateChapterContent(chapterTitle);
              setIsGenerating(false);
            }
          } else if (step === 'keypoints' && useSimpleInput) {
            const simplePoints = currentInput
              .split(/[;\n]+/)
              .map((p) => p.trim())
              .filter(Boolean);
            if (simplePoints.length < getRequiredKeyPoints()) {
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  sender: 'bot',
                  text: `Please enter at least ${getRequiredKeyPoints()} key points.`,
                },
              ]);
              return;
            }

            const formattedKeyPoints = simplePoints
              .map((kp, i) => `${i + 1}. ${kp}`)
              .join('\n');
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                sender: 'user',
                text: `Here are my key points:\n${formattedKeyPoints}`,
              },
            ]);
            setHasKeyPoints(true);
            setKeyPoints(simplePoints);
            setIsGenerating(true);
            await generateChapterContent(selectedChapter || currentInput);
            setIsGenerating(false);
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

  const ensureTitleInStorage = (id, title) => {
    if (!id || !title) return;
    const list = JSON.parse(localStorage.getItem('book_titles') || '[]');
    if (!list.find((b) => b.id === id)) {
      list.push({ id, title });
      localStorage.setItem('book_titles', JSON.stringify(list));
      window.dispatchEvent(new Event('titlesUpdated'));
    }
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

      ensureTitleInStorage(bookIdArg, cleanTitle);

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

  const handleOutlineDecision = async (useIt, chaptersArg = null) => {
    const outlineToUse = chaptersArg || outline;

    if (useIt) {
      console.log("📘 Using outline:", outlineToUse);

      const first = outlineToUse[0];
      console.log("📗 First chapter:", first);

      if (!first) {
        console.warn("⚠️ Outline is missing or malformed:", outlineToUse);
        return;
      }

      setSelectedChapter(first.title || '');
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          sender: 'bot',
          text: `Great! Let's start with Chapter 1: ${first.title}. Please enter ${getRequiredKeyPoints()} key points you want to cover.`,
        },
      ]);
      setKeyPoints(getInitialKeyPoints());
      setStep('keypoints');
      setUseSimpleInput(false);
      setUseSimpleInput(false);
    } else {
      // regenerate outline
      setInput(String(chapterCount));
      setStep('chapters');
      await sendMessage();
    }
  };

  const getOutlineSuggestions = async (count) => {
    const answer = await askQuestion(
      `Provide an outline of ${count} chapters for the ${bookType} "${selectedTitle}" based on this summary:\n${summary}. Each chapter should have a title and four subheadings.`
    );

    console.log("🧠 Outline response:", answer);

    const lines = answer
      .split(/\n|\r/)
      .map((l) => l.trim())
      .filter(Boolean);

    const chapters = [];
    let current = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`🔍 Line ${i + 1}: ${line}`);

      if (/^(?:#+\s*)?(?:\d+\.\s*)?(?:chapter\s*\d+)/i.test(line)) {
        if (current) chapters.push(current);

        let title = line
          .replace(/^(?:#+\s*)?(?:\d+\.\s*)?(?:chapter\s*\d+[:.-]?\s*)/i, '')
          .replace(/\*\*/g, '')
          .trim();

        if (!title && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (
            !/^(?:#+\s*)?(?:\d+\.\s*)?(?:chapter\s*\d+)/i.test(nextLine) &&
            !/^[-•]/.test(nextLine)
          ) {
            title = nextLine.replace(/\*\*/g, '').trim();
            i++;
          }
        }

        current = { title, subheadings: [] };
        console.log(`📌 Found chapter line, extracted title: ${title}`);
      } else if (current && /^[-•]/.test(line)) {
        const sub = line.replace(/^[-•]\s*/, '').replace(/\*\*/g, '').trim();
        current.subheadings.push(sub);
        console.log(`🧩 Added subheading: ${sub}`);
      } else {
        console.warn(`⚠️ Ignored line (not matched): ${line}`);
      }
    }

    if (current) chapters.push(current);
    const finalChapters = chapters.slice(0, count);
    console.log("✅ Final parsed chapters array:", finalChapters);
    return finalChapters;
  };

// Example of calling both together
const generateAndUseOutline = async () => {
  const chapters = await getOutlineSuggestions(chapterCount);
  setOutline(chapters); // keep state if needed elsewhere
  handleOutlineDecision(true, chapters);
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
        const nextTitle = outline[next - 1]?.title || `Chapter ${next}`;
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            sender: 'bot',
            text: `Great! Let's work on Chapter ${next}: ${nextTitle}. Please enter ${getRequiredKeyPoints()} key points you want to cover.`,
          },
        ]);
        setCurrentChapter(next);
        setSelectedChapter(nextTitle);
        setHasKeyPoints(false);
        setKeyPoints(getInitialKeyPoints());
        setStep('keypoints');
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
    setRefinedSummary('');
    setTitleOptions([]);
    setChapterTitleOptions([]);
    setCurrentChapter(1);
    setOutline([]);
    setHasKeyPoints(false);
    setIsGenerating(false);
    setIsMultiline(false);
    setUseSimpleInput(false);
    if (bookId) {
      saveChatState(bookId, {}).catch(() => {});
    }

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
      {isLoadingChat && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      {isFirstPrompt ? (
        <div className="d-flex flex-column justify-content-center align-items-center text-center flex-grow-1">
          <h2 className="mb-4"> What kind of book do you want to write?</h2>
          <ul className="list-unstyled d-flex flex-wrap gap-2">
                  <li>
                    <button  className={`selection text-start ${selectedBookType === 'Ebook' ? 'selected' : ''}`} onClick={() =>
                      {
                         handleTypeSelect('Ebook');
                         setSelectedBookType('Ebook');
                    }}>
                    <strong>Ebook</strong>
                     (40–80 pages)<br />
                     <small>• 6 chapters<br />• exactly 700 words per chapter part</small>
                    </button></li>
                  <li>
                    <button  className={`selection text-start ${selectedBookType === 'Short Book' ? 'selected' : ''}`} onClick={() => {
                      handleTypeSelect('Short Book');
                      setSelectedBookType('Short Book');
                    }}>
                      <strong>Short Book</strong> (80–125 pages)<br />
                      <small>• 10 chapters<br />• exactly 1,000 words per chapter part</small>
                    </button></li>
                  <li>
                    <button  className={`selection text-start ${selectedBookType === 'Full Length Book' ? 'selected' : ''}`} onClick={() => {
                      handleTypeSelect('Full Length Book');
                      setSelectedBookType('Full Length Book');

                    }}>
                      <strong>Full Length Book</strong> (125–200 pages)<br />
                      <small>• 12 chapters<br />• exactly 1,500 words per chapter part</small>
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
                  className={`p-3 rounded message ${msg.sender === 'user' ? 'userMsg' : 'botMsg'}`}
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
            useSimpleInput ? (
              <div className="p-3">
                <div className={`chatInputBg${isMultiline ? " multiline" : ""} d-flex align-items-center gap-2`}>
                  <textarea
                    ref={inputRef}
                    className="chatInput"
                    placeholder={`Enter ${getRequiredKeyPoints()} key points separated by semicolons`}
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
              <div className="p-3 keypointBg">
                <p className="text-dark mb-2">Please enter {getRequiredKeyPoints()} key points you'd like to include in your book:</p>
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
                <div className="d-flex justify-content-between">
                  <button className="btn-chat" onClick={handleSubmitKeyPoints}>
                    Submit Key Points
                  </button>
                  <button className="btn-toggle-input" onClick={() => setUseSimpleInput(true)}>
                    Use simple input
                  </button>
                </div>
              </div>
            )
          ) : step === 'outline' ? null : (
            <div className="p-3">
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
            </div>) }

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
