"""
Generates a synthetic RAGAS testset from documents stored in the psx_kse100
PGVector table on Supabase.

Run this ONCE before evaluation to produce synthetic_testset.csv.

Usage:
    python synthetic_dataset.py                        # Ollama (default)
    python synthetic_dataset.py --provider gemini      # Google Gemini (fast, free tier)
    python synthetic_dataset.py --provider groq        # Groq (free tier, fast)
    python synthetic_dataset.py --provider openrouter  # OpenRouter (paid, reliable)
    python synthetic_dataset.py --size 20              # default size
    python synthetic_dataset.py --provider gemini --size 50

Provider setup: see providers.py docstring or .env.local for required keys.

Groq notes:
    Multi-key:  set GROQ_API_KEYS=key1,key2,key3 for automatic rate-limit rotation.
    500K tokens/day with llama-3.1-8b-instant; 100K/day with llama-3.3-70b-versatile.
    Override model with GROQ_CHAT_MODEL in .env.local.

OpenRouter notes:
    Uses OPENROUTER_MODEL (default: meta-llama/llama-3.3-70b-instruct).
    ~$0.05-0.15 per 20-case run. Override with OPENROUTER_MODEL in .env.local.
"""
import argparse
import os
from pathlib import Path
from urllib.parse import urlparse, unquote

import psycopg2
from dotenv import load_dotenv
from langchain_core.documents import Document
from ragas.run_config import RunConfig
from ragas.testset import TestsetGenerator
from ragas.testset.synthesizers import SingleHopSpecificQuerySynthesizer

from providers import get_provider

load_dotenv(Path(__file__).parent.parent / ".env.local")

DATABASE_URL = os.environ["DATABASE_URL"]


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


def _build_minimal_transforms(llm, embedding_model):
    """
    Minimal transform pipeline for short PSX documents.

    Skips all LLM-based transforms (SummaryExtractor, ThemesExtractor,
    NERExtractor, CustomNodeFilter) — PSX stock/sector docs are already short
    and self-descriptive. Sets summary = page_content directly, then embeds
    summaries in a single synchronous batch to avoid async compatibility issues
    with HuggingFaceEmbeddings on Windows.
    """
    from dataclasses import dataclass
    from ragas.testset.graph import KnowledgeGraph
    from ragas.testset.transforms.base import BaseGraphTransformation
    from ragas.testset.transforms.relationship_builders import CosineSimilarityBuilder

    raw_embedder = getattr(embedding_model, "embeddings", embedding_model)

    @dataclass
    class _PageContentAsSummary(BaseGraphTransformation):
        name: str = "PageContentAsSummary"

        async def transform(self, kg: KnowledgeGraph):
            pass

        def generate_execution_plan(self, kg: KnowledgeGraph):
            async def _set(node):
                if node.get_property("summary") is None:
                    node.add_property("summary", node.get_property("page_content") or "")
            return [_set(node) for node in kg.nodes]

    @dataclass
    class _KeywordsAsThemes(BaseGraphTransformation):
        """Derives themes from page_content keywords — no LLM needed.
        SingleHopSpecificQuerySynthesizer requires non-empty themes on each node
        to build persona→theme mappings; without them it sends an empty list to
        the LLM which returns verbose English instead of valid JSON."""
        name: str = "KeywordsAsThemes"

        async def transform(self, kg: KnowledgeGraph):
            pass

        def generate_execution_plan(self, kg: KnowledgeGraph):
            keyword_map = {
                "stock price": "Stock Prices",
                "market cap": "Market Capitalization",
                "revenue": "Revenue & Earnings",
                "sector": "Market Sectors",
                "dividend": "Dividends",
                "earnings": "Earnings",
                "kse": "KSE Market",
                "psx": "PSX Market",
                "index": "Market Index",
                "trading": "Trading Activity",
                "profit": "Profitability",
                "loss": "Profitability",
                "volume": "Trading Volume",
                "share": "Share Data",
                "company": "Company Overview",
                "annual": "Annual Reports",
                "quarter": "Quarterly Performance",
            }

            async def _set(node):
                if node.get_property("themes") is None:
                    content = (node.get_property("page_content") or "").lower()
                    themes = list({
                        theme for kw, theme in keyword_map.items() if kw in content
                    })
                    node.add_property("themes", themes or ["Financial Data"])

            return [_set(node) for node in kg.nodes]

    @dataclass
    class _BatchEmbedSummaries(BaseGraphTransformation):
        """Embeds all summaries in one synchronous batch — avoids async issues."""
        name: str = "BatchEmbedSummaries"

        async def transform(self, kg: KnowledgeGraph):
            pass

        def generate_execution_plan(self, kg: KnowledgeGraph):
            async def _embed_all():
                nodes = [n for n in kg.nodes if n.get_property("summary")]
                texts = [n.get_property("summary") for n in nodes]
                if not texts:
                    return
                vectors = raw_embedder.embed_documents(texts)
                for node, vec in zip(nodes, vectors):
                    if node.get_property("summary_embedding") is None:
                        node.add_property("summary_embedding", vec)
                print(f"  [transforms] Embedded {len(nodes)} summaries")
            return [_embed_all()]

    return [
        _PageContentAsSummary(),
        _KeywordsAsThemes(),
        _BatchEmbedSummaries(),
        CosineSimilarityBuilder(
            property_name="summary_embedding",
            new_property_name="summary_similarity",
            threshold=0.5,
        ),
    ]


