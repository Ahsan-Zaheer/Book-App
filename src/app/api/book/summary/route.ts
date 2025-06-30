
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";

export const POST = async (req: Request) => {
    const { summary } = await req.json();
    if (!summary) {
        return NextResponse.json({ error: "Summary is required" }, { status: 400 });
    }

    await connectToDatabase();
    const book = await Book.create({ summary, status: 'draft' });
    return NextResponse.json({ data: book });
};
