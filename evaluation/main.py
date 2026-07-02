"""
Evaluates the Talk PSX RAG pipeline using RAGAS.

Requires:
  1. synthetic_testset.csv  — run synthetic_dataset.py first
  2. Next.js dev server running at http://localhost:3000

Usage:
    python main.py                             # Ollama (default)
    python main.py --provider openrouter       # OpenRouter gpt-4o-mini (recommended)
    python main.py --provider gemini           # Google Gemini
    python main.py --provider groq             # Groq

Outputs:
    evaluation_results.csv — per-question scores
    evaluation_summary.csv — mean scores across all metrics

RAGAS metrics used (mirrors the notebook approach):
  - LLMContextPrecisionWithReference: are relevant contexts ranked first?
  - LLMContextRecall:                 do contexts cover the reference answer?
  - Faithfulness:                     is the answer grounded in context (no hallucination)?
  - ResponseRelevancy:                is the answer relevant to the question?
  - FactualCorrectness:               is the answer factually correct vs ground truth?
  - SemanticSimilarity:               how close is the answer to the reference semantically?

Provider notes:
  - ollama:      free, local — requires a 7B+ model for reliable LLM-as-judge scoring.
                 Set EVAL_LLM_MODEL in .env.local (e.g. llama3.1:8b).
  - openrouter:  recommended on low-RAM machines — uses EVAL_OPENROUTER_MODEL
                 (default: openai/gpt-4o-mini). Costs ~$0.01-0.02 per run.
  - gemini:      free tier, reliable JSON output. Set GOOGLE_API_KEY in .env.local.
  - groq:        free tier. Set GROQ_API_KEY in .env.local.
"""
import argparse
import ast
import os
import time
from pathlib import Path

import pandas as pd
import requests
from datasets import Dataset
from dotenv import load_dotenv
from ragas import evaluate
from ragas.metrics import (
    Faithfulness,
    FactualCorrectness,
    LLMContextRecall,
    LLMContextPrecisionWithReference,
    ResponseRelevancy,
    SemanticSimilarity,
)

from providers import get_provider

load_dotenv(Path(__file__).parent.parent / ".env.local")

NEXT_BASE_URL = os.getenv("NEXT_BASE_URL", "http://localhost:3000")

METRIC_COLUMNS = [
    "llm_context_precision_with_reference",
    "llm_context_recall",
    "faithfulness",
    "response_relevancy",
    "factual_correctness",
    "semantic_similarity",
]


def _query_pipeline(question: str) -> tuple[str, list[str]]:
    """POST /api/eval on the running Next.js app. Returns (answer, contexts)."""
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


def create_ragas_dataset(eval_df: pd.DataFrame) -> Dataset:
    """
    Mirrors the notebook's create_ragas_dataset(rag_pipeline, eval_dataset).

    For each question, calls the Next.js RAG pipeline via HTTP to get the
    generated answer and retrieved contexts, then packages everything into a
    RAGAS-compatible Dataset.
    """
    print(f"\nQuerying RAG pipeline at {NEXT_BASE_URL}/api/eval ...")
    print("Make sure `npm run dev` is running!\n")

    ragas_rows = []
    for i, row in eval_df.iterrows():
        question = row["user_input"]
        print(f"[{i + 1}/{len(eval_df)}] {question[:80]}")
        answer, contexts = _query_pipeline(question)
        ragas_rows.append({
            "user_input":         question,
            "response":           answer,
            # Use ACTUAL retrieved contexts (not synthetic reference_contexts)
            # so Faithfulness reflects real pipeline behaviour.
            "retrieved_contexts": contexts,
            "reference":          row["reference"],
        })
        time.sleep(1)

    return Dataset.from_pandas(pd.DataFrame(ragas_rows))


def evaluate_ragas_dataset(ragas_dataset: Dataset, eval_llm, eval_embeddings):
    """
    Mirrors the notebook's evaluate_ragas_dataset(ragas_dataset).

    Notebook metrics → Ragas 0.3.x equivalents:
        context_precision   → LLMContextPrecisionWithReference
        context_recall      → LLMContextRecall
        faithfulness        → Faithfulness
        answer_relevancy    → ResponseRelevancy
        answer_correctness  → FactualCorrectness
        answer_similarity   → SemanticSimilarity
        context_relevancy   → removed in 0.3.x, skipped
    """
    metrics = [
        LLMContextPrecisionWithReference(),
        LLMContextRecall(),
        Faithfulness(),
        ResponseRelevancy(),
        FactualCorrectness(),
        SemanticSimilarity(),
    ]

    print("Running RAGAS evaluation...\n")
    return evaluate(ragas_dataset, metrics=metrics, llm=eval_llm, embeddings=eval_embeddings)


def main(provider: str = "ollama") -> None:
    # ── 1. Load synthetic testset ──────────────────────────────────────────
    csv_path = Path(__file__).parent / "synthetic_testset.csv"
    if not csv_path.exists():
        print("synthetic_testset.csv not found. Run synthetic_dataset.py first.")
        return

    df = pd.read_csv(csv_path)

    if "user_input" not in df.columns:
        print("Unexpected CSV format — expected RAGAS 0.3.x columns (user_input, reference, ...).")
        return

    if "reference_contexts" in df.columns:
        df["reference_contexts"] = df["reference_contexts"].apply(
            lambda x: ast.literal_eval(x) if isinstance(x, str) else x
        )

    print(f"Loaded {len(df)} test cases from {csv_path.name}")

    # ── 2. Build RAGAS dataset by querying the live pipeline ───────────────
    ragas_dataset = create_ragas_dataset(df)

    # ── 3. Initialise evaluator LLM + embeddings ───────────────────────────
    print(f"\nInitialising evaluator (provider={provider})...")
    eval_llm, eval_embeddings = get_provider(provider, eval_mode=True)

    # ── 4. Evaluate ────────────────────────────────────────────────────────
    result = evaluate_ragas_dataset(ragas_dataset, eval_llm, eval_embeddings)

    # ── 5. Save & display results ──────────────────────────────────────────
    result_df = result.to_pandas()
    available = [c for c in METRIC_COLUMNS if c in result_df.columns]
    summary = result_df[available].mean()

    print("\n─── Evaluation Summary ───────────────────────────────────────")
    print(summary.to_string())

    result_df.to_csv("evaluation_results.csv", index=False)
    summary.to_frame("mean_score").to_csv("evaluation_summary.csv")

    print("\nDetailed results → evaluation_results.csv")
    print("Summary          → evaluation_summary.csv")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Talk PSX RAG pipeline with RAGAS")
    parser.add_argument(
        "--provider",
        choices=["ollama", "gemini", "groq", "openrouter"],
        default="ollama",
        help="LLM provider for evaluation judging (default: ollama)",
    )
    args = parser.parse_args()
    main(provider=args.provider)
