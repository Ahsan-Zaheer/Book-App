import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../utils/db";
import { Book } from "../../../../models/book";
// Import the User model so mongoose registers the schema before populate is used
import "../../../../models/user";

// Ensure this route always runs dynamically so it is accessible
// without any client state such as localStorage.
export const dynamic = "force-dynamic";

export const GET = async (req: Request) => {
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get("page") || "1";
  let page = Number.parseInt(pageParam, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  const PAGE_SIZE = 50;
  const filter = { author: { $ne: null } };

  const totalItems = await Book.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const skip = (page - 1) * PAGE_SIZE;

  const books = await Book.find(filter)
    .sort({ _id: -1 }) // deterministic ordering for pagination
    .skip(skip)
    .limit(PAGE_SIZE)
    .populate("author")
    .populate("chapters")
    .lean();

  const data = books.map((b: any) => ({
    bookId: b._id?.toString() || "",
    title: b.suggestedTitle || "",
    summary: b.summary || "",
    name: b.author?.name || "",
    email: b.author?.email || "",
    chapterNames: Array.isArray(b.chapters) ? b.chapters.map((c: any) => c?.title || "") : [],
  }));

  return NextResponse.json({
    data,
    meta: {
      page,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
    },
  });
};
