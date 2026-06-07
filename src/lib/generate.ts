import { ChatOllama } from "@langchain/ollama";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { Annotation } from "@langchain/langgraph";
import {  BaseMessage } from "@langchain/core/messages";
import { resolveEmbeddings } from "@/lib/embeddingProvider";
import { databaseUrlToPgConfig } from "@/lib/databaseUrlToPgConfig";
import { resolveOllamaBaseUrl, resolveOllamaChatModel } from "@/lib/ollamaEnv";
import { detectLiveQuoteSymbol } from "@/lib/liveQuoteDetect";
import { fetchLiveQuote } from "@/lib/quoteService";
import { resolveChatSystemPrompt } from "@/lib/prompts/chatSystemPrompt";
import {
  normalizeMessageContent,
  sanitizeChatTitle,
  stripThinkingBlocks,
} from "@/lib/cleanLlmOutput";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: ".env.local" });

/** Lazy-init: avoids DB + Ollama during import (fixes Vercel `next build` / cold analysis). */
let vectorStorePromise: ReturnType<typeof PGVectorStore.initialize> | null = null;

function getVectorStore() {
  if (!vectorStorePromise) {
    vectorStorePromise = PGVectorStore.initialize(
      resolveEmbeddings(),
      {
        postgresConnectionOptions: databaseUrlToPgConfig(),
        tableName: "psx_kse100",
        columns: {
          idColumnName: "id",
          vectorColumnName: "embedding",
          contentColumnName: "text",
          metadataColumnName: "metadata",
        },
      }
    );
  }
  return vectorStorePromise;
}

// Main LLM: OLLAMA_CHAT_MODEL or OLLAMA_MODEL (default deepseek-r1:1.5b)
const chatModel = new ChatOllama({
  baseUrl: resolveOllamaBaseUrl(),
  model: resolveOllamaChatModel(),
});

// Define the prompt template (system message from resolveChatSystemPrompt)
const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", resolveChatSystemPrompt()],
  ["placeholder", "{chat_history}"],
  ["human", "Question: {question}\nContext: {context}\nAnswer:"],
]);

const titlePromptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([
  [
    "human",
    `Based on the following conversation, generate a concise and descriptive title that summarizes the main topic or question discussed.

    Return only the title text. No reasoning, tags, or XML.
    YOU MUST ALWAYS RETURN A TITLE AND IT SHOULD MUST BE LESS THAN 5 WORDS.

    Conversation: {conversation}
    Title:`,
  ],
]);


// Define State Annotations (value used for `typeof … .State` typing)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- only referenced in `typeof StateAnnotation.State`
const StateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  context: Annotation<Document[]>({
    value: (_, updates) => updates,
    default: () => [],
  }),
  answer: Annotation<string>(),
  messages: Annotation<BaseMessage[]>({
    reducer: (
      existing: BaseMessage[],
      updates: BaseMessage[] | { type: string; from: number; to?: number }
    ) => {
      if (Array.isArray(updates)) {
        return [...existing, ...updates];
      } else if (typeof updates === "object" && updates.type === "keep") {
        return existing.slice(updates.from, updates.to);
      }
      return existing;
    },
    default: () => [],
  }),
});

type State = typeof StateAnnotation.State;

// Cosine distance threshold — docs with score above this are considered irrelevant.
// Lower = stricter. Default 0.5 means "at least 50% similar".
const RAG_THRESHOLD = (() => {
  const raw = process.env.RAG_SCORE_THRESHOLD?.trim();
  if (!raw) return 0.5;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0.5;
})();

// Retrieve context: live quote (if price query) + vector store results.
const retrieve = async (state: State) => {
  // Phase 2: detect live price queries and fetch real-time data
  const liveSymbol = detectLiveQuoteSymbol(state.question);
  const liveContext = liveSymbol ? await fetchLiveQuote(liveSymbol) : null;

  const vectorStore = await getVectorStore();
  const results = await vectorStore.similaritySearchWithScore(state.question, 4);
  const relevantDocs = results
    .filter(([, score]) => score <= RAG_THRESHOLD)
    .map(([doc]) => doc);

  // Prepend live data so the LLM sees it first and treats it as authoritative
  if (liveContext) {
    return { context: [new Document({ pageContent: liveContext }), ...relevantDocs] };
  }
  return { context: relevantDocs };
};



// Generate response with proper memory handling.
// If state.context is already populated it is used directly (skips retrieve).
const generate = async (state: State, options?: { skipTitle?: boolean }) => {
  const { context } = state.context.length > 0
    ? { context: state.context }
    : await retrieve(state);
  const docsContent = context.length > 0
    ? context.map((doc) => doc.pageContent).join("\n")
    : "[NO RELEVANT DATA FOUND]";

  // Format chat history
  const chatHistory = state.messages
    .map((msg) => `${msg._getType()}: ${msg.content}`)
    .join("\n");

  // Format prompt with all inputs
  const formattedMessages = await promptTemplate.formatMessages({
    question: state.question,
    context: docsContent,
    chat_history: chatHistory,
  });

  const response = await chatModel.invoke(formattedMessages);

  const cleanedAnswer = stripThinkingBlocks(
    normalizeMessageContent(response.content)
  );

  let title = "";
  if (!options?.skipTitle) {
    const titleMessages = await titlePromptTemplate.invoke({
      conversation: `Question: ${state.question}\nAnswer: ${cleanedAnswer}`,
    });
    const titleResponse = await chatModel.invoke(titleMessages);
    title = sanitizeChatTitle(titleResponse.content, state.question);
  }

  return {
    answer: cleanedAnswer,
    title,
    messages: state.messages,
  };
};

/**
 * Eval-only entry point: runs retrieve + generate and returns the answer
 * alongside the actual retrieved context strings for RAGAS scoring.
 */
export async function generateForEval(
  question: string
): Promise<{ answer: string; contexts: string[] }> {
  const state: State = { question, context: [], answer: "", messages: [] };
  const { context } = await retrieve(state);
  const result = await generate({ ...state, context }, { skipTitle: true });
  return { answer: result.answer, contexts: context.map((d) => d.pageContent) };
}

export default generate;