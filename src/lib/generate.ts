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

const titlePromptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([
  [
    "human",
    `Based on the following conversation, generate a concise and descriptive title that summarizes the main topic or question discussed.
    
    YOU MUST ALWAYS RETURN A TITLE AND IT SHOULD MUST BE LESS THAN 5 WORDS.

    Conversation: {conversation}
    Title:`,
  ],
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

  // Use the chatModel to get a single response instead of streaming
  const response = await chatModel.invoke(formattedMessages);

  // console.log("Response: ", response);

  // Generate a title based on the conversation
  const titleMessages = await titlePromptTemplate.invoke({
    conversation: `Question: ${state.question}\nAnswer: ${response.content}`,
  });

  const titleResponse = await chatModel.invoke(titleMessages);

  // console.log("Answer: ", typeof(response.content) );


  console.log(typeof(titleResponse.content) );
  return { answer: JSON.stringify(response.content), title: titleResponse.content, messages: state.messages };
};

export default generate;