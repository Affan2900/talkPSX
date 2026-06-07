import { NextResponse } from "next/server";
import { generateForEval } from "@/lib/generate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    const result = await generateForEval(question);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Eval error:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
