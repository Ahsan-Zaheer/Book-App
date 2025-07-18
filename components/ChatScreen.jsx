'use client';

import React, { useState, useEffect, useRef } from 'react';
import '../stylesheets/style.css';
import { Icon } from '@iconify/react';

import { askQuestion, saveTitle, createBook, generateChapterStream, loadChatState, saveChatState } from '../utils/api';
import { formatChapterText } from '../utils/format';

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
  const [hasKeyPoints, setHasKeyPoints] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [outline, setOutline] = useState([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [useSimpleInput, setUseSimpleInput] = useState(false);

  const createTitleSuggestionMessage = (id, refined, titles) => ({
    id,
    sender: 'bot',
    customType: 'titleSuggestions',
    data: { refinedSummary: refined, titles },
    custom: (
      <div>
        <p>
          Great! Here is the refined version of your summary: <br /> <br /> <span style={{fontStyle: 'italic'}}>"{refined}"</span><br /> <br /> Based on your summary, here are some title ideas choose one or enter your own book title
        </p>
        <ul className="list-unstyled d-flex flex-wrap gap-2">
          {titles.map((t, idx) => (
            <li key={idx} className="title-suggestion">
              <button className="selection" onClick={() => handleTitleSelect(t.title)}>
                <span className="main-title">Title: {t.title}</span>
                {t.subtitle && <div className="subtitle">Subtitle: {t.subtitle}</div>}
              </button>
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
        <p>Here is a suggested outline for chapters and their contents:</p>
        <ol>
          {outlineData.map((ch, idx) => (
            <li key={idx}>
              <strong>{ch.title}</strong>
              <p className="mb-0">{ch.concept}</p>
            </li>
          ))}
        </ol>
        <div className="d-flex gap-2 mt-2">
          <button className="selection" onClick={() => handleOutlineDecision(true, outlineData)}>Go ahead with this</button>
          <button className="selection" onClick={() => handleOutlineDecision(false, null)}>Generate another suggestion</button>
        </div>
      </div>
    ),
  });

  const createSummaryPromptMessage = (id) => ({
    id,
    sender: 'bot',
    customType: 'summaryPrompt',
    custom: (
      <div>
        <p>Great! To get started, I’ll need a brief book summary—just 3 to 6 sentences that describe the main message or journey you want to share in your book.</p>
        <p>Once you provide that, I’ll:</p>
        <ul className="d-flex flex-column flex-wrap gap-2">
          <li>Refine your summary into a clean and compelling version.</li>
          <li>Give you 10 title and subtitle suggestions to consider.</li>
          <li>Help you develop chapter ideas and an outline if you’d like.</li>
        </ul>
        <p>👉 Please go ahead and type or paste your book summary when you're ready.</p>
      </div>
    ),
  });

  const restoreMessage = (msg) => {
    if (msg.customType === 'titleSuggestions' && msg.data) {
      setRefinedSummary(msg.data.refinedSummary || '');
      setTitleOptions(msg.data.titles || []);
      return createTitleSuggestionMessage(msg.id, msg.data.refinedSummary, msg.data.titles || []);
    }
    if (msg.customType === 'outline' && msg.data) {
      setOutline(msg.data.outline || []);

      return createOutlineMessage(msg.id, msg.data.outline || []);
    }
    if (msg.customType === 'summaryPrompt') {
      return createSummaryPromptMessage(msg.id);
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
        console.log("old book", stored.bookType);
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
            ? stored.messages.map((m) => restoreMessage(m))
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

  // Persist chat history and state whenever relevant data changes.
  // Throttle updates to avoid sending a request on every streaming chunk.
  const saveTimeout = useRef(null);
  
  useEffect(() => {
    if (!bookId) return;
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

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveChatState(bookId, data).catch((e) => console.error('Failed to save chat', e));
    }, 1000);
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

  const sendMessage = async (overrideInput = null, overrideStep = null) => {
    const messageText = overrideInput !== null && overrideInput !== undefined ? overrideInput : input;
    const currentStep = overrideStep || step;

    if (!messageText.trim()) return;

    const userMsg = { id: generateId(), sender: 'user', text: messageText };
    const currentInput = messageText;
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }


    if (currentStep === 'outline') {
      setMessages((prev) => [
        ...prev,
        { id: generateId(), sender: 'bot', text: 'Please use the buttons above to continue.' },
      ]);
      return;
    }

    if (currentStep === 'bookType') {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          createSummaryPromptMessage(generateId()),
        ]);
      }, 400);
      setStep('summary');
    } else if (currentStep === 'summary') {
      setSummary(currentInput);
      const loadingId = generateId();
      setMessages((prev) => [
        ...prev,
        { id: loadingId, sender: 'bot', text: 'Generating title suggestions...' },
      ]);

      try {

        const userId = localStorage.getItem('userId') || null;
        const created = await createBook(currentInput, userId);
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
          .map((t) => {
            // Match titles inside **bold** markdown with : or - as separator
            const match = t.match(/^\d+\.\s*\*\*(.+?)\s*[:\-–]\s*(.+?)\*\*$/);
            if (match) {
              return { title: match[1].trim(), subtitle: match[2].trim() };
            } else {
              // Fallback: try to extract title and subtitle without markdown
              const fallback = t.match(/^\d+\.\s*(.*?)\s*[:\-–]\s*(.*)$/);
              if (fallback) {
                return { title: fallback[1].trim(), subtitle: fallback[2].trim() };
              } else {
                return { title: t.replace(/^\d+\.\s*/, '').trim(), subtitle: '' };
              }
            }
          });

           setTitleOptions(titles);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? createTitleSuggestionMessage(loadingId, refined, titles)
              : m
          ));


      } catch (e) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId ? { id: loadingId, sender: 'bot', text: 'Failed to fetch suggestions.' } : m
          )
        );
      }
      setStep('title');
    } else if (currentStep === 'title') {
      const cleanTitle = currentInput.replace(/\*\*/g, '').trim();
      setSelectedTitle(cleanTitle);
      if (!bookId) {
        console.error("Cannot save title: bookId is null");
      } else {
        try {
          await saveTitle(bookId, cleanTitle);
          ensureTitleInStorage(bookId, cleanTitle);
        } catch (e) {
          console.error(e);
        }
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
        } else if (currentStep === 'chapters') {
          const num = parseInt(currentInput);
          if (!isNaN(num) && num > 0 && num <= 50) {
            setChapterCount(num);
            const loadingId = generateId();
            setMessages((prev) => [
              ...prev,
              { id: loadingId, sender: 'bot', text: 'Generating outline...' },
            ]);
            try {

              console.log("🔄 Generating outline", outline);
              
              const outlineData = await getOutlineSuggestions(num, outline);
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
              { id: generateId(), sender: 'bot', text: 'Please enter a valid number of chapters.' },
            ]);
          }
          } else if (currentStep === 'chapterTitle') {
            const chapterTitle = selectedChapter || currentInput;
            if (!chapterTitle.trim()) return;
            if (!hasKeyPoints) {
              setSelectedChapter(chapterTitle);
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  sender: 'bot',
                  text: `Awesome! Now, please enter ${getRequiredKeyPoints()} Key points you'd like to include in this Chapter:`,
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
        } else if (currentStep === 'keypoints' && useSimpleInput) {
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
          setKeyPoints(simplePoints); // <-- This is async, but you call generateChapterContent below!
          setIsGenerating(true);
          await generateChapterContent(selectedChapter || currentInput, simplePoints);
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


  const handleTitleSelect = (title) => {
    const cleanTitle = title.replace(/\*\*/g, '').trim();
    setInput(cleanTitle);
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
    // Accept outline, continue as before
    const first = outlineToUse[0];
    if (!first) return;
    setSelectedChapter(first.title || '');
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        sender: 'bot',
        text: `Great! Let's start with \n Chapter 1: ${first.title} \n Concept: ${first.concept} \n Please enter ${getRequiredKeyPoints()} key points you'd like to include in this Chapter.`,
      },
    ]);
    setKeyPoints(getInitialKeyPoints());
    setStep('keypoints');
    setUseSimpleInput(false);
  } else {
    // ALWAYS prompt for chapter count before generating a new outline
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        sender: 'bot',
        text: `How many chapters do you want in your ${bookType}? Usually this type has ${getChapterRange()} chapters.`,
      },
    ]);
    setStep('chapters');
    setInput(''); // clear input so user can type a new number
  }
};


  const getOutlineSuggestions = async (count, oldOutline = null) => {

    let answer = await askQuestion(
      `Provide an outline of ${count} chapters for the ${bookType} "${selectedTitle}" based on this summary:\n${summary}. Each chapter should have a title followed by a brief concept of the chapter in no more than two lines.`
    );
    
    console.log("old outline",oldOutline);
    
    if(Array.isArray(oldOutline) && oldOutline.length > 0){
      answer = await askQuestion(
      `The following outline was already provided: ${oldOutline}.\n\nPlease generate a **completely different** outline with ${count} chapters for the ${bookType} titled "${selectedTitle}", based on this summary:\n${summary}.\n\nAvoid rephrasing or repeating ideas from the previous version. Instead, introduce **new perspectives, alternative structures, or fresh thematic interpretations**. Each chapter should include a distinctive title and a brief concept (max two lines) that stands apart from the prior version.`
    );}
      
   

    const lines = answer
      .split(/\n|\r/)
      .map((l) => l.trim())
      .filter(Boolean);

    const chapters = [];
    let current = null;

    const isChapterLine = (l) => /^(?:#+\s*)?(?:\d+\.\s*)?(?:chapter\s*\d+)/i.test(l);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`🔍 Line ${i + 1}: ${line}`);

      if (isChapterLine(line)) {
        if (current) chapters.push(current);

        let rest = line.replace(/^(?:#+\s*)?(?:\d+\.\s*)?(?:chapter\s*\d+[:.-]?\s*)/i, '').replace(/\*\*/g, '').trim();
        let title = rest;
        let concept = '';

        const sepMatch = rest.match(/[-:–]\s*(.*)/);
        if (sepMatch) {
          title = rest.slice(0, sepMatch.index).trim();
          concept = sepMatch[1].trim();
        }

        if (!concept && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (!isChapterLine(nextLine)) {
            concept = nextLine.replace(/\*\*/g, '').trim();
            i++;
          }
        }

        current = { title, concept };
      } else if (current && !current.concept) {
        current.concept = line.replace(/\*\*/g, '').trim();
      } else {
        console.warn(`⚠️ Ignored line (not matched): ${line}`);
      }
    }

    if (current) chapters.push(current);
    const finalChapters = chapters.slice(0, count);
    console.log("✅ Final parsed chapters array:", finalChapters);
    return finalChapters;
  };




  const generateChapterContent = async (chapterTitle, _keyPoints = null) => {
    const loadingId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, sender: 'bot', text: '' },
    ]);

    try {
      const stream = await generateChapterStream({
        bookId,
        bookType,
        summary,
        title: selectedTitle,
        chapterIndex: currentChapter,
        chapterTitle,
        keyPoints: _keyPoints ?? keyPoints, 
      });

      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId ? { ...m, text: (m.text || '') + chunk } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId ? { ...m, text: fullText, custom: formatMessageText(fullText, true) } : m
        )
      );

      const next = currentChapter + 1;
      if (next <= chapterCount) {
        const nextTitle = outline[next - 1]?.title || `Chapter ${next}`;
        const nextConcept = outline[next - 1]?.concept || '';
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            sender: 'bot',
            text: `Great! Let's work on Chapter ${next}: ${nextTitle} \n Concept: ${nextConcept} \n Please enter ${getRequiredKeyPoints()} Key points you'd like to include in this Chapter:`,
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

  const handleSkipKeyPoints = async () => {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          sender: 'user',
          text: 'Skip key points for this chapter',
        },
      ]);
      setHasKeyPoints(false);
      setIsGenerating(true);
      await generateChapterContent(selectedChapter || input, []);
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
  const formatMessageText = (text, doubleSpace = false) => {
    if (!text || typeof text !== 'string') return text;

    const sanitized = formatChapterText(text, doubleSpace);

    // Match lines that start with "1. ", "2. ", etc.
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
                    <strong >{cleaned}</strong>
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

    



  return (
    <div className="d-flex flex-column chatScreen" style={{ height: '100vh' }}>
      {isLoadingChat && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      {isFirstPrompt ? (
        <div className="d-flex flex-column justify-content-center align-items-center text-center flex-grow-1">
          <h2 className="mb-4 chatTitle"> What kind of book do you want to write?</h2>
          
          <ul className="list-unstyled d-flex flex-wrap gap-2 typeList">
                  <li>
                    <button  className={`selection text-start ${selectedBookType === 'Ebook' ? 'selected' : ''}`} onClick={() =>
                      {
                         handleTypeSelect('Ebook');
                         setSelectedBookType('Ebook');
                    }}>
                    <strong>Ebook</strong>
                     (40–80 pages)<br />
                     <small>• Up to 6 Chapters per Book <br />• Up to 2,000 Words per Chapter</small>
                    </button></li>
                  <li>
                    <button  className={`selection text-start ${selectedBookType === 'Short Book' ? 'selected' : ''}`} onClick={() => {
                      handleTypeSelect('Short Book');
                      setSelectedBookType('Short Book');
                    }}>
                      <strong>Short Book</strong> (80–125 pages)<br />
                      <small>• Up to 10 Chapters per Book<br />• Up to 3,000 Words per Chapter</small>
                    </button></li>
                  <li>
                    <button  className={`selection text-start ${selectedBookType === 'Full Length Book' ? 'selected' : ''}`} onClick={() => {
                      handleTypeSelect('Full Length Book');
                      setSelectedBookType('Full Length Book');

                    }}>
                      <strong>Full Length Book</strong> (125–200 pages)<br />
                      <small>• Up to 12 Chapters per Book<br />• Up to 4,000 Words per Chapter</small>
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
            <button className="btn-chat" onClick={() => sendMessage()}>
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
                  <button className="btn-chat" onClick={() => sendMessage()}>
                    <Icon icon="fa:send-o" />
                  </button>
                </div>
                <div className="mt-2 text-end">
                  {bookType === "Ebook" && (
                  <button className="btn-toggle-input" onClick={handleSkipKeyPoints}>
                    Skip this step
                  </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 keypointBg">
                <p className="text-dark mb-2">Please enter {getRequiredKeyPoints()} key points you'd like to include in this chapter:</p>
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
                  <div className="d-flex gap-2">
                    <button className="btn-toggle-input" onClick={() => setUseSimpleInput(true)}>
                      Use simple input
                    </button>
                    {bookType === "Ebook" && (
                      <button className="btn-toggle-input" onClick={handleSkipKeyPoints}>
                        Skip this step
                      </button>
                    )}
                  </div>
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

                

                  <button className="btn-chat" onClick={() => sendMessage()}>

                    <Icon icon="fa:send-o" />
                  </button>
                </div>
            </div>) }

          {/* Clear Chat */}
         <div >
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
