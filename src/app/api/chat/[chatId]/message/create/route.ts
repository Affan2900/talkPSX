'use server'

import generate from "@/lib/generate";
import { NextResponse, NextRequest } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getDB } from "@/lib/db";
import { messages } from "@/app/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { question, chat_history = [], chatId } = await req.json();

    // Validate the question and chatId
    if (!question || typeof question !== "string" || !chatId) {
      return NextResponse.json(
        { error: "Valid question and chatId are required" },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Convert chat history to BaseMessage format
    const previousMessages = chat_history.map((msg: any) => {
      return msg.role === "user" 
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content);
    });

    // Construct the complete state object
    const initialState = {
      question: question.trim(),
      context: [],    // Will be filled by retrieve()
      answer: "",     // Will be filled by generate()
      messages: previousMessages // Converted chat history
    };

    // Process the question through the AI pipeline
    const { answer, messages: updatedMessages } = await generate(initialState);

    // Convert messages back to client-safe format
    const formattedMessages = updatedMessages.map(msg => ({
      role: msg._getType(),
      content: msg.content
    }));

    // Save AI response to database
    const newMessage = await db.insert(messages).values({
      chatId,
      senderId: "ai",
      content: answer,
    }).returning();

    return NextResponse.json({ 
      answer,
      messages: formattedMessages,
      savedMessage: newMessage
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}