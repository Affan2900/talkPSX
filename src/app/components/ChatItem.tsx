"use client"

import { useRouter } from "next/navigation";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Chat {
  id: string;
  title: string;
}

export default function ChatItem({ chat, onDeleteChat }: { chat: Chat; onDeleteChat: (id: string) => void } ) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/chat/${chat.id}`);
  };

  const deleteChat = async (id: string) => {
  
    try {
      await fetch(`/api/chat/${id}/delete`, {
        method: "DELETE",
      });
      onDeleteChat(id);
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  return (
    <div
  className="group flex items-center space-x-3 rounded-lg px-3 py-2 hover:bg-white/30 transition-colors cursor-pointer bg-white/10 w-64 h-12"
  onClick={handleClick}
>
  <MessageSquare className="h-5 w-5 opacity-70 flex-shrink-0" />
  <div className="flex-1 min-w-0 overflow-hidden">
    <div className="whitespace-nowrap text-ellipsis overflow-hidden hover:overflow-visible hover:animate-loop-scroll">
      {chat.title}
    </div>
  </div>
  <Button
    variant="ghost"
    size="icon"
    onClick={(e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    }}
    className="opacity-0 group-hover:opacity-100 hover:bg-white/10 w-8 h-8 flex-shrink-0"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>

  );
}