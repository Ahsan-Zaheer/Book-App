import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";

export const POST = async (req: Request) => {
  try {
    const { bookId, chapterIndex, chapterTitle, keyPoints, aiContent } = await req.json();

    if (!bookId || !chapterIndex || !chapterTitle || !aiContent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();
    const book = await Book.findById(bookId);
    
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Check if chapter already exists and update it, otherwise add new chapter
    const existingChapterIndex = book.chapters.findIndex(ch => ch.idx === chapterIndex);
    
    if (existingChapterIndex !== -1) {
      // Update existing chapter
      book.chapters[existingChapterIndex] = {
        idx: chapterIndex,
        title: chapterTitle,
        keyPoints: keyPoints || [],
        aiContent: aiContent,
      };
    } else {
      // Add new chapter
      book.chapters.push({
        idx: chapterIndex,
        title: chapterTitle,
        keyPoints: keyPoints || [],
        aiContent: aiContent,
      });
    }

    // Update book status
    if (book.chapterCount && book.chapters.length >= book.chapterCount) {
      book.status = "generated";
    } else {
      book.status = "generating";
    }

    await book.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving chapter:', error);
    return NextResponse.json({ error: "Failed to save chapter" }, { status: 500 });
  }
};
