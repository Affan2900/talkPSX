import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";

class JinaEmbeddings extends Embeddings {
  constructor(
    private readonly model: string,
    private apiKey: string,
    params?: EmbeddingsParams
  ) {
    super(params ?? {});
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedQuery(t)));
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: this.model, input: [{ text }] }),
    });

    if (!response.ok) {
      const msg = await response.text();
      throw new Error(`Jina embedding error ${response.status}: ${msg}`);
    }

    const data = await response.json();
    return data.data[0].embedding as number[];
  }
}

export default JinaEmbeddings;
