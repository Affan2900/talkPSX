import { KSE100_SYMBOLS } from "@/lib/kse100Symbols";

/**
 * Symbols that are also ordinary English words. These only count as tickers
 * when written in uppercase — otherwise "the power sector" or "good luck"
 * would pin an unrelated stock to the top of the results.
 */
const AMBIGUOUS_SYMBOLS = new Set(["POWER", "UNITY", "LUCK", "SILK"]);

/** Longest symbol is UNILEVER (8); allow a little headroom for future entries. */
const TICKER_TOKEN = /\b[A-Z]{2,10}\b/g;

const BY_LOWERCASE = new Map(
  [...KSE100_SYMBOLS].map((symbol) => [symbol.toLowerCase(), symbol])
);

/**
 * Returns every KSE-100 symbol mentioned in `text`, in the order first seen.

 */
export function extractSymbols(text: string): string[] {
  const found = new Set<string>();

  for (const token of text.match(TICKER_TOKEN) ?? []) {
    if (KSE100_SYMBOLS.has(token)) found.add(token);
  }

  for (const token of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    const symbol = BY_LOWERCASE.get(token);
    if (symbol && !AMBIGUOUS_SYMBOLS.has(symbol)) found.add(symbol);
  }

  return [...found];
}


export function extractSymbolCandidates(text: string): string[] {
  const candidates = new Set(extractSymbols(text));

  for (const token of text.match(TICKER_TOKEN) ?? []) {
    candidates.add(token);
  }

  return [...candidates];
}
