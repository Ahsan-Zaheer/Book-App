
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../utils/db";
import { Book } from "../../../../../models/book";

export const POST = async (req: Request) => {
    const { summary, authorId } = await req.json();
    if (!summary) {
        return NextResponse.json({ error: "Summary is required" }, { status: 400 });
    }

    await connectToDatabase();
    const data: any = { summary, status: 'draft' };
    if (authorId) data.author = authorId;
    const book = await Book.create(data);
    return NextResponse.json({ data: book });
};
