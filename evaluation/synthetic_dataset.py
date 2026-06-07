"""
Generates a synthetic RAGAS testset from documents stored in the psx_kse100
PGVector table on Supabase.

Run this ONCE before evaluation to produce synthetic_testset.csv.

Usage:
    python synthetic_dataset.py
    python synthetic_dataset.py --size 20   # default

Note: quality improves significantly with a larger LLM (7B+). deepseek-r1:1.5b
will work but may produce lower-quality questions due to its small size.
"""
import argparse
import os
from pathlib import Path
from urllib.parse import urlparse, unquote

import psycopg2
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_ollama import ChatOllama, OllamaEmbeddings
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.testset import TestsetGenerator

load_dotenv(Path(__file__).parent.parent / ".env.local")

DATABASE_URL        = os.environ["DATABASE_URL"]
OLLAMA_BASE_URL     = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
# Use a larger model here if available — better question quality
GENERATOR_LLM_MODEL = os.getenv("EVAL_LLM_MODEL", os.getenv("OLLAMA_CHAT_MODEL", "deepseek-r1:1.5b"))
EMBEDDING_MODEL     = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text:latest")


def load_psx_documents() -> list[Document]:
    """Fetch all documents stored in the psx_kse100 PGVector table."""
    p = urlparse(DATABASE_URL)
    conn = psycopg2.connect(
        host=p.hostname,
        port=p.port or 5432,
        user=unquote(p.username or ""),
        password=unquote(p.password or ""),
        dbname=(p.path or "/postgres").lstrip("/") or "postgres",
        sslmode="require",
    )
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT text, metadata FROM "psx_kse100" WHERE text IS NOT NULL')
            rows = cur.fetchall()
    finally:
        conn.close()

    docs = [
        Document(page_content=row[0], metadata=row[1] if isinstance(row[1], dict) else {})
        for row in rows
        if row[0] and row[0].strip()
    ]
    print(f"  Loaded {len(docs)} documents from psx_kse100")
    return docs


def main(testset_size: int = 20) -> None:
    print(f"Loading documents from Supabase psx_kse100...")
    docs = load_psx_documents()
    if not docs:
        print("Error: no documents found. Run `npm run ingest` first to populate psx_kse100.")
        return

    print(f"Initialising generator LLM ({GENERATOR_LLM_MODEL}) and embeddings ({EMBEDDING_MODEL})...")
    generator_llm = LangchainLLMWrapper(
        ChatOllama(model=GENERATOR_LLM_MODEL, base_url=OLLAMA_BASE_URL)
    )
    generator_embeddings = LangchainEmbeddingsWrapper(
        OllamaEmbeddings(model=EMBEDDING_MODEL, base_url=OLLAMA_BASE_URL)
    )

    print(f"Generating {testset_size} test cases (this may take a few minutes)...")
    generator = TestsetGenerator(llm=generator_llm, embedding_model=generator_embeddings)
    dataset = generator.generate_with_langchain_docs(
        docs,
        testset_size=testset_size,
        with_debugging_logs=True,
    )

    print(f"Generated {len(dataset.test_cases)} test cases")

    df = dataset.to_pandas()
    print(df[["user_input", "reference"]].head(3).to_string())

    out = "synthetic_testset.csv"
    df.to_csv(out, index=False)
    print(f"\nSaved to {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate RAGAS synthetic testset from psx_kse100")
    parser.add_argument("--size", type=int, default=20, help="Number of test cases to generate (default: 20)")
    args = parser.parse_args()
    main(testset_size=args.size)
