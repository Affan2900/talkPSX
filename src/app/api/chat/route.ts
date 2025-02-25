'use server'

import generate from "@/lib/generate";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    // Validate the question
    if (!question) {
      return NextResponse.json(
        { error: "Missing question" },
        { status: 400 }
      );
    }

    // Construct the state object with the required properties
    const state = {
      question, // Include the question
      context: [], // Add an empty context array (or fetch context if needed)
      answer: "", // Add an empty answer (or default value)
    };

    // Call the generate function, which now returns a simple response
    const { answer } = await generate(state); // Pass the question as part of the state

    // Return the response as JSON
    console.log(answer)
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}