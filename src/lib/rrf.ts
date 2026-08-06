/**
 * Reciprocal Rank Fusion (Cormack et al., 2009).
 *
 * Combines several independently-ranked result lists into one. Fusion is done
 * on *ranks*, not scores, which is the whole point: cosine distance and
 * `ts_rank_cd` live on incomparable scales, so any attempt to blend their raw
 * values needs arbitrary normalisation. Ranks sidestep that entirely.
 *
 *   score(doc) = Σ_lanes  weight(lane) / (K + rank(doc, lane))
 *
 * A document missing from a lane simply contributes nothing for that lane.
 */

export type Lane = "vector" | "keyword" | "symbol";

export interface LaneHit<T> {
  lane: Lane;
  /** 1-based position within its own lane. */
  rank: number;
  item: T;
}

export interface FusedResult<T> {
  item: T;
  score: number;
  /** Per-lane rank of this item, for debugging and weight tuning. */
  ranks: Partial<Record<Lane, number>>;
}

export interface RrfOptions {
  /**
   * Smoothing constant. Larger values flatten the curve, so top ranks count
   * for less relative to the long tail. 60 is the value from the original
   * paper and the de-facto default.
   */
  k?: number;
  weights?: Partial<Record<Lane, number>>;
}

export const DEFAULT_RRF_K = 60;

export function reciprocalRankFusion<T>(
  hits: LaneHit<T>[],
  keyOf: (item: T) => string,
  options: RrfOptions = {}
): FusedResult<T>[] {
  const k = options.k ?? DEFAULT_RRF_K;
  const weights = options.weights ?? {};

  const fused = new Map<string, FusedResult<T>>();

  for (const hit of hits) {
    const key = keyOf(hit.item);
    const weight = weights[hit.lane] ?? 1;

    let entry = fused.get(key);
    if (!entry) {
      entry = { item: hit.item, score: 0, ranks: {} };
      fused.set(key, entry);
    }

    if (entry.ranks[hit.lane] !== undefined) continue;

    entry.ranks[hit.lane] = hit.rank;
    entry.score += weight / (k + hit.rank);
  }

  return [...fused.values()].sort((a, b) => b.score - a.score);
}
