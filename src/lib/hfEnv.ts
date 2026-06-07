export function resolveHFApiKey(): string {
  const key = process.env.HUGGINGFACE_API_KEY?.trim();
  if (!key) throw new Error("HUGGINGFACE_API_KEY is not set. Add it to .env.local.");
  return key;
}

export function resolveHFEmbeddingModel(): string {
  return (
    process.env.HUGGINGFACE_EMBEDDING_MODEL?.trim() ||
    "sentence-transformers/all-MiniLM-L6-v2"
  );
}
