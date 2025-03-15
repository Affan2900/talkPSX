"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import ChatItem from "./ChatItem";

interface Chat {
  id: string;
  title: string;
}

export default function Sidebar({ isOpen, toggleSidebar }: { isOpen: boolean; toggleSidebar: () => void }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    const fetchChats = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/user/${user.id}/chats`);
          const data = await response.json();
          // Ensure data.chats is an array, default to empty array if undefined
          setChats(Array.isArray(data.chats) ? data.chats : []);
        } catch (error) {
          console.error("Failed to fetch chats:", error);
          setChats([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchChats();
  }, [user]);


  const handleNewChat = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/chat/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title: "New Chat" }),
      });

      const newChat = await response.json();
      setChats(prevChats => [newChat, ...prevChats]);
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };


  return (
    <>
      <motion.div
        initial={{ width: isOpen ? 300 : 0 }}
        animate={{ width: isOpen ? 300 : 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 bg-gradient-to-b from-green-500 to-green-600",
          "border-r border-white/10 backdrop-blur-sm",
          isOpen ? "shadow-xl" : ""
        )}
      >
        {isOpen && (
          <div className="flex flex-col h-full text-white">
            <div className="p-4 border-b border-white/10">
              <Button onClick={handleNewChat} className="w-full bg-white/10 hover:bg-white/20 text-white border-0">
                <PlusCircle className="mr-2 h-5 w-5" />
                New Chat
              </Button>
            </div>

            <ScrollArea className="flex-1 px-3">
              <div className="space-y-2 py-4">
                {isLoading ? (
                  <div className="text-center text-white/60">Loading chats...</div>
                ) : chats.length === 0 ? (
                  <div className="text-center text-white/60">No chats yet</div>
                ) : (
                  chats.map((chat) => (
                    <ChatItem key={chat.id} chat={chat} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

<Button
  variant="ghost"
  size="icon"
  onClick={toggleSidebar}
  className={cn(
    "absolute -right-10 top-4 bg-green-500 text-white hover:bg-green-600 rounded-full",
    "border border-white/10 shadow-lg"
  )}
>
  {isOpen ? <ChevronLeft /> : <ChevronRight />}
</Button>

      </motion.div>

      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={toggleSidebar} />}
    </>
  );
}