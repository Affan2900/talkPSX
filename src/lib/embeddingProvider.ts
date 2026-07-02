import HuggingFaceEmbeddings from "@/lib/hfEmbedding";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";
import JinaEmbeddings from "@/lib/jinaEmbedding";
import { resolveHFApiKey, resolveHFEmbeddingModel } from "@/lib/hfEnv";
import { resolveOllamaBaseUrl, resolveOllamaEmbeddingModel } from "@/lib/ollamaEnv";

export function resolveEmbeddings(): HuggingFaceEmbeddings | OllamaEmbeddings | JinaEmbeddings {
  const provider = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase() ?? "ollama";

  if (provider === "huggingface") {
    return new HuggingFaceEmbeddings(resolveHFEmbeddingModel(), resolveHFApiKey());
  }

  if (provider === "jina") {
    const apiKey = process.env.JINA_API_KEY?.trim();
    if (!apiKey) throw new Error("JINA_API_KEY is not set.");
    const model = process.env.JINA_EMBEDDING_MODEL?.trim() ?? "jina-embeddings-v2-base-en";
    return new JinaEmbeddings(model, apiKey);
  }

  return new OllamaEmbeddings(resolveOllamaEmbeddingModel(), resolveOllamaBaseUrl());
}
