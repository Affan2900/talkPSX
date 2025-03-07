import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { messages } from "@/app/db/schema"; // Ensure you are importing messages schema
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  if (!params.chatId) {
    return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
  }

  try {
    const db = await getDB();

    // Log the chatId being queried
    console.log("Fetching messages for chatId:", params.chatId);

    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, params.chatId))
      .execute();

    // Log the query result
    console.log("Query result:", chatMessages);

    return NextResponse.json(Array.isArray(chatMessages) ? chatMessages : [], { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
