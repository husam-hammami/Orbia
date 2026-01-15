// ============================================
// ORBITAL NEWS DATABASE TABLES
// Add these to your shared/schema.ts file
// ============================================

import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User News Topics (user-selected topics to follow for news updates)
export const userNewsTopics = pgTable("user_news_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topic: text("topic").notNull(), // "teaching", "cybersecurity", "tech", "wellness", etc.
  isCustom: integer("is_custom").notNull().default(0), // 0 = suggested, 1 = user-added custom
  isActive: integer("is_active").notNull().default(1), // 0 = disabled, 1 = active
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserNewsTopicSchema = createInsertSchema(userNewsTopics).omit({
  id: true,
  createdAt: true,
});

export type UserNewsTopic = typeof userNewsTopics.$inferSelect;
export type InsertUserNewsTopic = z.infer<typeof insertUserNewsTopicSchema>;

// Saved News Articles (bookmarked articles)
export const savedArticles = pgTable("saved_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  link: text("link").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  source: text("source"),
  pubDate: timestamp("pub_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedArticleSchema = createInsertSchema(savedArticles).omit({
  id: true,
  createdAt: true,
});

export type SavedArticle = typeof savedArticles.$inferSelect;
export type InsertSavedArticle = z.infer<typeof insertSavedArticleSchema>;
