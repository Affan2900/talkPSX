"use client";

import { useState, useRef, useEffect } from "react";
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
}

export default function ChatInterface({
  initialMessages,
  chatId,
  isLocal,
}: ChatInterfaceProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: `${Date.now()}`,
      content: input,
      sender: "user",
    };

    const question = input;
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");

    try {
      const url = isLocal 
        ? `/api/chat/local` 
        : `/api/chat/${chatId}/message/create`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          // Map sender→role so the API can correctly classify history messages
          chat_history: updatedMessages.map((m) => ({
            role: m.sender,
            content: m.content,
          })),
          chatId,
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const aiMessage: ChatMessage = {
          id: `${Date.now() + 1}`,
          content: data.answer.replace(/^"|"$/g, ""),
          sender: "ai",
        };
        const newMessages = [...updatedMessages, aiMessage];
        setMessages(newMessages);
        
        if (isLocal) {
          sessionStorage.setItem(`chat_${chatId}`, JSON.stringify(newMessages));
        }
      } else {
        console.error("Error:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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
        disabled={isLoading}
      />
    </div>
  );
}
