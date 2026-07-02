export const dynamic = 'force-dynamic';

import { generateStream } from "@/lib/generate";
import { NextRequest } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

type ClientChatTurn = { role: string; content: unknown };

export async function POST(req: NextRequest) {
  try {
    const { question, chat_history = [] } = await req.json();

    if (!question || typeof question !== "string") {
      return Response.json({ error: "Valid question is required" }, { status: 400 });
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

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const gen = generateStream(initialState);
          while (true) {
            const { value, done } = await gen.next();
            if (done) {
              const result = value as { fullAnswer: string; title: string } | undefined;
              const title = result?.title ?? "";
              controller.enqueue(encoder.encode(`\n[TITLE]:${title}`));
              break;
            }
            if (typeof value === "string") {
              controller.enqueue(encoder.encode(value));
            }
          }
        } finally {
          controller.close();
        }
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
    console.error("API Error (Local Chat):", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
