"""
PSX KSE-100 daily ingestion pipeline.

Fetches KSE-100 index constituents, per-stock live quotes, and sector
summaries from psxdata, embeds them via HuggingFace Inference API, and
upserts into the psx_kse100 PGVector table on Supabase.

Incremental by default — only stale or missing records are refreshed.
Each stock/sector has exactly ONE row in the table (replace-latest model).

Usage:
    python ingest.py             # incremental: skip today's records, refresh stale
    python ingest.py --force     # wipe everything and reingest from scratch
    python ingest.py --dry-run   # print sample docs without writing to DB
"""
import argparse
import json
import os
import time
import uuid
from datetime import date
from pathlib import Path
from urllib.parse import urlparse, unquote

import pandas as pd
import psxdata
import requests
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from pgvector.psycopg2 import register_vector
from psycopg2.extras import execute_values

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
load_dotenv(Path(__file__).parent.parent / ".env.local")

DATABASE_URL        = os.environ["DATABASE_URL"]
EMBEDDING_PROVIDER  = os.getenv("EMBEDDING_PROVIDER", "ollama").lower()
# HuggingFace (used when EMBEDDING_PROVIDER=huggingface)
HF_API_KEY          = os.getenv("HUGGINGFACE_API_KEY", "")
HF_EMBEDDING_MODEL  = os.getenv("HUGGINGFACE_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
# Ollama (used when EMBEDDING_PROVIDER=ollama)
OLLAMA_BASE_URL     = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL        = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text:latest")

TABLE = "psx_kse100"
TODAY = date.today().isoformat()

# Dimensions must match the embedding model exactly
_DIMS: dict[str, int] = {
    "nomic-embed-text:latest": 768,
    "nomic-embed-text":        768,
    "sentence-transformers/all-MiniLM-L6-v2": 384,
}
if EMBEDDING_PROVIDER == "huggingface":
    VECTOR_DIM = _DIMS.get(HF_EMBEDDING_MODEL, 384)
else:
    VECTOR_DIM = _DIMS.get(OLLAMA_MODEL, 768)

hf: "InferenceClient | None" = None
if EMBEDDING_PROVIDER == "huggingface":
    if not HF_API_KEY:
        raise EnvironmentError("HUGGINGFACE_API_KEY is required when EMBEDDING_PROVIDER=huggingface")
    hf = InferenceClient(token=HF_API_KEY)


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def _embed_huggingface(text: str, retries: int = 3) -> list[float]:
    for attempt in range(1, retries + 1):
        try:
            result = hf.feature_extraction(text, model=HF_EMBEDDING_MODEL)
            arr = result.flatten()
            return [float(x) for x in arr]
        except Exception as exc:
            msg = str(exc)
            if "loading" in msg.lower() and attempt < retries:
                wait = 20 * attempt
                print(f"    HF model loading, retrying in {wait}s... ({attempt}/{retries})")
                time.sleep(wait)
            else:
                raise
    raise RuntimeError("HuggingFace embedding failed after all retries")


def _embed_ollama(text: str) -> list[float]:
    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": OLLAMA_MODEL, "prompt": text},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]


def embed(text: str) -> list[float]:
    if EMBEDDING_PROVIDER == "huggingface":
        return _embed_huggingface(text)
    return _embed_ollama(text)


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def pg_connect() -> psycopg2.extensions.connection:
    p = urlparse(DATABASE_URL)
    conn = psycopg2.connect(
        host=p.hostname,
        port=p.port or 5432,
        user=unquote(p.username or ""),
        password=unquote(p.password or ""),
        dbname=(p.path or "/postgres").lstrip("/") or "postgres",
        sslmode="require",
    )
    register_vector(conn)
    return conn


def get_columns(cur) -> list[str]:
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s ORDER BY ordinal_position
    """, (TABLE,))
    return [r[0] for r in cur.fetchall()]


def ensure_table(cur) -> None:
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS "{TABLE}" (
            "id"            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            "embedding"     vector({VECTOR_DIM}),
            "text"          text,
            "metadata"     jsonb,
            "collection_id" uuid
        )
    """)


