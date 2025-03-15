import { ChatOllama } from "@langchain/ollama";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";

// PostgreSQL configuration
const PG_DB_CONFIG = {
  postgresConnectionOptions: {
    connectionString: process.env.DATABASE_URL || "",
  },
  tableName: "Dividend_Stock_Scores",
};

// Initialize PGVectorStore
const vectorStore = await PGVectorStore.initialize(
  new OllamaEmbeddings("llama3.2:1b", "http://localhost:11434"),
  PG_DB_CONFIG
);

// Initialize Chat Model
const chatModel = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "llama3.2:1b",
});

// Define the prompt template
const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a specialized financial analyst focusing on Pakistan Stock Exchange stocks and market trends. Use the provided context and chat history to deliver concise insights on stock performance, trend analysis, and market data specific to the Pakistan Stock Exchange. If you are unsure, please state that you don't have enough information. Keep your responses under three sentences.",
  ],
  ["placeholder", "{chat_history}"],
  ["human", "Question: {question}\nContext: {context}\nAnswer:"],
]);

// Define State Annotations
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

  // Combine with existing messages and keep last 5
  const allMessages = [...state.messages, ...formattedMessages].slice(-5);

  // Generate response
  const response = await chatModel.invoke(allMessages);
  
  // Convert MessageContent to string
  const responseContent = typeof response.content === "string" 
    ? response.content
    : response.content.map(c => "text" in c ? c.text : "").join("\n");

  // Update state with new messages
  return {
    answer: responseContent,
    messages: [
      ...allMessages,
      new AIMessage({
        content: responseContent,
        additional_kwargs: response.additional_kwargs,
      }),
    ],
  };
};

export default generate;