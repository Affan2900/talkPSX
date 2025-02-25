'use server'
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import fs from 'fs';
import path from 'path';

// Supabase PostgreSQL connection details
const PG_DB_CONFIG = {
  postgresConnectionOptions: {
    connectionString: process.env.DATABASE_URL || '',
  },
  tableName: "Dividend_Stock_Scores",
};

// Initialize embedding model
const embeddings = new OllamaEmbeddings("llama3.2:1b", "http://localhost:11434");

async function loadCSV() {
  const filePath = path.join(process.cwd(), 'src/documents/Updated_Dividend_Stock_Scores.csv');

  console.log("Resolved file path:", filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const loader = new CSVLoader(filePath);
  return await loader.load();
}

export default async function createAndStoreEmbeddings() {
  const documents = await loadCSV();

  // Split documents into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 60,
  });

  const splitDocs = await textSplitter.splitDocuments(documents);

  // Initialize PGVectorStore and store embeddings
  const vectorStore = await PGVectorStore.initialize(embeddings, PG_DB_CONFIG);
  await vectorStore.addDocuments(splitDocs);

  console.log("Embeddings successfully stored in the database.");
}

