"use client";

import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  return (
    <div className="sticky bottom-0 border-t border-border bg-background/80 px-4 py-3 backdrop-blur-sm md:py-4">
      <div className="mx-auto w-full max-w-4xl">
        <form
          onSubmit={onSubmit}
          className="flex items-end gap-2 rounded-2xl border border-input bg-card px-3 py-2 shadow-sm"
        >
          <Input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={disabled}
            placeholder="Ask about PSX stocks..."
            className="min-h-[40px] flex-1 border-0 bg-transparent px-3 py-2.5 text-base shadow-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            disabled={disabled || !input.trim()}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            <ArrowUpRight className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
