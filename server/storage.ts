import { 
  type SystemMember, 
  type InsertSystemMember,
  type TrackerEntry,
  type InsertTrackerEntry,
  type SystemMessage,
  type InsertSystemMessage,
  type HeadspaceRoom,
  type InsertHeadspaceRoom,
  type SystemSettings,
  type InsertSystemSettings,
  type Habit,
  type InsertHabit,
  type HabitCompletion,
  type InsertHabitCompletion,
  type RoutineBlock,
  type InsertRoutineBlock,
  type RoutineActivity,
  type InsertRoutineActivity,
  type RoutineActivityLog,
  type InsertRoutineActivityLog,
  type Todo,
  type InsertTodo,
  type DailySummary,
  type InsertDailySummary,
  type CareerProject,
  type InsertCareerProject,
  type CareerTask,
  type InsertCareerTask,
  type Expense,
  type InsertExpense,
  type CareerVision,
  type InsertCareerVision,
  type FinanceSettings,
  type InsertFinanceSettings,
  type JournalEntry,
  type InsertJournalEntry,
  type IncomeStream,
  type InsertIncomeStream,
  type Transaction,
  type InsertTransaction,
  type UserNewsTopic,
  type InsertUserNewsTopic,
  type SavedArticle,
  type InsertSavedArticle,
  systemMembers,
  trackerEntries,
  systemMessages,
  headspaceRooms,
  systemSettings,
  habits,
  habitCompletions,
  routineTemplates,
  routineBlocks,
  routineActivities,
  routineActivityLogs,
  todos,
  type RoutineTemplate,
  type InsertRoutineTemplate,
  dailySummaries,
  careerProjects,
  careerTasks,
  expenses,
  careerVision,
  financeSettings,
  journalEntries,
  foodOptions,
  type FoodOption,
  type InsertFoodOption,
  careerCoachSnapshots,
  type CareerCoachSnapshot,
  incomeStreams,
  transactions,
  loans,
  loanPayments,
  type Loan,
  type InsertLoan,
  type LoanPayment,
  type InsertLoanPayment,
  userNewsTopics,
  savedArticles,
  medicalProfiles,
  medDiagnoses,
  medPriorities,
  medPainMechanisms,
  medMedications,
  medTimelineEvents,
  medMedicalNetwork,
  medVaultDocuments,
  type MedicalProfile,
  type InsertMedicalProfile,
  type MedDiagnosis,
  type InsertMedDiagnosis,
  type MedPriority,
  type InsertMedPriority,
  type MedPainMechanism,
  type InsertMedPainMechanism,
  type MedMedication,
  type InsertMedMedication,
  type MedTimelineEvent,
  type InsertMedTimelineEvent,
  type MedMedicalNetworkEntry,
  type InsertMedMedicalNetworkEntry,
  type MedVaultDocument,
  type InsertMedVaultDocument,
  microsoftConnections,
  type MicrosoftConnection,
  type User,
  users,
  type InsertMicrosoftConnection,
  scheduledMessages,
  type ScheduledMessage,
  type InsertScheduledMessage,
  memoryEntities,
  memoryConnections,
  memoryNarratives,
  memoryProcessingLog,
  type MemoryEntity,
  type InsertMemoryEntity,
  type MemoryConnection,
  type InsertMemoryConnection,
  type MemoryNarrative,
  type InsertMemoryNarrative,
  type MemoryProcessingLogEntry,
  orbitConversations,
  orbitMessages,
  type OrbitConversation,
  type InsertOrbitConversation,
  type OrbitMessage,
  type InsertOrbitMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc, inArray } from "drizzle-orm";

export interface IStorage {
  // User Profile
  getUserProfile(userId: string): Promise<{ displayName: string | null; bio: string | null }>;
  updateUserProfile(userId: string, data: { displayName?: string; bio?: string }): Promise<User>;

  // System Members
  getAllMembers(userId: string): Promise<SystemMember[]>;
  getMember(userId: string, id: string): Promise<SystemMember | undefined>;
  createMember(userId: string, member: InsertSystemMember): Promise<SystemMember>;
  updateMember(userId: string, id: string, member: Partial<InsertSystemMember>): Promise<SystemMember | undefined>;
  deleteMember(userId: string, id: string): Promise<boolean>;

  // Tracker Entries
  getAllTrackerEntries(userId: string): Promise<TrackerEntry[]>;
  getTrackerEntry(userId: string, id: string): Promise<TrackerEntry | undefined>;
  createTrackerEntry(userId: string, entry: InsertTrackerEntry): Promise<TrackerEntry>;
  updateTrackerEntry(userId: string, id: string, entry: Partial<InsertTrackerEntry>): Promise<TrackerEntry | undefined>;
  deleteTrackerEntry(userId: string, id: string): Promise<boolean>;
  getRecentTrackerEntries(userId: string, limit: number): Promise<TrackerEntry[]>;

  // System Messages
  getAllMessages(userId: string): Promise<SystemMessage[]>;
  getMessage(userId: string, id: string): Promise<SystemMessage | undefined>;
  createMessage(userId: string, message: InsertSystemMessage): Promise<SystemMessage>;
  deleteMessage(userId: string, id: string): Promise<boolean>;

  // Headspace Rooms
  getAllRooms(userId: string): Promise<HeadspaceRoom[]>;
  getRoom(userId: string, id: string): Promise<HeadspaceRoom | undefined>;
  createRoom(userId: string, room: InsertHeadspaceRoom): Promise<HeadspaceRoom>;
  updateRoom(userId: string, id: string, room: Partial<InsertHeadspaceRoom>): Promise<HeadspaceRoom | undefined>;
  deleteRoom(userId: string, id: string): Promise<boolean>;

  // System Settings
  getSettings(userId: string): Promise<SystemSettings | undefined>;
  updateSettings(userId: string, settings: Partial<InsertSystemSettings>): Promise<SystemSettings>;

