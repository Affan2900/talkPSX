'use server'

import generate from "@/lib/generate";
import { NextResponse, NextRequest } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

type ClientChatTurn = { role: string; content: unknown };

export async function POST(req: NextRequest) {
  try {
    const { question, chat_history = [], chatId } = await req.json();

    // Validate the question
    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Valid question is required" },
        { status: 400 }
      );
    }

    const history: ClientChatTurn[] = Array.isArray(chat_history)
      ? (chat_history as ClientChatTurn[])
      : [];

    // Convert chat history to BaseMessage format
    const previousMessages = history.map((msg) => {
      const text = typeof msg.content === "string" ? msg.content : "";
      return msg.role === "user"
        ? new HumanMessage(text)
        : new AIMessage(text);
    });

    // Construct the complete state object
    const initialState = {
      question: question.trim(),
      context: [],    // Will be filled by retrieve()
      answer: "",     // Will be filled by generate()
      messages: previousMessages // Converted chat history
    };

    // Process the question through the AI pipeline
    const { answer, title, messages: updatedMessages } = await generate(initialState);

    // Convert messages back to client-safe format
    const formattedMessages = updatedMessages.map(msg => ({
      role: msg._getType(),
      content: msg.content
    }));

    return NextResponse.json({ 
      answer,
      title,
      messages: formattedMessages
    });
  } catch (error) {
    console.error("API Error (Local Chat):", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