def _patch_cosine_similarity_builder() -> None:
    """
    When SummaryExtractor silently skips a node (common with small/unreliable LLMs),
    that node gets no summary_embedding and CosineSimilarityBuilder raises ValueError.
    Patch it to fill missing embeddings with a zero vector so generation can continue.
    Those nodes end up with zero cosine similarity to everything and are effectively
    ignored during scenario sampling — which is fine since their summaries were bad.
    """
    try:
        from ragas.testset.transforms.relationship_builders.cosine import CosineSimilarityBuilder

        _orig = CosineSimilarityBuilder.generate_execution_plan

        def _safe_plan(self, kg):
            prop = self.property_name
            missing = [n for n in kg.nodes if prop not in n.properties]
            if missing:
                valid = next((n for n in kg.nodes if prop in n.properties), None)
                dim = len(valid.properties[prop]) if valid else 768
                print(f"  [patch] {len(missing)} node(s) lack '{prop}' — filling with zero vector (dim={dim})")
                for node in missing:
                    node.properties[prop] = [0.0] * dim
            return _orig(self, kg)

        CosineSimilarityBuilder.generate_execution_plan = _safe_plan
    except Exception as exc:
        print(f"  [patch] Warning: could not patch CosineSimilarityBuilder: {exc}")


def main(testset_size: int = 20, provider: str = "ollama") -> None:
    print(f"Loading documents from Supabase psx_kse100...")
    docs = load_psx_documents()
    if not docs:
        print("Error: no documents found. Run `npm run ingest` first to populate psx_kse100.")
        return

    print(f"Initialising generator (provider={provider})...")
    generator_llm, generator_embeddings = get_provider(provider)

    _patch_cosine_similarity_builder()

    print(f"Generating {testset_size} test cases (this may take a few minutes)...")
    generator = TestsetGenerator(llm=generator_llm, embedding_model=generator_embeddings)
    query_distribution = [(SingleHopSpecificQuerySynthesizer(llm=generator_llm), 1.0)]
    dataset = generator.generate_with_langchain_docs(
        docs,
        testset_size=testset_size,
        query_distribution=query_distribution,
        run_config=RunConfig(max_retries=15, max_wait=120, timeout=300),
        transforms=_build_minimal_transforms(generator_llm, generator_embeddings),
        with_debugging_logs=True,
    )

    n = len(dataset.samples)
    print(f"Generated {n} test cases")

    if n == 0:
        print(
            "\nNo test cases were generated. Likely causes:\n"
            "  - Groq rate limits exhausted during Q&A generation\n"
            "  - Try: add more GROQ_API_KEYS, reduce --size, or use --provider gemini\n"
        )
        return

    df = dataset.to_pandas()
    cols = [c for c in ["user_input", "reference"] if c in df.columns]
    if cols:
        print(df[cols].head(3).to_string())

    out = "synthetic_testset.csv"
    df.to_csv(out, index=False)
    print(f"\nSaved to {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate RAGAS synthetic testset from psx_kse100")
    parser.add_argument("--size", type=int, default=20, help="Number of test cases to generate (default: 20)")
    parser.add_argument(
        "--provider",
        choices=["ollama", "gemini", "groq", "openrouter"],
        default="ollama",
        help="LLM provider to use (default: ollama)",
    )
    args = parser.parse_args()
    main(testset_size=args.size, provider=args.provider)