def load_existing(cur) -> dict[tuple[str, str], str]:
    """
    Returns a dict mapping (type, key) -> stored_date for all rows.
    key is symbol for stocks, sector_code for sectors.
    """
    cur.execute(f"""
        SELECT
            metadata->>'type',
            COALESCE(metadata->>'symbol', metadata->>'sector_code'),
            metadata->>'date'
        FROM "{TABLE}"
    """)
    return {
        (row[0], row[1]): row[2]
        for row in cur.fetchall()
        if row[0] and row[1]
    }


def delete_stale(cur, stale_stocks: list[str], stale_sectors: list[str]) -> int:
    """Delete rows for stale symbols and sector codes. Returns rows deleted."""
    deleted = 0
    if stale_stocks:
        cur.execute(
            f"""DELETE FROM "{TABLE}"
                WHERE metadata->>'type' = 'stock'
                  AND metadata->>'symbol' = ANY(%s)""",
            (stale_stocks,),
        )
        deleted += cur.rowcount
    if stale_sectors:
        cur.execute(
            f"""DELETE FROM "{TABLE}"
                WHERE metadata->>'type' = 'sector'
                  AND metadata->>'sector_code' = ANY(%s)""",
            (stale_sectors,),
        )
        deleted += cur.rowcount
    return deleted


def wipe_all(cur) -> None:
    cur.execute(f'DELETE FROM "{TABLE}"')


def bulk_insert(cur, rows: list[tuple]) -> None:
    execute_values(
        cur,
        f'INSERT INTO "{TABLE}" (id, embedding, text, metadata) VALUES %s',
        rows,
        template="(%s, %s::vector, %s, %s::jsonb)",
    )


# ---------------------------------------------------------------------------
# Document builders
# ---------------------------------------------------------------------------

def _v(val, fmt: str | None = None) -> str:
    if val is None:
        return "N/A"
    try:
        if pd.isna(val):
            return "N/A"
    except (TypeError, ValueError):
        pass
    return fmt.format(val) if fmt else str(val)


def build_stock_doc(symbol: str, quote: dict | None, idx_row: dict | None) -> tuple[str, dict]:
    lines = [f"Stock: {symbol}"]
    if quote:
        lines += [
            f"Sector: {_v(quote.get('sector'))}",
            f"Listed In: {_v(quote.get('listed_in'))}",
            f"Price: PKR {_v(quote.get('price'), '{:.2f}')}",
            f"P/E Ratio: {_v(quote.get('pe_ratio'), '{:.2f}')}",
            f"Dividend Yield: {_v(quote.get('dividend_yield'), '{:.2f}')}%",
            f"Market Cap: PKR {_v(quote.get('market_cap'), '{:,.0f}')}M",
        ]
    if idx_row:
        lines += [
            f"KSE-100 Weight: {_v(idx_row.get('idx_weight'), '{:.4f}')}%",
            f"Index Points: {_v(idx_row.get('idx_point'), '{:.2f}')}",
            f"Free Float: PKR {_v(idx_row.get('freefloat_m'), '{:,.0f}')}M",
        ]
    lines.append(f"As of: {TODAY}")
    return "\n".join(lines), {"symbol": symbol, "type": "stock", "date": TODAY}


