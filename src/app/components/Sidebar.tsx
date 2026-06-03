"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlusCircle, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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

export const SIDEBAR_WIDTH_PX = 300;

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
          console.log("Chats: ", data);
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
      const response = await fetch(`/api/user/${user.id}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title: "New Chat" }),
      });

      const newChat = await response.json();
      console.log("New Chat ID from API: ", newChat);
      // Make sure chatId exists before updating state
      if (newChat?.chatId) {
      setChats(prevChats => [
        {
          id: newChat.chatId,
          title: newChat.title || "New Chat"
        },
          ...prevChats,
        ])
        router.push(`/chat/${newChat.chatId}?new=1`);
      };
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
  };


  return (
    <>
      <div className="pointer-events-none fixed left-0 top-0 bottom-0 z-40">
        <motion.div
          initial={false}
          animate={{ width: isOpen ? SIDEBAR_WIDTH_PX : 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "relative h-full overflow-hidden pointer-events-auto",
            "bg-gradient-to-b from-green-400 to-green-500",
            "border-r border-white/10 backdrop-blur-sm",
            isOpen && "shadow-xl"
          )}
        >
          {isOpen && (
            <div
              className="flex h-full flex-col text-white"
              style={{ width: SIDEBAR_WIDTH_PX }}
            >
              <div className="border-b border-white/10 p-4">
                <Button
                  onClick={handleNewChat}
                  className="w-full border-0 bg-white/10 text-lg text-white hover:bg-white/20"
                >
                  <PlusCircle className="mr-1 h-5 w-5" />
                  New Chat
                </Button>
              </div>

              <ScrollArea className="flex-1 px-3">
                <div className="space-y-2 py-4 pl-2">
                  {isLoading ? (
                    <div className="text-center text-white/60">
                      Loading chats...
                    </div>
                  ) : chats.length === 0 ? (
                    <div className="text-center text-white/60">No chats yet</div>
                  ) : (
                    chats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        onDeleteChat={handleDeleteChat}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </motion.div>

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          className={cn(
            "pointer-events-auto absolute z-50",
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-md p-0",
            "bg-transparent text-white/80",
            "transition-[left] duration-300 hover:bg-white/10 hover:text-white",
            isOpen ? "top-[80px]" : "top-[80px] left-2"
          )}
          style={{
            left: isOpen ? SIDEBAR_WIDTH_PX + 8 : undefined,
          }}
        >
          {isOpen ? (
            <PanelLeftClose size={28} />
          ) : (
            <PanelLeftOpen size={28} />
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden
        />
      )}
    </>
  );
}