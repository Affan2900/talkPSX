// app/api/chat/[id]/delete route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { chats } from "@/app/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Delete the chat with the specified id
    await db.delete(chats).where(eq(chats.id, id)).execute();

    return NextResponse.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}