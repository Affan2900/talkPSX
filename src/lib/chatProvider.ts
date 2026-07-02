import { ChatOllama } from "@langchain/ollama";
import { ChatGroq } from "@langchain/groq";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { resolveOllamaBaseUrl, resolveOllamaChatModel } from "@/lib/ollamaEnv";

export function resolveChatModel(): BaseChatModel {
  const provider = process.env.CHAT_PROVIDER?.trim().toLowerCase() ?? "ollama";

  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
    return new ChatGroq({ apiKey, model: process.env.GROQ_MODEL?.trim() ?? "llama-3.1-8b-instant" });
  }

  return new ChatOllama({
    baseUrl: resolveOllamaBaseUrl(),
    model: resolveOllamaChatModel(),
  });
}
