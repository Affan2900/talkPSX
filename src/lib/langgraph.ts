import { ChatOllama } from "@langchain/ollama";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { Annotation } from "@langchain/langgraph";

// Supabase PostgreSQL connection details
const PG_DB_CONFIG = {
  postgresConnectionOptions: {
    connectionString: process.env.SUPABASE_DB_URL || '',
  },
  tableName: "Dividend_Stock_Scores",
};

// Initialize embeddings and vector store
const embeddings = new OllamaEmbeddings("llama3.2:latest", "http://localhost:11434");
const vectorStore = await PGVectorStore.initialize(embeddings, PG_DB_CONFIG);

const chatModel = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "llama3.2:latest",
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

console.time("retrieve");
const retrieve = async (state: { question: string }) => {
  const retrievedDocs = await vectorStore.similaritySearch(state.question, 3);
  return { context: retrievedDocs };
};
console.timeEnd("retrieve");

const generate = async (state: { question: string }) => {
  const { context } = await retrieve(state);
  const docsContent = context.map((doc) => doc.pageContent).join("\n");

  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });

  const response = await chatModel.invoke(messages);

  return { answer: response.content };
};

export default generate;
