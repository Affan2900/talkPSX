import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { traceable } from "langsmith/traceable"; //for tracing using langsmith
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { resolveEmbeddings } from "@/lib/embeddingProvider";
import { databaseUrlToPgConfig } from "@/lib/databaseUrlToPgConfig";
import { resolveChatModel } from "@/lib/chatProvider";
import { detectLiveQuoteSymbol } from "@/lib/liveQuoteDetect";
import { fetchLiveQuote } from "@/lib/quoteService";
import { hybridRetrieve, resolveRetrievalMode } from "@/lib/hybridRetrieve";
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

/**
 * Pure semantic search — the pre-hybrid behaviour, kept reachable via
 * RETRIEVAL_MODE=vector as a rollback switch.
 */
async function vectorOnlyRetrieve(question: string): Promise<Document[]> {
  const vectorStore = await getVectorStore();
  const results = await vectorStore.similaritySearchWithScore(question, RAG_TOP_K);
  return results.filter(([, score]) => score <= RAG_THRESHOLD).map(([doc]) => doc);
}

/**
 * Note on the relevance gate: RAG_SCORE_THRESHOLD is an absolute cosine
 * distance, whereas RRF scores are rank-derived and have no absolute meaning.
 * The threshold is therefore applied *inside the vector lane before fusion*
 * (see hybridRetrieve), and the post-fusion cut is by rank alone. Documents can
 * now reach the context on a strong lexical match despite mediocre semantic
 * distance — which is the point — and the system prompt's relevance check is
 * what rejects context that turns out not to fit the question.
 */
async function retrieveDocs(question: string): Promise<Document[]> {
  if (resolveRetrievalMode() === "vector") {
    return vectorOnlyRetrieve(question);
  }
  return hybridRetrieve(question, { topK: RAG_TOP_K, threshold: RAG_THRESHOLD });
}

/**
 * The live-quote path as a single tool span. Detection is a synchronous
 * keyword + ticker check, so a span of its own would be sub-millisecond noise —
 * what is worth seeing in a trace is the decision it produced (which symbol, if
 * any) next to what Yahoo actually returned for it.
 */
const tracedLiveQuote = traceable(
  async (question: string): Promise<{ symbol: string | null; context: string | null }> => {
    const symbol = detectLiveQuoteSymbol(question);
    if (!symbol) return { symbol: null, context: null };
    return { symbol, context: await fetchLiveQuote(symbol) };
  },
  { name: "live_quote", run_type: "tool" }
);

/**
 * Retrieval as a retriever span. Neither lane emits callback events on its own —
 * the keyword/symbol lanes are raw SQL through the `postgres` driver, and
 * `Embeddings` in @langchain/core has no callback manager at all — so without
 * this wrapper the whole retrieval phase shows up as unattributed dead time
 * before the first LLM child.
 */
const tracedRetrieveDocs = traceable(
  async (question: string): Promise<{ documents: Document[] }> => ({
    documents: await retrieveDocs(question),
  }),
  { name: "retrieve_docs", run_type: "retriever" }
);

const retrieve = async (state: State) => {
  const live = await tracedLiveQuote(state.question);

  const { documents } = await tracedRetrieveDocs(state.question);

  if (live.context) {
    return { context: [new Document({ pageContent: live.context }), ...documents] };
  }
  return { context: documents };
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
 *
 * Two details here are load-bearing for LangSmith, both consequences of how
 * `traceable` handles an async generator: it returns the *same* generator object
 * with only `[Symbol.asyncIterator]` swapped for a wrapper, and the run is ended
 * inside that wrapper's `finally`.
 *
 *   1. The traced generator must be driven with `for await`, not `.next()`.
 *      A caller calling `.next()` on the raw generator runs the body and still
 *      nests child runs correctly (those come from AsyncLocalStorage), but never
 *      reaches the wrapper — so the root run never gets an end time and shows up
 *      in LangSmith spinning forever underneath completed children. Iterating
 *      properly also means an abandoned stream (client disconnect) closes the
 *      run as "Cancelled" instead of leaving it dangling.
 *
 *   2. That wrapper discards the generator's *return* value, so the final
 *      payload travels out by closure rather than by `return`. The traced
 *      function is therefore built per call, to close over `result`.
 */
export async function* generateStream(
  state: State,
  options?: { skipTitle?: boolean }
): AsyncGenerator<string, { fullAnswer: string; title: string }, unknown> {
  const result = { fullAnswer: "", title: "" };

  const traced = traceable(
    async function* (
      s: State,
      opts?: { skipTitle?: boolean }
    ): AsyncGenerator<string, void, unknown> {
      const { context } =
        s.context.length > 0 ? { context: s.context } : await retrieve(s);

      const docsContent =
        context.length > 0
          ? context.map((doc) => doc.pageContent).join("\n")
          : "[NO RELEVANT DATA FOUND]";

      const promptTemplate = buildPromptTemplate();
      const formattedMessages = await promptTemplate.formatMessages({
        question: s.question,
        context: docsContent,
        chat_history: formatChatHistory(s.messages),
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
      if (!opts?.skipTitle) {
        const titleMessages = await titlePromptTemplate.invoke({
          conversation: `Question: ${s.question}\nAnswer: ${fullAnswer}`,
        });
        const titleResponse = await getChatModel().invoke(titleMessages);
        title = sanitizeChatTitle(titleResponse.content, s.question);
      }

      result.fullAnswer = fullAnswer;
      result.title = title;
    },
    { name: "generateStream" }
  );

  for await (const chunk of traced(state, options)) {
    yield chunk;
  }

  return result;
}

/**
 * Traced so the eval path nests under one root the way the chat path does —
 * otherwise the retrieval spans above surface as orphaned top-level runs.
 */
export const generateForEval = traceable(
  async function (question: string): Promise<{ answer: string; contexts: string[] }> {
    const state: State = { question, context: [], answer: "", messages: [] };
    const { context } = await retrieve(state);
    const result = await generate({ ...state, context }, { skipTitle: true });
    return { answer: result.answer, contexts: context.map((d) => d.pageContent) };
  },
  { name: "generateForEval" }
);

export default generate;
