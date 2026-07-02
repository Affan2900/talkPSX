import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { resolveEmbeddings } from "@/lib/embeddingProvider";
import { databaseUrlToPgConfig } from "@/lib/databaseUrlToPgConfig";
import { resolveChatModel } from "@/lib/chatProvider";
import { detectLiveQuoteSymbol } from "@/lib/liveQuoteDetect";
import { fetchLiveQuote } from "@/lib/quoteService";
import { resolveChatSystemPrompt } from "@/lib/prompts/chatSystemPrompt";
import {
  normalizeMessageContent,
  sanitizeChatTitle,
  stripThinkingBlocks,
} from "@/lib/cleanLlmOutput";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/** Lazy-init: avoids DB + embedding client during import (fixes Vercel cold analysis). */
let vectorStorePromise: ReturnType<typeof PGVectorStore.initialize> | null = null;

function getVectorStore() {
  if (!vectorStorePromise) {
    vectorStorePromise = PGVectorStore.initialize(resolveEmbeddings(), {
      postgresConnectionOptions: databaseUrlToPgConfig(),
      tableName: "psx_kse100",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "text",
        metadataColumnName: "metadata",
      },
    });
  }
  return vectorStorePromise;
}

let _chatModel: ReturnType<typeof resolveChatModel> | null = null;
function getChatModel() {
  if (!_chatModel) _chatModel = resolveChatModel();
  return _chatModel;
}

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

const RAG_TOP_K = (() => {
  const n = parseInt(process.env.RAG_TOP_K ?? "6", 10);
  return Number.isFinite(n) && n > 0 ? n : 6;
})();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      if (Array.isArray(updates)) return [...existing, ...updates];
      if (typeof updates === "object" && updates.type === "keep")
        return existing.slice(updates.from, updates.to);
      return existing;
    },
    default: () => [],
  }),
});

type State = typeof StateAnnotation.State;

const RAG_THRESHOLD = (() => {
  const raw = process.env.RAG_SCORE_THRESHOLD?.trim();
  if (!raw) return 0.5;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0.5;
})();

const retrieve = async (state: State) => {
  const liveSymbol = detectLiveQuoteSymbol(state.question);
  const liveContext = liveSymbol ? await fetchLiveQuote(liveSymbol) : null;

  const vectorStore = await getVectorStore();
  const results = await vectorStore.similaritySearchWithScore(state.question, RAG_TOP_K);
  const relevantDocs = results
    .filter(([, score]) => score <= RAG_THRESHOLD)
    .map(([doc]) => doc);

  if (liveContext) {
    return { context: [new Document({ pageContent: liveContext }), ...relevantDocs] };
  }
  return { context: relevantDocs };
};

function buildPromptTemplate() {
  return ChatPromptTemplate.fromMessages([
    ["system", resolveChatSystemPrompt()],
    ["placeholder", "{chat_history}"],
    ["human", "Question: {question}\nContext: {context}\nAnswer:"],
  ]);
}

function formatChatHistory(messages: BaseMessage[]): string {
  return messages.map((msg) => `${msg._getType()}: ${msg.content}`).join("\n");
}

const generate = async (state: State, options?: { skipTitle?: boolean }) => {
  const { context } =
    state.context.length > 0 ? { context: state.context } : await retrieve(state);

  const docsContent =
    context.length > 0
      ? context.map((doc) => doc.pageContent).join("\n")
      : "[NO RELEVANT DATA FOUND]";

  const promptTemplate = buildPromptTemplate();
  const formattedMessages = await promptTemplate.formatMessages({
    question: state.question,
    context: docsContent,
    chat_history: formatChatHistory(state.messages),
  });

  const response = await getChatModel().invoke(formattedMessages);
  const cleanedAnswer = stripThinkingBlocks(normalizeMessageContent(response.content));

  let title = "";
  if (!options?.skipTitle) {
    const titleMessages = await titlePromptTemplate.invoke({
      conversation: `Question: ${state.question}\nAnswer: ${cleanedAnswer}`,
    });
    const titleResponse = await getChatModel().invoke(titleMessages);
    title = sanitizeChatTitle(titleResponse.content, state.question);
  }

  return { answer: cleanedAnswer, title, messages: state.messages };
};

/**
 * Streaming variant — yields raw text chunks as they arrive from the LLM.
 * After the async iterator is exhausted, the caller should read `.fullAnswer`
 * and `.title` from the returned object (via the last yielded value pattern
 * is not ideal for generators, so we return a result object via a wrapper).
 */
export async function* generateStream(
  state: State,
  options?: { skipTitle?: boolean }
): AsyncGenerator<string, { fullAnswer: string; title: string }, unknown> {
  const { context } =
    state.context.length > 0 ? { context: state.context } : await retrieve(state);

  const docsContent =
    context.length > 0
      ? context.map((doc) => doc.pageContent).join("\n")
      : "[NO RELEVANT DATA FOUND]";

  const promptTemplate = buildPromptTemplate();
  const formattedMessages = await promptTemplate.formatMessages({
    question: state.question,
    context: docsContent,
    chat_history: formatChatHistory(state.messages),
  });

  const stream = await getChatModel().stream(formattedMessages);
  let raw = "";
  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : "";
    raw += text;
    yield text;
  }

  const fullAnswer = stripThinkingBlocks(normalizeMessageContent(raw));

  let title = "";
  if (!options?.skipTitle) {
    const titleMessages = await titlePromptTemplate.invoke({
      conversation: `Question: ${state.question}\nAnswer: ${fullAnswer}`,
    });
    const titleResponse = await getChatModel().invoke(titleMessages);
    title = sanitizeChatTitle(titleResponse.content, state.question);
  }

  return { fullAnswer, title };
}

export async function generateForEval(
  question: string
): Promise<{ answer: string; contexts: string[] }> {
  const state: State = { question, context: [], answer: "", messages: [] };
  const { context } = await retrieve(state);
  const result = await generate({ ...state, context }, { skipTitle: true });
  return { answer: result.answer, contexts: context.map((d) => d.pageContent) };
}

export default generate;
