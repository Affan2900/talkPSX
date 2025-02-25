import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";

class OllamaEmbeddings extends Embeddings {
  constructor(
    private model: string,
    private baseUrl: string = "http://localhost:11434",
    params?: EmbeddingsParams // Accept EmbeddingsParams to satisfy the base class
  ) {
    super(params ?? {}); // Pass the params to the superclass
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.embedQuery(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      console.error(`Embedding API Error: ${response.status} - ${response.statusText}`);
      console.error(`Response Body: ${response}`);
      throw new Error(`Failed to fetch embeddings: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }
}

export default OllamaEmbeddings;
