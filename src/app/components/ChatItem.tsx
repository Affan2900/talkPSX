"use client"

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Chat {
  id: string;
  title: string;
}

export default function ChatItem({ chat, onDeleteChat }: { chat: Chat; onDeleteChat: (id: string) => void }) {
  const router = useRouter();
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    }
  }, [chat.title]);

  const handleClick = () => {
    router.push(`/chat/${chat.id}`);
  };

  const deleteChat = async (id: string) => {
    try {
      await fetch(`/api/chat/${id}/delete`, { method: "DELETE" });
      onDeleteChat(id);
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  return (
    <div
      className="group flex items-center rounded-lg px-3 py-2 hover:bg-white/80 transition-colors cursor-pointer bg-white text-green-600 w-64 h-12 shadow-md shadow-slate-300"
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0 overflow-hidden">
        <div
          ref={textRef}
          className={`whitespace-nowrap overflow-hidden text-ellipsis ${
            isOverflowing
              ? "group-hover:overflow-visible group-hover:animate-loop-scroll group-hover:text-clip"
              : ""
          }`}
        >
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
