import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

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
  capacity: integer("capacity"), // 0-5 scale (how much capacity do I have right now?)
  triggerTag: text("trigger_tag"), // "work" | "loneliness" | "pain" | "noise" | "sleep" | "body" | "unknown"
  workLoad: integer("work_load"), // 0-10: How hostile/draining was work today?
  workTag: text("work_tag"), // "deadlines" | "conflict" | "firefighting" | "unclear" | "blame" | "chaos"
  timeOfDay: text("time_of_day"), // "morning" | "afternoon" | "evening" | "night" (auto-set)
  frontingMemberId: varchar("fronting_member_id").references(() => systemMembers.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrackerEntrySchema = createInsertSchema(trackerEntries, {
  timestamp: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});

export type TrackerEntry = typeof trackerEntries.$inferSelect;
export type InsertTrackerEntry = z.infer<typeof insertTrackerEntrySchema>;

// Daily Summary (end-of-day reflection)
export const dailySummaries = pgTable("daily_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // "2026-01-04" format
  feeling: text("feeling").notNull(), // "lighter" | "average" | "heavier"
  breakfast: text("breakfast").default(""),
  lunch: text("lunch").default(""),
  dinner: text("dinner").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Food Options (pre-defined meals to select from)
export const foodOptions = pgTable("food_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mealType: text("meal_type").notNull(), // "breakfast" | "lunch" | "dinner"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFoodOptionSchema = createInsertSchema(foodOptions).omit({
  id: true,
  createdAt: true,
});

export type FoodOption = typeof foodOptions.$inferSelect;
export type InsertFoodOption = z.infer<typeof insertFoodOptionSchema>;

export const insertDailySummarySchema = createInsertSchema(dailySummaries).omit({
  id: true,
  createdAt: true,
});

export type DailySummary = typeof dailySummaries.$inferSelect;
export type InsertDailySummary = z.infer<typeof insertDailySummarySchema>;

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
  icon: text("icon"), // AI-generated Lucide icon name
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

// Routine Blocks (time blocks in daily routine)
export const routineBlocks = pgTable("routine_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  startTime: text("start_time").notNull(), // "08:00"
  endTime: text("end_time").notNull(), // "09:00"
  purpose: text("purpose").notNull().default(""),
  order: integer("order").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoutineBlockSchema = createInsertSchema(routineBlocks).omit({
  id: true,
  createdAt: true,
});

export type RoutineBlock = typeof routineBlocks.$inferSelect;
export type InsertRoutineBlock = z.infer<typeof insertRoutineBlockSchema>;

// Routine Activities (individual activities within blocks)
export const routineActivities = pgTable("routine_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockId: varchar("block_id").notNull().references(() => routineBlocks.id),
  name: text("name").notNull(),
  time: text("time"), // "08:00" - optional specific time
  description: text("description"),
  habitId: varchar("habit_id").references(() => habits.id), // link to habit for auto-completion
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoutineActivitySchema = createInsertSchema(routineActivities).omit({
  id: true,
  createdAt: true,
});

export type RoutineActivity = typeof routineActivities.$inferSelect;
export type InsertRoutineActivity = z.infer<typeof insertRoutineActivitySchema>;

// Routine Activity Logs (daily completion tracking)
export const routineActivityLogs = pgTable("routine_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").notNull().references(() => routineActivities.id),
  completedDate: text("completed_date").notNull(), // "2026-01-03"
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const insertRoutineActivityLogSchema = createInsertSchema(routineActivityLogs).omit({
  id: true,
  completedAt: true,
});

export type RoutineActivityLog = typeof routineActivityLogs.$inferSelect;
export type InsertRoutineActivityLog = z.infer<typeof insertRoutineActivityLogSchema>;

// Simple To-Do List
export const todos = pgTable("todos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  completed: integer("completed").notNull().default(0), // 0 = false, 1 = true
  priority: text("priority").notNull().default("medium"), // "low" | "medium" | "high"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTodoSchema = createInsertSchema(todos).omit({
  id: true,
  createdAt: true,
});

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

// Career Projects
export const careerProjects = pgTable("career_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planning"), // "planning" | "in_progress" | "ongoing" | "completed"
  progress: integer("progress").notNull().default(0), // 0-100
  deadline: text("deadline"), // "2026-02-15" format or null
  nextAction: text("next_action"),
  color: text("color").notNull().default("bg-indigo-500"),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareerProjectSchema = createInsertSchema(careerProjects).omit({
  id: true,
  createdAt: true,
});

export type CareerProject = typeof careerProjects.$inferSelect;
export type InsertCareerProject = z.infer<typeof insertCareerProjectSchema>;

// Career Tasks (linked to projects)
export const careerTasks = pgTable("career_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => careerProjects.id),
  title: text("title").notNull(),
  description: text("description"),
  completed: integer("completed").notNull().default(0), // 0 = false, 1 = true
  priority: text("priority").notNull().default("medium"), // "low" | "medium" | "high"
  due: text("due"), // "Today", "Tomorrow", "2026-01-15", etc.
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareerTaskSchema = createInsertSchema(careerTasks).omit({
  id: true,
  createdAt: true,
});

export type CareerTask = typeof careerTasks.$inferSelect;
export type InsertCareerTask = z.infer<typeof insertCareerTaskSchema>;

// Finance Expenses
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  amount: integer("amount").notNull(), // in cents or whole numbers
  budget: integer("budget").notNull(), // budgeted amount
  category: text("category").notNull().default("Variable"), // "Fixed" | "Variable" | "Savings" | "Debt"
  status: text("status").notNull().default("pending"), // "paid" | "pending" | "variable"
  date: text("date").notNull(), // "Jan 1", "Feb 5", etc.
  month: text("month").notNull(), // "January", "February", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Career Vision
export const careerVision = pgTable("career_vision", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  timeframe: text("timeframe").notNull(),
  color: text("color").notNull().default("text-blue-500"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareerVisionSchema = createInsertSchema(careerVision).omit({
  id: true,
  createdAt: true,
});

export type CareerVision = typeof careerVision.$inferSelect;
export type InsertCareerVision = z.infer<typeof insertCareerVisionSchema>;

// Finance Settings (budget and debt tracking)
export const financeSettings = pgTable("finance_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  monthlyBudget: integer("monthly_budget").notNull().default(15000),
  debtTotal: integer("debt_total").notNull().default(0),
  debtPaid: integer("debt_paid").notNull().default(0),
  debtMonthlyPayment: integer("debt_monthly_payment").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFinanceSettingsSchema = createInsertSchema(financeSettings).omit({
  id: true,
  updatedAt: true,
});

export type FinanceSettings = typeof financeSettings.$inferSelect;
export type InsertFinanceSettings = z.infer<typeof insertFinanceSettingsSchema>;

// Journal Entries (rich journaling with mood, alter, time context)
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  entryType: text("entry_type").notNull().default("reflection"), // "reflection" | "vent" | "gratitude" | "grounding" | "memory" | "system_note"
  mood: integer("mood"), // 1-10 scale (optional)
  energy: integer("energy"), // 1-10 scale (optional)
  authorId: varchar("author_id").references(() => systemMembers.id), // which alter wrote this
  timeOfDay: text("time_of_day"), // "morning" | "afternoon" | "evening" | "night"
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  isPrivate: integer("is_private").notNull().default(0), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
