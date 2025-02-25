import { ChatOllama } from "@langchain/ollama";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { Annotation } from "@langchain/langgraph";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";

// Supabase PostgreSQL connection details
const PG_DB_CONFIG = {
  postgresConnectionOptions: {
    connectionString: process.env.DATABASE_URL || '',
  },
  tableName: "Dividend_Stock_Scores",
};

// Initialize PGVectorStore without reinitializing embeddings
const vectorStore = await PGVectorStore.initialize(new OllamaEmbeddings("llama3.2:1b", "http://localhost:11434"), PG_DB_CONFIG);

const chatModel = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "llama3.2:1b",
});

const promptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([
  [
    "human",
    `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. 
    If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.

    Question: {question}  
    Context: {context}  
    Answer:`,
  ],
]);

const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

// Define the retrieve function
const retrieve = async (state: typeof InputStateAnnotation.State) => {
  const retrievedDocs = await vectorStore.similaritySearch(state.question);
  return { context: retrievedDocs };
};

// Define the generate function
const generate = async (state: typeof StateAnnotation.State) => {
  const { context } = await retrieve(state);
  const docsContent = context.map((doc) => doc.pageContent).join("\n");

  // Prepare the messages using the prompt template
  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });

  // Use the chatModel to get a single response instead of streaming
  const response = await chatModel.invoke(messages);

  return { answer: response.content };
};

export default generate;
