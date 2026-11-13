import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const threads = pgTable("threads", {
  id: text("id").primaryKey(),
  clientName: text("client_name").notNull().default("Visitor"),
  status: text("status").notNull().default("active"),
  mode: text("mode").notNull().default("bot"),
  lastMessageText: text("last_message_text").default(""),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => threads.id),
  sender: text("sender").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
