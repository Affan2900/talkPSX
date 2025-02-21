import { ChatOllama } from "@langchain/ollama";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Client } from 'pg';
import { supabase } from "./supabaseClient";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { Annotation } from "@langchain/langgraph";
import { concat } from "@langchain/core/utils/stream";
import fs from 'fs';
import path from 'path';

// Supabase PostgreSQL connection details
const PG_DB_CONFIG = {
  postgresConnectionOptions: {
    connectionString: process.env.SUPABASE_DB_URL || '',
  },
  tableName: "Dividend_Stock_Scores",
};

const embeddings = new OllamaEmbeddings("llama3.2:latest","http://localhost:11434");

async function loadCSV() {
  const filePath = path.join(process.cwd(), 'src/documents/Updated_Dividend_Stock_Scores.csv');

  console.log("Resolved file path:", filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const loader = new CSVLoader(filePath);
  const documents = await loader.load();
  return documents;
}

// Initialize text splitter
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200, 
  chunkOverlap: 60,
});

const documents = await loadCSV();
const splitDocs = await textSplitter.splitDocuments(documents);
// Initialize PGVectorStore
const vectorStore = await PGVectorStore.initialize(embeddings, PG_DB_CONFIG);
// Add documents to vector store
await vectorStore.addDocuments(splitDocs);


// const vectorStore = await PGVectorStore.initialize(embeddings, {})

const chatModel = new ChatOllama({
  baseUrl: "http://localhost:11434", // Default value
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
  const { context } = await retrieve(state); // Now retrieve is defined
  const docsContent = context.map((doc) => doc.pageContent).join("\n");
  
  // Prepare the messages using the prompt template
  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });

  // Use the chatModel to get a single response instead of streaming
  const response = await chatModel.invoke(messages);

  // Return the response content
  return { answer: response.content };
};

export default generate;