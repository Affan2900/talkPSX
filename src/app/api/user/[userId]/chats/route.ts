import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { chats } from "@/app/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // Get the database instance
    const db = await getDB();

    // Fetch the chats for the specified user
    const userChats = await db
      .select()
      .from(chats)
      .where(eq(chats.createdBy, userId))
      .orderBy(chats.createdAt)
      .execute();

    return NextResponse.json({ chats: userChats }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user chats:", error);
    return NextResponse.json({ error: "Failed to fetch user chats" }, { status: 500 });
  }
}