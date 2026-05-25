import { ChatOllama } from "@langchain/ollama";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { Annotation } from "@langchain/langgraph";
import {  BaseMessage } from "@langchain/core/messages";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";
import { databaseUrlToPgConfig } from "@/lib/databaseUrlToPgConfig";
import {
  resolveOllamaBaseUrl,
  resolveOllamaChatModel,
  resolveOllamaEmbeddingModel,
} from "@/lib/ollamaEnv";
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
      new OllamaEmbeddings(
        resolveOllamaEmbeddingModel(),
        resolveOllamaBaseUrl()
      ),
      {
        postgresConnectionOptions: databaseUrlToPgConfig(),
        tableName: "Dividend_Stock_Scores",
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

// Retrieve context from vector store
const retrieve = async (state: State) => {
  const vectorStore = await getVectorStore();
  const retrievedDocs = await vectorStore.similaritySearch(state.question);
  return { context: retrievedDocs };
};



// Generate response with proper memory handling
const generate = async (state: State) => {
  // Retrieve relevant context
  const { context } = await retrieve(state);
  const docsContent = context.map((doc) => doc.pageContent).join("\n");

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

  // Use the chatModel to get a single response instead of streaming
  const response = await chatModel.invoke(formattedMessages);

  const cleanedAnswer = stripThinkingBlocks(
    normalizeMessageContent(response.content)
  );

  // Generate title after answer is cleaned (title prompt sees clean text)
  const titleMessages = await titlePromptTemplate.invoke({
    conversation: `Question: ${state.question}\nAnswer: ${cleanedAnswer}`,
  });

  const titleResponse = await chatModel.invoke(titleMessages);
  const title = sanitizeChatTitle(titleResponse.content, state.question);

  return {
    answer: cleanedAnswer,
    title,
    messages: state.messages,
  };
};

export default generate;