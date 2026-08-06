import { Document } from "@langchain/core/documents";
import postgres from "postgres";
import { resolveEmbeddings } from "@/lib/embeddingProvider";
import { extractSymbolCandidates } from "@/lib/symbolExtract";
import {
  DEFAULT_RRF_K,
  reciprocalRankFusion,
  type Lane,
  type LaneHit,
} from "@/lib/rrf";

/**
 * Hybrid retrieval over the `psx_kse100` PGVector table.
 *
 * Three independent lanes are ranked in a single round trip, then fused with
 * Reciprocal Rank Fusion:
 *
 *   vector   — cosine ANN over the embedding column (semantic similarity)
 *   keyword  — Postgres full-text search over a generated tsvector (exact words)
 *   symbol   — direct match on metadata->>'symbol' for any ticker in the question
 *
 
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** How many candidates each lane contributes to fusion. Wider than the final K. */
const LANE_K = () => envInt("HYBRID_LANE_K", 20);
const RRF_K = () => envInt("HYBRID_RRF_K", DEFAULT_RRF_K);

/**
 * Maximum share of the corpus a term may appear in before the keyword lane
 * ignores it.
 */
const MAX_DF = () => envFloat("HYBRID_MAX_DF", 0.3);

function laneWeights(): Partial<Record<Lane, number>> {
  return {
    vector: envFloat("HYBRID_WEIGHT_VECTOR", 1.0),
    keyword: envFloat("HYBRID_WEIGHT_KEYWORD", 1.0),
    // An explicitly named ticker is the highest-precision signal available:
    // with ~135 documents, "tell me about OGDC" should surface the OGDC row
    // regardless of what the other lanes think.
    symbol: envFloat("HYBRID_WEIGHT_SYMBOL", 2.0),
  };
}

/** "hybrid" (default) or "vector" */
export function resolveRetrievalMode(): "hybrid" | "vector" {
  return process.env.RETRIEVAL_MODE?.trim().toLowerCase() === "vector"
    ? "vector"
    : "hybrid";
}

let sqlClient: ReturnType<typeof postgres> | null = null;
let cachedDatabaseUrl: string | undefined;

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  if (sqlClient && cachedDatabaseUrl !== connectionString) {
    void sqlClient.end({ timeout: 5 });
    sqlClient = null;
    cachedDatabaseUrl = undefined;
  }

  if (!sqlClient) {
    // prepare: false is required for Supabase's transaction pooler (port 6543).
    sqlClient = postgres(connectionString, {
      ssl: "require",
      connect_timeout: 60,
      max: 3,
      prepare: false,
      keep_alive: 60,
    });
    cachedDatabaseUrl = connectionString;
  }

  return sqlClient;
}

interface LaneRow {
  lane: Lane;
  id: string;
  text: string;
  metadata: Record<string, unknown> | null;
  rank: number;
}

export interface HybridRetrieveOptions {
  topK: number;
  /** Max cosine distance for the vector lane. Applied before fusion. */
  threshold: number;
  laneK?: number;
}

export async function hybridRetrieve(
  question: string,
  options: HybridRetrieveOptions
): Promise<Document[]> {
  const { topK, threshold } = options;
  const laneK = options.laneK ?? LANE_K();

  const embedding = await resolveEmbeddings().embedQuery(question);
  const symbols = extractSymbolCandidates(question);

  // pgvector accepts its literal form as text; the column's dimension is
  // inferred, so this works unchanged across the 384/768-dim providers.
  const vector = `[${embedding.join(",")}]`;
  const symbolCsv = symbols.join(",");

  const sql = getSql();

  const rows = await sql<LaneRow[]>`
    WITH corpus AS (
      SELECT count(*)::float AS ndocs FROM "psx_kse100"
    ),
    -- Lexemes of the question, stemmed and stopword-stripped by Postgres.
    qlex AS (
      SELECT DISTINCT unnest(tsvector_to_array(to_tsvector('english', ${question}))) AS word
    ),
    -- Corpus-wide document frequency, so boilerplate template words can be
    -- dropped. ts_stat scans every tsvector; fine at this corpus size, but
    -- promote it to a materialised view if the table grows past a few thousand.
    df AS (
      SELECT word, ndoc FROM ts_stat('SELECT tsv FROM "psx_kse100"')
    ),
    -- Only terms rare enough to actually discriminate between documents.
    rare AS (
      SELECT q.word
      FROM qlex q
      LEFT JOIN df ON df.word = q.word
      WHERE df.ndoc IS NULL
         OR df.ndoc::float / (SELECT ndocs FROM corpus) <= ${MAX_DF()}
    ),
    -- Rebuilt as an OR query. Terms are already lexemes, so casting straight to
    -- tsquery avoids a second round of stemming, and quote_literal keeps user
    -- input from reaching the tsquery parser as syntax. With no rare terms
    -- string_agg yields NULL, "tsv @@ NULL" is NULL, and the lane self-disables.
    kwq AS (
      SELECT string_agg(quote_literal(word), ' | ')::tsquery AS query FROM rare
    ),
    vec AS (
      SELECT
        id,
        "text",
        metadata,
        (row_number() OVER (ORDER BY embedding <=> ${vector}::vector))::int AS rank
      FROM "psx_kse100"
      WHERE embedding IS NOT NULL
        AND (embedding <=> ${vector}::vector) <= ${threshold}
      ORDER BY embedding <=> ${vector}::vector
      LIMIT ${laneK}
    ),
    kw AS (
      SELECT
        d.id,
        d."text",
        d.metadata,
        (row_number() OVER (ORDER BY ts_rank_cd(d.tsv, q.query) DESC, d.id))::int AS rank
      FROM "psx_kse100" d, kwq q
      WHERE d.tsv @@ q.query
      ORDER BY ts_rank_cd(d.tsv, q.query) DESC, d.id
      LIMIT ${laneK}
    ),
    sym AS (
      SELECT
        id,
        "text",
        metadata,
        (row_number() OVER (ORDER BY metadata->>'symbol'))::int AS rank
      FROM "psx_kse100"
      WHERE metadata->>'symbol' = ANY(string_to_array(${symbolCsv}, ','))
      LIMIT ${laneK}
    )
    SELECT 'vector'::text AS lane, id, "text", metadata, rank FROM vec
    UNION ALL
    SELECT 'keyword'::text AS lane, id, "text", metadata, rank FROM kw
    UNION ALL
    SELECT 'symbol'::text AS lane, id, "text", metadata, rank FROM sym
  `;

  if (rows.length === 0) return [];

  const hits: LaneHit<LaneRow>[] = rows.map((row) => ({
    lane: row.lane,
    rank: row.rank,
    item: row,
  }));

  const fused = reciprocalRankFusion(hits, (row) => row.id, {
    k: RRF_K(),
    weights: laneWeights(),
  });

  const top = fused.slice(0, topK);

  if (process.env.HYBRID_DEBUG?.trim() === "1") {
    console.log(
      `[hybrid] "${question.slice(0, 60)}" candidates=[${symbols.join(",")}] ` +
        `lanes=${rows.length} fused=${fused.length}`,
      top.map((r) => ({
        symbol: r.item.metadata?.symbol ?? r.item.metadata?.sector_code,
        score: Number(r.score.toFixed(5)),
        ranks: r.ranks,
      }))
    );
  }

  return top.map(
    ({ item }) =>
      new Document({
        pageContent: item.text,
        metadata: item.metadata ?? {},
      })
  );
}
