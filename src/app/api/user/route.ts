import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../utils/db";
import { User } from "../../../../models/user";

export const POST = async (req: Request) => {
  const { name, email } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "Missing name or email" }, { status: 400 });
  }
  await connectToDatabase();
  const user = await User.create({ name, email });
  return NextResponse.json({ data: user });
};
