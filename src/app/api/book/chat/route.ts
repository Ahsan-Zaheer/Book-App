import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }
  await connectToDatabase();
  const book = await Book.findById(bookId).lean();
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  return NextResponse.json({ data: book.chatState || null });
};

export const PUT = async (req: Request) => {
  const { bookId, state } = await req.json();
  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }
  await connectToDatabase();
  const book = await Book.findByIdAndUpdate(bookId, { chatState: state }, { new: true });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  return NextResponse.json({ data: book.chatState });
};
