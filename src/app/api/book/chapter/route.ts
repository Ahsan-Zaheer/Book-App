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
    "Write a comprehensive chapter with EXACTLY " + totalWords + " words total. This word count is mandatory and must be achieved.\n\n" +
    
    "CHAPTER STRUCTURE:\n" +
    "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
    "Part 1: [Creative Title]\n[Write extensive content with detailed explanations - target " + wordsPerPart + " words]\n\n" +
    "Part 2: [Creative Title]\n[Write extensive content with detailed explanations - target " + wordsPerPart + " words]\n\n" +
    "Part 3: [Creative Title]\n[Write extensive content with detailed explanations - target " + wordsPerPart + " words]\n\n" +
    "Part 4: [Creative Title]\n[Write extensive content with detailed explanations - target " + wordsPerPart + " words]\n\n" +
    
    "MANDATORY REQUIREMENTS:\n" +
    "- TOTAL WORD COUNT: " + totalWords + " words (this is non-negotiable)\n" +
    "- Each part should be approximately " + wordsPerPart + " words\n" +
    "- Write extensively with detailed explanations, examples, and analysis\n" +
    "- Include multiple practical examples and case studies\n" +
    "- Use comprehensive analysis from multiple perspectives\n" +
    "- Write in full, detailed paragraphs with rich, descriptive language\n" +
    "- Expand thoroughly on every concept with deep insights\n" +
    "- Add two spaces after every period\n" +
    "- Maintain a professional, educational tone throughout\n" +
    "- Do not conclude early - continue writing until you reach " + totalWords + " words\n\n" +
    
    "KEY POINTS TO INCORPORATE:\n" +
    "- Distribute these key points across all 4 parts: " + keyPoints.join("; ") + "\n" +
    "- Expand each key point extensively with detailed explanations and multiple examples\n" +
    "- Connect concepts logically throughout the chapter with thorough analysis\n" +
    "- Provide comprehensive coverage of each topic area with extensive detail\n\n" +
    
    "BOOK SUMMARY TO FOLLOW: " + summary;
  } else {
    prompt = basePrompt +
      "Write a comprehensive chapter with EXACTLY " + totalWords + " words total. This word count is mandatory.\n\n" +
      
      "WORD COUNT REQUIREMENTS:\n" +
      "- Part 1: Target " + wordsPerPart + " words with extensive explanations and multiple examples\n" +
      "- Part 2: Target " + wordsPerPart + " words with extensive explanations and multiple examples\n" +
      "- Part 3: Target " + wordsPerPart + " words with extensive explanations and multiple examples\n" +
      "- Part 4: Target " + wordsPerPart + " words with extensive explanations and multiple examples\n" +
      "- TOTAL MANDATORY TARGET: " + totalWords + " words\n\n" +
      
      "CHAPTER STRUCTURE:\n" +
      "Chapter " + chapterIndex + ": " + chapterTitle + "\n\n" +
      "Part 1: [Creative Title]\n[Write extensive content with detailed explanations, multiple examples, and thorough analysis - target " + wordsPerPart + " words]\n\n" +
      "Part 2: [Creative Title]\n[Write extensive content with detailed explanations, multiple examples, and thorough analysis - target " + wordsPerPart + " words]\n\n" +
      "Part 3: [Creative Title]\n[Write extensive content with detailed explanations, multiple examples, and thorough analysis - target " + wordsPerPart + " words]\n\n" +
      "Part 4: [Creative Title]\n[Write extensive content with detailed explanations, multiple examples, and thorough analysis - target " + wordsPerPart + " words]\n\n" +
      
      "CONTENT REQUIREMENTS:\n" +
      "- Write extensive, educational content about the book topic\n" +
      "- Use multiple detailed paragraphs with comprehensive explanations\n" +
      "- Include numerous practical examples, case studies, and real-world applications\n" +
      "- Provide in-depth analysis from multiple perspectives\n" +
      "- Add two spaces after every period\n" +
      "- Maintain a professional, educational tone with rich vocabulary\n" +
      "- Expand concepts fully with detailed exploration and extensive insights\n" +
      "- Continue writing until you reach exactly " + totalWords + " words\n" +
      "- Do not conclude early - keep expanding on concepts until target is met\n\n" +
      
      "Book Summary: " + summary;
  }

  const encoder = new TextEncoder();
  let content = "";
  let wordCount = 0;
  let generationAttempts = 0;
  const maxAttempts = 3;

  const generateContent = async (controller, attemptPrompt) => {
    const model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.4, // Slightly higher for more expansive content
      streaming: true,
      maxTokens: Math.ceil(totalWords * 2.2), // Even higher token limit
      openAIApiKey: process.env.OPEN_AI_KEY,
      callbackManager: CallbackManager.fromHandlers({
        async handleLLMNewToken(token) {
          content += token;
          
          // Count words in real-time
          const currentWordCount = countWords(content);
          
          // Only stop if we significantly exceed the target
          if (currentWordCount > totalWords + 400) {
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
          const finalWordCount = countWords(content);
          console.log(`Attempt ${generationAttempts + 1}: Generated ${finalWordCount}/${totalWords} words`);
          
          // Check if we need to continue generating
          if (finalWordCount < totalWords * 0.85 && generationAttempts < maxAttempts - 1) {
            generationAttempts++;
            const remainingWords = totalWords - finalWordCount;
            console.log(`Attempting continuation. Need ${remainingWords} more words.`);
            
            // Create continuation prompt
            const continuationPrompt = `Continue writing the chapter content. You have written ${finalWordCount} words so far, but you need to write exactly ${totalWords} words total. Please continue writing ${remainingWords} more words to complete the chapter. Do not repeat what has already been written. Continue with new content that flows naturally from where you left off:\n\n${content}\n\n[CONTINUE FROM HERE - ADD ${remainingWords} MORE WORDS]`;
            
            // Continue generation
            await generateContent(controller, continuationPrompt);
            return;
          }
          
          // Finalize generation
          controller.enqueue(encoder.encode("event: done\n\n"));
          controller.close();

          const formatted = formatChapterText(content, true);
          
          // Log final word count
          const finalFormattedWordCount = countWords(formatted);
          console.log("Final chapter word count: " + finalFormattedWordCount + ", Expected: " + totalWords);

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

    await model.call([new HumanMessage(attemptPrompt)]);
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await generateContent(controller, prompt);
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
