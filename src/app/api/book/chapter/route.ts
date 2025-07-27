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
    "Please write a comprehensive chapter with the following structure and word count target of " + totalWords + " words total.\n\n" +
    
    "CHAPTER STRUCTURE:\n" +
    "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
    "Part 1: [Creative Title]\n[Comprehensive content - approximately " + wordsPerPart + " words]\n\n" +
    "Part 2: [Creative Title]\n[Comprehensive content - approximately " + wordsPerPart + " words]\n\n" +
    "Part 3: [Creative Title]\n[Comprehensive content - approximately " + wordsPerPart + " words]\n\n" +
    "Part 4: [Creative Title]\n[Comprehensive content - approximately " + wordsPerPart + " words]\n\n" +
    
    "CONTENT REQUIREMENTS:\n" +
    "- Target word count: " + totalWords + " words total (" + wordsPerPart + " words per part)\n" +
    "- Write detailed, educational content with thorough explanations\n" +
    "- Include practical examples, case studies, and real-world applications\n" +
    "- Use comprehensive analysis and multiple perspectives\n" +
    "- Write in full paragraphs with rich, descriptive language\n" +
    "- Expand on concepts with detailed exploration and insights\n" +
    "- Add two spaces after every period\n" +
    "- Maintain a professional, educational tone throughout\n\n" +
    
    "KEY POINTS TO INCORPORATE:\n" +
    "- Distribute these key points across all 4 parts: " + keyPoints.join("; ") + "\n" +
    "- Expand each key point with detailed explanations and examples\n" +
    "- Connect concepts logically throughout the chapter\n" +
    "- Provide thorough coverage of each topic area\n\n" +
    
    "BOOK SUMMARY TO FOLLOW: " + summary;
  } else {
    prompt = basePrompt +
      "Please write a comprehensive chapter with a target word count of " + totalWords + " words total.\n\n" +
      
      "WORD COUNT TARGETS:\n" +
      "- Part 1: Approximately " + wordsPerPart + " words with detailed explanations and examples\n" +
      "- Part 2: Approximately " + wordsPerPart + " words with detailed explanations and examples\n" +
      "- Part 3: Approximately " + wordsPerPart + " words with detailed explanations and examples\n" +
      "- Part 4: Approximately " + wordsPerPart + " words with detailed explanations and examples\n" +
      "- Total target: " + totalWords + " words\n\n" +
      
      "CHAPTER STRUCTURE:\n" +
      "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
      "Part 1: [Creative Title]\n[Write comprehensive content with detailed explanations, examples, and analysis - approximately " + wordsPerPart + " words]\n\n" +
      "Part 2: [Creative Title]\n[Write comprehensive content with detailed explanations, examples, and analysis - approximately " + wordsPerPart + " words]\n\n" +
      "Part 3: [Creative Title]\n[Write comprehensive content with detailed explanations, examples, and analysis - approximately " + wordsPerPart + " words]\n\n" +
      "Part 4: [Creative Title]\n[Write comprehensive content with detailed explanations, examples, and analysis - approximately " + wordsPerPart + " words]\n\n" +
      
      "CONTENT GUIDELINES:\n" +
      "- Write thorough, educational content about the book topic\n" +
      "- Use detailed paragraphs with comprehensive explanations\n" +
      "- Include practical examples, case studies, and real-world applications\n" +
      "- Provide in-depth analysis and multiple perspectives\n" +
      "- Add two spaces after every period\n" +
      "- Maintain a professional, educational tone with rich vocabulary\n" +
      "- Expand concepts fully with detailed exploration and insights\n" +
      "- Write substantial content to meet the target word count\n\n" +
      
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
          
              // Remove the continuation injection as it may be causing issues
              
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
