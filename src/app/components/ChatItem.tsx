"use client"

import { useRouter } from "next/navigation";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Chat {
  id: string;
  title: string;
}

export default function ChatItem({ chat }: { chat: Chat }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/chat/${chat.id}`);
  };

  const deleteChat = async (chatId: string) => {
    try {
      await fetch(`/api/chat/${chatId}/delete`, {
        method: "DELETE",
      });
      
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  return (
    <div
      className="group flex items-center space-x-3 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <MessageSquare className="h-5 w-5 opacity-70" />
      <span className="flex-1 truncate">{chat.title}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          deleteChat(chat.id);
        }}
        className="opacity-0 group-hover:opacity-100 hover:bg-white/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}