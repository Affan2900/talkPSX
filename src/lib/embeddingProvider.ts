import HuggingFaceEmbeddings from "@/lib/hfEmbedding";
import OllamaEmbeddings from "@/lib/ollamaEmbedding";
import { resolveHFApiKey, resolveHFEmbeddingModel } from "@/lib/hfEnv";
import { resolveOllamaBaseUrl, resolveOllamaEmbeddingModel } from "@/lib/ollamaEnv";

/**
 * Returns the active embedding implementation based on EMBEDDING_PROVIDER.
 *
 * EMBEDDING_PROVIDER=ollama      → Ollama (local, default for dev)
 * EMBEDDING_PROVIDER=huggingface → HuggingFace Inference API (used on Lambda/prod)
 *
 * Both ingest.py and this file must use the same provider — mixing them
 * produces incompatible vectors and breaks similarity search.
 */
export function resolveEmbeddings(): HuggingFaceEmbeddings | OllamaEmbeddings {
  const provider = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase() ?? "ollama";

  if (provider === "huggingface") {
    return new HuggingFaceEmbeddings(resolveHFEmbeddingModel(), resolveHFApiKey());
  }

  return new OllamaEmbeddings(resolveOllamaEmbeddingModel(), resolveOllamaBaseUrl());
}
