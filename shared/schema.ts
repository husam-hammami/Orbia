import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, serial, real, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

// Users (password-only auth, admin-assigned)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Daily Tracker Entries (mood, stress, etc.)
export const trackerEntries = pgTable("tracker_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  mood: integer("mood").notNull(),
  stress: integer("stress").notNull(),
  energy: integer("energy").notNull(),
  sleepHours: real("sleep_hours"),
  sleepQuality: integer("sleep_quality"),
  capacity: integer("capacity"),
  pain: integer("pain"),
  triggerTag: text("trigger_tag"),
  workLoad: integer("work_load"),
  workTag: text("work_tag"),
  timeOfDay: text("time_of_day"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrackerEntrySchema = createInsertSchema(trackerEntries, {
  timestamp: z.coerce.date().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type TrackerEntry = typeof trackerEntries.$inferSelect;
export type InsertTrackerEntry = z.infer<typeof insertTrackerEntrySchema>;

// Daily Summary (end-of-day reflection)
export const dailySummaries = pgTable("daily_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(),
  feeling: text("feeling").notNull(),
  breakfast: text("breakfast").default(""),
  lunch: text("lunch").default(""),
  dinner: text("dinner").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Food Options (pre-defined meals to select from)
export const foodOptions = pgTable("food_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  mealType: text("meal_type").notNull(),
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

// Habits for daily tracking
export const habits = pgTable("habits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  streak: integer("streak").notNull().default(0),
  color: text("color").notNull(),
  target: integer("target").notNull().default(1),
  unit: text("unit"),
  icon: text("icon"),
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
  userId: varchar("user_id").notNull(),
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

// Routine Templates (weekday, weekend, holiday, etc.)
export const routineTemplates = pgTable("routine_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").default("Briefcase"),
  isDefault: integer("is_default").notNull().default(0),
  dayType: text("day_type").notNull().default("weekday"),
  activeDays: integer("active_days").array().default(sql`'{}'::integer[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoutineTemplateSchema = createInsertSchema(routineTemplates).omit({
  id: true,
  createdAt: true,
});

export type RoutineTemplate = typeof routineTemplates.$inferSelect;
export type InsertRoutineTemplate = z.infer<typeof insertRoutineTemplateSchema>;

// Routine Blocks (time blocks in daily routine)
export const routineBlocks = pgTable("routine_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  templateId: varchar("template_id").references(() => routineTemplates.id),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  icon: text("icon").default("Sunrise"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
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
  userId: varchar("user_id").notNull(),
  blockId: varchar("block_id").notNull().references(() => routineBlocks.id),
  name: text("name").notNull(),
  time: text("time"),
  description: text("description"),
  habitId: varchar("habit_id").references(() => habits.id),
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
  userId: varchar("user_id").notNull(),
  activityId: varchar("activity_id").notNull().references(() => routineActivities.id),
  completedDate: text("completed_date").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const insertRoutineActivityLogSchema = createInsertSchema(routineActivityLogs).omit({
  id: true,
  completedAt: true,
});

export type RoutineActivityLog = typeof routineActivityLogs.$inferSelect;
export type InsertRoutineActivityLog = z.infer<typeof insertRoutineActivityLogSchema>;

// Simple To-Do List with subtasks support
export const todos = pgTable("todos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  parentId: varchar("parent_id"),
  title: text("title").notNull(),
  completed: integer("completed").notNull().default(0),
  priority: text("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTodoSchema = createInsertSchema(todos).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional().nullable()
  ),
});

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

// Career Projects
export const careerProjects = pgTable("career_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planning"),
  progress: integer("progress").notNull().default(0),
  deadline: text("deadline"),
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

// Career Tasks (linked to projects, supports subtasks)
export const careerTasks = pgTable("career_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  projectId: varchar("project_id").references(() => careerProjects.id),
  parentId: varchar("parent_id"),
  title: text("title").notNull(),
  description: text("description"),
  completed: integer("completed").notNull().default(0),
  priority: text("priority").notNull().default("medium"),
  due: text("due"),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareerTaskSchema = createInsertSchema(careerTasks).omit({
  id: true,
  createdAt: true,
});

export type CareerTask = typeof careerTasks.$inferSelect;
export type InsertCareerTask = z.infer<typeof insertCareerTaskSchema>;

// Finance Expenses (legacy - kept for backwards compatibility)
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  budget: integer("budget").notNull(),
  category: text("category").notNull().default("Variable"),
  status: text("status").notNull().default("pending"),
  date: text("date").notNull(),
  month: text("month").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Income Streams (salary, freelance, benefits, etc.)
export const incomeStreams = pgTable("income_streams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  dayOfMonth: integer("day_of_month"),
  isActive: integer("is_active").notNull().default(1),
  category: text("category").notNull().default("salary"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIncomeStreamSchema = createInsertSchema(incomeStreams).omit({
  id: true,
  createdAt: true,
});

export type IncomeStream = typeof incomeStreams.$inferSelect;
export type InsertIncomeStream = z.infer<typeof insertIncomeStreamSchema>;

// Financial Transactions (unified income and expenses)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
  month: text("month").notNull(),
  isRecurring: integer("is_recurring").notNull().default(0),
  incomeStreamId: varchar("income_stream_id").references(() => incomeStreams.id),
  notes: text("notes"),
  importSource: text("import_source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions, {
  date: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Career Vision
export const careerVision = pgTable("career_vision", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
  monthlyBudget: integer("monthly_budget").notNull().default(15000),
  debtTotal: integer("debt_total").notNull().default(0),
  debtPaid: integer("debt_paid").notNull().default(0),
  debtMonthlyPayment: integer("debt_monthly_payment").notNull().default(0),
  currency: text("currency").notNull().default("AED"),
  savingsGoal: integer("savings_goal").notNull().default(0),
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
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  entryType: text("entry_type").notNull().default("reflection"),
  mood: integer("mood"),
  energy: integer("energy"),
  timeOfDay: text("time_of_day"),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  isPrivate: integer("is_private").notNull().default(0),
  entryDate: timestamp("entry_date").defaultNow().notNull(),
  primaryDriver: text("primary_driver"),
  secondaryDriver: text("secondary_driver"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  entryDate: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

// Career Coach Snapshots (persisted AI coaching data)
export const careerCoachSnapshots = pgTable("career_coach_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  payload: jsonb("payload").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareerCoachSnapshotSchema = createInsertSchema(careerCoachSnapshots).omit({
  id: true,
  createdAt: true,
});

export type CareerCoachSnapshot = typeof careerCoachSnapshots.$inferSelect;
export type InsertCareerCoachSnapshot = z.infer<typeof insertCareerCoachSnapshotSchema>;

// Loans (debt tracking with progress)
export const loans = pgTable("loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  lender: text("lender"),
  principal: integer("principal").notNull(),
  currentBalance: integer("current_balance").notNull(),
  interestRate: integer("interest_rate"),
  minimumPayment: integer("minimum_payment").notNull(),
  dueDay: integer("due_day"),
  startDate: timestamp("start_date"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLoanSchema = createInsertSchema(loans, {
  startDate: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;

// Loan Payments (individual payments toward a loan)
export const loanPayments = pgTable("loan_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  loanId: varchar("loan_id").references(() => loans.id).notNull(),
  amount: integer("amount").notNull(),
  principalPaid: integer("principal_paid"),
  interestPaid: integer("interest_paid"),
  paymentDate: timestamp("payment_date").notNull(),
  transactionId: varchar("transaction_id").references(() => transactions.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLoanPaymentSchema = createInsertSchema(loanPayments, {
  paymentDate: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});

export type LoanPayment = typeof loanPayments.$inferSelect;
export type InsertLoanPayment = z.infer<typeof insertLoanPaymentSchema>;

// User News Topics (user-selected topics to follow for news updates)
export const userNewsTopics = pgTable("user_news_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topic: text("topic").notNull(),
  isCustom: integer("is_custom").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
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
  userId: varchar("user_id").notNull(),
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

// ==================== MEDICAL MODULE ====================

export const medicalProfiles = pgTable("medical_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  patientName: text("patient_name"),
  dateOfBirth: text("date_of_birth"),
  sex: text("sex"),
  bloodType: text("blood_type"),
  allergies: text("allergies"),
  notes: text("notes"),
});

export const insertMedicalProfileSchema = createInsertSchema(medicalProfiles).omit({ id: true });
export type MedicalProfile = typeof medicalProfiles.$inferSelect;
export type InsertMedicalProfile = z.infer<typeof insertMedicalProfileSchema>;

export const medDiagnoses = pgTable("med_diagnoses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertMedDiagnosisSchema = createInsertSchema(medDiagnoses).omit({ id: true });
export type MedDiagnosis = typeof medDiagnoses.$inferSelect;
export type InsertMedDiagnosis = z.infer<typeof insertMedDiagnosisSchema>;

export const medPriorities = pgTable("med_priorities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertMedPrioritySchema = createInsertSchema(medPriorities).omit({ id: true });
export type MedPriority = typeof medPriorities.$inferSelect;
export type InsertMedPriority = z.infer<typeof insertMedPrioritySchema>;

export const medPainMechanisms = pgTable("med_pain_mechanisms", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertMedPainMechanismSchema = createInsertSchema(medPainMechanisms).omit({ id: true });
export type MedPainMechanism = typeof medPainMechanisms.$inferSelect;
export type InsertMedPainMechanism = z.infer<typeof insertMedPainMechanismSchema>;

export const medMedications = pgTable("med_medications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  purpose: text("purpose").notNull(),
  dosage: text("dosage").notNull(),
});

export const insertMedMedicationSchema = createInsertSchema(medMedications).omit({ id: true });
export type MedMedication = typeof medMedications.$inferSelect;
export type InsertMedMedication = z.infer<typeof insertMedMedicationSchema>;

export const medTimelineEvents = pgTable("med_timeline_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull().default("standard"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertMedTimelineEventSchema = createInsertSchema(medTimelineEvents).omit({ id: true });
export type MedTimelineEvent = typeof medTimelineEvents.$inferSelect;
export type InsertMedTimelineEvent = z.infer<typeof insertMedTimelineEventSchema>;

export const medMedicalNetwork = pgTable("med_medical_network", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  facility: text("facility"),
  status: text("status").notNull().default("current"),
  category: text("category").notNull().default("treating"),
});

export const insertMedMedicalNetworkSchema = createInsertSchema(medMedicalNetwork).omit({ id: true });
export type MedMedicalNetworkEntry = typeof medMedicalNetwork.$inferSelect;
export type InsertMedMedicalNetworkEntry = z.infer<typeof insertMedMedicalNetworkSchema>;

export const medVaultDocuments = pgTable("med_vault_documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  docType: text("doc_type").notNull(),
  date: text("date").notNull(),
  description: text("description"),
  color: text("color").notNull().default("primary"),
  fileData: text("file_data"),
  mimeType: text("mime_type"),
  aiAnalysis: text("ai_analysis"),
  aiProcessed: integer("ai_processed").notNull().default(0),
});

export const insertMedVaultDocumentSchema = createInsertSchema(medVaultDocuments).omit({ id: true });
export type MedVaultDocument = typeof medVaultDocuments.$inferSelect;
export type InsertMedVaultDocument = z.infer<typeof insertMedVaultDocumentSchema>;

export const microsoftConnections = pgTable("microsoft_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry").notNull(),
  microsoftUserId: text("microsoft_user_id"),
  displayName: text("display_name"),
  email: text("email"),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  status: text("status").notNull().default("active"),
});

export const insertMicrosoftConnectionSchema = createInsertSchema(microsoftConnections).omit({ id: true, connectedAt: true });
export type MicrosoftConnection = typeof microsoftConnections.$inferSelect;
export type InsertMicrosoftConnection = z.infer<typeof insertMicrosoftConnectionSchema>;

export const scheduledMessages = pgTable("scheduled_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  chatId: text("chat_id").notNull(),
  recipientName: text("recipient_name").notNull(),
  message: text("message").notNull(),
  timeOfDay: text("time_of_day").notNull(),
  recurrence: text("recurrence").notNull().default("daily"),
  active: boolean("active").notNull().default(true),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduledMessageSchema = createInsertSchema(scheduledMessages).omit({ id: true, createdAt: true, lastSentAt: true });
export type ScheduledMessage = typeof scheduledMessages.$inferSelect;
export type InsertScheduledMessage = z.infer<typeof insertScheduledMessageSchema>;

// ==================== UNIFIED MEMORY GRAPH ====================

// Memory Entities — nodes in the understanding graph
// Types: person, condition, pattern, preference, trigger, state, goal, medication, event, behavior, insight
// Categories: wellness, work, medical, finance, career, system, social, identity
export const memoryEntities = pgTable("memory_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  entityType: text("entity_type").notNull(), // person, condition, pattern, preference, trigger, state, goal, medication, event, behavior, insight
  category: text("category").notNull(), // wellness, work, medical, finance, career, system, social, identity
  name: text("name").notNull(), // human-readable identifier
  content: jsonb("content").notNull().$type<Record<string, any>>(), // structured data about this entity
  summary: text("summary").notNull(), // one-line description
  importance: real("importance").notNull().default(0.5), // 0-1 how significant
  confidence: real("confidence").notNull().default(0.5), // 0-1 how certain
  accessCount: integer("access_count").notNull().default(0),
  lastAccessed: timestamp("last_accessed"),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  sourceRefs: jsonb("source_refs").notNull().$type<Array<{ type: string; id: string }>>().default(sql`'[]'::jsonb`),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemoryEntitySchema = createInsertSchema(memoryEntities).omit({ id: true, createdAt: true });
export type MemoryEntity = typeof memoryEntities.$inferSelect;
export type InsertMemoryEntity = z.infer<typeof insertMemoryEntitySchema>;

// Memory Connections — edges between entities with typed relationships
export const memoryConnections = pgTable("memory_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sourceId: varchar("source_id").notNull().references(() => memoryEntities.id, { onDelete: "cascade" }),
  targetId: varchar("target_id").notNull().references(() => memoryEntities.id, { onDelete: "cascade" }),
  relationType: text("relation_type").notNull(), // causes, correlates_with, triggers, alleviates, belongs_to, influences, precedes, contradicts, worsens, improves
  strength: real("strength").notNull().default(0.5), // 0-1 how strong
  evidence: jsonb("evidence").notNull().$type<Array<{ observation: string; date: string }>>().default(sql`'[]'::jsonb`),
  occurrences: integer("occurrences").notNull().default(1),
  lastObserved: timestamp("last_observed").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemoryConnectionSchema = createInsertSchema(memoryConnections).omit({ id: true, createdAt: true });
export type MemoryConnection = typeof memoryConnections.$inferSelect;
export type InsertMemoryConnection = z.infer<typeof insertMemoryConnectionSchema>;

// Memory Narratives — high-level synthesized understandings about the user
export const memoryNarratives = pgTable("memory_narratives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  domain: text("domain").notNull(), // wellness, work, medical, finance, career, identity, cross_domain
  narrativeKey: text("narrative_key").notNull(), // unique identifier like "sleep_mood_pattern" or "career_direction"
  narrative: text("narrative").notNull(), // the actual understanding
  supportingEntityIds: jsonb("supporting_entity_ids").notNull().$type<string[]>().default(sql`'[]'::jsonb`),
  confidence: real("confidence").notNull().default(0.5),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemoryNarrativeSchema = createInsertSchema(memoryNarratives).omit({ id: true, createdAt: true });
export type MemoryNarrative = typeof memoryNarratives.$inferSelect;
export type InsertMemoryNarrative = z.infer<typeof insertMemoryNarrativeSchema>;

// Memory Processing Log — tracks what data has been processed into the memory graph
export const memoryProcessingLog = pgTable("memory_processing_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sourceType: text("source_type").notNull(), // tracker_entry, journal_entry, habit_completion, transaction, medical_doc, etc.
  sourceId: text("source_id").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

export type MemoryProcessingLogEntry = typeof memoryProcessingLog.$inferSelect;

// ==================== AI AGENTS OFFICE ====================

export const githubConnections = pgTable("github_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  githubUserId: text("github_user_id"),
  username: text("username"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGithubConnectionSchema = createInsertSchema(githubConnections).omit({ id: true, createdAt: true, updatedAt: true });
export type GithubConnection = typeof githubConnections.$inferSelect;
export type InsertGithubConnection = z.infer<typeof insertGithubConnectionSchema>;

export const agentProfiles = pgTable("agent_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  role: text("role"),
  repoUrl: text("repo_url").notNull(),
  repoBranch: text("repo_branch").default("main"),
  workdir: text("workdir"),
  accentColor: text("accent_color").default("#6366f1"),
  status: text("status").default("idle"),
  currentTaskSummary: text("current_task_summary"),
  linkedProjectId: varchar("linked_project_id"),
  systemPrompt: text("system_prompt"),
  lastActiveAt: timestamp("last_active_at"),
  totalTasksCompleted: integer("total_tasks_completed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentProfileSchema = createInsertSchema(agentProfiles).omit({ id: true, createdAt: true, lastActiveAt: true, totalTasksCompleted: true });
export type AgentProfile = typeof agentProfiles.$inferSelect;
export type InsertAgentProfile = z.infer<typeof insertAgentProfileSchema>;

export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull(),
  claudeConversationId: text("claude_conversation_id"),
  status: text("status").default("active"),
  startedAt: timestamp("started_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
});

export const insertAgentSessionSchema = createInsertSchema(agentSessions).omit({ id: true, startedAt: true, lastActiveAt: true });
export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = z.infer<typeof insertAgentSessionSchema>;

export const agentTasks = pgTable("agent_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull(),
  sessionId: uuid("session_id"),
  description: text("description").notNull(),
  status: text("status").default("queued"),
  priority: integer("priority").default(0),
  result: text("result"),
  filesChanged: jsonb("files_changed"),
  diffSummary: text("diff_summary"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentTaskSchema = createInsertSchema(agentTasks).omit({ id: true, createdAt: true, startedAt: true, completedAt: true });
export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;

export const agentActivityLog = pgTable("agent_activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull(),
  eventType: text("event_type").notNull(),
  content: text("content"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertAgentActivityLogSchema = createInsertSchema(agentActivityLog).omit({ id: true, timestamp: true });
export type AgentActivityLogEntry = typeof agentActivityLog.$inferSelect;
export type InsertAgentActivityLog = z.infer<typeof insertAgentActivityLogSchema>;
