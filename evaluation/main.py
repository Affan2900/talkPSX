"""
Evaluates the Talk PSX RAG pipeline using RAGAS.

Requires:
  1. synthetic_testset.csv  — run synthetic_dataset.py first
  2. Next.js dev server running at http://localhost:3000

Usage:
    python main.py

Outputs:
    evaluation_results.csv — per-question scores
    evaluation_summary.csv — mean scores across all metrics

RAGAS metrics used:
  - LLMContextRecall:   do retrieved contexts cover the reference answer?
  - Faithfulness:       is the answer grounded in retrieved context (no hallucination)?
  - FactualCorrectness: is the answer factually correct vs ground truth?

Note: evaluation LLM quality matters. deepseek-r1:1.5b will work but a 7B+
model (e.g. llama3.1:8b, mistral:7b) produces more reliable scores. Set
EVAL_LLM_MODEL in .env.local to override.
"""
import ast
import os
import time
from pathlib import Path

import pandas as pd
import requests
from datasets import Dataset
from dotenv import load_dotenv
from langchain_ollama import ChatOllama, OllamaEmbeddings
from ragas import evaluate
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import Faithfulness, FactualCorrectness, LLMContextRecall

load_dotenv(Path(__file__).parent.parent / ".env.local")

NEXT_BASE_URL       = os.getenv("NEXT_BASE_URL", "http://localhost:3000")
OLLAMA_BASE_URL     = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EVAL_LLM_MODEL      = os.getenv("EVAL_LLM_MODEL", os.getenv("OLLAMA_CHAT_MODEL", "deepseek-r1:1.5b"))
EMBEDDING_MODEL     = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text:latest")


def get_answer_and_contexts(question: str) -> tuple[str, list[str]]:
    """
    Calls POST /api/eval on the running Next.js app.
    Returns (answer, retrieved_contexts). Falls back to empty on error.
    """
    try:
        resp = requests.post(
            f"{NEXT_BASE_URL}/api/eval",
            json={"question": question},
            headers={"Content-Type": "application/json"},
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("answer", ""), data.get("contexts", [])
    except requests.RequestException as exc:
        print(f"  API error for '{question[:60]}': {exc}")
        return "Error fetching answer", []


def main() -> None:
    # ── 1. Load synthetic testset ──────────────────────────────────────────
    csv_path = Path(__file__).parent / "synthetic_testset.csv"
    if not csv_path.exists():
        print("synthetic_testset.csv not found. Run synthetic_dataset.py first.")
        return

    df = pd.read_csv(csv_path)

    # RAGAS 0.3.x TestsetGenerator outputs: user_input, reference_contexts, reference
    if "user_input" not in df.columns:
        print("Unexpected CSV format — expected RAGAS 0.3.x columns (user_input, reference, ...).")
        return

    # reference_contexts may be stored as a string representation of a list
    if "reference_contexts" in df.columns:
        df["reference_contexts"] = df["reference_contexts"].apply(
            lambda x: ast.literal_eval(x) if isinstance(x, str) else x
        )

    print(f"Loaded {len(df)} test cases from {csv_path.name}")

    # ── 2. Get answers + actual retrieved contexts from the RAG pipeline ───
    print(f"\nQuerying RAG pipeline at {NEXT_BASE_URL}/api/eval ...")
    print("Make sure `npm run dev` is running!\n")

    responses, retrieved_contexts = [], []
    for i, row in df.iterrows():
        q = row["user_input"]
        print(f"[{i+1}/{len(df)}] {q[:80]}")
        answer, contexts = get_answer_and_contexts(q)
        responses.append(answer)
        retrieved_contexts.append(contexts)
        time.sleep(1)

    # ── 3. Build RAGAS evaluation dataset ─────────────────────────────────
    # Use ACTUAL retrieved contexts (not synthetic reference_contexts) so
    # Faithfulness reflects real pipeline behaviour.
    eval_dict = {
        "user_input":          df["user_input"].tolist(),
        "response":            responses,
        "retrieved_contexts":  retrieved_contexts,
        "reference":           df["reference"].tolist(),
    }
    dataset = Dataset.from_dict(eval_dict)

    # ── 4. Run RAGAS evaluation ────────────────────────────────────────────
    print(f"\nInitialising evaluator LLM ({EVAL_LLM_MODEL}) and embeddings ({EMBEDDING_MODEL})...")
    eval_llm = LangchainLLMWrapper(
        ChatOllama(model=EVAL_LLM_MODEL, base_url=OLLAMA_BASE_URL)
    )
    eval_embeddings = LangchainEmbeddingsWrapper(
        OllamaEmbeddings(model=EMBEDDING_MODEL, base_url=OLLAMA_BASE_URL)
    )

    metrics = [LLMContextRecall(), Faithfulness(), FactualCorrectness()]

    print("Running RAGAS evaluation...\n")
    result = evaluate(dataset, metrics=metrics, llm=eval_llm, embeddings=eval_embeddings)

    # ── 5. Save & display results ──────────────────────────────────────────
    print("\n─── Evaluation Summary ───────────────────────────────────────")
    summary = result.to_pandas()[["llm_context_recall", "faithfulness", "factual_correctness"]].mean()
    print(summary.to_string())

    result_df = result.to_pandas()
    result_df.to_csv("evaluation_results.csv", index=False)
    summary.to_frame("mean_score").to_csv("evaluation_summary.csv")

    print("\nDetailed results → evaluation_results.csv")
    print("Summary          → evaluation_summary.csv")


if __name__ == "__main__":
    main()
