import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../utils/db";
import { Book } from "../../../../models/book";
// Import the User model so mongoose registers the schema before populate is used
import "../../../../models/user";

// Ensure this route always runs dynamically so it is accessible
// without any client state such as localStorage.
export const dynamic = "force-dynamic";

export const GET = async () => {
  await connectToDatabase();
  const books = await Book.find({ author: { $ne: null } })
    .populate('author')
    .lean();

  const data = books.map((b: any) => ({
    bookId: b._id.toString() || '',
    title: b.suggestedTitle || '',
    summary: b.summary || '',
    name: b.author?.name || '',
    email: b.author?.email || '',
    chapterNames: b.chapters.map((c: any) => c.title) || [],
  }));

  return NextResponse.json({ data });
};
