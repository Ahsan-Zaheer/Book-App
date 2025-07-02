import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../utils/db";
import { Book } from "../../../../models/book";

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
