import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";
import { HfInference } from "@huggingface/inference";

class HuggingFaceEmbeddings extends Embeddings {
  private hf: HfInference;

  constructor(
    private model: string,
    apiKey: string,
    params?: EmbeddingsParams
  ) {
    super(params ?? {});
    this.hf = new HfInference(apiKey);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedQuery(t)));
  }

  async embedQuery(text: string): Promise<number[]> {
    const result = await this.hf.featureExtraction({
      model: this.model,
      inputs: text,
    });

    const arr = result as number[] | number[][];
    return Array.isArray(arr[0]) ? (arr[0] as number[]) : (arr as number[]);
  }
}

export default HuggingFaceEmbeddings;
