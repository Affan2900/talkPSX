"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import AnimatedText from "./AnimatedText";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

const texts = [
  "Insights and Trends for PSX Companies",
  "Best Performing PSX Companies",
  "In-Depth Analysis and Predictions for PSX Stocks"
];

type HeroProps = {
  sidebarOpen?: boolean;
};

export default function Hero({ sidebarOpen = false }: HeroProps) {
  const router = useRouter();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [query]);

  // Check if the user exists in the database, create if not
  useEffect(() => {
    if (!user?.id) return;

    const checkAndCreateUser = async () => {
      try {
        const username =
          user.fullName?.trim() ||
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.username ||
          user.primaryEmailAddress?.emailAddress ||
          `user_${user.id.slice(0, 12)}`;

        const response = await fetch("/api/user/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, username }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(
            "Error checking/creating user:",
            data.error,
            "cause" in data ? data.cause : ""
          );
        }
      } catch (error) {
        console.error("Failed to check/create user:", error);
      }
    };

    checkAndCreateUser();
  }, [
    user?.id,
    user?.firstName,
    user?.lastName,
    user?.fullName,
    user?.username,
    user?.primaryEmailAddress?.emailAddress,
  ]);

  // console.log("User object:", user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    if (!user) {
      // Redirect immediately — chat page handles the LLM call
      const localChatId = "local-" + crypto.randomUUID();
      router.push(`/chat/${localChatId}?q=${encodeURIComponent(query)}&new=1`);
      setQuery("");
      return;
    }

    setLoading(true);

    try {
      const createChatResponse = await fetch(`/api/user/${user.id}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, message: query }),
      });

      const chatData = await createChatResponse.json();
      if (!createChatResponse.ok) {
        throw new Error(chatData.error || "Failed to create chat");
      }

      // Redirect immediately — chat page handles the LLM call
      router.push(`/chat/${chatData.chatId}?q=${encodeURIComponent(query)}&new=1`);
    } catch (error) {
      toast.error("Failed to reach the server. Please try again.");
      console.error("API Error:", error);
    } finally {
      setLoading(false);
    }

    setQuery("");
  };

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-theme(spacing.24))] flex-col items-center justify-center px-4 py-12 transition-[margin-left] duration-300 ease-in-out",
        sidebarOpen && "md:ml-[300px]"
      )}
    >
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-6xl md:text-7xl font-bold text-green-800 mb-6"
          >
            Talk PSX
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-green-700 flex items-center justify-center"
          >
            <p className="mr-2 font-bold">Get Real-Time </p>
            <AnimatedText texts={texts} />
          </motion.div>
        </div>
        <motion.form
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          onSubmit={handleSubmit}
          className="relative w-full max-w-3xl rounded-2xl border border-input bg-card shadow-md"
        >
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading && query.trim()) handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            disabled={loading}
            placeholder="Ask about PSX companies and trends..."
            rows={1}
            className="w-full resize-none rounded-2xl bg-transparent px-4 pb-14 pt-4 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          />

          <div className="absolute bottom-3 right-3">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Spinner /> : <ArrowUp className="h-5 w-5" />}
            </button>
          </div>
        </motion.form>

    </div>
  );
}