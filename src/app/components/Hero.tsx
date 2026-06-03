"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import AnimatedText from "./AnimatedText";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner"

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
  const [answer, setAnswer] = useState("");
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
      setLoading(true);
      setAnswer("");
      try {
        const localChatId = "local-" + crypto.randomUUID();
        
        const response = await fetch(`/api/chat/local`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query, chatId: localChatId }),
        });

        const data = await response.json();

        if (response.ok) {
          const aiResponse = data.answer.replace(/^"|"$/g, "");
          setAnswer(aiResponse);

          // Prepare messages array and store in sessionStorage
          const initialMessages = [
            { id: `${Date.now()}`, content: query, senderId: "user" },
            { id: `${Date.now() + 1}`, content: aiResponse, senderId: "ai" }
          ];
          sessionStorage.setItem(`chat_${localChatId}`, JSON.stringify(initialMessages));

          router.push(`/chat/${localChatId}`);
        } else {
          setAnswer("Error: " + data.error);
        }
      } catch (error) {
        setAnswer("Failed to fetch response.");
        console.error("API Error:", error);
      } finally {
        setLoading(false);
      }
      setQuery("");
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      // Use an API route to create a chat and messages instead of direct DB access
      const createChatResponse = await fetch(`/api/user/${user.id}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user.id,
          message: query 
        }),
      });

      const chatData = await createChatResponse.json();
      
      
      if (!createChatResponse.ok) {
        throw new Error(chatData.error || "Failed to create chat");
      }

      const chatId = chatData.chatId;
      

      // Get the answer from your existing chat API
      const response = await fetch(`/api/chat/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, chatId }),
      });

      const data = await response.json();

      if (response.ok) {
        setAnswer(data.answer.replace(/^"|"$/g, ""));

        // // Save the AI response through an API route
        // await fetch("/api/chat/message", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({
        //     chatId,
        //     senderId: null, // null for AI
        //     content: data.answer
        //   }),
        // });


        await fetch(`/api/chat/${chatId}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title
          })
        })    

        router.push(`/chat/${chatId}`);
      } else {
        setAnswer("Error: " + data.error);
      }
    } catch (error) {
      setAnswer("Failed to fetch response.");
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

        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8 bg-gray-100 p-6 rounded-xl shadow-lg max-w-4xl text-lg text-green-900"
          >
            <strong>Answer:</strong> {answer}
          </motion.div>
        )}
    </div>
  );
}