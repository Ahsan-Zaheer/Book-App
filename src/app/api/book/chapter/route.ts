import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";
import { ChatOpenAI } from "@langchain/openai";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { HumanMessage } from "@langchain/core/messages";
import { formatChapterText } from "../../../../../utils/format";




function getWordsPerPart(bookType: string): number {
  switch (bookType) {
    case 'Ebook':
      return 700; 
    case 'Short Book':
      return 1000; 
    case 'Full Length Book':
      return 1500; 
      return 700;
  }
}

// Helper function to count words (for debugging)
function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Remove markdown formatting and extra whitespace
  const cleanText = text
    .replace(/\*\*/g, '') 
    .replace(/#+/g, '') 
    .replace(/\s+/g, ' ') 
    .trim();
  
  // Split by whitespace and filter out empty strings
  return cleanText.split(/\s+/).filter(word => word.length > 0).length;
}

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

  // Fixed word count calculations
  const wordsPerPart = getWordsPerPart(bookType);
  const totalWords = wordsPerPart * 4;

  console.log(`Total words for chapter: ${totalWords} (Parts: ${wordsPerPart} each)`);

  const basePrompt = "You are a professional book writer. Write Chapter " + chapterIndex + " titled \"" + chapterTitle + "\" for the " + "Book" + " \"" + title + "\".\n\n";

  let prompt: string;

  if (keyPoints.length > 0) {
    prompt = basePrompt +
    "IMPORTANT: You are writing a professional-grade chapter with strict format and word count requirements.\n\n" +
    
    "CHAPTER STRUCTURE:\n" +
    "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
    "Part 1: [Insert Title]\n[Write EXACTLY " + wordsPerPart + " words]\n\n" +
    "Part 2: [Insert Title]\n[Write EXACTLY " + wordsPerPart + " words]\n\n" +
    "Part 3: [Insert Title]\n[Write EXACTLY " + wordsPerPart + " words]\n\n" +
    "Part 4: [Insert Title]\n[Write EXACTLY " + wordsPerPart + " words]\n\n" +
    
    "TOTAL WORDS: EXACTLY " + totalWords + ". EACH PART MUST HAVE EXACT WORD COUNT — NO MORE, NO LESS.\n\n" +
    
    "RULES:\n" +
    "- Do NOT summarize, do NOT compress.\n" +
    "- Do NOT exceed or fall short in word count. Each part must be standalone and precisely written.\n" +
    "- Use the following key points across the 4 parts. Spread them logically: " + keyPoints.join("; ") + "\n" +
    "- Add TWO SPACES after every period.\n" +
    "- Use clear, professional tone.\n" +
    "- Count the words as you write.\n\n" +
    
    "ADDITIONAL:\n" +
    "- If helpful, write a few short paragraphs per part to hit the exact word count.\n" +
    "- Avoid bullet points, markdown, or dialogue unless contextually relevant.\n\n" +
    
    "BOOK SUMMARY TO FOLLOW: " + summary;
  } else {
    prompt = basePrompt +
      "READ CAREFULLY:\n\n" +
      
      "WORD COUNT LIMITS:\n" +
      "- Part 1: Write EXACTLY " + wordsPerPart + " words, then STOP\n" +
      "- Part 2: Write EXACTLY " + wordsPerPart + " words, then STOP\n" +
      "- Part 3: Write EXACTLY " + wordsPerPart + " words, then STOP\n" +
      "- Part 4: Write EXACTLY " + wordsPerPart + " words, then STOP\n" +
      "- TOTAL CHAPTER: " + totalWords + " words maximum\n" +
      "- DO NOT exceed these limits under any circumstances\n\n" +
      
      "STRUCTURE (Follow this exact format):\n" +
      "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
      "Part 1: [Title]:\n[Content - exactly " + wordsPerPart + " words]\n\n" +
      "Part 2: [Title]:\n[Content - exactly " + wordsPerPart + " words]\n\n" +
      "Part 3: [Title]:\n[Content - exactly " + wordsPerPart + " words]\n\n" +
      "Part 4: [Title]:\n[Content - exactly " + wordsPerPart + " words]\n\n" +
      
      "CONTENT RULES:\n" +
      "- Write educational content related to the book topic\n" +
      "- Add two spaces after every period\n" +
      "- Professional, clear tone\n\n" +
      
      "Book Summary: " + summary;
  }

  const encoder = new TextEncoder();
  let content = "";
  let wordCount = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const model = new ChatOpenAI({
          modelName: "gpt-4o",
          temperature: 0.2, // Lower temperature for more controlled output
          streaming: true,
          maxTokens: Math.ceil(totalWords * 1.3), // Limit tokens to prevent overgeneration
          openAIApiKey: process.env.OPEN_AI_KEY,
          callbackManager: CallbackManager.fromHandlers({
            async handleLLMNewToken(token) {
              content += token;
              
              // Count words in real-time
              const currentWordCount = countWords(content);
              
              // Stop if we exceed the target (with small buffer)
              if (currentWordCount > totalWords + 100) {
                console.log("Stopping generation - word count exceeded:", currentWordCount);
                controller.enqueue(encoder.encode("event: done\n\n"));
                controller.close();
                return;
              }
              
              controller.enqueue(encoder.encode("data: " + token + "\n\n"));
            },
            async handleLLMEnd() {
              controller.enqueue(encoder.encode("event: done\n\n"));
              controller.close();

              const formatted = formatChapterText(content, true);
              
              // Log word count for debugging
              const finalWordCount = countWords(formatted);
              console.log("Generated chapter word count: " + finalWordCount + ", Expected: " + totalWords);

              book.chapters.push({
                idx: chapterIndex,
                title: chapterTitle,
                keyPoints: keyPoints,
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