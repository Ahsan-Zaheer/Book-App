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
    "🚨 CRITICAL WORD COUNT REQUIREMENT: You MUST write EXACTLY " + totalWords + " words total. DO NOT STOP WRITING UNTIL YOU REACH THIS EXACT NUMBER! 🚨\n\n" +
    
    "MANDATORY STRUCTURE (MUST FOLLOW EXACTLY):\n" +
    "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
    "Part 1: [Insert Creative Title]\n[Write extensive, comprehensive content with detailed explanations, multiple examples, case studies, and thorough coverage - EXACTLY " + wordsPerPart + " words]\n\n" +
    "Part 2: [Insert Creative Title]\n[Write extensive, comprehensive content with detailed explanations, multiple examples, case studies, and thorough coverage - EXACTLY " + wordsPerPart + " words]\n\n" +
    "Part 3: [Insert Creative Title]\n[Write extensive, comprehensive content with detailed explanations, multiple examples, case studies, and thorough coverage - EXACTLY " + wordsPerPart + " words]\n\n" +
    "Part 4: [Insert Creative Title]\n[Write extensive, comprehensive content with detailed explanations, multiple examples, case studies, and thorough coverage - EXACTLY " + wordsPerPart + " words]\n\n" +
    
    "ABSOLUTE WORD COUNT REQUIREMENTS:\n" +
    "- TOTAL TARGET: " + totalWords + " words (THIS IS NON-NEGOTIABLE - YOU MUST REACH THIS EXACT NUMBER)\n" +
    "- Each part target: " + wordsPerPart + " words (WRITE EXTENSIVELY TO MEET THIS)\n" +
    "- Count words as you write and continue until you reach the target\n" +
    "- Write multiple detailed paragraphs with comprehensive explanations\n" +
    "- Include multiple examples, case studies, detailed analysis, and practical applications\n" +
    "- Expand on every concept thoroughly with extensive detail\n" +
    "- DO NOT summarize, compress, or conclude early - KEEP EXPANDING AND ELABORATING\n" +
    "- If you reach what feels like a natural conclusion, continue with additional insights, examples, or analysis\n\n" +
    
    "CONTENT EXPANSION REQUIREMENTS:\n" +
    "- Use these key points across all 4 parts: " + keyPoints.join("; ") + "\n" +
    "- Write in-depth, educational content with extensive detail and multiple perspectives\n" +
    "- Include practical examples, real-world applications, case studies, and scenarios\n" +
    "- Add comprehensive explanations for every concept with multiple angles\n" +
    "- Use descriptive language, thorough analysis, and rich vocabulary\n" +
    "- Write extensive paragraphs with detailed exploration of each topic\n" +
    "- Add TWO SPACES after every period\n" +
    "- Professional, educational tone with extensive elaboration\n" +
    "- NO bullet points or short sentences - use full, detailed paragraphs\n" +
    "- Continue writing until you reach exactly " + totalWords + " words\n\n" +
    
    "BOOK SUMMARY TO FOLLOW: " + summary;
  } else {
    prompt = basePrompt +
      "🚨 ABSOLUTE WORD COUNT REQUIREMENT: You MUST write EXACTLY " + totalWords + " words total. DO NOT STOP WRITING UNTIL YOU REACH THIS EXACT TARGET! 🚨\n\n" +
      
      "MANDATORY WORD TARGETS (NON-NEGOTIABLE):\n" +
      "- Part 1: EXACTLY " + wordsPerPart + " words (write extensively with multiple detailed explanations and examples)\n" +
      "- Part 2: EXACTLY " + wordsPerPart + " words (write extensively with multiple detailed explanations and examples)\n" +
      "- Part 3: EXACTLY " + wordsPerPart + " words (write extensively with multiple detailed explanations and examples)\n" +
      "- Part 4: EXACTLY " + wordsPerPart + " words (write extensively with multiple detailed explanations and examples)\n" +
      "- TOTAL: " + totalWords + " words (THIS IS MANDATORY - COUNT AS YOU WRITE)\n\n" +
      
      "STRUCTURE (Follow exactly):\n" +
      "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
      "Part 1: [Creative Title]\n[Write extensive, comprehensive content with multiple detailed explanations, examples, case studies, and thorough analysis - EXACTLY " + wordsPerPart + " words]\n\n" +
      "Part 2: [Creative Title]\n[Write extensive, comprehensive content with multiple detailed explanations, examples, case studies, and thorough analysis - EXACTLY " + wordsPerPart + " words]\n\n" +
      "Part 3: [Creative Title]\n[Write extensive, comprehensive content with multiple detailed explanations, examples, case studies, and thorough analysis - EXACTLY " + wordsPerPart + " words]\n\n" +
      "Part 4: [Creative Title]\n[Write extensive, comprehensive content with multiple detailed explanations, examples, case studies, and thorough analysis - EXACTLY " + wordsPerPart + " words]\n\n" +
      
      "CONTENT EXPANSION REQUIREMENTS:\n" +
      "- Write in-depth, educational content about the book topic with extensive detail\n" +
      "- Use multiple extensive paragraphs with comprehensive explanations\n" +
      "- Include multiple detailed examples, case studies, practical applications, and scenarios\n" +
      "- Provide thorough analysis, deep insights, and multiple perspectives\n" +
      "- Add two spaces after every period\n" +
      "- Professional, educational tone with rich vocabulary and extensive elaboration\n" +
      "- Expand every concept fully with multiple angles and detailed exploration\n" +
      "- DO NOT summarize, compress, or conclude early - KEEP WRITING UNTIL YOU REACH " + totalWords + " WORDS\n" +
      "- If you feel like concluding, continue with additional insights, examples, or detailed analysis\n\n" +
      
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
              if (currentWordCount > totalWords + 300) {
                console.log("Stopping generation - word count exceeded:", currentWordCount);
                controller.enqueue(encoder.encode("event: done\n\n"));
                controller.close();
                return;
              }
          
              // Log progress every 500 words
              if (currentWordCount % 500 === 0) {
                console.log(`Progress: ${currentWordCount}/${totalWords} words`);
              }
          
              // If we're getting close to the target but haven't reached it, encourage continuation
              if (currentWordCount >= totalWords * 0.7 && currentWordCount < totalWords) {
                // Add a continuation prompt to encourage more content
                const remainingWords = totalWords - currentWordCount;
                if (remainingWords > 100 && Math.random() < 0.1) { // 10% chance to inject continuation
                  controller.enqueue(encoder.encode(`data: \n\nContinue writing to reach exactly ${totalWords} words total. You need ${remainingWords} more words. Expand on the concepts with more detailed explanations, examples, and analysis.\n\n`));
                }
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
