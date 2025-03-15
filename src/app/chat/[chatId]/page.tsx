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

  console.log("Messages:", formattedMessages); // Debugging

  return (
    <div className="flex h-screen">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <main
        className={`flex-1 transition-all ${
          isSidebarOpen ? "ml-[300px]" : "ml-0"
        }`}
      >
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white">
            <motion.div
              className="w-12 h-12 border-4 border-green-200 border-t-green-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
            <p className="mt-4 text-green-600 font-medium">
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