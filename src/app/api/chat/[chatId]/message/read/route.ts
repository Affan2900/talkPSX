import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { messages, users } from "@/app/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const { chatId } = await params;
  // Validate chatId
  if (!chatId) {
    return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
  }

  try {
    // Get the database instance
    const db = await getDB();

    // Fetch messages for the given chatId
    const chatMessages = await db
  .select({
    id: messages.id,
    content: messages.content,
    senderId: messages.senderId,
    createdAt: messages.createdAt,
    username: sql<string>`COALESCE(${users.username}, 'ai')`.as("username"), 
  })
  .from(messages)
  .leftJoin(users, eq(messages.senderId, users.id)) 
  .where(eq(messages.chatId, chatId))
  .orderBy(messages.createdAt)
  .execute();


    console.log("Chat Messages:", chatMessages);

    return NextResponse.json({ messages: chatMessages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
