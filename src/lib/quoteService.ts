interface QuoteData {
  symbol?: string;
  sector?: string;
  listed_in?: string;
  price?: number;
  change?: number;
  change_pct?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  market_cap?: number;
  [key: string]: unknown;
}

function fmt(n: number | undefined | null, decimals = 2): string {
  return n != null ? n.toFixed(decimals) : "N/A";
}

function formatQuoteContext(symbol: string, q: QuoteData): string {
  const change = q.change ?? null;
  const changePct = q.change_pct ?? null;
  const changeStr =
    change != null && changePct != null
      ? `${change >= 0 ? "+" : ""}${fmt(change)} (${change >= 0 ? "+" : ""}${fmt(changePct)}%)`
      : "N/A";

  return [
    `[LIVE DATA — real-time, takes priority over stored context for current price]`,
    `Stock: ${symbol}`,
    q.sector   ? `Sector: ${q.sector}`                          : null,
    q.price    ? `Price: PKR ${fmt(q.price)}`                   : null,
    `Change: ${changeStr}`,
    q.pe_ratio        ? `P/E Ratio: ${fmt(q.pe_ratio)}`         : null,
    q.dividend_yield  ? `Dividend Yield: ${fmt(q.dividend_yield)}%` : null,
    q.market_cap      ? `Market Cap: PKR ${q.market_cap.toLocaleString()}M` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Fetches a live quote from the Python Quote API and returns it as a
 * formatted context string ready for the LLM prompt.
 * Returns null if the API is unreachable — vector store is used instead.
 */
export async function fetchLiveQuote(symbol: string): Promise<string | null> {
  const base = process.env.QUOTE_API_URL?.trim() || "http://localhost:8001";
  try {
    const res = await fetch(`${base}/quote/${encodeURIComponent(symbol)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: QuoteData = await res.json();
    return formatQuoteContext(symbol, data);
  } catch {
    // API not running (e.g. Lambda cold-start or local dev without quote-api)
    return null;
  }
}
