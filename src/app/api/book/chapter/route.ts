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
  const { bookId, bookType, summary, title, chapterIndex, chapterTitle, keyPoints, targetWordCount } = await req.json();

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

  // Use targetWordCount from frontend if provided, otherwise fall back to getWordsPerPart
  const wordsPerPart = targetWordCount || getWordsPerPart(bookType);
  const totalWords = wordsPerPart * 4;

  console.log(`Total words for chapter: ${totalWords} (Parts: ${wordsPerPart} each)`);
  console.log(`Target word count received: ${targetWordCount}`);

  const basePrompt = "You are a professional book writer. Write Chapter " + chapterIndex + " titled \"" + chapterTitle + "\" for the " + "Book" + " \"" + title + "\".\n\n";

  let prompt: string;

  if (keyPoints.length > 0) {
    prompt = basePrompt +
    "CRITICAL: You MUST write EXACTLY " + totalWords + " words total. This is NON-NEGOTIABLE.\n\n" +
    
    "MANDATORY STRUCTURE:\n" +
    "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
    "Part 1: [Insert Title]\n[Write EXACTLY " + wordsPerPart + " words - count every single word]\n\n" +
    "Part 2: [Insert Title]\n[Write EXACTLY " + wordsPerPart + " words - count every single word]\n\n" +
    "Part 3: [Insert Title]\n[Write EXACTLY " + wordsPerPart + " words - count every single word]\n\n" +
    "Part 4: [Insert Title]\n[Write EXACTLY " + wordsPerPart + " words - count every single word]\n\n" +
    
    "WORD COUNT ENFORCEMENT:\n" +
    "- TOTAL: " + totalWords + " words (no exceptions)\n" +
    "- Each part: " + wordsPerPart + " words (no exceptions)\n" +
    "- Count words continuously as you write\n" +
    "- Stop immediately when you reach the target\n\n" +
    
    "CONTENT REQUIREMENTS:\n" +
    "- Use these key points across all 4 parts: " + keyPoints.join("; ") + "\n" +
    "- Write detailed, comprehensive content to reach word targets\n" +
    "- Add TWO SPACES after every period\n" +
    "- Professional, educational tone\n" +
    "- No bullet points or lists - use full paragraphs\n" +
    "- Expand on concepts with examples and explanations\n\n" +
    
    "BOOK SUMMARY TO FOLLOW: " + summary;
  } else {
    prompt = basePrompt +
      "CRITICAL WORD COUNT REQUIREMENT: You MUST write EXACTLY " + totalWords + " words total.\n\n" +
      
      "MANDATORY WORD TARGETS:\n" +
      "- Part 1: EXACTLY " + wordsPerPart + " words (count each word)\n" +
      "- Part 2: EXACTLY " + wordsPerPart + " words (count each word)\n" +
      "- Part 3: EXACTLY " + wordsPerPart + " words (count each word)\n" +
      "- Part 4: EXACTLY " + wordsPerPart + " words (count each word)\n" +
      "- TOTAL: " + totalWords + " words (this is mandatory)\n\n" +
      
      "STRUCTURE (Follow exactly):\n" +
      "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
      "Part 1: [Title]\n[Write comprehensive content with detailed explanations - exactly " + wordsPerPart + " words]\n\n" +
      "Part 2: [Title]\n[Write comprehensive content with detailed explanations - exactly " + wordsPerPart + " words]\n\n" +
      "Part 3: [Title]\n[Write comprehensive content with detailed explanations - exactly " + wordsPerPart + " words]\n\n" +
      "Part 4: [Title]\n[Write comprehensive content with detailed explanations - exactly " + wordsPerPart + " words]\n\n" +
      
      "WRITING REQUIREMENTS:\n" +
      "- Write detailed, educational content about the book topic\n" +
      "- Use full paragraphs with comprehensive explanations\n" +
      "- Include examples, details, and thorough coverage\n" +
      "- Add two spaces after every period\n" +
      "- Professional, clear tone\n" +
      "- Expand concepts fully to meet word count requirements\n\n" +
      
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
              if (currentWordCount > totalWords + 50) {
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
