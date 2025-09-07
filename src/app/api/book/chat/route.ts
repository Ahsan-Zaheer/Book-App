import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }
  await connectToDatabase();
  const book = await (Book as any).findById(bookId).lean();
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  

  
  // If chatState is empty but book has chapters, reconstruct chatState
  const hasChapters = book.chapters && book.chapters.length > 0;
  const hasIncompleteOrMinimalChatState = !book.chatState || 
    !book.chatState.messages || 
    book.chatState.messages.length === 0 ||
    book.chatState.step === 'bookType' ||
    (hasChapters && book.chatState.step !== 'content' && book.chatState.messages.length < book.chapters.length + 4);



  if (hasChapters && hasIncompleteOrMinimalChatState) {
    
    // Determine book type from chapter count if not specified
    let bookTypeToUse = book.bookType;
    if (!bookTypeToUse) {
      const chapterCount = book.chapters.length;
      if (chapterCount <= 6) bookTypeToUse = 'Ebook';
      else if (chapterCount <= 10) bookTypeToUse = 'Short Book';
      else bookTypeToUse = 'Full Length Book';
    }
    
    // Create outline from existing chapters
    const reconstructedOutline = book.chapters.map(ch => ({
      title: ch.title,
      concept: ch.keyPoints ? ch.keyPoints.slice(0, 3).join(', ') : 'Chapter content'
    }));
    
    // Reconstruct messages showing the book completion
    const reconstructedMessages = [
      { id: `${Date.now()}-1`, sender: 'bot', text: 'Hi 👋! What kind of book do you want to write?' },
      { id: `${Date.now()}-2`, sender: 'user', text: `I want to write a ${bookTypeToUse}` },
      { id: `${Date.now()}-3`, sender: 'user', text: book.summary },
      { id: `${Date.now()}-4`, sender: 'bot', text: `Great! Your book "${book.suggestedTitle || book.title}" has been completed with ${book.chapters.length} chapters.` },
      ...book.chapters.map((chapter, index) => ({
        id: `${Date.now()}-${index + 5}`,
        sender: 'bot',
        text: `**Chapter ${chapter.idx || index + 1}: ${chapter.title}**\n\n${chapter.aiContent}`,
      })),
      { id: `${Date.now()}-${book.chapters.length + 5}`, sender: 'bot', text: '🎉 Book generation complete!' }
    ];
    
    // Create reconstructed chatState
    const reconstructedChatState = {
      messages: reconstructedMessages,
      step: 'content',
      bookType: bookTypeToUse,
      selectedBookType: bookTypeToUse,
      selectedTitle: book.suggestedTitle || book.title || 'Untitled Book',
      selectedChapter: '',
      chapterCount: book.chapters.length,
      summary: book.summary || '',
      refinedSummary: book.summary || '',
      titleOptions: [],
      currentChapter: book.chapters.length + 1,
      keyPoints: ['', '', ''],
      hasKeyPoints: false,
      outline: reconstructedOutline,
      useCustomOutline: false,
      customOutline: []
    };
    
    // Update the book with the reconstructed chatState
    await (Book as any).findByIdAndUpdate(bookId, { chatState: reconstructedChatState });

    
    // Return the full book data with reconstructed chatState
    return NextResponse.json({ 
      data: {
        ...book,
        chatState: reconstructedChatState
      }
    });
  }
  

  return NextResponse.json({ data: book });
};

export const PUT = async (req: Request) => {
  const { bookId, state } = await req.json();
  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }
  await connectToDatabase();
  const book = await (Book as any).findByIdAndUpdate(bookId, { chatState: state }, { new: true });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  return NextResponse.json({ data: book.chatState });
};
