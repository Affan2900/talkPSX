function isTextContent(c: unknown): c is { type: "text"; text: string } {
  return (
    typeof c === "object" &&
    c !== null &&
    "type" in c &&
    (c as { type: unknown }).type === "text" &&
    "text" in c &&
    typeof (c as { text: unknown }).text === "string"
  );
}

/** Coerce LangChain / Ollama message content to a plain string. */
export function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(isTextContent)
      .map((c) => c.text)
      .join("\n");
  }
  return "";
}

/** Remove DeepSeek / Ollama reasoning blocks and stray thinking tags. */
export function stripThinkingBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, "")
    .replace(/<redacted_thinking\s*\/?>/gi, "")
    .replace(/<\/think>/gi, "")
    .replace(/<think\s*\/?>/gi, "")
    .replace(/^\s*[\r\n]+/gm, "\n")
    .trim();
}

const MAX_TITLE_LENGTH = 80;

/** Normalize LLM title output for sidebar display. */
export function sanitizeChatTitle(
  rawTitle: unknown,
  fallbackQuestion: string
): string {
  let title = stripThinkingBlocks(normalizeMessageContent(rawTitle));
  title = title.split(/\r?\n/)[0]?.trim() ?? "";
  title = title.replace(/^["'`]+|["'`]+$/g, "").trim();
  if (title.length > MAX_TITLE_LENGTH) {
    title = title.slice(0, MAX_TITLE_LENGTH).trim();
  }
  if (title) return title;

  const fromQuestion = fallbackQuestion
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");
  return fromQuestion || "New Chat";
}
