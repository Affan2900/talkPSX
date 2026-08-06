import { extractSymbols } from "@/lib/symbolExtract";

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
 *   2. A known KSE-100 symbol mentioned (see `extractSymbols`)
 */
export function detectLiveQuoteSymbol(question: string): string | null {
  const lower = question.toLowerCase();

  const hasKeyword = PRICE_KEYWORDS.some((k) => lower.includes(k));
  if (!hasKeyword) return null;

  return extractSymbols(question)[0] ?? null;
}
