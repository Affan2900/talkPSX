"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import ChatInterface from "@/app/components/ChatInterface";
import Sidebar from "@/app/components/Sidebar";

interface ChatMessage {
  id: string;
  content: string;
  senderId?: string;
}

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { chatId } = useParams();

  useEffect(() => {
    const fetchChatData = async () => {
      if (typeof chatId !== "string") {
        console.error("Invalid chatId:", chatId);
        setLoading(false);
        return;
      }

      try {
        const messagesResponse = await fetch(
          `/api/chat/${chatId}/message/read`
        );
        const messagesData = await messagesResponse.json();
      
    
        // Fix: Access the `messages` array inside the response object
        if (Array.isArray(messagesData.messages)) {
          setChatMessages(messagesData.messages);
        } else {
          console.error("Unexpected API response format:", messagesData);
          setChatMessages([]); // Prevent errors
        }
      } catch (error) {
        console.error("Failed to fetch chat data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();
  }, [chatId]);

  // Transform messages for ChatInterface
  const formattedMessages = chatMessages.map((msg) => ({
    id: msg.id,
    content: msg.content,
    sender: msg.senderId !== "ai" ? "user" : ("ai" as "user" | "ai"),
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col transition-all ${
          isSidebarOpen ? "ml-[300px]" : "ml-0"
        }`}
      >
        {loading ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50">
            <motion.div
              className="h-8 w-8 rounded-full border-2 border-muted border-t-green-600"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              Loading conversation...
            </p>
          </div>
        ) : (
          typeof chatId === "string" && (
            <ChatInterface initialMessages={formattedMessages} chatId={chatId} />
          )
        )}
      </main>
    </div>
  );
}