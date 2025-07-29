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
  const { bookId, bookType, summary, title, chapterIndex, chapterTitle, keyPoints, targetWordCount, partIndex, previousParts } = await req.json();

  if (!bookId || !chapterTitle || !summary || !title || !Array.isArray(keyPoints) || !chapterIndex || partIndex === undefined) {
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

  console.log(`Generating Part ${partIndex + 1} for Chapter ${chapterIndex}`);
  console.log(`Target words per part: ${wordsPerPart}`);

  const basePrompt = "You are a professional book writer. ";

  // Build context from previous parts
  let contextPrompt = "";
  if (previousParts && previousParts.length > 0) {
    contextPrompt = "PREVIOUS PARTS OF THIS CHAPTER FOR CONTEXT:\n" + 
      previousParts.map((part, idx) => `Part ${idx + 1}:\n${part}`).join("\n\n") + 
      "\n\nNow continue with the next part, ensuring it flows naturally from the previous content and maintains consistency in tone and style.\n\n";
  }

  let prompt: string;

  if (keyPoints.length > 0) {
    const relevantKeyPoints = keyPoints.slice(
      Math.floor((partIndex / 4) * keyPoints.length),
      Math.floor(((partIndex + 1) / 4) * keyPoints.length)
    );

    prompt = basePrompt + contextPrompt +
      `Write Part ${partIndex + 1} of Chapter ${chapterIndex} titled "${chapterTitle}" for the book "${title}".\n\n` +
      
      `STRUCTURE FOR THIS PART:\n` +
      ` [Three Explanation Marks: !!!] [Creative Title] [Three Explanation Marks: !!!]\n` +
      `[Write extensive, detailed content with comprehensive explanations, multiple examples, and thorough analysis - target ${wordsPerPart} words]\n\n` +

      `CRITICAL REQUIREMENTS:\n` +
      `- Write ONLY Part ${partIndex + 1} (do not write other parts)\n` +
      `- Target approximately ${wordsPerPart} words for this part\n` +
      `- Write extensive, detailed content with multiple paragraphs\n` +
      `- Include comprehensive explanations, practical examples, and case studies\n` +
      `- Use thorough analysis and multiple perspectives\n` +
      `- Write in full, detailed paragraphs with rich, descriptive language\n` +
      `- Expand extensively on concepts with deep insights and analysis\n` +
      `- Add two spaces after every period\n` +
      `- Maintain a professional, educational tone throughout\n` +
      `- Ensure this part flows naturally from previous parts\n\n` +
      
      `KEY POINTS TO FOCUS ON IN THIS PART:\n` +
      `- Primary focus: ${relevantKeyPoints.join("; ")}\n` +
      `- Expand each key point extensively with detailed explanations and multiple examples\n` +
      `- Connect concepts logically with the overall chapter theme\n` +
      `- Provide thorough, in-depth coverage of these specific topics\n\n` +
      
      `BOOK SUMMARY TO FOLLOW: ${summary}`;
  } else {
    prompt = basePrompt + contextPrompt +
      `Write Part ${partIndex + 1} of Chapter ${chapterIndex} titled "${chapterTitle}" for the book "${title}".\n\n` +
      
      `STRUCTURE FOR THIS PART:\n` +
      ` [Three Explanation Marks: !!!] [Creative Title] [Three Explanation Marks: !!!]\n` +
      `[Write extensive, detailed content - target ${wordsPerPart} words]\n\n` +

      `CRITICAL REQUIREMENTS:\n` +
      `- Write ONLY Part ${partIndex + 1} (do not write other parts)\n` +
      `- Target approximately ${wordsPerPart} words for this part\n` +
      `- Write extensive, educational content about the book topic\n` +
      `- Use multiple detailed paragraphs with comprehensive explanations\n` +
      `- Include numerous practical examples, case studies, and real-world applications\n` +
      `- Provide thorough, in-depth analysis from multiple perspectives\n` +
      `- Add two spaces after every period\n` +
      `- Maintain a professional, educational tone with rich vocabulary\n` +
      `- Expand concepts extensively with detailed exploration and comprehensive insights\n` +
      `- Write substantial, detailed content to meet word targets\n` +
      `- Ensure this part flows naturally from previous parts\n\n` +
      
      `Book Summary: ${summary}`;
  }

  const encoder = new TextEncoder();
  let content = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const model = new ChatOpenAI({
          modelName: "gpt-4o",
          temperature: 0.4, // Slightly higher for more expansive content
          streaming: true,
          maxTokens: Math.ceil(wordsPerPart * 2.0), // Higher token limit to ensure full generation
          openAIApiKey: process.env.OPEN_AI_KEY,
          callbackManager: CallbackManager.fromHandlers({
            async handleLLMNewToken(token) {
              content += token;
              
              // Count words in real-time
              const currentWordCount = countWords(content);
              
              // Only stop if we significantly exceed the target for this part
              if (currentWordCount > wordsPerPart + 200) {
                console.log("Stopping generation - word count exceeded:", currentWordCount);
                controller.enqueue(encoder.encode("event: done\n\n"));
                controller.close();
                return;
              }
          
              // Log progress every 200 words
              if (currentWordCount % 200 === 0) {
                console.log(`Progress: ${currentWordCount}/${wordsPerPart} words`);
              }
              
              controller.enqueue(encoder.encode("data: " + token + "\n\n"));
            },
            async handleLLMEnd() {
              controller.enqueue(encoder.encode("event: done\n\n"));
              controller.close();

              const formatted = formatChapterText(content, true);
              
              // Log final word count for this part
              const finalWordCount = countWords(formatted);
              console.log(`Final Part ${partIndex + 1} word count: ${finalWordCount}, Expected: ${wordsPerPart}`);

              // Don't save to database here - let the frontend handle combining parts
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
