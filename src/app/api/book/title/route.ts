import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";

export const POST = async (req: Request) => {
    const { bookId, title } = await req.json();
    if (!bookId || !title) {
        return NextResponse.json({ error: "Missing bookId or title" }, { status: 400 });
    }

    await connectToDatabase();
    const book = await Book.findByIdAndUpdate(bookId, { suggestedTitle: title }, { new: true, upsert: true });
    return NextResponse.json({ data: book });
};
