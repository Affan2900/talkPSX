import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { chats, messages } from "@/app/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const db = await getDB();
    
    // Create a new chat
    const newChat = await db
      .insert(chats)
      .values({ createdBy: userId })
      .returning({ id: chats.id });

    const chatId = newChat[0].id;

    // Add the user's message to the chat
    if(message !== undefined) {
      await db.insert(messages).values({
        chatId,
        senderId: userId,
        content: message,
      });
    }

    return NextResponse.json({ chatId });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}