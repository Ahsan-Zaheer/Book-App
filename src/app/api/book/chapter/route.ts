import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";
import { ChatOpenAI } from "@langchain/openai";
import { CallbackManager } from "@langchain/core/callbacks/manager"; // ✅ Import this
import { HumanMessage } from "@langchain/core/messages"; // ✅ Needed for .call()

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

  const wordsPerPart =
    bookType === "Ebook" ? 700 : bookType === "Short Book" ? 1000 : 1500;

  const prompt = `You are a professional book writer. Write chapter ${chapterIndex} titled "${chapterTitle}" for the ${bookType} "${title}".\n` +
    `Start the chapter with \"Chapter ${chapterIndex}: ${chapterTitle}\" on its own line. ` +
    `Divide the chapter into 4 parts, each exactly ${wordsPerPart} words. ` +
    `Each part must begin on a new line with a heading in the format \"Part X: Title\".` +
    ` Use the following summary and key points.\nSummary: ${summary}\nKey points: ${keyPoints.join("; ")}`;

  const encoder = new TextEncoder();
  let content = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const model = new ChatOpenAI({
          modelName: "gpt-4o-mini",
          temperature: 0.7,
          streaming: true,
          openAIApiKey: process.env.OPEN_AI_KEY,
          callbackManager: CallbackManager.fromHandlers({
            async handleLLMNewToken(token) {
              content += token;
              controller.enqueue(encoder.encode(`data: ${token}\n\n`));
            },
            async handleLLMEnd() {
              controller.enqueue(encoder.encode("event: done\n\n"));
              controller.close();

              book.chapters.push({
                idx: chapterIndex,
                title: chapterTitle,
                keyPoints,
                aiContent: content,
              });

              if (book.chapterCount && book.chapters.length >= book.chapterCount) {
                book.status = "generated";
              }

              await book.save();
            },
            async handleLLMError(err) {
              controller.error(err);
            },
          }),
        });

        // ✅ Correct way to call the model
        await model.call([new HumanMessage(prompt)]);
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
