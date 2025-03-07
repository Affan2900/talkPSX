"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import ChatInterface from "@/app/components/ChatInterface"
import Sidebar from "@/app/components/Sidebar"

interface ChatMessage {
  id: string
  content: string
  senderId?: string
}

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const { chatId } = useParams()

  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const messagesResponse = await fetch(`/api/chat/${chatId}/messages`);
        const messagesData = await messagesResponse.json();
        
        console.log("API Response:", messagesData); // Debugging
    
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

    fetchChatData()
  }, [chatId])

  // Transform messages for ChatInterface
  const formattedMessages = chatMessages.map((msg) => ({
    id: msg.id,
    content: msg.content,
    sender: msg.senderId ? "user" : ("ai" as "user" | "ai"),
  }))

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <main className={`flex-1 transition-all ${isSidebarOpen ? "ml-[300px]" : "ml-0"}`}>
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white">
            <div className="relative w-24 h-24 mb-8">
              <motion.div
                className="absolute inset-0 rounded-full border-t-4 border-green-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-t-4 border-green-400"
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-4 rounded-full border-t-4 border-green-300"
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              />
            </div>
            <motion.h2
              className="text-2xl font-bold text-green-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              Loading Chat
            </motion.h2>
            <motion.p
              className="text-green-600 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Fetching your conversation history...
            </motion.p>
          </div>
        ) : (
          <ChatInterface initialMessages={formattedMessages} />
        )}
      </main>
    </div>
  )
}

