"use client";

import { useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface ChatComposerProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}

export default function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  disabled = false,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && input.trim()) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <div className="px-4 pb-5 pt-2 md:px-6 md:pb-6">
      <div className="mx-auto w-full max-w-3xl">
        <form
          onSubmit={onSubmit}
          className="relative rounded-2xl border border-input bg-card shadow-md"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Message Talk PSX..."
            rows={1}
            className="w-full resize-none rounded-2xl bg-transparent px-4 pb-14 pt-4 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          />

          {/* Send button — bottom-right inside the container */}
          <div className="absolute bottom-3 right-3">
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </form>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