  // Habits
  getAllHabits(userId: string): Promise<Habit[]>;
  getHabit(userId: string, id: string): Promise<Habit | undefined>;
  createHabit(userId: string, habit: InsertHabit): Promise<Habit>;
  updateHabit(userId: string, id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined>;
  deleteHabit(userId: string, id: string): Promise<boolean>;

  // Habit Completions
  getAllHabitCompletions(userId: string): Promise<HabitCompletion[]>;
  getHabitCompletions(userId: string, habitId: string): Promise<HabitCompletion[]>;
  addHabitCompletion(userId: string, completion: InsertHabitCompletion): Promise<HabitCompletion>;
  removeHabitCompletion(userId: string, habitId: string, date: string): Promise<boolean>;

  // Routine Templates
  getAllRoutineTemplates(userId: string): Promise<RoutineTemplate[]>;
  getRoutineTemplate(userId: string, id: string): Promise<RoutineTemplate | undefined>;
  getDefaultRoutineTemplate(userId: string): Promise<RoutineTemplate | undefined>;
  createRoutineTemplate(userId: string, template: InsertRoutineTemplate): Promise<RoutineTemplate>;
  updateRoutineTemplate(userId: string, id: string, template: Partial<InsertRoutineTemplate>): Promise<RoutineTemplate | undefined>;
  deleteRoutineTemplate(userId: string, id: string): Promise<boolean>;
  setDefaultRoutineTemplate(userId: string, id: string): Promise<RoutineTemplate | undefined>;

  // Routine Blocks
  getAllRoutineBlocks(userId: string): Promise<RoutineBlock[]>;
  getRoutineBlocksByTemplate(userId: string, templateId: string): Promise<RoutineBlock[]>;
  createRoutineBlock(userId: string, block: InsertRoutineBlock): Promise<RoutineBlock>;
  updateRoutineBlock(userId: string, id: string, block: Partial<InsertRoutineBlock>): Promise<RoutineBlock | undefined>;
  deleteRoutineBlock(userId: string, id: string): Promise<boolean>;

  // Routine Activities
  getAllRoutineActivities(userId: string): Promise<RoutineActivity[]>;
  getActivitiesByBlock(userId: string, blockId: string): Promise<RoutineActivity[]>;
  createRoutineActivity(userId: string, activity: InsertRoutineActivity): Promise<RoutineActivity>;
  updateRoutineActivity(userId: string, id: string, activity: Partial<InsertRoutineActivity>): Promise<RoutineActivity | undefined>;
  deleteRoutineActivity(userId: string, id: string): Promise<boolean>;

  // Routine Activity Logs
  getAllRoutineLogs(userId: string): Promise<RoutineActivityLog[]>;
  getActivityLogsForDate(userId: string, date: string): Promise<RoutineActivityLog[]>;
  addActivityLog(userId: string, log: InsertRoutineActivityLog): Promise<RoutineActivityLog>;
  removeActivityLog(userId: string, activityId: string, date: string): Promise<boolean>;

  // Atomic routine + habit sync
  toggleRoutineActivityWithHabit(userId: string, activityId: string, date: string, habitId: string | null, action: "add" | "remove"): Promise<{ success: boolean }>;

  // Todos
  getAllTodos(userId: string): Promise<Todo[]>;
  createTodo(userId: string, todo: InsertTodo): Promise<Todo>;
  updateTodo(userId: string, id: string, todo: Partial<InsertTodo>): Promise<Todo | undefined>;
  deleteTodo(userId: string, id: string): Promise<boolean>;

  // Daily Summaries
  getAllDailySummaries(userId: string): Promise<DailySummary[]>;
  getDailySummary(userId: string, date: string): Promise<DailySummary | undefined>;
  upsertDailySummary(userId: string, summary: InsertDailySummary): Promise<DailySummary>;

  // Career Projects
  getAllCareerProjects(userId: string): Promise<CareerProject[]>;
  getCareerProject(userId: string, id: string): Promise<CareerProject | undefined>;
  createCareerProject(userId: string, project: InsertCareerProject): Promise<CareerProject>;
  updateCareerProject(userId: string, id: string, project: Partial<InsertCareerProject>): Promise<CareerProject | undefined>;
  deleteCareerProject(userId: string, id: string): Promise<boolean>;

  // Career Tasks
  getAllCareerTasks(userId: string): Promise<CareerTask[]>;
  getCareerTasksByProject(userId: string, projectId: string): Promise<CareerTask[]>;
  createCareerTask(userId: string, task: InsertCareerTask): Promise<CareerTask>;
  updateCareerTask(userId: string, id: string, task: Partial<InsertCareerTask>): Promise<CareerTask | undefined>;
  deleteCareerTask(userId: string, id: string): Promise<boolean>;

  // Expenses
  getAllExpenses(userId: string): Promise<Expense[]>;
  getExpensesByMonth(userId: string, month: string): Promise<Expense[]>;
  createExpense(userId: string, expense: InsertExpense): Promise<Expense>;
  updateExpense(userId: string, id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(userId: string, id: string): Promise<boolean>;

  // Career Vision
  getVision(userId: string): Promise<CareerVision[]>;
  updateVision(userId: string, items: InsertCareerVision[]): Promise<CareerVision[]>;
  createVisionItem(userId: string, data: InsertCareerVision): Promise<CareerVision>;
  updateVisionItem(userId: string, id: string, data: Partial<InsertCareerVision>): Promise<CareerVision | undefined>;
  deleteVisionItem(userId: string, id: string): Promise<boolean>;

  // Finance Settings
  getFinanceSettings(userId: string): Promise<FinanceSettings | undefined>;
  updateFinanceSettings(userId: string, settings: Partial<InsertFinanceSettings>): Promise<FinanceSettings>;

  // Income Streams
  getAllIncomeStreams(userId: string): Promise<IncomeStream[]>;
  getIncomeStream(userId: string, id: string): Promise<IncomeStream | undefined>;
  createIncomeStream(userId: string, stream: InsertIncomeStream): Promise<IncomeStream>;
  updateIncomeStream(userId: string, id: string, stream: Partial<InsertIncomeStream>): Promise<IncomeStream | undefined>;
  deleteIncomeStream(userId: string, id: string): Promise<boolean>;

  // Transactions
  getAllTransactions(userId: string): Promise<Transaction[]>;
  getTransactionsByMonth(userId: string, month: string): Promise<Transaction[]>;
  getTransaction(userId: string, id: string): Promise<Transaction | undefined>;
  createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction>;
  createManyTransactions(userId: string, transactionsList: InsertTransaction[]): Promise<Transaction[]>;
  updateTransaction(userId: string, id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(userId: string, id: string): Promise<boolean>;

  // Journal Entries
  getAllJournalEntries(userId: string): Promise<JournalEntry[]>;
  getJournalEntry(userId: string, id: string): Promise<JournalEntry | undefined>;
  createJournalEntry(userId: string, entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(userId: string, id: string, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(userId: string, id: string): Promise<boolean>;

  // Food Options
  getAllFoodOptions(userId: string): Promise<FoodOption[]>;
  createFoodOption(userId: string, option: InsertFoodOption): Promise<FoodOption>;
  updateFoodOption(userId: string, id: string, option: Partial<InsertFoodOption>): Promise<FoodOption | undefined>;
  deleteFoodOption(userId: string, id: string): Promise<boolean>;

  // Career Coach Snapshots
  getLatestCoachSnapshot(userId: string): Promise<CareerCoachSnapshot | undefined>;
  upsertCoachSnapshot(userId: string, payload: any): Promise<CareerCoachSnapshot>;

  // Loans
  getAllLoans(userId: string): Promise<Loan[]>;
  getLoan(userId: string, id: string): Promise<Loan | undefined>;
  createLoan(userId: string, loan: InsertLoan): Promise<Loan>;
  updateLoan(userId: string, id: string, loan: Partial<InsertLoan>): Promise<Loan | undefined>;
  deleteLoan(userId: string, id: string): Promise<boolean>;

  // Loan Payments
  getLoanPayments(userId: string, loanId: string): Promise<LoanPayment[]>;
  createLoanPayment(userId: string, payment: InsertLoanPayment): Promise<LoanPayment>;
  deleteLoanPayment(userId: string, id: string): Promise<boolean>;

  // User News Topics
  getAllNewsTopics(userId: string): Promise<UserNewsTopic[]>;
  getActiveNewsTopics(userId: string): Promise<UserNewsTopic[]>;
  createNewsTopic(userId: string, topic: InsertUserNewsTopic): Promise<UserNewsTopic>;
  updateNewsTopic(userId: string, id: string, topic: Partial<InsertUserNewsTopic>): Promise<UserNewsTopic | undefined>;
  deleteNewsTopic(userId: string, id: string): Promise<boolean>;

  // Saved Articles
  getAllSavedArticles(userId: string): Promise<SavedArticle[]>;
  getSavedArticle(userId: string, link: string): Promise<SavedArticle | undefined>;
  createSavedArticle(userId: string, article: InsertSavedArticle): Promise<SavedArticle>;
  deleteSavedArticle(userId: string, id: string): Promise<boolean>;

  // Medical Profile
  getMedicalProfile(userId: string): Promise<MedicalProfile | undefined>;
  upsertMedicalProfile(userId: string, profile: Partial<InsertMedicalProfile>): Promise<MedicalProfile>;

  // Medical Diagnoses
  getMedDiagnoses(userId: string): Promise<MedDiagnosis[]>;
  createMedDiagnosis(userId: string, data: InsertMedDiagnosis): Promise<MedDiagnosis>;
  updateMedDiagnosis(userId: string, id: number, data: Partial<InsertMedDiagnosis>): Promise<MedDiagnosis | undefined>;
  deleteMedDiagnosis(userId: string, id: number): Promise<boolean>;

  // Medical Priorities
  getMedPriorities(userId: string): Promise<MedPriority[]>;
  createMedPriority(userId: string, data: InsertMedPriority): Promise<MedPriority>;
  updateMedPriority(userId: string, id: number, data: Partial<InsertMedPriority>): Promise<MedPriority | undefined>;
  deleteMedPriority(userId: string, id: number): Promise<boolean>;

  // Medical Pain Mechanisms
  getMedPainMechanisms(userId: string): Promise<MedPainMechanism[]>;
  createMedPainMechanism(userId: string, data: InsertMedPainMechanism): Promise<MedPainMechanism>;
  updateMedPainMechanism(userId: string, id: number, data: Partial<InsertMedPainMechanism>): Promise<MedPainMechanism | undefined>;
  deleteMedPainMechanism(userId: string, id: number): Promise<boolean>;

  // Medical Medications
  getMedMedications(userId: string): Promise<MedMedication[]>;
  createMedMedication(userId: string, data: InsertMedMedication): Promise<MedMedication>;
  updateMedMedication(userId: string, id: number, data: Partial<InsertMedMedication>): Promise<MedMedication | undefined>;
  deleteMedMedication(userId: string, id: number): Promise<boolean>;

  // Medical Timeline Events
  getMedTimelineEvents(userId: string): Promise<MedTimelineEvent[]>;
  createMedTimelineEvent(userId: string, data: InsertMedTimelineEvent): Promise<MedTimelineEvent>;
  updateMedTimelineEvent(userId: string, id: number, data: Partial<InsertMedTimelineEvent>): Promise<MedTimelineEvent | undefined>;
  deleteMedTimelineEvent(userId: string, id: number): Promise<boolean>;

  // Medical Network
  getMedMedicalNetwork(userId: string): Promise<MedMedicalNetworkEntry[]>;
  createMedMedicalNetworkEntry(userId: string, data: InsertMedMedicalNetworkEntry): Promise<MedMedicalNetworkEntry>;
  updateMedMedicalNetworkEntry(userId: string, id: number, data: Partial<InsertMedMedicalNetworkEntry>): Promise<MedMedicalNetworkEntry | undefined>;
  deleteMedMedicalNetworkEntry(userId: string, id: number): Promise<boolean>;

  // Medical Vault Documents
  getMedVaultDocuments(userId: string): Promise<MedVaultDocument[]>;
  createMedVaultDocument(userId: string, data: InsertMedVaultDocument): Promise<MedVaultDocument>;
  updateMedVaultDocument(userId: string, id: number, data: Partial<InsertMedVaultDocument>): Promise<MedVaultDocument | undefined>;
  deleteMedVaultDocument(userId: string, id: number): Promise<boolean>;

  getMicrosoftConnection(userId: string): Promise<MicrosoftConnection | undefined>;
  upsertMicrosoftConnection(userId: string, data: InsertMicrosoftConnection): Promise<MicrosoftConnection>;
  deleteMicrosoftConnection(userId: string): Promise<boolean>;

  getScheduledMessages(userId: string): Promise<ScheduledMessage[]>;
  createScheduledMessage(userId: string, data: InsertScheduledMessage): Promise<ScheduledMessage>;
  updateScheduledMessage(userId: string, id: number, data: Partial<InsertScheduledMessage>): Promise<ScheduledMessage | undefined>;
  deleteScheduledMessage(userId: string, id: number): Promise<boolean>;
  getActiveScheduledMessages(): Promise<ScheduledMessage[]>;
  markScheduledMessageSent(id: number): Promise<void>;

  // Memory Graph
  getMemoryEntities(userId: string): Promise<MemoryEntity[]>;
  getMemoryEntity(userId: string, id: string): Promise<MemoryEntity | undefined>;
  createMemoryEntity(userId: string, entity: InsertMemoryEntity): Promise<MemoryEntity>;
  updateMemoryEntity(userId: string, id: string, updates: Partial<InsertMemoryEntity>): Promise<MemoryEntity | undefined>;
  deleteMemoryEntity(userId: string, id: string): Promise<boolean>;

  getMemoryConnections(userId: string): Promise<MemoryConnection[]>;
  getMemoryConnectionsBetween(userId: string, sourceId: string, targetId: string): Promise<MemoryConnection[]>;
  createMemoryConnection(userId: string, connection: InsertMemoryConnection): Promise<MemoryConnection>;
  updateMemoryConnection(userId: string, id: string, updates: Partial<InsertMemoryConnection>): Promise<MemoryConnection | undefined>;
  deleteMemoryConnection(userId: string, id: string): Promise<boolean>;

  getMemoryNarratives(userId: string): Promise<MemoryNarrative[]>;
  upsertMemoryNarrative(userId: string, narrative: InsertMemoryNarrative): Promise<MemoryNarrative>;
  deleteMemoryNarrative(userId: string, id: string): Promise<boolean>;

  getMemoryProcessingLog(userId: string): Promise<MemoryProcessingLogEntry[]>;
  markMemoryProcessed(userId: string, sourceType: string, sourceId: string): Promise<void>;
  clearMemoryGraph(userId: string): Promise<void>;

  // Orbit Chat History
  getAllOrbitConversations(userId: string): Promise<OrbitConversation[]>;
  getOrbitConversation(userId: string, id: string): Promise<OrbitConversation | undefined>;
  createOrbitConversation(userId: string, conversation: InsertOrbitConversation): Promise<OrbitConversation>;
  updateOrbitConversation(userId: string, id: string, updates: Partial<InsertOrbitConversation>): Promise<OrbitConversation | undefined>;
  deleteOrbitConversation(userId: string, id: string): Promise<boolean>;
  getOrbitMessages(userId: string, conversationId: string): Promise<OrbitMessage[]>;
  createOrbitMessage(userId: string, message: InsertOrbitMessage): Promise<OrbitMessage>;
}

export class DatabaseStorage implements IStorage {
  // User Profile
  async getUserProfile(userId: string): Promise<{ displayName: string | null; bio: string | null }> {
    const result = await db.select({ displayName: users.displayName, bio: users.bio }).from(users).where(eq(users.id, userId));
    return result[0] || { displayName: null, bio: null };
  }

  async updateUserProfile(userId: string, data: { displayName?: string; bio?: string }): Promise<User> {
    const result = await db.update(users).set(data).where(eq(users.id, userId)).returning();
    return result[0];
  }

  // System Members
  async getAllMembers(userId: string): Promise<SystemMember[]> {
    return await db.select().from(systemMembers).where(eq(systemMembers.userId, userId));
  }

  async getMember(userId: string, id: string): Promise<SystemMember | undefined> {
    const result = await db.select().from(systemMembers).where(and(eq(systemMembers.id, id), eq(systemMembers.userId, userId)));
    return result[0];
  }

  async createMember(userId: string, member: InsertSystemMember): Promise<SystemMember> {
    const result = await db.insert(systemMembers).values({ ...member, userId }).returning();
    return result[0];
  }

  async updateMember(userId: string, id: string, member: Partial<InsertSystemMember>): Promise<SystemMember | undefined> {
    const result = await db.update(systemMembers).set(member).where(and(eq(systemMembers.id, id), eq(systemMembers.userId, userId))).returning();
    return result[0];
  }

  async deleteMember(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(systemMembers).where(and(eq(systemMembers.id, id), eq(systemMembers.userId, userId))).returning();
    return result.length > 0;
  }

  // Tracker Entries
  async getAllTrackerEntries(userId: string): Promise<TrackerEntry[]> {
    return await db.select().from(trackerEntries).where(eq(trackerEntries.userId, userId)).orderBy(desc(trackerEntries.timestamp));
  }

  async getTrackerEntry(userId: string, id: string): Promise<TrackerEntry | undefined> {
    const result = await db.select().from(trackerEntries).where(and(eq(trackerEntries.id, id), eq(trackerEntries.userId, userId)));
    return result[0];
  }

  async createTrackerEntry(userId: string, entry: InsertTrackerEntry): Promise<TrackerEntry> {
    const result = await db.insert(trackerEntries).values({ ...entry, userId }).returning();
    return result[0];
  }

  async updateTrackerEntry(userId: string, id: string, entry: Partial<InsertTrackerEntry>): Promise<TrackerEntry | undefined> {
    const result = await db.update(trackerEntries).set(entry).where(and(eq(trackerEntries.id, id), eq(trackerEntries.userId, userId))).returning();
    return result[0];
  }

  async deleteTrackerEntry(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(trackerEntries).where(and(eq(trackerEntries.id, id), eq(trackerEntries.userId, userId))).returning();
    return result.length > 0;
  }

  async getRecentTrackerEntries(userId: string, limit: number): Promise<TrackerEntry[]> {
    return await db.select().from(trackerEntries).where(eq(trackerEntries.userId, userId)).orderBy(desc(trackerEntries.timestamp)).limit(limit);
  }

  // System Messages
  async getAllMessages(userId: string): Promise<SystemMessage[]> {
    return await db.select().from(systemMessages).where(eq(systemMessages.userId, userId)).orderBy(desc(systemMessages.createdAt));
  }

  async getMessage(userId: string, id: string): Promise<SystemMessage | undefined> {
    const result = await db.select().from(systemMessages).where(and(eq(systemMessages.id, id), eq(systemMessages.userId, userId)));
    return result[0];
  }

  async createMessage(userId: string, message: InsertSystemMessage): Promise<SystemMessage> {
    const result = await db.insert(systemMessages).values({ ...message, userId }).returning();
    return result[0];
  }

  async deleteMessage(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(systemMessages).where(and(eq(systemMessages.id, id), eq(systemMessages.userId, userId))).returning();
    return result.length > 0;
  }

  // Headspace Rooms
  async getAllRooms(userId: string): Promise<HeadspaceRoom[]> {
    return await db.select().from(headspaceRooms).where(eq(headspaceRooms.userId, userId)).orderBy(headspaceRooms.order);
  }

  async getRoom(userId: string, id: string): Promise<HeadspaceRoom | undefined> {
    const result = await db.select().from(headspaceRooms).where(and(eq(headspaceRooms.id, id), eq(headspaceRooms.userId, userId)));
    return result[0];
  }

  async createRoom(userId: string, room: InsertHeadspaceRoom): Promise<HeadspaceRoom> {
    const result = await db.insert(headspaceRooms).values({ ...room, userId }).returning();
    return result[0];
  }

  async updateRoom(userId: string, id: string, room: Partial<InsertHeadspaceRoom>): Promise<HeadspaceRoom | undefined> {
    const result = await db.update(headspaceRooms).set(room).where(and(eq(headspaceRooms.id, id), eq(headspaceRooms.userId, userId))).returning();
    return result[0];
  }

  async deleteRoom(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(headspaceRooms).where(and(eq(headspaceRooms.id, id), eq(headspaceRooms.userId, userId))).returning();
    return result.length > 0;
  }

  // System Settings
  async getSettings(userId: string): Promise<SystemSettings | undefined> {
    const result = await db.select().from(systemSettings).where(eq(systemSettings.userId, userId)).limit(1);
    if (result.length === 0) {
      const newSettings = await db.insert(systemSettings).values({ userId }).returning();
      return newSettings[0];
    }
    return result[0];
  }

  async updateSettings(userId: string, settings: Partial<InsertSystemSettings>): Promise<SystemSettings> {
    const existing = await this.getSettings(userId);
    if (!existing) throw new Error("Settings not found");
    
    const result = await db.update(systemSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(and(eq(systemSettings.id, existing.id), eq(systemSettings.userId, userId)))
      .returning();
    return result[0];
  }

  // Habits
  async getAllHabits(userId: string): Promise<Habit[]> {
    return await db.select().from(habits).where(eq(habits.userId, userId)).orderBy(habits.createdAt);
  }

  async getHabit(userId: string, id: string): Promise<Habit | undefined> {
    const result = await db.select().from(habits).where(and(eq(habits.id, id), eq(habits.userId, userId)));
    return result[0];
  }

  async createHabit(userId: string, habit: InsertHabit): Promise<Habit> {
    const result = await db.insert(habits).values({ ...habit, userId }).returning();
    return result[0];
  }

  async updateHabit(userId: string, id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined> {
    const result = await db.update(habits).set(habit).where(and(eq(habits.id, id), eq(habits.userId, userId))).returning();
    return result[0];
  }

  async deleteHabit(userId: string, id: string): Promise<boolean> {
    const existing = await this.getHabit(userId, id);
    if (!existing) return false;
    await db.update(routineActivities).set({ habitId: null }).where(and(eq(routineActivities.habitId, id), eq(routineActivities.userId, userId)));
    await db.delete(habitCompletions).where(and(eq(habitCompletions.habitId, id), eq(habitCompletions.userId, userId)));
    const result = await db.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, userId))).returning();
    return result.length > 0;
  }

  // Habit Completions
  async getAllHabitCompletions(userId: string): Promise<HabitCompletion[]> {
    return await db.select().from(habitCompletions).where(eq(habitCompletions.userId, userId));
  }

  async getHabitCompletions(userId: string, habitId: string): Promise<HabitCompletion[]> {
    return await db.select().from(habitCompletions).where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.userId, userId)));
  }

  async addHabitCompletion(userId: string, completion: InsertHabitCompletion): Promise<HabitCompletion> {
    const result = await db.insert(habitCompletions).values({ ...completion, userId }).returning();
    return result[0];
  }

  async removeHabitCompletion(userId: string, habitId: string, date: string): Promise<boolean> {
    const result = await db.delete(habitCompletions)
      .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.completedDate, date), eq(habitCompletions.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // Routine Templates
  async getAllRoutineTemplates(userId: string): Promise<RoutineTemplate[]> {
    return await db.select().from(routineTemplates).where(eq(routineTemplates.userId, userId)).orderBy(routineTemplates.createdAt);
  }

  async getRoutineTemplate(userId: string, id: string): Promise<RoutineTemplate | undefined> {
    const result = await db.select().from(routineTemplates).where(and(eq(routineTemplates.id, id), eq(routineTemplates.userId, userId)));
    return result[0];
  }

  async getDefaultRoutineTemplate(userId: string): Promise<RoutineTemplate | undefined> {
    const result = await db.select().from(routineTemplates).where(and(eq(routineTemplates.isDefault, 1), eq(routineTemplates.userId, userId)));
    return result[0];
  }

  async createRoutineTemplate(userId: string, template: InsertRoutineTemplate): Promise<RoutineTemplate> {
    const result = await db.insert(routineTemplates).values({ ...template, userId }).returning();
    return result[0];
  }

  async updateRoutineTemplate(userId: string, id: string, template: Partial<InsertRoutineTemplate>): Promise<RoutineTemplate | undefined> {
    const result = await db.update(routineTemplates).set(template).where(and(eq(routineTemplates.id, id), eq(routineTemplates.userId, userId))).returning();
    return result[0];
  }

  async deleteRoutineTemplate(userId: string, id: string): Promise<boolean> {
    const blocks = await db.select({ id: routineBlocks.id }).from(routineBlocks).where(and(eq(routineBlocks.templateId, id), eq(routineBlocks.userId, userId)));
    const blockIds = blocks.map(b => b.id);
    if (blockIds.length > 0) {
      await db.delete(routineActivities).where(and(inArray(routineActivities.blockId, blockIds), eq(routineActivities.userId, userId)));
      await db.delete(routineBlocks).where(and(eq(routineBlocks.templateId, id), eq(routineBlocks.userId, userId)));
    }
    const result = await db.delete(routineTemplates).where(and(eq(routineTemplates.id, id), eq(routineTemplates.userId, userId))).returning();
    return result.length > 0;
  }

  async setDefaultRoutineTemplate(userId: string, id: string): Promise<RoutineTemplate | undefined> {
    await db.update(routineTemplates).set({ isDefault: 0 }).where(eq(routineTemplates.userId, userId));
    const result = await db.update(routineTemplates).set({ isDefault: 1 }).where(and(eq(routineTemplates.id, id), eq(routineTemplates.userId, userId))).returning();
    return result[0];
  }

  // Routine Blocks
  async getAllRoutineBlocks(userId: string): Promise<RoutineBlock[]> {
    return await db.select().from(routineBlocks).where(eq(routineBlocks.userId, userId)).orderBy(routineBlocks.order);
  }

  async getRoutineBlocksByTemplate(userId: string, templateId: string): Promise<RoutineBlock[]> {
    return await db.select().from(routineBlocks).where(and(eq(routineBlocks.templateId, templateId), eq(routineBlocks.userId, userId))).orderBy(routineBlocks.order);
  }

  async createRoutineBlock(userId: string, block: InsertRoutineBlock): Promise<RoutineBlock> {
    const result = await db.insert(routineBlocks).values({ ...block, userId }).returning();
    return result[0];
  }

  async updateRoutineBlock(userId: string, id: string, block: Partial<InsertRoutineBlock>): Promise<RoutineBlock | undefined> {
    const result = await db.update(routineBlocks).set(block).where(and(eq(routineBlocks.id, id), eq(routineBlocks.userId, userId))).returning();
    return result[0];
  }

  async deleteRoutineBlock(userId: string, id: string): Promise<boolean> {
    const activities = await db.select().from(routineActivities).where(and(eq(routineActivities.blockId, id), eq(routineActivities.userId, userId)));
    for (const activity of activities) {
      await db.delete(routineActivityLogs).where(and(eq(routineActivityLogs.activityId, activity.id), eq(routineActivityLogs.userId, userId)));
    }
    await db.delete(routineActivities).where(and(eq(routineActivities.blockId, id), eq(routineActivities.userId, userId)));
    const result = await db.delete(routineBlocks).where(and(eq(routineBlocks.id, id), eq(routineBlocks.userId, userId))).returning();
    return result.length > 0;
  }

  // Routine Activities
  async getAllRoutineActivities(userId: string): Promise<RoutineActivity[]> {
    return await db.select().from(routineActivities).where(eq(routineActivities.userId, userId)).orderBy(routineActivities.order);
  }

  async getActivitiesByBlock(userId: string, blockId: string): Promise<RoutineActivity[]> {
    return await db.select().from(routineActivities).where(and(eq(routineActivities.blockId, blockId), eq(routineActivities.userId, userId))).orderBy(routineActivities.order);
  }

  async createRoutineActivity(userId: string, activity: InsertRoutineActivity): Promise<RoutineActivity> {
    const result = await db.insert(routineActivities).values({ ...activity, userId }).returning();
    return result[0];
  }

  async updateRoutineActivity(userId: string, id: string, activity: Partial<InsertRoutineActivity>): Promise<RoutineActivity | undefined> {
    const result = await db.update(routineActivities).set(activity).where(and(eq(routineActivities.id, id), eq(routineActivities.userId, userId))).returning();
    return result[0];
  }

  async deleteRoutineActivity(userId: string, id: string): Promise<boolean> {
    await db.delete(routineActivityLogs).where(and(eq(routineActivityLogs.activityId, id), eq(routineActivityLogs.userId, userId)));
    const result = await db.delete(routineActivities).where(and(eq(routineActivities.id, id), eq(routineActivities.userId, userId))).returning();
    return result.length > 0;
  }

  // Routine Activity Logs
  async getAllRoutineLogs(userId: string): Promise<RoutineActivityLog[]> {
    return await db.select().from(routineActivityLogs).where(eq(routineActivityLogs.userId, userId));
  }

  async getActivityLogsForDate(userId: string, date: string): Promise<RoutineActivityLog[]> {
    return await db.select().from(routineActivityLogs).where(and(eq(routineActivityLogs.completedDate, date), eq(routineActivityLogs.userId, userId)));
  }

  async addActivityLog(userId: string, log: InsertRoutineActivityLog): Promise<RoutineActivityLog> {
    const result = await db.insert(routineActivityLogs).values({ ...log, userId }).returning();
    return result[0];
  }

  async removeActivityLog(userId: string, activityId: string, date: string): Promise<boolean> {
    const result = await db.delete(routineActivityLogs)
      .where(and(eq(routineActivityLogs.activityId, activityId), eq(routineActivityLogs.completedDate, date), eq(routineActivityLogs.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async toggleRoutineActivityWithHabit(userId: string, activityId: string, date: string, habitId: string | null, action: "add" | "remove"): Promise<{ success: boolean }> {
    try {
      await db.transaction(async (tx) => {
        if (action === "add") {
          const existingLog = await tx.select().from(routineActivityLogs)
            .where(and(eq(routineActivityLogs.activityId, activityId), eq(routineActivityLogs.completedDate, date), eq(routineActivityLogs.userId, userId)));
          if (existingLog.length === 0) {
            await tx.insert(routineActivityLogs).values({ activityId, completedDate: date, userId });
          }
          if (habitId) {
            const existingHabit = await tx.select().from(habitCompletions)
              .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.completedDate, date), eq(habitCompletions.userId, userId)));
            if (existingHabit.length === 0) {
              await tx.insert(habitCompletions).values({ habitId, completedDate: date, userId });
            }
          }
        } else {
          await tx.delete(routineActivityLogs)
            .where(and(eq(routineActivityLogs.activityId, activityId), eq(routineActivityLogs.completedDate, date), eq(routineActivityLogs.userId, userId)));
          if (habitId) {
            await tx.delete(habitCompletions)
              .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.completedDate, date), eq(habitCompletions.userId, userId)));
          }
        }
      });
      return { success: true };
    } catch (error) {
      console.error("Transaction failed:", error);
      return { success: false };
    }
  }

