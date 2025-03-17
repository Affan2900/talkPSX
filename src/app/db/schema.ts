import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// Users Table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Use text for Clerk's userId
  username: text("username").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chats Table
export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages Table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id").references(() => chats.id, { onDelete: "cascade" }),
  senderId: text("sender_id").references(() => users.id, { onDelete: "cascade" }), // Use text for Clerk's userId
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});