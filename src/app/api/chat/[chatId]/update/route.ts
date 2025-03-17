import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { chats } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { userId } = await auth();
    const { chatId } = await params;
    const { title } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Valid title is required" },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Update the chat title
    const result = await db
      .update(chats)
      .set({ title })
      .where(eq(chats.id, chatId))
      .execute();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Chat not found or not updated" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Chat title updated successfully" });
  } catch (error) {
    console.error("Error updating chat title:", error);
    return NextResponse.json(
      { error: "Failed to update chat title" },
      { status: 500 }
    );
  }
}