import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";
import { ChatOpenAI } from "@langchain/openai";

export const POST = async (req: Request) => {
  const { bookId, bookType, summary, title, chapterCount, keyPoints } = await req.json();

  if (!bookId || !summary || !title || !chapterCount || !Array.isArray(keyPoints)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await connectToDatabase();
  const book = await Book.findById(bookId);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Update book status before generation
  book.status = "generating";
  book.chapterCount = chapterCount;
  await book.save();

  const wordsPerPart =
    bookType === 'Ebook' ? 700 : bookType === 'Short Book' ? 100 : 1500;
  const prompt = `You are a professional book writer. Write a ${bookType} titled "${title}" based on the following summary and key points. The book must have ${chapterCount} chapters with each part about ${wordsPerPart} words. \nSummary: ${summary}\nKey points: ${keyPoints.join("; ")}`;

  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    openAIApiKey: process.env.OPEN_AI_KEY,
  });

  const response = await model.invoke(prompt);

  book.status = "generated";
  book.chapters = [ { idx: 1, title: title, keyPoints, aiContent: response.content } ];
  await book.save();

  return NextResponse.json({ data: book });
};
