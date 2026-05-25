"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
}

interface ChatMessageRowProps {
  message: ChatMessage;
  isSameSenderAsPrevious: boolean;
}

export default function ChatMessageRow({
  message,
  isSameSenderAsPrevious,
}: ChatMessageRowProps) {
  const isUser = message.sender === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        isSameSenderAsPrevious ? "mt-1" : "mt-6 first:mt-0"
      )}
    >
      <div className="flex-shrink-0">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full md:h-12 md:w-12",
            isUser
              ? "bg-green-500 text-white"
              : "border border-green-500/40 bg-card"
          )}
        >
          {isUser ? (
            <User className="h-5 w-5 md:h-6 md:w-6" />
          ) : (
            <Bot className="h-5 w-5 text-green-600 md:h-6 md:w-6" />
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex min-w-0 max-w-[85%] flex-col md:max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {!isUser && !isSameSenderAsPrevious && (
          <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Talk PSX
          </span>
        )}
        <div
          className={cn(
            isUser
              ? "rounded-xl rounded-tr-none border border-border bg-card px-4 py-2 shadow-sm"
              : "bg-transparent px-0 py-1"
          )}
        >
          <p
            className={cn(
              "text-base leading-relaxed",
              isUser ? "text-foreground" : "text-slate-800"
            )}
          >
            {message.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ChatLoadingRow() {
  return (
    <div className="mt-6 flex gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-green-500/40 bg-card md:h-12 md:w-12">
        <Bot className="h-5 w-5 text-green-600 md:h-6 md:w-6" />
      </div>
      <div className="flex flex-col items-start">
        <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Talk PSX
        </span>
        <div className="flex items-center gap-2 px-0 py-1">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="h-4 w-4 rounded-full border-2 border-green-200 border-t-green-600"
          />
          <span className="text-sm font-medium text-muted-foreground">
            Thinking...
          </span>
        </div>
      </div>
    </div>
  );
}
