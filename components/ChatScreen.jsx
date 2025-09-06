'use client';

import React, { useState, useEffect, useRef } from 'react';
import '../stylesheets/style.css';
import { Icon } from '@iconify/react';

import { askQuestion, saveTitle, createBook, generateChapterStream, loadChatState, saveChatState } from '../utils/api';
import { formatChapterText } from '../utils/format';
import { ensureTitleInStorage } from '../utils/bookHelpers';

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
  const [useCustomOutline, setUseCustomOutline] = useState(false);
  const [customOutline, setCustomOutline] = useState([]);

  const createTitleSuggestionMessage = (id, refined, titles, originalSummary) => ({
    id,
    sender: 'bot',
    customType: 'titleSuggestions',
    data: { refinedSummary: refined, titles, originalSummary },
    custom: (
      <div>
        <p>
          Great! Here is the refined version of your summary: <br /> <br /> <span style={{fontStyle: 'italic'}}>"{refined}"</span><br /> <br />  <strong >
            Based on your summary, here are some title ideas choose one or enter your own book title:
          </strong>
        </p>
        <ul className="list-unstyled d-flex flex-wrap gap-2">
          {titles.map((t, idx) => (
            <li key={idx} className="title-suggestion">
              <button className="selection" onClick={() => handleTitleSelect(t.title)}>
                <div className="title-container">
                  <div className="main-title">{t.title}</div>
                  {t.subtitle && <div className="subtitle">{t.subtitle}</div>}
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="d-flex gap-2 mt-2">
          <button className="selection regeneration" onClick={() => handleSummaryRegeneration(originalSummary, refined)}>Generate another suggestion</button>
        </div>
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
          <button className="selection regeneration" onClick={() => handleOutlineDecision(false, null)}>Generate another suggestion</button>
          <button className="selection" onClick={() => handleWriteOwnOutline(outlineData.length)}>Write your own outline</button>
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
        <strong>👉 Please go ahead and type or paste your book summary when you're ready.</strong>
      </div>
    ),
  });

  const restoreMessage = (msg) => {
    if (msg.customType === 'titleSuggestions' && msg.data) {
      setRefinedSummary(msg.data.refinedSummary || '');
      setTitleOptions(msg.data.titles || []);
      return createTitleSuggestionMessage(msg.id, msg.data.refinedSummary, msg.data.titles || [], msg.data.originalSummary || '');
    }
    if (msg.customType === 'outline' && msg.data) {
      setOutline(msg.data.outline || []);
      return createOutlineMessage(msg.id, msg.data.outline || []);
    }
    if (msg.customType === 'summaryPrompt') {
      return createSummaryPromptMessage(msg.id);
    }
    
    // Handle reconstructed chapter messages - they need custom formatting
    if (msg.sender === 'bot' && msg.text && msg.text.includes('**Chapter')) {
      return {
        ...msg,
        custom: formatMessageText(msg.text, true)
      };
    }
    
    return msg;
  };

  
  useEffect(() => {
    const load = async () => {
      if (!initialBookId) return;
      setIsLoadingChat(true);
      try {
        const stored = await loadChatState(initialBookId);
        console.log("📚 Raw API response:", stored);
        console.log("📚 Raw API response keys:", Object.keys(stored || {}));
        console.log("📚 Book has chapters:", stored?.chapters?.length || 0);
        console.log("📚 First chapter:", stored?.chapters?.[0]);
        console.log("📚 Book summary:", stored?.summary);
        console.log("📚 Book suggestedTitle:", stored?.suggestedTitle);
        console.log("📚 ChatState exists:", !!stored?.chatState);
        console.log("📚 ChatState messages:", stored?.chatState?.messages?.length || 0);
        
        if (stored) {
          // The API now handles reconstruction, so we just use the chatState
          console.log("📋 Using chat state from API");
          const chatState = stored.chatState || {};
          
          console.log("📋 Final chatState to use:", chatState);
          console.log("📋 Messages in chatState:", chatState.messages?.length || 0);
          console.log("📋 Step in chatState:", chatState.step);
          
          if (chatState.step) setStep(chatState.step);
          if (chatState.bookType) setBookType(chatState.bookType);
          if (chatState.selectedBookType) setSelectedBookType(chatState.selectedBookType);
          if (chatState.selectedTitle) {
            setSelectedTitle(chatState.selectedTitle);
            ensureTitleInStorage(initialBookId, chatState.selectedTitle);
          }
          if (chatState.selectedChapter) setSelectedChapter(chatState.selectedChapter);
          if (typeof chatState.chapterCount !== 'undefined') setChapterCount(chatState.chapterCount);
          if (chatState.summary) setSummary(chatState.summary);
          if (typeof chatState.currentChapter !== 'undefined') setCurrentChapter(chatState.currentChapter);
          if (Array.isArray(chatState.keyPoints)) setKeyPoints(chatState.keyPoints);
          if (typeof chatState.hasKeyPoints === 'boolean') setHasKeyPoints(chatState.hasKeyPoints);
          if (Array.isArray(chatState.outline)) setOutline(chatState.outline);
          if (chatState.refinedSummary) setRefinedSummary(chatState.refinedSummary);
          if (Array.isArray(chatState.titleOptions)) setTitleOptions(chatState.titleOptions);
          if (typeof chatState.useCustomOutline === 'boolean') setUseCustomOutline(chatState.useCustomOutline);
          if (Array.isArray(chatState.customOutline)) setCustomOutline(chatState.customOutline);

          let restoredMessages = Array.isArray(chatState.messages)
            ? chatState.messages.map((m) => restoreMessage(m))
            : [{ id: generateId(), sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' }];

          console.log("📋 Restored messages:", restoredMessages.length);
          console.log("📋 First few messages:", restoredMessages.slice(0, 3));
          setMessages(restoredMessages);
        } else {
          console.log("❌ No book data found");
          // If no stored data, start fresh
          setMessages([{ id: generateId(), sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' }]);
        }
        setBookId(initialBookId);
      } catch (e) {
        console.error('❌ Failed to load stored chat', e);
        // On error, start fresh
        setMessages([{ id: generateId(), sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' }]);
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
      useCustomOutline,
      customOutline,
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
    useCustomOutline,
    customOutline,
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

        // Array of different prompt variations for summary refinement
        const summaryRefinementPrompts = [
          `Rewrite the following book summary in a single polished paragraph:\n${currentInput}`,
          `Transform this book summary into an elegant, cohesive paragraph that captures the essence:\n${currentInput}`,
          `Craft a refined, professional summary paragraph from the following content:\n${currentInput}`,
          `Polish and restructure this book summary into a compelling single paragraph:\n${currentInput}`,
          `Convert this summary into a sophisticated, well-crafted paragraph:\n${currentInput}`,
          `Refine and enhance this book summary into a smooth, flowing paragraph:\n${currentInput}`,
          `Reshape this summary into an articulate, engaging single paragraph:\n${currentInput}`,
          `Transform this content into a beautifully written summary paragraph:\n${currentInput}`,
          `Elevate this book summary into a polished, professional paragraph:\n${currentInput}`,
          `Reframe this summary as an eloquent, well-structured paragraph:\n${currentInput}`,
          `Convert this into a refined, captivating summary paragraph:\n${currentInput}`,
          `Polish this book summary into a compelling, cohesive paragraph:\n${currentInput}`,
          `Craft an improved, sophisticated version of this summary in paragraph form:\n${currentInput}`,
          `Transform this into a well-articulated, professional book summary:\n${currentInput}`,
          `Refine this content into a smooth, engaging summary paragraph:\n${currentInput}`,
          `Reshape this summary into a polished, compelling single paragraph:\n${currentInput}`,
          `Convert this into an elegant, well-crafted book summary paragraph:\n${currentInput}`,
          `Transform this summary into a refined, professional narrative paragraph:\n${currentInput}`,
          `Polish this content into a sophisticated, flowing summary paragraph:\n${currentInput}`,
          `Craft a beautifully written, cohesive paragraph from this book summary:\n${currentInput}`
        ];

        // Randomly select a prompt variation
        const randomPrompt = summaryRefinementPrompts[Math.floor(Math.random() * summaryRefinementPrompts.length)];
        const refined = await askQuestion(randomPrompt);
        setRefinedSummary(refined);

        console.log(refinedSummary);
        

        // Array of different prompt variations for title generation
        const titleGenerationPrompts = [
          `Generate 10 book title suggestions based on this summary. Format each as: "1. TITLE | SUBTITLE"\n\nSummary: ${currentInput}\n\nRequirements:\n- Use the exact format: "1. TITLE | SUBTITLE"\n- Make titles catchy and memorable\n- Make subtitles descriptive and informative\n- Ensure each title-subtitle pair works together cohesively`,
          `Create 10 compelling book titles with subtitles for this summary. Use this exact format: "1. TITLE | SUBTITLE"\n\nSummary: ${currentInput}\n\nGuidelines:\n- Title should be attention-grabbing\n- Subtitle should explain the book's value or approach\n- Use the pipe symbol (|) as separator\n- Number each entry clearly`,
          `Develop 10 professional book title and subtitle combinations. Format: "1. TITLE | SUBTITLE"\n\nBased on: ${currentInput}\n\nCriteria:\n- Title: Short, impactful, memorable\n- Subtitle: Longer, explanatory, benefit-focused\n- Consistent formatting with pipe separator\n- Clear numbering from 1-10`,
          `Generate 10 marketable book titles with descriptive subtitles. Use format: "1. TITLE | SUBTITLE"\n\nContent summary: ${currentInput}\n\nSpecifications:\n- Title should hook readers immediately\n- Subtitle should clarify the book's purpose\n- Maintain consistent pipe (|) separation\n- Number sequentially 1 through 10`,
          `Create 10 engaging book title-subtitle pairs using format: "1. TITLE | SUBTITLE"\n\nSource material: ${currentInput}\n\nRequirements:\n- Title: Concise and compelling\n- Subtitle: Detailed and informative\n- Use pipe symbol for clean separation\n- Sequential numbering essential`,
          `Craft 10 distinctive book titles with explanatory subtitles. Format: "1. TITLE | SUBTITLE"\n\nBased on summary: ${currentInput}\n\nGuidelines:\n- Title should be unique and memorable\n- Subtitle should describe key benefits or approach\n- Consistent pipe separator usage\n- Clear 1-10 numbering system`,
          `Design 10 powerful book title and subtitle combinations. Use: "1. TITLE | SUBTITLE"\n\nFrom this summary: ${currentInput}\n\nCriteria:\n- Title: Strong, attention-grabbing\n- Subtitle: Clear value proposition\n- Pipe symbol for professional formatting\n- Numbered list from 1 to 10`,
          `Produce 10 strategic book titles with informative subtitles. Format: "1. TITLE | SUBTITLE"\n\nContent: ${currentInput}\n\nSpecifications:\n- Title should create curiosity\n- Subtitle should promise specific outcomes\n- Use pipe (|) for clean separation\n- Maintain sequential numbering`,
          `Generate 10 commercial book title-subtitle pairs. Use format: "1. TITLE | SUBTITLE"\n\nBased on: ${currentInput}\n\nRequirements:\n- Title: Market-friendly and catchy\n- Subtitle: Benefit-driven and clear\n- Consistent pipe symbol usage\n- Proper 1-10 numbering`,
          `Formulate 10 impactful book titles with descriptive subtitles. Format: "1. TITLE | SUBTITLE"\n\nSummary: ${currentInput}\n\nGuidelines:\n- Title should be emotionally engaging\n- Subtitle should explain the transformation offered\n- Use pipe separator consistently\n- Number each suggestion clearly`
        ];

        // Randomly select a prompt variation
        const randomTitlePrompt = titleGenerationPrompts[Math.floor(Math.random() * titleGenerationPrompts.length)];
        const answer = await askQuestion(randomTitlePrompt);

        const titles = answer
          .split(/\n|\r/)
          .map((t) => t.trim())
          .filter((t) => /^\d+\./.test(t))
          .map((t) => {
            // Remove the number prefix (e.g., "1. ")
            const withoutNumber = t.replace(/^\d+\.\s*/, '').trim();
            
            // Look for pipe separator first (our preferred format)
            const pipeMatch = withoutNumber.match(/^(.+?)\s*\|\s*(.+)$/);
            if (pipeMatch) {
              return { 
                title: pipeMatch[1].trim().replace(/\*\*/g, ''), 
                subtitle: pipeMatch[2].trim().replace(/\*\*/g, '') 
              };
            }
            
            // Fallback: look for colon or dash separators
            const colonDashMatch = withoutNumber.match(/^(.+?)\s*[:\-–]\s*(.+)$/);
            if (colonDashMatch) {
              return { 
                title: colonDashMatch[1].trim().replace(/\*\*/g, ''), 
                subtitle: colonDashMatch[2].trim().replace(/\*\*/g, '') 
              };
            }
            
            // If no separator found, treat entire text as title
            return { 
              title: withoutNumber.replace(/\*\*/g, '').trim(), 
              subtitle: '' 
            };
          })
          .filter(item => item.title.length > 0); // Remove empty titles

        setTitleOptions(titles);

        console.log(titles);
        
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? createTitleSuggestionMessage(loadingId, refined, titles, currentInput)
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
              // Ensure chapterCount is properly set to the requested number
              setChapterCount(num);
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
                  isHtml: true,
                  htmlContent: `Awesome! Now, <strong>please enter ${getRequiredKeyPoints()} Key points you'd like to include in this Chapter:</strong>`,
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

  const getInitialCustomOutline = (count) => {
    return Array(count).fill({ title: '', concept: '' });
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
        isHtml: true,
        htmlContent: `Great! Let's start with \n Chapter 1: ${first.title} \n Concept: ${first.concept} \n <strong>Please enter ${getRequiredKeyPoints()} key points you'd like to include in this Chapter.</strong>`,
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

const handleWriteOwnOutline = (chaps) => {
  // Use the chapter count that was actually requested by the user
  // If chapterCount is null, use outline.length, if that's also 0, default to 4
  const validChapterCount = chaps;
  console.log('Chapter count for custom outline:', chaps);
  
  setUseCustomOutline(true);
  setCustomOutline(getInitialCustomOutline(chaps));
  setMessages((prev) => [
  ...prev,
  {
    id: generateId(),
    sender: 'bot',
    text: `Great! Please create your own outline with **${chaps}** chapters. Enter a title for each chapter and optionally add a concept description.`,
  },

  ]);
  setStep('customOutline');
};

const handleCustomOutlineChange = (index, field, value) => {
  const newOutline = [...customOutline];
  newOutline[index] = { ...newOutline[index], [field]: value };
  setCustomOutline(newOutline);
};

const handleSubmitCustomOutline = () => {
  const filledOutline = customOutline.filter(ch => ch.title.trim());
  const expectedCount = chapterCount || customOutline.length;
  
  if (filledOutline.length < expectedCount) {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), sender: 'bot', text: `Please fill in all ${expectedCount} chapter titles.` },
    ]);
    return;
  }

  // Set the custom outline as the main outline
  setOutline(filledOutline);
  
  // Show user's custom outline with proper formatting
  const customOutlineMessage = {
    id: generateId(),
    sender: 'user',
    text: 'Here is my custom outline:',
    custom: (
      <div>
        <p style={{ color: 'white' }}><strong>Here is my custom outline:</strong></p>
        <ol style={{ color: 'white' }}>
          {filledOutline.map((ch, idx) => (
            <li key={idx}>
              <strong>{ch.title}</strong>
              <p className="mb-0" style={{ color: 'white' }}>{ch.concept}</p>
            </li>
          ))}
        </ol>
      </div>
    ),
  };
  
  setMessages((prev) => [
    ...prev,
    customOutlineMessage,
  ]);

  // Continue with the first chapter
  const first = filledOutline[0];
  setSelectedChapter(first.title);
  setMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      sender: 'bot',
      text: `Perfect! Let's start with \n Chapter 1: ${first.title} \n Concept: ${first.concept} \n Please enter ${getRequiredKeyPoints()} key points you'd like to include in this Chapter.`,
      isHtml: true,
      htmlContent: `Perfect! Let's start with \n Chapter 1: ${first.title} \n Concept: ${first.concept} \n <strong>Please enter ${getRequiredKeyPoints()} key points you'd like to include in this Chapter.</strong>`,
    },
  ]);
  
  setKeyPoints(getInitialKeyPoints());
  setStep('keypoints');
  setUseCustomOutline(false);
  setUseSimpleInput(false);
};

  const handleSummaryRegeneration = async (originalSummary = null, currentRefined = null) => {
    const loadingId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, sender: 'bot', text: 'Generating new title suggestions...' },
    ]);

    // Use passed parameters first, then fall back to state variables
    const summaryToUse = originalSummary || currentRefined || refinedSummary || summary;
    
    console.log('Summary to use:', summaryToUse);
    console.log('Original Summary passed:', originalSummary);
    console.log('Current Refined passed:', currentRefined);
    console.log('State Summary:', summary);
    console.log('State Refined Summary:', refinedSummary);
    

    try {
      // Generate a completely different refined summary with explicit instructions for uniqueness
      const refined = await askQuestion(
        `Take the following book summary and rewrite it in a completely different style and perspective. Use different vocabulary, sentence structure, and emphasis. Focus on different aspects of the content than previous versions. Make it sound fresh and unique while maintaining the core message:\n\nOriginal summary: ${summaryToUse}\n\nPrevious refined version to avoid repeating: ${currentRefined || refinedSummary || 'None'}\n\nCreate a single polished paragraph that feels completely new and different.`
      );
      setRefinedSummary(refined);

      // Get existing titles to explicitly avoid them
      const existingTitles = titleOptions.map(t => `${t.title}: ${t.subtitle}`).join('\n');
      
      const answer = await askQuestion(
        `Generate 10 completely NEW and UNIQUE book title suggestions with subtitles. These must be entirely different from any previous suggestions.\n\nBook summary: ${summaryToUse}\n\nPREVIOUS TITLES TO AVOID (do not repeat or rephrase these):\n${existingTitles}\n\nRequirements:\n- Use completely different keywords and themes\n- Explore new angles, metaphors, and perspectives\n- Vary the style (some catchy, some academic, some emotional, etc.)\n- Make each title memorable and distinct\n- Format as: "1. **Title: Subtitle**"`
      );

        const titles = answer
          .split(/\n|\r/)
          .map((t) => t.trim())
          .filter((t) => /^\d+\./.test(t))
          .map((t) => {
            // Remove the number prefix (e.g., "1. ")
            const withoutNumber = t.replace(/^\d+\.\s*/, '').trim();
            
            // Look for pipe separator first (our preferred format)
            const pipeMatch = withoutNumber.match(/^(.+?)\s*\|\s*(.+)$/);
            if (pipeMatch) {
              return { 
                title: pipeMatch[1].trim().replace(/\*\*/g, ''), 
                subtitle: pipeMatch[2].trim().replace(/\*\*/g, '') 
              };
            }
            
            // Fallback: look for colon or dash separators
            const colonDashMatch = withoutNumber.match(/^(.+?)\s*[:\-–]\s*(.+)$/);
            if (colonDashMatch) {
              return { 
                title: colonDashMatch[1].trim().replace(/\*\*/g, ''), 
                subtitle: colonDashMatch[2].trim().replace(/\*\*/g, '') 
              };
            }
            
            // If no separator found, treat entire text as title
            return { 
              title: withoutNumber.replace(/\*\*/g, '').trim(), 
              subtitle: '' 
            };
          })
          .filter(item => item.title.length > 0); // Remove empty titles

          console.log(titles);
          

        setTitleOptions(titles);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? createTitleSuggestionMessage(loadingId, refined, titles, summaryToUse)
              : m
          ));

    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId ? { id: loadingId, sender: 'bot', text: 'Failed to generate new suggestions.' } : m
        )
      );
    }
  };


  const getOutlineSuggestions = async (count, oldOutline = null) => {

    let answer;
    
    console.log("old outline",oldOutline);
    
    if(Array.isArray(oldOutline) && oldOutline.length > 0){
      // Generate completely different outline when regenerating
      const existingChapters = oldOutline.map(ch => `${ch.title}: ${ch.concept}`).join('\n');
      const summaryToUse = refinedSummary || summary;
      console.log("Summary to use: ", summaryToUse);


      
      answer = await askQuestion(
        `Generate a **completely NEW and UNIQUE** outline with ${count} chapters for the ${bookType} titled "${selectedTitle}", based on this summary: ${summaryToUse}

PREVIOUS OUTLINE TO AVOID (do not repeat, rephrase, or use similar concepts):
${existingChapters}

Requirements for the new outline:
- Use entirely different chapter themes and approaches
- Explore alternative angles, perspectives, or methodologies
- Introduce fresh concepts and unique chapter structures
- Avoid any similarity to the previous version
- Be creative and think outside the box

CRITICAL: You must format your response EXACTLY as shown below. Do not include any introduction, conclusion, or additional text. Start directly with "Chapter 1:" and follow this exact pattern:

Chapter 1: [Title]
[Brief concept description in 1-2 lines]

Chapter 2: [Title]  
[Brief concept description in 1-2 lines]

Chapter 3: [Title]
[Brief concept description in 1-2 lines]

Continue this exact format for all ${count} chapters. Each chapter must start with "Chapter X:" followed by the title on the same line, then the concept description on the next line(s).`
      );
      console.log(answer);
      
    } else {
      // Use a single, highly specific prompt that ensures consistent formatting
      const summaryToUse = refinedSummary || summary;
      
      const specificPrompt = `Create an outline for the ${bookType} titled "${selectedTitle}" based on this summary: ${summaryToUse}

CRITICAL: You must format your response EXACTLY as shown below. Do not include any introduction, conclusion, or additional text. Start directly with "Chapter 1:" and follow this exact pattern:

Chapter 1: [Title]
[Brief concept description in 1-2 lines]

Chapter 2: [Title]  
[Brief concept description in 1-2 lines]

Chapter 3: [Title]
[Brief concept description in 1-2 lines]

Continue this exact format for all ${count} chapters. Each chapter must start with "Chapter X:" followed by the title on the same line, then the concept description on the next line(s).`;

      answer = await askQuestion(specificPrompt);
    }
      
   

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
      // Get the target word count based on book type
      const getTargetWordCount = (bookType) => {
        switch (bookType) {
          case 'Ebook':
            return 700;
          case 'Short Book':
            return 1000;
          case 'Full Length Book':
            return 1500;
          default:
            return 700;
        }
      };

      const targetWords = getTargetWordCount(bookType);
      let fullChapterText = '';
      let previousParts = [];

      // Generate 4 parts sequentially
      for (let partIndex = 0; partIndex < 4; partIndex++) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId ? { ...m, text: fullChapterText + `\n\nGenerating Part ${partIndex + 1}/4...` } : m
          )
        );

        const stream = await generateChapterStream({
          bookId,
          bookType,
          summary,
          title: selectedTitle,
          chapterIndex: currentChapter,
          chapterTitle,
          keyPoints: _keyPoints ?? keyPoints,
          targetWordCount: targetWords,
          partIndex,
          previousParts: [...previousParts],
        });

        let partText = '';
        for await (const chunk of stream) {
          partText += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingId ? { ...m, text: fullChapterText + partText } : m
            )
          );
        }

        // Add this part to the full chapter and previous parts array with proper line breaks
        fullChapterText += (partIndex > 0 ? '\n\n' : '') + partText;
        previousParts.push(partText);

        // Small delay between parts to avoid rate limiting
        if (partIndex < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Save the complete chapter to the database
      try {
        const response = await fetch('/api/book/save-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId,
            chapterIndex: currentChapter,
            chapterTitle,
            keyPoints: _keyPoints ?? keyPoints,
            aiContent: fullChapterText,
          }),
        });

        if (!response.ok) {
          console.error('Failed to save chapter to database');
        }
      } catch (saveError) {
        console.error('Error saving chapter:', saveError);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId ? { ...m, text: fullChapterText, custom: formatMessageText(fullChapterText, true) } : m
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
            isHtml: true,
            htmlContent: `Great! Let's work on Chapter ${next}: ${nextTitle} \n Concept: ${nextConcept} \n <strong>Please enter ${getRequiredKeyPoints()} Key points you'd like to include in this Chapter:</strong>`,
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
    setUseCustomOutline(false);
    setCustomOutline([]);
    if (bookId) {
      saveChatState(bookId, {}).catch(() => {});
    }

  };
  const formatMessageText = (text, doubleSpace = false) => {
    if (!text || typeof text !== 'string') return text;

    let sanitized = formatChapterText(text, doubleSpace);

    // Remove ** markers that were added by formatChapterText but preserve the text
    sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, '$1');

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
                    <strong style={{ fontWeight: 'bold' }}>{cleaned}</strong>
                    <br />
                  </React.Fragment>
                );
              }

              // Check for part titles with !!! markers
              if (cleaned.includes('!!!')) {
                const match = cleaned.match(/^(.*?)!!!\s*([^!]+?)\s*!!!(.*?)$/);
                if (match) {
                  const beforeTitle = match[1].trim();
                  const partTitle = match[2].trim();
                  const afterTitle = match[3].trim();
                  
                  return (
                    <React.Fragment key={`${idx}-${jdx}`}>
                      {beforeTitle && (
                        <>
                          <span style={{ whiteSpace: 'pre-wrap' }}>{beforeTitle}</span>
                          <br />
                        </>
                      )}
                      <br />
                      <strong style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{partTitle}</strong>
                      <br />
                      <br />
                      {afterTitle && (
                        <>
                          <span style={{ whiteSpace: 'pre-wrap' }}>{afterTitle}</span>
                          <br />
                        </>
                      )}
                    </React.Fragment>
                  );
                }
              }

              // Check if line is already formatted with ** (from utils/format.ts)
              if (cleaned.startsWith('**') && cleaned.endsWith('**')) {
                const boldText = cleaned.slice(2, -2); // Remove ** markers
                return (
                  <React.Fragment key={`${idx}-${jdx}`}>
                    <br />
                    <strong style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{boldText}</strong>
                    <br />
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
                  {msg.isHtml && msg.htmlContent ? (
                    <div dangerouslySetInnerHTML={{ __html: msg.htmlContent.replace(/\n/g, '<br />') }} />
                  ) : (
                    msg.custom ? msg.custom : formatMessageText(msg.text)
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input Section */}
          {step === 'customOutline' && !isGenerating ? (
            <div className="p-3 keypointBg">
              <div className="scrollable-keypoints mb-2">
                {customOutline.map((chapter, idx) => (
                  <div key={idx} className="mb-3">
                    <label className="form-label text-dark">Chapter {idx + 1}</label>
                    <input
                      type="text"
                      className="keypoint-input mb-2"
                      value={chapter.title}
                      placeholder={`Chapter ${idx + 1} Title`}
                      onChange={(e) => handleCustomOutlineChange(idx, 'title', e.target.value)}
                    />
                    <textarea
                      className="keypoint-input"
                      value={chapter.concept}
                      placeholder={`Chapter ${idx + 1} Concept (optional)`}
                      onChange={(e) => handleCustomOutlineChange(idx, 'concept', e.target.value)}
                      rows={3}
                    />
                  </div>
                ))}
              </div>
              <div className="d-flex justify-content-between">
                <button className="btn-chat" onClick={handleSubmitCustomOutline}>
                  Submit Custom Outline
                </button>
                <button className="btn-toggle-input" onClick={() => {
                  setUseCustomOutline(false);
                  setStep('outline');
                }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : step === 'keypoints' && !isGenerating ? (
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
                  
                  <button className="btn-toggle-input" onClick={handleSkipKeyPoints}>
                    Skip this step
                  </button>
                 
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
                    
                      <button className="btn-toggle-input" onClick={handleSkipKeyPoints}>
                        Skip this step
                      </button>
                
                  </div>
                </div>
              </div>
            )
          ) : step === 'outline' || step === 'customOutline' ? null : (
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
