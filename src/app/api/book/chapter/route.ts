import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";
import { ChatOpenAI } from "@langchain/openai";

export const POST = async (req: Request) => {
  const { bookId, bookType, summary, title, chapterIndex, chapterTitle, keyPoints } = await req.json();

  if (!bookId || !chapterTitle || !summary || !title || !Array.isArray(keyPoints) || !chapterIndex) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await connectToDatabase();
  const book = await Book.findById(bookId);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  book.status = "generating";
  await book.save();

  const prompt = `You are a professional book writer. Write chapter ${chapterIndex} titled "${chapterTitle}" for the ${bookType} \"${title}\". Base it on the following summary and key points.\nSummary: ${summary}\nKey points: ${keyPoints.join("; ")}`;

  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    openAIApiKey: process.env.OPEN_AI_KEY,
  });

  const response = await model.invoke(prompt);

  book.chapters.push({ idx: chapterIndex, title: chapterTitle, keyPoints, aiContent: response });
  if (book.chapterCount && book.chapters.length >= book.chapterCount) {
    book.status = "generated";
  }
  await book.save();

  return NextResponse.json({ data: { chapter: response } });
};
