// app/api/chat/message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { messages } from "@/app/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { chatId, senderId, content } = await req.json();
    
    if (!chatId || content === undefined) {
      return NextResponse.json(
        { error: "Chat ID and content are required" },
        { status: 400 }
      );
    }

    const db = await getDB();
    
    // Add the message to the chat
    await db.insert(messages).values({
      chatId,
      senderId, // Can be null for AI messages
      content,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving message:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}