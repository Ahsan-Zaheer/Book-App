import React, { useRef, useEffect } from 'react';
import BookTypeSelector from './components/BookTypeSelector';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import KeyPointsInput from './components/KeyPointsInput';
import LoadingOverlay from './components/LoadingOverlay';
import FloatingTitleBar from './components/FloatingTitleBar';
import useChatState from './hooks/useChatState';
import { getRequiredKeyPoints, getChapterRange, getInitialKeyPoints, ensureTitleInStorage } from './utils/bookHelpers';
import '../stylesheets/style.css';

export default function ChatScreen({ initialBookId = null }) {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const keyPointRefs = useRef([]);

  const {
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
    generateId
  } = useChatState(initialBookId);

  const isFirstPrompt = messages.length === 1 && step === 'bookType';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
    setIsMultiline(value.trim().length > 0);
  };

  const handleTypeSelect = (type) => {
    setBookType(type);
    setSelectedBookType(type);
    setInput(`I want to write a ${type}`);
    inputRef.current?.focus();
  };

  const handleClearChat = () => {
    setMessages([
      { id: generateId(), sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' },
    ]);
    setInput('');
    setStep('bookType');
    setKeyPoints(getInitialKeyPoints(bookType));
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
  };

  // Other handler functions would be extracted to separate files or remain here
  // depending on their complexity and reusability

  return (
    <div className="d-flex flex-column chatScreen" style={{ height: '100vh' }}>
      <LoadingOverlay isVisible={isLoadingChat} />
      
      {isFirstPrompt ? (
        <>
          <BookTypeSelector 
            selectedBookType={selectedBookType} 
            onTypeSelect={handleTypeSelect} 
          />
          <ChatInput
            input={input}
            inputRef={inputRef}
            placeholder="Is it Ebook, Short Length Book or Full Length Book..."
            isMultiline={isMultiline}
            onChange={handleInputChange}
            onSend={() => sendMessage()}
          />
        </>
      ) : (
        <>
          <MessageList messages={messages} bottomRef={bottomRef} />
          
          {step === 'keypoints' && !isGenerating ? (
            useSimpleInput ? (
              <ChatInput
                input={input}
                inputRef={inputRef}
                placeholder={`Enter ${getRequiredKeyPoints(bookType)} key points separated by semicolons`}
                isMultiline={isMultiline}
                onChange={handleInputChange}
                onSend={() => sendMessage()}
                showSkipButton={true}
                onSkip={handleSkipKeyPoints}
                bookType={bookType}
              />
            ) : (
              <KeyPointsInput
                keyPoints={keyPoints}
                useSimpleInput={useSimpleInput}
                bookType={bookType}
                getRequiredKeyPoints={() => getRequiredKeyPoints(bookType)}
                onKeyPointChange={handleKeyPointChange}
                onKeyPointEnter={handleKeyPointEnter}
                onSubmitKeyPoints={handleSubmitKeyPoints}
                onSkipKeyPoints={handleSkipKeyPoints}
                onToggleSimpleInput={setUseSimpleInput}
                keyPointRefs={keyPointRefs}
              />
            )
          ) : step === 'outline' ? null : (
            <ChatInput
              input={input}
              inputRef={inputRef}
              placeholder="Type your message..."
              isMultiline={isMultiline}
              onChange={handleInputChange}
              onSend={() => sendMessage()}
            />
          )}

          <div>
            <button className="btn-clear-chat" onClick={handleClearChat}>
              🧹 Clear Chat
            </button>
          </div>

          <FloatingTitleBar bookId={bookId} />
        </>
      )}
    </div>
  );
}