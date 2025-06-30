import { qa } from "../../../../utils/ai";
import { NextResponse } from "next/server";

export const POST = async (request) =>{
    const {question} = await request.json();

    const answer = await qa(question);

    return NextResponse.json({data: answer});
} 