import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// System Members (Alters/Parts)
export const systemMembers = pgTable("system_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  traits: jsonb("traits").notNull().$type<string[]>(),
  color: text("color").notNull(),
  avatar: text("avatar").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSystemMemberSchema = createInsertSchema(systemMembers).omit({
  id: true,
  createdAt: true,
});

export type SystemMember = typeof systemMembers.$inferSelect;
export type InsertSystemMember = z.infer<typeof insertSystemMemberSchema>;

// Daily Tracker Entries (mood, dissociation, stress, etc.)
export const trackerEntries = pgTable("tracker_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  mood: integer("mood").notNull(), // 1-10 scale
  dissociation: integer("dissociation").notNull(), // 0-100
  stress: integer("stress").notNull(), // 0-100
  energy: integer("energy").notNull(), // 1-10 scale
  frontingMemberId: varchar("fronting_member_id").references(() => systemMembers.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrackerEntrySchema = createInsertSchema(trackerEntries).omit({
  id: true,
  createdAt: true,
});

export type TrackerEntry = typeof trackerEntries.$inferSelect;
export type InsertTrackerEntry = z.infer<typeof insertTrackerEntrySchema>;

// System Communication Messages (sticky notes)
export const systemMessages = pgTable("system_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => systemMembers.id),
  content: text("content").notNull(),
  type: text("type").notNull().default("note"), // "note" | "urgent"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSystemMessageSchema = createInsertSchema(systemMessages).omit({
  id: true,
  createdAt: true,
});

export type SystemMessage = typeof systemMessages.$inferSelect;
export type InsertSystemMessage = z.infer<typeof insertSystemMessageSchema>;

// Headspace Rooms Configuration
export const headspaceRooms = pgTable("headspace_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHeadspaceRoomSchema = createInsertSchema(headspaceRooms).omit({
  id: true,
  createdAt: true,
});

export type HeadspaceRoom = typeof headspaceRooms.$inferSelect;
export type InsertHeadspaceRoom = z.infer<typeof insertHeadspaceRoomSchema>;

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemName: text("system_name").notNull().default("My System"),
  theme: text("theme").notNull().default("dark"),
  terminology: jsonb("terminology").notNull().$type<{
    member: string;
    fronting: string;
    headspace: string;
  }>().default(sql`'{"member":"alters","fronting":"fronting","headspace":"headspace"}'::jsonb`),
  privacyMode: integer("privacy_mode").notNull().default(0), // 0 = false, 1 = true (using integer for SQLite compatibility)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

// Habits for daily tracking
export const habits = pgTable("habits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  streak: integer("streak").notNull().default(0),
  color: text("color").notNull(),
  target: integer("target").notNull().default(1),
  unit: text("unit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHabitSchema = createInsertSchema(habits).omit({
  id: true,
  createdAt: true,
});

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

// Habit completions (tracks which dates a habit was completed)
export const habitCompletions = pgTable("habit_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  habitId: varchar("habit_id").notNull().references(() => habits.id),
  completedDate: text("completed_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHabitCompletionSchema = createInsertSchema(habitCompletions).omit({
  id: true,
  createdAt: true,
});

export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type InsertHabitCompletion = z.infer<typeof insertHabitCompletionSchema>;
