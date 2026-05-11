/** Ollama HTTP API base (no trailing slash). */
export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export function resolveOllamaBaseUrl(): string {
  const raw = process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_OLLAMA_BASE_URL;
  return raw.replace(/\/$/, "");
}

/** Model passed to Ollama `/api/embeddings` (e.g. nomic-embed-text). */
export function resolveOllamaEmbeddingModel(): string {
  return (
    process.env.OLLAMA_EMBEDDING_MODEL?.trim() || "nomic-embed-text:latest"
  );
}

/** Model for `ChatOllama` (main LLM). */
export function resolveOllamaChatModel(): string {
  return (
    process.env.OLLAMA_CHAT_MODEL?.trim() ||
    process.env.OLLAMA_MODEL?.trim() ||
    "deepseek-r1:1.5b"
  );
}
