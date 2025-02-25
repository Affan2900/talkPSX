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
  initialMessages: Message[]
}

export default function ChatInterface({ initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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
                <span className="ml-3 text-lg text-gray-600">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-green-100 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              // Handle sending message
            }}
            className="flex items-center gap-4"
          >
            <Input
              type="text"
              placeholder="Ask about PSX companies and trends..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-grow text-lg py-6 px-6 border-2 border-green-200 rounded-full focus:ring-green-500 focus:border-green-500 shadow-sm"
            />
            <Button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white rounded-full p-6 shadow-md transition-all duration-200 hover:shadow-lg"
            >
              <Send size={24} className="mr-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

