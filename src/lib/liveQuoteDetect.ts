import { KSE100_SYMBOLS } from "@/lib/kse100Symbols";

const PRICE_KEYWORDS = [
  "price", "trading", "current", "right now", "today", "rate",
  "worth", "quote", "rupees", "pkr", "how much", "value",
];

/**
 * Returns a PSX ticker symbol if the question looks like a live price query,
 * or null if the vector store should handle it instead.
 *
 * Detection requires BOTH:
 *   1. A price-related keyword in the question
 *   2. A known KSE-100 symbol mentioned (case-insensitive)
 */
export function detectLiveQuoteSymbol(question: string): string | null {
  const lower = question.toLowerCase();

  const hasKeyword = PRICE_KEYWORDS.some((k) => lower.includes(k));
  if (!hasKeyword) return null;

  // Check for explicit uppercase ticker (e.g. "ENGRO", "MCB")
  const upperTokens = question.match(/\b[A-Z]{2,6}\b/g) ?? [];
  for (const token of upperTokens) {
    if (KSE100_SYMBOLS.has(token)) return token;
  }

  // Check for lowercase/mixed mention (e.g. "engro", "Luck")
  for (const symbol of KSE100_SYMBOLS) {
    if (lower.includes(symbol.toLowerCase())) return symbol;
  }

  return null;
}