def build_sector_doc(row: dict) -> tuple[str, dict]:
    lines = [
        f"Sector: {_v(row.get('sector_name'))} ({_v(row.get('sector_code'))})",
        f"Market Cap: PKR {_v(row.get('market_cap_b'), '{:.2f}')}B",
        f"Turnover: {_v(row.get('turnover'), '{:,.0f}')} shares",
        f"Advancing: {_v(row.get('advance'), '{:.0f}')} | Declining: {_v(row.get('decline'), '{:.0f}')} | Unchanged: {_v(row.get('unchanged'), '{:.0f}')}",
        f"As of: {TODAY}",
    ]
    return "\n".join(lines), {"sector_code": row.get("sector_code"), "type": "sector", "date": TODAY}


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run(force: bool = False, dry_run: bool = False) -> None:
    model_label = HF_EMBEDDING_MODEL if EMBEDDING_PROVIDER == "huggingface" else OLLAMA_MODEL
    print(f"[{TODAY}] PSX KSE-100 ingestion — mode: {'force' if force else 'dry-run' if dry_run else 'incremental'} | embeddings: {EMBEDDING_PROVIDER} ({model_label})")

    # 1. Fetch index constituents + sector summaries
    print("  Fetching KSE-100 index constituents...")
    kse100_df = psxdata.indices("KSE100")
    all_symbols: list[str] = kse100_df["symbol"].tolist()
    idx_by_symbol = {r["symbol"]: r.to_dict() for _, r in kse100_df.iterrows()}
    print(f"  {len(all_symbols)} KSE-100 constituents")

    print("  Fetching sector summaries...")
    sectors_df = psxdata.sectors()
    print(f"  {len(sectors_df)} sectors")

    # 2. Determine what needs updating (skip freshness check on --force or --dry-run)
    stocks_to_update: list[str] = all_symbols
    sectors_to_update: list[dict] = sectors_df.to_dict("records")
    stale_stocks: list[str] = []
    stale_sectors: list[str] = []

    if not force and not dry_run:
        conn = pg_connect()
        with conn.cursor() as cur:
            ensure_table(cur)
            existing = load_existing(cur)
        conn.close()

        fresh_stocks  = {k for (t, k), d in existing.items() if t == "stock"  and d == TODAY}
        fresh_sectors = {k for (t, k), d in existing.items() if t == "sector" and d == TODAY}
        stale_stocks  = [s for s in all_symbols if s not in fresh_stocks and ("stock", s) in existing]
        stale_sectors = [r["sector_code"] for r in sectors_to_update
                         if r["sector_code"] not in fresh_sectors and ("sector", r["sector_code"]) in existing]

        stocks_to_update  = [s for s in all_symbols  if s not in fresh_stocks]
        sectors_to_update = [r for r in sectors_to_update if r["sector_code"] not in fresh_sectors]

        skipped = len(all_symbols) - len(stocks_to_update) + (len(sectors_df) - len(sectors_to_update))
        print(f"  Skipping {skipped} already-fresh records, updating {len(stocks_to_update)} stocks + {len(sectors_to_update)} sectors")

    if not stocks_to_update and not sectors_to_update:
        print("  Everything is up to date. Nothing to do.")
        return

    # 3. Fetch quotes only for stocks that need updating
    print(f"  Fetching quotes for {len(stocks_to_update)} stocks...")
    quotes: dict[str, dict] = {}
    for i, symbol in enumerate(stocks_to_update, 1):
        try:
            q = psxdata.quote(symbol)
            if not q.empty:
                quotes[symbol] = q.iloc[0].to_dict()
        except Exception as exc:
            print(f"    Warning: {symbol} skipped — {exc}")
        time.sleep(0.5)  # stay under psxdata's 2 req/s limit
        if i % 20 == 0:
            print(f"    {i}/{len(stocks_to_update)} done")

    # 4. Build documents
    docs: list[tuple[str, dict]] = []
    for symbol in stocks_to_update:
        docs.append(build_stock_doc(symbol, quotes.get(symbol), idx_by_symbol.get(symbol)))
    for row in sectors_to_update:
        docs.append(build_sector_doc(row))

    print(f"  Built {len(docs)} documents")

    if dry_run:
        print("\n--- Sample documents (first 3) ---")
        for text, meta in docs[:3]:
            print(f"\n[{meta}]\n{text}")
        print(f"\n... and {len(docs) - 3} more. Dry run complete — nothing stored.")
        return

    # 5. Embed
    model_name = HF_EMBEDDING_MODEL if EMBEDDING_PROVIDER == "huggingface" else OLLAMA_MODEL
    print(f"  Generating embeddings via {EMBEDDING_PROVIDER} ({model_name})...")
    rows: list[tuple] = []
    for i, (text, meta) in enumerate(docs, 1):
        vec = embed(text)
        rows.append((str(uuid.uuid4()), vec, text, json.dumps(meta)))
        if i % 20 == 0:
            print(f"    Embedded {i}/{len(docs)}...")

    # 6. Write to DB
    print(f"  Storing {len(rows)} documents to '{TABLE}'...")
    conn = pg_connect()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_table(cur)
                if force:
                    wipe_all(cur)
                else:
                    delete_stale(cur, stale_stocks, stale_sectors)
                bulk_insert(cur, rows)
    finally:
        conn.close()

    print(f"Done. {len(rows)} documents stored to '{TABLE}'.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PSX KSE-100 daily ingestion")
    parser.add_argument("--force",   action="store_true", help="Wipe all existing data and reingest from scratch")
    parser.add_argument("--dry-run", action="store_true", help="Print sample docs without writing to DB")
    args = parser.parse_args()
    run(force=args.force, dry_run=args.dry_run)
