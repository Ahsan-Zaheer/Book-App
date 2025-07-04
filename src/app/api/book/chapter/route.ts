import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";
import { ChatOpenAI } from "@langchain/openai";
import { CallbackManager } from "@langchain/core/callbacks/manager"; // ✅ Import this
import { HumanMessage } from "@langchain/core/messages"; // ✅ Needed for .call()
import { formatChapterText } from "../../../../../utils/format";

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
  
  const prompt =`You are a professional book writer. Write Chapter ${chapterIndex} titled "${chapterTitle}" for the ${bookType} "${title}".\n\n `+
  "Strictly follow this structure:\n" +
  "1. Start the chapter with this exact line (no extra characters, no quotes):\n" +
  `   Chapter ${chapterIndex}: ${chapterTitle}\n` +
  `2. Divide the chapter into exactly 4 parts. Each part must:\n`+
  `   - Have MORE THAN ${wordsPerPart} WORDS.\n` +
  `   - Begin on a new line\n` +
  `   - Start with a heading in this exact format (including colon at the end):\n` +
  `     Part X: Title:\n` +
  "Do not skip or alter any colons. Do not change the heading format. Follow the format exactly.\n" +
  `3. The COMPLETE chapter MUST have more than ${wordsPerPart * 4 } WORDS.\n\n ` +
  "Use the following content to guide your writing:\n" +
  `  Summary: ${summary}\n` +
  `  Key points: ${keyPoints.join("; ")}\n`;

  const encoder = new TextEncoder();
  let content = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const model = new ChatOpenAI({
          modelName: "gpt-4.1",
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

              const formatted = formatChapterText(content);

              book.chapters.push({
                idx: chapterIndex,
                title: chapterTitle,
                keyPoints,
                aiContent: formatted,
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