  // Todos
  async getAllTodos(userId: string): Promise<Todo[]> {
    return await db.select().from(todos).where(eq(todos.userId, userId)).orderBy(desc(todos.createdAt));
  }

  async createTodo(userId: string, todo: InsertTodo): Promise<Todo> {
    const result = await db.insert(todos).values({ ...todo, userId }).returning();
    return result[0];
  }

  async updateTodo(userId: string, id: string, todo: Partial<InsertTodo>): Promise<Todo | undefined> {
    const result = await db.update(todos).set(todo).where(and(eq(todos.id, id), eq(todos.userId, userId))).returning();
    return result[0];
  }

  async deleteTodo(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId))).returning();
    return result.length > 0;
  }

  // Daily Summaries
  async getAllDailySummaries(userId: string): Promise<DailySummary[]> {
    return await db.select().from(dailySummaries).where(eq(dailySummaries.userId, userId)).orderBy(desc(dailySummaries.date));
  }

  async getDailySummary(userId: string, date: string): Promise<DailySummary | undefined> {
    const result = await db.select().from(dailySummaries).where(and(eq(dailySummaries.date, date), eq(dailySummaries.userId, userId)));
    return result[0];
  }

  async upsertDailySummary(userId: string, summary: InsertDailySummary): Promise<DailySummary> {
    const existing = await this.getDailySummary(userId, summary.date);
    if (existing) {
      const updateData: any = { feeling: summary.feeling };
      if (summary.breakfast !== undefined) updateData.breakfast = summary.breakfast;
      if (summary.lunch !== undefined) updateData.lunch = summary.lunch;
      if (summary.dinner !== undefined) updateData.dinner = summary.dinner;
      
      const result = await db.update(dailySummaries)
        .set(updateData)
        .where(and(eq(dailySummaries.date, summary.date), eq(dailySummaries.userId, userId)))
        .returning();
      return result[0];
    }
    const result = await db.insert(dailySummaries).values({ ...summary, userId }).returning();
    return result[0];
  }

  // Career Projects
  async getAllCareerProjects(userId: string): Promise<CareerProject[]> {
    return await db.select().from(careerProjects).where(eq(careerProjects.userId, userId)).orderBy(desc(careerProjects.createdAt));
  }

  async getCareerProject(userId: string, id: string): Promise<CareerProject | undefined> {
    const result = await db.select().from(careerProjects).where(and(eq(careerProjects.id, id), eq(careerProjects.userId, userId)));
    return result[0];
  }

  async createCareerProject(userId: string, project: InsertCareerProject): Promise<CareerProject> {
    const result = await db.insert(careerProjects).values({ ...project, userId }).returning();
    return result[0];
  }

  async updateCareerProject(userId: string, id: string, project: Partial<InsertCareerProject>): Promise<CareerProject | undefined> {
    const result = await db.update(careerProjects).set(project).where(and(eq(careerProjects.id, id), eq(careerProjects.userId, userId))).returning();
    return result[0];
  }

  async deleteCareerProject(userId: string, id: string): Promise<boolean> {
    await db.update(careerTasks).set({ projectId: null }).where(and(eq(careerTasks.projectId, id), eq(careerTasks.userId, userId)));
    const result = await db.delete(careerProjects).where(and(eq(careerProjects.id, id), eq(careerProjects.userId, userId))).returning();
    return result.length > 0;
  }

  // Career Tasks
  async getAllCareerTasks(userId: string): Promise<CareerTask[]> {
    return await db.select().from(careerTasks).where(eq(careerTasks.userId, userId)).orderBy(desc(careerTasks.createdAt));
  }

  async getCareerTasksByProject(userId: string, projectId: string): Promise<CareerTask[]> {
    return await db.select().from(careerTasks).where(and(eq(careerTasks.projectId, projectId), eq(careerTasks.userId, userId))).orderBy(desc(careerTasks.createdAt));
  }

  async createCareerTask(userId: string, task: InsertCareerTask): Promise<CareerTask> {
    const result = await db.insert(careerTasks).values({ ...task, userId }).returning();
    return result[0];
  }

  async updateCareerTask(userId: string, id: string, task: Partial<InsertCareerTask>): Promise<CareerTask | undefined> {
    const result = await db.update(careerTasks).set(task).where(and(eq(careerTasks.id, id), eq(careerTasks.userId, userId))).returning();
    return result[0];
  }

  async deleteCareerTask(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(careerTasks).where(and(eq(careerTasks.id, id), eq(careerTasks.userId, userId))).returning();
    return result.length > 0;
  }

  // Expenses
  async getAllExpenses(userId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.createdAt));
  }

  async getExpensesByMonth(userId: string, month: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(and(eq(expenses.month, month), eq(expenses.userId, userId))).orderBy(expenses.date);
  }

  async createExpense(userId: string, expense: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses).values({ ...expense, userId }).returning();
    return result[0];
  }

  async updateExpense(userId: string, id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const result = await db.update(expenses).set(expense).where(and(eq(expenses.id, id), eq(expenses.userId, userId))).returning();
    return result[0];
  }

  async deleteExpense(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId))).returning();
    return result.length > 0;
  }

  // Career Vision
  async getVision(userId: string): Promise<CareerVision[]> {
    return await db.select().from(careerVision).where(eq(careerVision.userId, userId)).orderBy(asc(careerVision.order));
  }

  async updateVision(userId: string, items: InsertCareerVision[]): Promise<CareerVision[]> {
    try {
      return await db.transaction(async (tx) => {
        await tx.delete(careerVision).where(eq(careerVision.userId, userId));
        if (items.length === 0) return [];
        const itemsWithUser = items.map(item => ({ ...item, userId }));
        return await tx.insert(careerVision).values(itemsWithUser).returning();
      });
    } catch (error) {
      console.error("Failed to update vision:", error);
      throw error;
    }
  }

  async createVisionItem(userId: string, data: InsertCareerVision): Promise<CareerVision> {
    const maxOrder = await db.select().from(careerVision).where(eq(careerVision.userId, userId)).orderBy(desc(careerVision.order)).limit(1);
    const nextOrder = maxOrder.length > 0 ? (maxOrder[0].order + 1) : 0;
    const result = await db.insert(careerVision).values({ ...data, userId, order: nextOrder }).returning();
    return result[0];
  }

  async updateVisionItem(userId: string, id: string, data: Partial<InsertCareerVision>): Promise<CareerVision | undefined> {
    const result = await db.update(careerVision).set(data).where(and(eq(careerVision.id, id), eq(careerVision.userId, userId))).returning();
    return result[0];
  }

  async deleteVisionItem(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(careerVision).where(and(eq(careerVision.id, id), eq(careerVision.userId, userId))).returning();
    return result.length > 0;
  }

  // Finance Settings
  async getFinanceSettings(userId: string): Promise<FinanceSettings | undefined> {
    const result = await db.select().from(financeSettings).where(eq(financeSettings.userId, userId));
    return result[0];
  }

  async updateFinanceSettings(userId: string, settings: Partial<InsertFinanceSettings>): Promise<FinanceSettings> {
    const existing = await this.getFinanceSettings(userId);
    if (existing) {
      const result = await db.update(financeSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(and(eq(financeSettings.id, existing.id), eq(financeSettings.userId, userId)))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(financeSettings)
        .values({ ...settings, userId } as InsertFinanceSettings)
        .returning();
      return result[0];
    }
  }

  // Journal Entries
  async getAllJournalEntries(userId: string): Promise<JournalEntry[]> {
    return await db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.createdAt));
  }

  async getJournalEntry(userId: string, id: string): Promise<JournalEntry | undefined> {
    const result = await db.select().from(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
    return result[0];
  }

  async createJournalEntry(userId: string, entry: InsertJournalEntry): Promise<JournalEntry> {
    const result = await db.insert(journalEntries).values({ ...entry, userId }).returning();
    return result[0];
  }

  async updateJournalEntry(userId: string, id: string, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const result = await db.update(journalEntries).set(entry).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId))).returning();
    return result[0];
  }

  async deleteJournalEntry(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId))).returning();
    return result.length > 0;
  }

  // Food Options
  async getAllFoodOptions(userId: string): Promise<FoodOption[]> {
    return await db.select().from(foodOptions).where(eq(foodOptions.userId, userId)).orderBy(foodOptions.name);
  }

  async createFoodOption(userId: string, option: InsertFoodOption): Promise<FoodOption> {
    const result = await db.insert(foodOptions).values({ ...option, userId }).returning();
    return result[0];
  }

  async updateFoodOption(userId: string, id: string, option: Partial<InsertFoodOption>): Promise<FoodOption | undefined> {
    const result = await db.update(foodOptions).set(option).where(and(eq(foodOptions.id, id), eq(foodOptions.userId, userId))).returning();
    return result[0];
  }

  async deleteFoodOption(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(foodOptions).where(and(eq(foodOptions.id, id), eq(foodOptions.userId, userId))).returning();
    return result.length > 0;
  }

  // Career Coach Snapshots
  async getLatestCoachSnapshot(userId: string): Promise<CareerCoachSnapshot | undefined> {
    const [snapshot] = await db.select().from(careerCoachSnapshots).where(eq(careerCoachSnapshots.userId, userId)).orderBy(desc(careerCoachSnapshots.generatedAt)).limit(1);
    return snapshot;
  }

  async upsertCoachSnapshot(userId: string, payload: any): Promise<CareerCoachSnapshot> {
    const existing = await this.getLatestCoachSnapshot(userId);
    if (existing) {
      const [updated] = await db.update(careerCoachSnapshots)
        .set({ payload, generatedAt: new Date() })
        .where(and(eq(careerCoachSnapshots.id, existing.id), eq(careerCoachSnapshots.userId, userId)))
        .returning();
      return updated;
    } else {
      const [snapshot] = await db.insert(careerCoachSnapshots).values({
        payload,
        generatedAt: new Date(),
        userId,
      }).returning();
      return snapshot;
    }
  }

  // Income Streams
  async getAllIncomeStreams(userId: string): Promise<IncomeStream[]> {
    return await db.select().from(incomeStreams).where(eq(incomeStreams.userId, userId)).orderBy(desc(incomeStreams.createdAt));
  }

  async getIncomeStream(userId: string, id: string): Promise<IncomeStream | undefined> {
    const result = await db.select().from(incomeStreams).where(and(eq(incomeStreams.id, id), eq(incomeStreams.userId, userId)));
    return result[0];
  }

  async createIncomeStream(userId: string, stream: InsertIncomeStream): Promise<IncomeStream> {
    const result = await db.insert(incomeStreams).values({ ...stream, userId }).returning();
    return result[0];
  }

  async updateIncomeStream(userId: string, id: string, stream: Partial<InsertIncomeStream>): Promise<IncomeStream | undefined> {
    const result = await db.update(incomeStreams).set(stream).where(and(eq(incomeStreams.id, id), eq(incomeStreams.userId, userId))).returning();
    return result[0];
  }

  async deleteIncomeStream(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(incomeStreams).where(and(eq(incomeStreams.id, id), eq(incomeStreams.userId, userId))).returning();
    return result.length > 0;
  }

  // Transactions
  async getAllTransactions(userId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.date));
  }

  async getTransactionsByMonth(userId: string, month: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(and(eq(transactions.month, month), eq(transactions.userId, userId))).orderBy(desc(transactions.date));
  }

  async getTransaction(userId: string, id: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return result[0];
  }

  async createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values({ ...transaction, userId }).returning();
    return result[0];
  }

  async createManyTransactions(userId: string, transactionsList: InsertTransaction[]): Promise<Transaction[]> {
    if (transactionsList.length === 0) return [];
    const itemsWithUser = transactionsList.map(t => ({ ...t, userId }));
    const result = await db.insert(transactions).values(itemsWithUser).returning();
    return result;
  }

  async updateTransaction(userId: string, id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const result = await db.update(transactions).set(transaction).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).returning();
    return result[0];
  }

  async deleteTransaction(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).returning();
    return result.length > 0;
  }

  // Loans
  async getAllLoans(userId: string): Promise<Loan[]> {
    return await db.select().from(loans).where(eq(loans.userId, userId)).orderBy(desc(loans.createdAt));
  }

  async getLoan(userId: string, id: string): Promise<Loan | undefined> {
    const result = await db.select().from(loans).where(and(eq(loans.id, id), eq(loans.userId, userId)));
    return result[0];
  }

  async createLoan(userId: string, loan: InsertLoan): Promise<Loan> {
    const result = await db.insert(loans).values({ ...loan, userId }).returning();
    return result[0];
  }

  async updateLoan(userId: string, id: string, loan: Partial<InsertLoan>): Promise<Loan | undefined> {
    const result = await db.update(loans).set(loan).where(and(eq(loans.id, id), eq(loans.userId, userId))).returning();
    return result[0];
  }

  async deleteLoan(userId: string, id: string): Promise<boolean> {
    const payments = await this.getLoanPayments(userId, id);
    
    for (const payment of payments) {
      if (payment.transactionId) {
        await db.delete(transactions).where(and(eq(transactions.id, payment.transactionId), eq(transactions.userId, userId)));
      }
    }
    
    await db.delete(loanPayments).where(and(eq(loanPayments.loanId, id), eq(loanPayments.userId, userId)));
    
    const result = await db.delete(loans).where(and(eq(loans.id, id), eq(loans.userId, userId))).returning();
    return result.length > 0;
  }

  // Loan Payments
  async getLoanPayments(userId: string, loanId: string): Promise<LoanPayment[]> {
    return await db.select().from(loanPayments).where(and(eq(loanPayments.loanId, loanId), eq(loanPayments.userId, userId))).orderBy(desc(loanPayments.paymentDate));
  }

  async createLoanPayment(userId: string, payment: InsertLoanPayment): Promise<LoanPayment> {
    const result = await db.insert(loanPayments).values({ ...payment, userId }).returning();
    const loan = await this.getLoan(userId, payment.loanId);
    if (loan) {
      const newBalance = Math.max(0, loan.currentBalance - payment.amount);
      await this.updateLoan(userId, payment.loanId, { 
        currentBalance: newBalance,
        status: newBalance === 0 ? "paid_off" : "active"
      });
    }
    return result[0];
  }

  async deleteLoanPayment(userId: string, id: string): Promise<boolean> {
    const paymentResult = await db.select().from(loanPayments).where(and(eq(loanPayments.id, id), eq(loanPayments.userId, userId)));
    const payment = paymentResult[0];
    
    if (!payment) return false;
    
    if (payment.transactionId) {
      await db.delete(transactions).where(and(eq(transactions.id, payment.transactionId), eq(transactions.userId, userId)));
    }
    
    const loan = await this.getLoan(userId, payment.loanId);
    if (loan) {
      const restoredBalance = loan.currentBalance + payment.amount;
      await this.updateLoan(userId, payment.loanId, {
        currentBalance: restoredBalance,
        status: "active"
      });
    }
    
    const result = await db.delete(loanPayments).where(and(eq(loanPayments.id, id), eq(loanPayments.userId, userId))).returning();
    return result.length > 0;
  }

  // User News Topics
  async getAllNewsTopics(userId: string): Promise<UserNewsTopic[]> {
    return await db.select().from(userNewsTopics).where(eq(userNewsTopics.userId, userId)).orderBy(desc(userNewsTopics.createdAt));
  }

  async getActiveNewsTopics(userId: string): Promise<UserNewsTopic[]> {
    return await db.select().from(userNewsTopics).where(and(eq(userNewsTopics.isActive, 1), eq(userNewsTopics.userId, userId))).orderBy(desc(userNewsTopics.createdAt));
  }

  async createNewsTopic(userId: string, topic: InsertUserNewsTopic): Promise<UserNewsTopic> {
    const result = await db.insert(userNewsTopics).values({ ...topic, userId }).returning();
    return result[0];
  }

  async updateNewsTopic(userId: string, id: string, topic: Partial<InsertUserNewsTopic>): Promise<UserNewsTopic | undefined> {
    const result = await db.update(userNewsTopics).set(topic).where(and(eq(userNewsTopics.id, id), eq(userNewsTopics.userId, userId))).returning();
    return result[0];
  }

  async deleteNewsTopic(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(userNewsTopics).where(and(eq(userNewsTopics.id, id), eq(userNewsTopics.userId, userId))).returning();
    return result.length > 0;
  }

  // Saved Articles
  async getAllSavedArticles(userId: string): Promise<SavedArticle[]> {
    return await db.select().from(savedArticles).where(eq(savedArticles.userId, userId)).orderBy(desc(savedArticles.createdAt));
  }

  async getSavedArticle(userId: string, link: string): Promise<SavedArticle | undefined> {
    const result = await db.select().from(savedArticles).where(and(eq(savedArticles.link, link), eq(savedArticles.userId, userId)));
    return result[0];
  }

  async createSavedArticle(userId: string, article: InsertSavedArticle): Promise<SavedArticle> {
    const result = await db.insert(savedArticles).values({ ...article, userId }).returning();
    return result[0];
  }

  async deleteSavedArticle(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(savedArticles).where(and(eq(savedArticles.id, id), eq(savedArticles.userId, userId))).returning();
    return result.length > 0;
  }

  async getMedicalProfile(userId: string): Promise<MedicalProfile | undefined> {
    const result = await db.select().from(medicalProfiles).where(eq(medicalProfiles.userId, userId));
    return result[0];
  }

  async upsertMedicalProfile(userId: string, profile: Partial<InsertMedicalProfile>): Promise<MedicalProfile> {
    const existing = await this.getMedicalProfile(userId);
    if (existing) {
      const [updated] = await db.update(medicalProfiles).set(profile).where(and(eq(medicalProfiles.id, existing.id), eq(medicalProfiles.userId, userId))).returning();
      return updated;
    }
    const [created] = await db.insert(medicalProfiles).values({ ...profile, userId } as InsertMedicalProfile).returning();
    return created;
  }

  async getMedDiagnoses(userId: string): Promise<MedDiagnosis[]> {
    return db.select().from(medDiagnoses).where(eq(medDiagnoses.userId, userId)).orderBy(asc(medDiagnoses.sortOrder));
  }
  async createMedDiagnosis(userId: string, data: InsertMedDiagnosis): Promise<MedDiagnosis> {
    const [row] = await db.insert(medDiagnoses).values({ ...data, userId }).returning();
    return row;
  }
  async updateMedDiagnosis(userId: string, id: number, data: Partial<InsertMedDiagnosis>): Promise<MedDiagnosis | undefined> {
    const [row] = await db.update(medDiagnoses).set(data).where(and(eq(medDiagnoses.id, id), eq(medDiagnoses.userId, userId))).returning();
    return row;
  }
  async deleteMedDiagnosis(userId: string, id: number): Promise<boolean> {
    const result = await db.delete(medDiagnoses).where(and(eq(medDiagnoses.id, id), eq(medDiagnoses.userId, userId))).returning();
    return result.length > 0;
  }

  async getMedPriorities(userId: string): Promise<MedPriority[]> {
    return db.select().from(medPriorities).where(eq(medPriorities.userId, userId)).orderBy(asc(medPriorities.sortOrder));
  }
  async createMedPriority(userId: string, data: InsertMedPriority): Promise<MedPriority> {
    const [row] = await db.insert(medPriorities).values({ ...data, userId }).returning();
    return row;
  }
  async updateMedPriority(userId: string, id: number, data: Partial<InsertMedPriority>): Promise<MedPriority | undefined> {
    const [row] = await db.update(medPriorities).set(data).where(and(eq(medPriorities.id, id), eq(medPriorities.userId, userId))).returning();
    return row;
  }
  async deleteMedPriority(userId: string, id: number): Promise<boolean> {
    const result = await db.delete(medPriorities).where(and(eq(medPriorities.id, id), eq(medPriorities.userId, userId))).returning();
    return result.length > 0;
  }

  async getMedPainMechanisms(userId: string): Promise<MedPainMechanism[]> {
    return db.select().from(medPainMechanisms).where(eq(medPainMechanisms.userId, userId)).orderBy(asc(medPainMechanisms.sortOrder));
  }
  async createMedPainMechanism(userId: string, data: InsertMedPainMechanism): Promise<MedPainMechanism> {
    const [row] = await db.insert(medPainMechanisms).values({ ...data, userId }).returning();
    return row;
  }
  async updateMedPainMechanism(userId: string, id: number, data: Partial<InsertMedPainMechanism>): Promise<MedPainMechanism | undefined> {
    const [row] = await db.update(medPainMechanisms).set(data).where(and(eq(medPainMechanisms.id, id), eq(medPainMechanisms.userId, userId))).returning();
    return row;
  }
  async deleteMedPainMechanism(userId: string, id: number): Promise<boolean> {
    const result = await db.delete(medPainMechanisms).where(and(eq(medPainMechanisms.id, id), eq(medPainMechanisms.userId, userId))).returning();
    return result.length > 0;
  }

  async getMedMedications(userId: string): Promise<MedMedication[]> {
    return db.select().from(medMedications).where(eq(medMedications.userId, userId));
  }
  async createMedMedication(userId: string, data: InsertMedMedication): Promise<MedMedication> {
    const [row] = await db.insert(medMedications).values({ ...data, userId }).returning();
    return row;
  }
  async updateMedMedication(userId: string, id: number, data: Partial<InsertMedMedication>): Promise<MedMedication | undefined> {
    const [row] = await db.update(medMedications).set(data).where(and(eq(medMedications.id, id), eq(medMedications.userId, userId))).returning();
    return row;
  }
  async deleteMedMedication(userId: string, id: number): Promise<boolean> {
    const result = await db.delete(medMedications).where(and(eq(medMedications.id, id), eq(medMedications.userId, userId))).returning();
    return result.length > 0;
  }

  async getMedTimelineEvents(userId: string): Promise<MedTimelineEvent[]> {
    return db.select().from(medTimelineEvents).where(eq(medTimelineEvents.userId, userId)).orderBy(asc(medTimelineEvents.sortOrder));
  }
  async createMedTimelineEvent(userId: string, data: InsertMedTimelineEvent): Promise<MedTimelineEvent> {
    const [row] = await db.insert(medTimelineEvents).values({ ...data, userId }).returning();
    return row;
  }
  async updateMedTimelineEvent(userId: string, id: number, data: Partial<InsertMedTimelineEvent>): Promise<MedTimelineEvent | undefined> {
    const [row] = await db.update(medTimelineEvents).set(data).where(and(eq(medTimelineEvents.id, id), eq(medTimelineEvents.userId, userId))).returning();
    return row;
  }
  async deleteMedTimelineEvent(userId: string, id: number): Promise<boolean> {
    const result = await db.delete(medTimelineEvents).where(and(eq(medTimelineEvents.id, id), eq(medTimelineEvents.userId, userId))).returning();
    return result.length > 0;
  }

  async getMedMedicalNetwork(userId: string): Promise<MedMedicalNetworkEntry[]> {
    return db.select().from(medMedicalNetwork).where(eq(medMedicalNetwork.userId, userId));
  }
  async createMedMedicalNetworkEntry(userId: string, data: InsertMedMedicalNetworkEntry): Promise<MedMedicalNetworkEntry> {
    const [row] = await db.insert(medMedicalNetwork).values({ ...data, userId }).returning();
    return row;
  }
  async updateMedMedicalNetworkEntry(userId: string, id: number, data: Partial<InsertMedMedicalNetworkEntry>): Promise<MedMedicalNetworkEntry | undefined> {
    const [row] = await db.update(medMedicalNetwork).set(data).where(and(eq(medMedicalNetwork.id, id), eq(medMedicalNetwork.userId, userId))).returning();
    return row;
  }
  async deleteMedMedicalNetworkEntry(userId: string, id: number): Promise<boolean> {
    const result = await db.delete(medMedicalNetwork).where(and(eq(medMedicalNetwork.id, id), eq(medMedicalNetwork.userId, userId))).returning();
    return result.length > 0;
  }

  async getMedVaultDocuments(userId: string): Promise<MedVaultDocument[]> {
    return db.select().from(medVaultDocuments).where(eq(medVaultDocuments.userId, userId));
  }
  async createMedVaultDocument(userId: string, data: InsertMedVaultDocument): Promise<MedVaultDocument> {
    const [row] = await db.insert(medVaultDocuments).values({ ...data, userId }).returning();
    return row;
  }
  async updateMedVaultDocument(userId: string, id: number, data: Partial<InsertMedVaultDocument>): Promise<MedVaultDocument | undefined> {
    const [row] = await db.update(medVaultDocuments).set(data).where(and(eq(medVaultDocuments.id, id), eq(medVaultDocuments.userId, userId))).returning();
    return row;
  }
  async deleteMedVaultDocument(userId: string, id: number): Promise<boolean> {
    const result = await db.delete(medVaultDocuments).where(and(eq(medVaultDocuments.id, id), eq(medVaultDocuments.userId, userId))).returning();
    return result.length > 0;
  }
  async resetMedicalData(userId: string): Promise<void> {
    await db.delete(medDiagnoses).where(eq(medDiagnoses.userId, userId));
    await db.delete(medPriorities).where(eq(medPriorities.userId, userId));
    await db.delete(medPainMechanisms).where(eq(medPainMechanisms.userId, userId));
    await db.delete(medMedications).where(eq(medMedications.userId, userId));
    await db.delete(medTimelineEvents).where(eq(medTimelineEvents.userId, userId));
    await db.delete(medMedicalNetwork).where(eq(medMedicalNetwork.userId, userId));
    await db.delete(medVaultDocuments).where(eq(medVaultDocuments.userId, userId));
    await db.delete(medicalProfiles).where(eq(medicalProfiles.userId, userId));
  }

  async getMicrosoftConnection(userId: string): Promise<MicrosoftConnection | undefined> {
    const [row] = await db.select().from(microsoftConnections)
      .where(and(eq(microsoftConnections.userId, userId), eq(microsoftConnections.status, "active")));
    return row;
  }

  async upsertMicrosoftConnection(userId: string, data: InsertMicrosoftConnection): Promise<MicrosoftConnection> {
    await db.delete(microsoftConnections).where(eq(microsoftConnections.userId, userId));
    const [row] = await db.insert(microsoftConnections).values({ ...data, userId }).returning();
    return row;
  }

  async deleteMicrosoftConnection(userId: string): Promise<boolean> {
    const result = await db.delete(microsoftConnections).where(eq(microsoftConnections.userId, userId)).returning();
    return result.length > 0;
  }

  async getScheduledMessages(userId: string): Promise<ScheduledMessage[]> {
    return await db.select().from(scheduledMessages)
      .where(eq(scheduledMessages.userId, userId))
      .orderBy(desc(scheduledMessages.createdAt));
  }

  async createScheduledMessage(userId: string, data: InsertScheduledMessage): Promise<ScheduledMessage> {
    const [row] = await db.insert(scheduledMessages).values({ ...data, userId }).returning();
    return row;
  }

  async updateScheduledMessage(userId: string, id: number, data: Partial<InsertScheduledMessage>): Promise<ScheduledMessage | undefined> {
    const [row] = await db.update(scheduledMessages).set(data)
      .where(and(eq(scheduledMessages.id, id), eq(scheduledMessages.userId, userId))).returning();
    return row;
  }

  async deleteScheduledMessage(userId: string, id: number): Promise<boolean> {
    const result = await db.delete(scheduledMessages)
      .where(and(eq(scheduledMessages.id, id), eq(scheduledMessages.userId, userId))).returning();
    return result.length > 0;
  }

  async getActiveScheduledMessages(): Promise<ScheduledMessage[]> {
    return await db.select().from(scheduledMessages)
      .where(eq(scheduledMessages.active, true));
  }

  async markScheduledMessageSent(id: number): Promise<void> {
    await db.update(scheduledMessages).set({ lastSentAt: new Date() })
      .where(eq(scheduledMessages.id, id));
  }

  // ==================== MEMORY GRAPH ====================

  async getMemoryEntities(userId: string): Promise<MemoryEntity[]> {
    return await db.select().from(memoryEntities)
      .where(and(eq(memoryEntities.userId, userId), eq(memoryEntities.active, 1)))
      .orderBy(desc(memoryEntities.importance));
  }

  async getMemoryEntity(userId: string, id: string): Promise<MemoryEntity | undefined> {
    const [row] = await db.select().from(memoryEntities)
      .where(and(eq(memoryEntities.id, id), eq(memoryEntities.userId, userId)));
    return row;
  }

  async createMemoryEntity(userId: string, entity: InsertMemoryEntity): Promise<MemoryEntity> {
    const [row] = await db.insert(memoryEntities).values({ ...entity, userId }).returning();
    return row;
  }

  async updateMemoryEntity(userId: string, id: string, updates: Partial<InsertMemoryEntity>): Promise<MemoryEntity | undefined> {
    const [row] = await db.update(memoryEntities).set(updates)
      .where(and(eq(memoryEntities.id, id), eq(memoryEntities.userId, userId))).returning();
    return row;
  }

  async deleteMemoryEntity(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(memoryEntities)
      .where(and(eq(memoryEntities.id, id), eq(memoryEntities.userId, userId))).returning();
    return result.length > 0;
  }

  async getMemoryConnections(userId: string): Promise<MemoryConnection[]> {
    return await db.select().from(memoryConnections)
      .where(eq(memoryConnections.userId, userId))
      .orderBy(desc(memoryConnections.strength));
  }

  async getMemoryConnectionsBetween(userId: string, sourceId: string, targetId: string): Promise<MemoryConnection[]> {
    return await db.select().from(memoryConnections)
      .where(and(
        eq(memoryConnections.userId, userId),
        eq(memoryConnections.sourceId, sourceId),
        eq(memoryConnections.targetId, targetId)
      ));
  }

  async createMemoryConnection(userId: string, connection: InsertMemoryConnection): Promise<MemoryConnection> {
    const [row] = await db.insert(memoryConnections).values({ ...connection, userId }).returning();
    return row;
  }

  async updateMemoryConnection(userId: string, id: string, updates: Partial<InsertMemoryConnection>): Promise<MemoryConnection | undefined> {
    const [row] = await db.update(memoryConnections).set(updates)
      .where(and(eq(memoryConnections.id, id), eq(memoryConnections.userId, userId))).returning();
    return row;
  }

  async deleteMemoryConnection(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(memoryConnections)
      .where(and(eq(memoryConnections.id, id), eq(memoryConnections.userId, userId))).returning();
    return result.length > 0;
  }

  async getMemoryNarratives(userId: string): Promise<MemoryNarrative[]> {
    return await db.select().from(memoryNarratives)
      .where(eq(memoryNarratives.userId, userId))
      .orderBy(desc(memoryNarratives.confidence));
  }

  async upsertMemoryNarrative(userId: string, narrative: InsertMemoryNarrative): Promise<MemoryNarrative> {
    // Check if a narrative with this key exists
    const [existing] = await db.select().from(memoryNarratives)
      .where(and(
        eq(memoryNarratives.userId, userId),
        eq(memoryNarratives.narrativeKey, narrative.narrativeKey)
      ));

    if (existing) {
      const [row] = await db.update(memoryNarratives).set({
        narrative: narrative.narrative,
        supportingEntityIds: narrative.supportingEntityIds,
        confidence: narrative.confidence,
        lastUpdated: new Date(),
      }).where(eq(memoryNarratives.id, existing.id)).returning();
      return row;
    }

    const [row] = await db.insert(memoryNarratives).values({ ...narrative, userId }).returning();
    return row;
  }

  async deleteMemoryNarrative(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(memoryNarratives)
      .where(and(eq(memoryNarratives.id, id), eq(memoryNarratives.userId, userId))).returning();
    return result.length > 0;
  }

  async getMemoryProcessingLog(userId: string): Promise<MemoryProcessingLogEntry[]> {
    return await db.select().from(memoryProcessingLog)
      .where(eq(memoryProcessingLog.userId, userId));
  }

  async markMemoryProcessed(userId: string, sourceType: string, sourceId: string): Promise<void> {
    await db.insert(memoryProcessingLog).values({ userId, sourceType, sourceId });
  }

  async clearMemoryGraph(userId: string): Promise<void> {
    await db.delete(memoryConnections).where(eq(memoryConnections.userId, userId));
    await db.delete(memoryEntities).where(eq(memoryEntities.userId, userId));
    await db.delete(memoryNarratives).where(eq(memoryNarratives.userId, userId));
    await db.delete(memoryProcessingLog).where(eq(memoryProcessingLog.userId, userId));
  }

  // Orbit Chat History
  async getAllOrbitConversations(userId: string): Promise<OrbitConversation[]> {
    return await db.select().from(orbitConversations)
      .where(eq(orbitConversations.userId, userId))
      .orderBy(desc(orbitConversations.updatedAt));
  }

  async getOrbitConversation(userId: string, id: string): Promise<OrbitConversation | undefined> {
    const result = await db.select().from(orbitConversations)
      .where(and(eq(orbitConversations.id, id), eq(orbitConversations.userId, userId)));
    return result[0];
  }

  async createOrbitConversation(userId: string, conversation: InsertOrbitConversation): Promise<OrbitConversation> {
    const result = await db.insert(orbitConversations)
      .values({ ...conversation, userId })
      .returning();
    return result[0];
  }

  async updateOrbitConversation(userId: string, id: string, updates: Partial<InsertOrbitConversation>): Promise<OrbitConversation | undefined> {
    const result = await db.update(orbitConversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(orbitConversations.id, id), eq(orbitConversations.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteOrbitConversation(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(orbitConversations)
      .where(and(eq(orbitConversations.id, id), eq(orbitConversations.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getOrbitMessages(userId: string, conversationId: string): Promise<OrbitMessage[]> {
    return await db.select().from(orbitMessages)
      .where(and(eq(orbitMessages.conversationId, conversationId), eq(orbitMessages.userId, userId)))
      .orderBy(asc(orbitMessages.createdAt));
  }

  async createOrbitMessage(userId: string, message: InsertOrbitMessage): Promise<OrbitMessage> {
    const result = await db.insert(orbitMessages)
      .values({ ...message, userId })
      .returning();
    // Touch the conversation's updatedAt
    await db.update(orbitConversations)
      .set({ updatedAt: new Date() })
      .where(eq(orbitConversations.id, message.conversationId));
    return result[0];
  }
}

export const storage = new DatabaseStorage();
