interface QuoteData {
  symbol: string;
  price?: number;
  change?: number;
  change_pct?: number;
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
    q.price ? `Price: PKR ${fmt(q.price)}` : null,
    `Change: ${changeStr}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Fetches a live quote from Yahoo Finance (no API key required).
 * PSX symbols use the .KA suffix on Yahoo Finance (e.g. ENGRO.KA).
 * Returns null if the symbol is not found or the request fails.
 */
export async function fetchLiveQuote(symbol: string): Promise<string | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.KA?interval=1d&range=1d`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;

    const price: number = meta.regularMarketPrice;
    const prev: number | undefined = meta.chartPreviousClose;
    const change = prev != null ? price - prev : undefined;
    const change_pct = prev != null ? ((price - prev) / prev) * 100 : undefined;

    return formatQuoteContext(symbol, { symbol, price, change, change_pct });
  } catch {
    return null;
  }
}
