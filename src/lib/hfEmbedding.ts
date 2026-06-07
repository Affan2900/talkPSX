import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";

const HF_INFERENCE_URL = "https://api-inference.huggingface.co/models";

class HuggingFaceEmbeddings extends Embeddings {
  constructor(
    private model: string,
    private apiKey: string,
    params?: EmbeddingsParams
  ) {
    super(params ?? {});
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedQuery(t)));
  }

  async embedQuery(text: string, attempt = 1): Promise<number[]> {
    const response = await fetch(`${HF_INFERENCE_URL}/${this.model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    });

    // HF returns 503 while model is cold-starting — retry up to 3 times
    if (response.status === 503 && attempt <= 3) {
      const body = await response.json().catch(() => ({}));
      const wait = (body?.estimated_time ?? 20) * 1000;
      await new Promise((r) => setTimeout(r, wait));
      return this.embedQuery(text, attempt + 1);
    }

    if (!response.ok) {
      const msg = await response.text();
      throw new Error(`HuggingFace embedding error ${response.status}: ${msg}`);
    }

    const data = await response.json();
    // Feature-extraction returns [[...]] for a single string input
    return Array.isArray(data[0]) ? (data[0] as number[]) : (data as number[]);
  }
}

export default HuggingFaceEmbeddings;
