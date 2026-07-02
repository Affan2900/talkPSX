export const dynamic = 'force-dynamic';

import { generateStream } from "@/lib/generate";
import { NextRequest } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getDB } from "@/lib/db";
import { messages } from "@/app/db/schema";

type ClientChatTurn = { role: string; content: unknown };

export async function POST(req: NextRequest) {
  try {
    const { question, chat_history = [], chatId } = await req.json();

    if (!question || typeof question !== "string" || !chatId) {
      return Response.json(
        { error: "Valid question and chatId are required" },
        { status: 400 }
      );
    }

    const history: ClientChatTurn[] = Array.isArray(chat_history)
      ? (chat_history as ClientChatTurn[])
      : [];

    const previousMessages = history.map((msg) => {
      const text = typeof msg.content === "string" ? msg.content : "";
      return msg.role === "user" ? new HumanMessage(text) : new AIMessage(text);
    });

    const initialState = {
      question: question.trim(),
      context: [],
      answer: "",
      messages: previousMessages,
    };

    const encoder = new TextEncoder();
    let fullAnswer = "";
    let title = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const gen = generateStream(initialState);
          while (true) {
            const { value, done } = await gen.next();
            if (done) {
              // Generator return value carries fullAnswer + title
              const result = value as { fullAnswer: string; title: string } | undefined;
              if (result) {
                fullAnswer = result.fullAnswer;
                title = result.title;
              }
              break;
            }
            if (typeof value === "string") {
              controller.enqueue(encoder.encode(value));
            }
          }
          // Append title as a parseable suffix
          controller.enqueue(encoder.encode(`\n[TITLE]:${title}`));
        } finally {
          controller.close();
        }

        // Save AI response to DB after stream closes
        const db = await getDB();
        await db.insert(messages).values({
          chatId,
          senderId: "ai",
          content: fullAnswer,
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
