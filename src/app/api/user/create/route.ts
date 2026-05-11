import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { users } from "@/app/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId, username } = await req.json();

    const usernameStr =
      typeof username === "string" ? username.trim() : String(username ?? "").trim();

    if (!userId || !usernameStr) {
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
    await db.insert(users).values({ id: userId, username: usernameStr });

    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (error) {
    console.error("Error checking/creating user:", error);
    const cause =
      error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
    const payload =
      process.env.NODE_ENV === "development"
        ? { error: "Failed to check or create user", cause }
        : { error: "Failed to check or create user" };
    return NextResponse.json(payload, { status: 500 });
  }
}
