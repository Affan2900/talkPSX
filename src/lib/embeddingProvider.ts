import HuggingFaceEmbeddings from "@/lib/hfEmbedding";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";
import { resolveHFApiKey, resolveHFEmbeddingModel } from "@/lib/hfEnv";
import { resolveOllamaBaseUrl, resolveOllamaEmbeddingModel } from "@/lib/ollamaEnv";

export function resolveEmbeddings(): HuggingFaceEmbeddings | OllamaEmbeddings {
  const provider = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase() ?? "ollama";

  if (provider === "huggingface") {
    return new HuggingFaceEmbeddings(resolveHFEmbeddingModel(), resolveHFApiKey());
  }

  return new OllamaEmbeddings(resolveOllamaEmbeddingModel(), resolveOllamaBaseUrl());
}
