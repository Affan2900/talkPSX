import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { users } from "@/app/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { userId, username, email } = await req.json();

    const usernameStr =
      typeof username === "string" ? username.trim() : String(username ?? "").trim();
    const emailStr =
      typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;

    if (!userId || !usernameStr) {
      return NextResponse.json(
        { error: "User ID and username are required" },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Idempotent sync: insert on first sight, refresh username/email on every
    // later visit so Clerk profile changes propagate.
    await db
      .insert(users)
      .values({ id: userId, username: usernameStr, email: emailStr })
      .onConflictDoUpdate({
        target: users.id,
        set: { username: usernameStr, email: emailStr },
      });

    return NextResponse.json({ message: "User synced" }, { status: 200 });
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
