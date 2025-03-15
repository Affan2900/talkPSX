"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Send, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
}

interface ChatInterfaceProps {
  initialMessages: Message[],
  chatId: string
}

export default function ChatInterface({ initialMessages, chatId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setIsLoading(true)
    try {
      // Add the user's message to the chat
      const userMessage: Message = {
        id: `${Date.now()}`,
        content: input,
        sender: "user",
      }
      setMessages((prevMessages) => [...prevMessages, userMessage])
      setInput("")

    // Get the answer from the chat API
    const response = await fetch(`/api/chat/${chatId}/message/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: input, chat_history: messages, chatId }),
    })

    const data = await response.json()

    if (response.ok) {
      const aiMessage: Message = {
        id: `${Date.now() + 1}`,
        content: data.answer,
        sender: "ai",
      }
      setMessages((prevMessages) => [...prevMessages, aiMessage])
    } else {
      console.error("Error:", data.error)
    }
  } catch (error) {
    console.error("Failed to fetch response:", error)
  } finally {
    setIsLoading(false)
  }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Chat Messages */}
      <ScrollArea className="flex-grow px-4 md:px-8 py-6" ref={scrollAreaRef}>
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-end space-x-2 ${
                message.sender === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"
              }`}
            >
              {/* Sender Icon */}
              <div className="flex-shrink-0 mb-1">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md ${
                    message.sender === "user" ? "bg-green-500 ml-3" : "bg-white border-2 border-green-500 mr-3"
                  }`}
                >
                  {message.sender === "user" ? (
                    <User size={24} className="text-white" />
                  ) : (
                    <Bot size={24} className="text-green-500" />
                  )}
                </div>
              </div>

              {/* Message Bubble */}
              <div className={`flex flex-col max-w-[80%] ${message.sender === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`p-6 rounded-[2rem] shadow-md ${
                    message.sender === "user"
                      ? "bg-green-500 text-white rounded-tr-lg"
                      : "bg-white text-gray-800 border border-green-100 rounded-tl-lg"
                  }`}
                >
                  <p className="text-lg leading-relaxed">{message.content}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
  <div className="flex items-end space-x-2">
    <div className="flex-shrink-0 mb-1">
      <div className="flex items-center justify-center w-12 h-12 rounded-full shadow-md bg-white border-2 border-green-500 mr-3">
        <Bot size={24} className="text-green-500" />
      </div>
    </div>
    <div className="flex items-center bg-white p-6 rounded-[2rem] rounded-tl-lg shadow-md border border-green-100">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="w-6 h-6 border-t-3 border-green-500 border-solid rounded-full"
      />
      <div className="ml-3 flex items-end">
        <div className="flex space-x-1">
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{ 
              duration: 0.6, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{ 
              duration: 0.6, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.2
            }}
          />
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{ 
              duration: 0.6, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.4 
            }}
          />
        </div>
      </div>
    </div>
  </div>
)}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-8 bg-gradient-to-r from-green-50 to-white border-t-2 border-green-200 shadow-xl">
        <div className="max-w-5xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-lg border-2 border-green-300 hover:border-green-400 transition-all duration-300"
          >
            <div className="flex-grow relative">
              <Input
                type="text"
                placeholder="Ask about PSX companies and trends..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="text-xl py-7 px-8 border-0 focus:ring-0 rounded-xl bg-transparent"
              />
              <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-r from-green-50 to-white opacity-50" />
            </div>
            <Button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-7 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 min-w-[80px] flex items-center justify-center"
            >
              <Send size={28} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

