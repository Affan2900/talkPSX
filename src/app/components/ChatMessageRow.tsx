"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
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

function UserAvatar() {
  const { user } = useUser();

  if (user?.imageUrl) {
    return (
      <Image
        src={user.imageUrl}
        alt={user.fullName ?? "User"}
        fill
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-green-500 text-white">
      <User className="h-5 w-5 md:h-6 md:w-6" />
    </div>
  );
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
      {/* Avatar: user side only */}
      {isUser && (
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full md:h-12 md:w-12">
          <UserAvatar />
        </div>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-col",
          isUser ? "max-w-[75%] items-end md:max-w-[70%]" : "w-full items-start"
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
          {isUser ? (
            <p className="text-base leading-relaxed text-foreground">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm max-w-none text-slate-800 prose-headings:font-semibold prose-headings:text-slate-900 prose-strong:text-slate-900 prose-a:text-green-700 prose-ul:my-1 prose-li:my-0">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatLoadingRow() {
  return (
    <div className="mt-6 flex gap-3">
      <div className="flex w-full flex-col items-start">
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
