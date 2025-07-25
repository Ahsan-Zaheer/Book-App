import { useState, useEffect, useRef } from 'react';
import { loadChatState, saveChatState } from '../utils/api';

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function useChatState(initialBookId) {
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

  const saveTimeout = useRef(null);

  // Load stored chat when an initial book id is provided
  useEffect(() => {
    const load = async () => {
      if (!initialBookId) return;
      setIsLoadingChat(true);
      try {
        const stored = await loadChatState(initialBookId);
        if (stored) {
          // Restore all state from stored data
          if (stored.step) setStep(stored.step);
          if (stored.bookType) setBookType(stored.bookType);
          if (stored.selectedBookType) setSelectedBookType(stored.selectedBookType);
          if (stored.selectedTitle) setSelectedTitle(stored.selectedTitle);
          if (stored.selectedChapter) setSelectedChapter(stored.selectedChapter);
          if (typeof stored.chapterCount !== 'undefined') setChapterCount(stored.chapterCount);
          if (stored.summary) setSummary(stored.summary);
          if (typeof stored.currentChapter !== 'undefined') setCurrentChapter(stored.currentChapter);
          if (Array.isArray(stored.keyPoints)) setKeyPoints(stored.keyPoints);
          if (typeof stored.hasKeyPoints === 'boolean') setHasKeyPoints(stored.hasKeyPoints);
          if (Array.isArray(stored.outline)) setOutline(stored.outline);
          if (stored.refinedSummary) setRefinedSummary(stored.refinedSummary);
          if (Array.isArray(stored.titleOptions)) setTitleOptions(stored.titleOptions);
          
          // Restore messages with custom components
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

  // Auto-save chat state
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

  const restoreMessage = (msg) => {
    // Implementation for restoring custom message types
    if (msg.customType === 'titleSuggestions' && msg.data) {
      // Return restored title suggestions component
    }
    // Add other message type restorations
    return msg;
  };

  return {
    // State
    input, setInput,
    messages, setMessages,
    step, setStep,
    keyPoints, setKeyPoints,
    bookType, setBookType,
    selectedTitle, setSelectedTitle,
    selectedChapter, setSelectedChapter,
    selectedBookType, setSelectedBookType,
    chapterCount, setChapterCount,
    bookId, setBookId,
    titleOptions, setTitleOptions,
    refinedSummary, setRefinedSummary,
    summary, setSummary,
    currentChapter, setCurrentChapter,
    hasKeyPoints, setHasKeyPoints,
    isGenerating, setIsGenerating,
    isMultiline, setIsMultiline,
    outline, setOutline,
    isLoadingChat,
    useSimpleInput, setUseSimpleInput,
    
    // Helper function
    generateId
  };
}
