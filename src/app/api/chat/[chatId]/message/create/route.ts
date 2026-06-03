'use server'

import generate from "@/lib/generate";
import { NextResponse, NextRequest } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getDB } from "@/lib/db";
import { messages, users } from "@/app/db/schema";

type ClientChatTurn = { role: string; content: unknown };

export async function POST(req: NextRequest) {
  try {
    const { question, chat_history = [], chatId, userId } = await req.json();

    if (!question || typeof question !== "string" || !chatId) {
      return NextResponse.json(
        { error: "Valid question and chatId are required" },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Ensure AI user exists
    await db.insert(users)
      .values({ id: "ai", username: "AI Assistant" })
      .onConflictDoNothing();

    // Save the user message before calling the LLM
    const senderId = userId ?? "anonymous";
    if (senderId !== "anonymous") {
      await db.insert(messages).values({
        chatId,
        senderId,
        content: question,
      });
    }

    const history: ClientChatTurn[] = Array.isArray(chat_history)
      ? (chat_history as ClientChatTurn[])
      : [];

    const previousMessages = history.map((msg) => {
      const text = typeof msg.content === "string" ? msg.content : "";
      return msg.role === "user"
        ? new HumanMessage(text)
        : new AIMessage(text);
    });

    const initialState = {
      question: question.trim(),
      context: [],
      answer: "",
      messages: previousMessages,
    };

    // Skip title generation for follow-up messages — cuts response time in half
    const { answer } = await generate(initialState, { skipTitle: true });

    // Save the AI response
    const newMessage = await db.insert(messages).values({
      chatId,
      senderId: "ai",
      content: answer,
    }).returning();

    return NextResponse.json({ answer, savedMessage: newMessage });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
