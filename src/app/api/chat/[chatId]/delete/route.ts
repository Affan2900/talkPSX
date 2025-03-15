import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { chats } from "@/app/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    // Check if chatId is missing
    if (!params.chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Delete the chat with the specified id
    await db.delete(chats).where(eq(chats.id, params.chatId)).execute();

    return NextResponse.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}