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
    "🚨 CRITICAL WORD COUNT REQUIREMENT: You MUST write EXACTLY " + totalWords + " words total. DO NOT STOP UNTIL YOU REACH THIS TARGET! 🚨\n\n" +
    
    "MANDATORY STRUCTURE (MUST FOLLOW EXACTLY):\n" +
    "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
    "Part 1: [Insert Creative Title]\n[Write comprehensive content with detailed explanations, examples, and thorough coverage - EXACTLY " + wordsPerPart + " words]\n\n" +
    "Part 2: [Insert Creative Title]\n[Write comprehensive content with detailed explanations, examples, and thorough coverage - EXACTLY " + wordsPerPart + " words]\n\n" +
    "Part 3: [Insert Creative Title]\n[Write comprehensive content with detailed explanations, examples, and thorough coverage - EXACTLY " + wordsPerPart + " words]\n\n" +
    "Part 4: [Insert Creative Title]\n[Write comprehensive content with detailed explanations, examples, and thorough coverage - EXACTLY " + wordsPerPart + " words]\n\n" +
    
    "ABSOLUTE WORD COUNT REQUIREMENTS:\n" +
    "- TOTAL TARGET: " + totalWords + " words (YOU MUST REACH THIS NUMBER)\n" +
    "- Each part target: " + wordsPerPart + " words (EXPAND CONTENT TO MEET THIS)\n" +
    "- Write detailed paragraphs with comprehensive explanations\n" +
    "- Include examples, case studies, detailed analysis\n" +
    "- Expand on every concept thoroughly\n" +
    "- DO NOT summarize or compress - EXPAND and ELABORATE\n\n" +
    
    "CONTENT EXPANSION REQUIREMENTS:\n" +
    "- Use these key points across all 4 parts: " + keyPoints.join("; ") + "\n" +
    "- Write in-depth, educational content with extensive detail\n" +
    "- Include practical examples and real-world applications\n" +
    "- Add comprehensive explanations for every concept\n" +
    "- Use descriptive language and thorough analysis\n" +
    "- Add TWO SPACES after every period\n" +
    "- Professional, educational tone with rich vocabulary\n" +
    "- Write full paragraphs - no bullet points or short sentences\n\n" +
    
    "BOOK SUMMARY TO FOLLOW: " + summary;
  } else {
    prompt = basePrompt +
      "🚨 ABSOLUTE WORD COUNT REQUIREMENT: You MUST write EXACTLY " + totalWords + " words total. DO NOT STOP WRITING UNTIL YOU REACH THIS TARGET! 🚨\n\n" +
      
      "MANDATORY WORD TARGETS (NON-NEGOTIABLE):\n" +
      "- Part 1: EXACTLY " + wordsPerPart + " words (write extensively with detailed explanations)\n" +
      "- Part 2: EXACTLY " + wordsPerPart + " words (write extensively with detailed explanations)\n" +
      "- Part 3: EXACTLY " + wordsPerPart + " words (write extensively with detailed explanations)\n" +
      "- Part 4: EXACTLY " + wordsPerPart + " words (write extensively with detailed explanations)\n" +
      "- TOTAL: " + totalWords + " words (YOU MUST REACH THIS NUMBER)\n\n" +
      
      "STRUCTURE (Follow exactly):\n" +
      "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
      "Part 1: [Creative Title]\n[Write extensive, comprehensive content with detailed explanations, examples, and thorough analysis - EXACTLY " + wordsPerPart + " words]\n\n" +
      "Part 2: [Creative Title]\n[Write extensive, comprehensive content with detailed explanations, examples, and thorough analysis - EXACTLY " + wordsPerPart + " words]\n\n" +
      "Part 3: [Creative Title]\n[Write extensive, comprehensive content with detailed explanations, examples, and thorough analysis - EXACTLY " + wordsPerPart + " words]\n\n" +
      "Part 4: [Creative Title]\n[Write extensive, comprehensive content with detailed explanations, examples, and thorough analysis - EXACTLY " + wordsPerPart + " words]\n\n" +
      
      "CONTENT EXPANSION REQUIREMENTS:\n" +
      "- Write in-depth, educational content about the book topic\n" +
      "- Use extensive paragraphs with comprehensive explanations\n" +
      "- Include detailed examples, case studies, and practical applications\n" +
      "- Provide thorough analysis and deep insights\n" +
      "- Add two spaces after every period\n" +
      "- Professional, educational tone with rich vocabulary\n" +
      "- Expand every concept fully to meet exact word count requirements\n" +
      "- DO NOT summarize or compress - ELABORATE and EXPAND\n\n" +
      
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
          temperature: 0.3, // Slightly higher for more creative expansion
          streaming: true,
          maxTokens: Math.ceil(totalWords * 1.8), // Increased token limit to allow full generation
          openAIApiKey: process.env.OPEN_AI_KEY,
          callbackManager: CallbackManager.fromHandlers({
            async handleLLMNewToken(token) {
              content += token;
              
              // Count words in real-time
              const currentWordCount = countWords(content);
              
              // Only stop if we significantly exceed the target
              if (currentWordCount > totalWords + 200) {
                console.log("Stopping generation - word count exceeded:", currentWordCount);
                controller.enqueue(encoder.encode("event: done\n\n"));
                controller.close();
                return;
              }
          
              // Log progress every 500 words
              if (currentWordCount % 500 === 0) {
                console.log(`Progress: ${currentWordCount}/${totalWords} words`);
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
