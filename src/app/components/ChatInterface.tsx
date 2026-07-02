"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessageRow, {
  ChatLoadingRow,
  type ChatMessage,
} from "@/app/components/ChatMessageRow";
import ChatComposer from "@/app/components/ChatComposer";

interface ChatInterfaceProps {
  initialMessages: ChatMessage[];
  chatId: string;
  isLocal?: boolean;
  initialQuestion?: string;
}

const TITLE_PREFIX = "\n[TITLE]:";

export default function ChatInterface({
  initialMessages,
  chatId,
  isLocal,
  initialQuestion,
}: ChatInterfaceProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const autoSubmittedRef = useRef(false);

  const submitQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: `${Date.now()}`,
      content: question,
      sender: "user",
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    const aiMsgId = `${Date.now() + 1}`;

    try {
      const url = isLocal
        ? `/api/chat/local`
        : `/api/chat/${chatId}/message/create`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          chat_history: updatedMessages.map((m) => ({
            role: m.sender,
            content: m.content,
          })),
          chatId,
          userId: user?.id,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Server error");
      }

      setMessages((prev) => [...prev, { id: aiMsgId, content: "", sender: "ai" }]);
      setIsLoading(false);
      setIsStreaming(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        const titleIdx = accumulated.indexOf(TITLE_PREFIX);
        const display = titleIdx !== -1 ? accumulated.slice(0, titleIdx) : accumulated;

        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, content: display } : m))
        );
      }

      const titleIdx = accumulated.indexOf(TITLE_PREFIX);
      const finalAnswer = titleIdx !== -1 ? accumulated.slice(0, titleIdx) : accumulated;

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, content: finalAnswer } : m))
      );

      if (isLocal) {
        const allMessages = [
          ...updatedMessages,
          { id: aiMsgId, content: finalAnswer, sender: "ai" as const },
        ];
        sessionStorage.setItem(`chat_${chatId}`, JSON.stringify(allMessages));
      }
    } catch (error) {
      console.error("Failed to fetch response:", error);
      setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isLocal, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const question = input;
    setInput("");
    await submitQuestion(question);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading, isStreaming]);

  // Auto-submit the initial question coming from the home page redirect
  useEffect(() => {
    if (!initialQuestion || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    submitQuestion(initialQuestion);
  }, [initialQuestion, submitQuestion]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <ScrollArea className="min-h-0 flex-1 py-6 md:py-8" ref={scrollAreaRef}>
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6">
          {messages.map((message, index) => {
            const prev = messages[index - 1];
            const isSameSenderAsPrevious =
              prev !== undefined && prev.sender === message.sender;
            return (
              <ChatMessageRow
                key={message.id}
                message={message}
                isSameSenderAsPrevious={isSameSenderAsPrevious}
              />
            );
          })}
          {isLoading && <ChatLoadingRow />}
        </div>
      </ScrollArea>

      <ChatComposer
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading || isStreaming}
      />
    </div>
  );
}
