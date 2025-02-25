

import { NextResponse } from "next/server";
import createAndStoreEmbeddings from "@/lib/createEmbeddings";

export const runtime = "nodejs";

export async function GET() {
  try {
    await createAndStoreEmbeddings(); // Run once
    return NextResponse.json({ message: "Embeddings stored successfully." });
  } catch (error) {
    console.error("Error storing embeddings:", error);
    return NextResponse.json({ error: "Failed to store embeddings." }, { status: 500 });
  }
}
