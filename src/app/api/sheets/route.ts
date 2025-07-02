import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../utils/db";
import { Book } from "../../../../models/book";

// Ensure this route always runs dynamically so it is accessible
// without any client state such as localStorage.
export const dynamic = "force-dynamic";

export const GET = async () => {
  await connectToDatabase();
  const books = await Book.find({ author: { $ne: null } })
    .populate('author')
    .lean();

  const data = books.map((b: any) => ({
    title: b.suggestedTitle || '',
    summary: b.summary || '',
    name: b.author?.name || '',
    email: b.author?.email || '',
  }));

  return NextResponse.json({ data });
};
