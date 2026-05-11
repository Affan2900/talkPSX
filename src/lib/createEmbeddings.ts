'use server'
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { databaseUrlToPgConfig } from "@/lib/databaseUrlToPgConfig";
import {
  resolveOllamaBaseUrl,
  resolveOllamaEmbeddingModel,
} from "@/lib/ollamaEnv";
import fs from 'fs';
import path from 'path';

// Embeddings: OLLAMA_EMBEDDING_MODEL (default nomic-embed-text:latest). Chat LLM is separate (generate.ts).
const embeddings = new OllamaEmbeddings(
  resolveOllamaEmbeddingModel(),
  resolveOllamaBaseUrl()
);

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

  // PGVector column width matches the embedding model. If you change OLLAMA_EMBEDDING_MODEL after data
  // exists, drop the LangChain table for this name (or use a new tableName) then re-run this job.
  const vectorStore = await PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: databaseUrlToPgConfig(),
    tableName: "Dividend_Stock_Scores",
  });
  await vectorStore.addDocuments(splitDocs);

  console.log("Embeddings successfully stored in the database.");
}

