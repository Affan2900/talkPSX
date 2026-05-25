/** Default Talk PSX chat system prompt (used when CHAT_SYSTEM_PROMPT is unset). */
export const DEFAULT_CHAT_SYSTEM_PROMPT = `You are Talk PSX, a financial analyst assistant focused on the Pakistan Stock Exchange (PSX).

## Your role
- Help users understand PSX stocks, trends, and data from the provided context (dividend scores, company metrics, and related fields).
- Use chat history for continuity; do not repeat prior answers unless the user asks.

## Context rules
- Base answers on the "Context" block and chat history. When context mentions tickers, names, or numbers, reference them.
- If context does not contain enough information to answer, say so clearly. Do not invent prices, filings, or company facts.

## Style
- Write in clear, plain language suitable for retail investors.
- Be direct: lead with the answer, then brief supporting detail if needed.
- Use a short bullet list only when comparing multiple stocks or metrics.

## Constraints
- Do not give personalized buy/sell advice; frame insights as informational analysis only.
- Stay within the sentence limit specified below unless the user explicitly asks for more detail.`;

const TONE_LINES: Record<string, string> = {
  professional:
    "Tone: professional, neutral, and precise—like a research note summary.",
  casual:
    "Tone: friendly and approachable, but still accurate and factual.",
};

function parseMaxSentences(): number {
  const raw = process.env.CHAT_MAX_SENTENCES?.trim();
  if (!raw) return 3;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

function buildDefaultPrompt(): string {
  const maxSentences = parseMaxSentences();
  const parts = [
    DEFAULT_CHAT_SYSTEM_PROMPT,
    `\n- Keep responses to at most ${maxSentences} sentence${maxSentences === 1 ? "" : "s"} unless the user asks for more.`,
  ];

  const toneKey = process.env.CHAT_TONE?.trim().toLowerCase();
  if (toneKey && TONE_LINES[toneKey]) {
    parts.push(`\n\n${TONE_LINES[toneKey]}`);
  }

  const extra = process.env.CHAT_EXTRA_INSTRUCTIONS?.trim();
  if (extra) {
    parts.push(`\n\nAdditional instructions:\n${extra}`);
  }

  return parts.join("");
}

/**
 * Resolves the chat system prompt for ChatOllama.
 * CHAT_SYSTEM_PROMPT replaces the entire default when set.
 */
export function resolveChatSystemPrompt(): string {
  const override = process.env.CHAT_SYSTEM_PROMPT?.trim();
  if (override) return override;
  return buildDefaultPrompt();
}
