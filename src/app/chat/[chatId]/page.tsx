import { getDB } from "@/lib/db";
import { chats, messages, users } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import ChatInterface from "@/app/components/ChatInterface";

interface ChatPageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  // Await the params object to extract chatId
  const { chatId } = await params;

  // Get the database instance (only on server)
  const db = await getDB();

  // Fetch the chat and its messages
  const chat = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
    .execute();

  const chatMessages = await db
    .select({
      id: messages.id,
      content: messages.content,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
      username: users.username,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt)
    .execute();

  if (!chat || chat.length === 0) {
    return <div>Chat not found</div>;
  }

  // console.log(chatMessages);

  // Transform messages for ChatInterface
  const formattedMessages = chatMessages.map((msg) => ({
    id: msg.id,
    content: msg.content,
    sender: msg.senderId ? "user" : "ai",
  }));

  console.log(formattedMessages);

  return <ChatInterface initialMessages={formattedMessages} />;
}
