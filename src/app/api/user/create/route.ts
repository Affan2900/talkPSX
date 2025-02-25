import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { users } from "@/app/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId, username } = await req.json();

    if (!userId || !username) {
      return NextResponse.json(
        { error: "User ID and username are required" },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Check if the user already exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId));

    if (existingUser.length > 0) {
      return NextResponse.json({ message: "User already exists" }, { status: 200 });
    }

    // Create a new user
    await db.insert(users).values({ id: userId, username });

    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (error) {
    console.error("Error checking/creating user:", error);
    return NextResponse.json(
      { error: "Failed to check or create user" },
      { status: 500 }
    );
  }
}
