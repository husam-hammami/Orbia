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
  systemMembers,
  trackerEntries,
  systemMessages,
  headspaceRooms,
  systemSettings,
  habits,
  habitCompletions,
  routineBlocks,
  routineActivities,
  routineActivityLogs,
  todos
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // System Members
  getAllMembers(): Promise<SystemMember[]>;
  getMember(id: string): Promise<SystemMember | undefined>;
  createMember(member: InsertSystemMember): Promise<SystemMember>;
  updateMember(id: string, member: Partial<InsertSystemMember>): Promise<SystemMember | undefined>;
  deleteMember(id: string): Promise<boolean>;

  // Tracker Entries
  getAllTrackerEntries(): Promise<TrackerEntry[]>;
  getTrackerEntry(id: string): Promise<TrackerEntry | undefined>;
  createTrackerEntry(entry: InsertTrackerEntry): Promise<TrackerEntry>;
  getRecentTrackerEntries(limit: number): Promise<TrackerEntry[]>;

  // System Messages
  getAllMessages(): Promise<SystemMessage[]>;
  getMessage(id: string): Promise<SystemMessage | undefined>;
  createMessage(message: InsertSystemMessage): Promise<SystemMessage>;
  deleteMessage(id: string): Promise<boolean>;

  // Headspace Rooms
  getAllRooms(): Promise<HeadspaceRoom[]>;
  getRoom(id: string): Promise<HeadspaceRoom | undefined>;
  createRoom(room: InsertHeadspaceRoom): Promise<HeadspaceRoom>;
  updateRoom(id: string, room: Partial<InsertHeadspaceRoom>): Promise<HeadspaceRoom | undefined>;
  deleteRoom(id: string): Promise<boolean>;

  // System Settings
  getSettings(): Promise<SystemSettings | undefined>;
  updateSettings(settings: Partial<InsertSystemSettings>): Promise<SystemSettings>;

  // Habits
  getAllHabits(): Promise<Habit[]>;
  getHabit(id: string): Promise<Habit | undefined>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  updateHabit(id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined>;
  deleteHabit(id: string): Promise<boolean>;

  // Habit Completions
  getAllHabitCompletions(): Promise<HabitCompletion[]>;
  getHabitCompletions(habitId: string): Promise<HabitCompletion[]>;
  addHabitCompletion(completion: InsertHabitCompletion): Promise<HabitCompletion>;
  removeHabitCompletion(habitId: string, date: string): Promise<boolean>;

  // Routine Blocks
  getAllRoutineBlocks(): Promise<RoutineBlock[]>;
  createRoutineBlock(block: InsertRoutineBlock): Promise<RoutineBlock>;
  updateRoutineBlock(id: string, block: Partial<InsertRoutineBlock>): Promise<RoutineBlock | undefined>;
  deleteRoutineBlock(id: string): Promise<boolean>;

  // Routine Activities
  getAllRoutineActivities(): Promise<RoutineActivity[]>;
  getActivitiesByBlock(blockId: string): Promise<RoutineActivity[]>;
  createRoutineActivity(activity: InsertRoutineActivity): Promise<RoutineActivity>;
  updateRoutineActivity(id: string, activity: Partial<InsertRoutineActivity>): Promise<RoutineActivity | undefined>;
  deleteRoutineActivity(id: string): Promise<boolean>;

  // Routine Activity Logs
  getAllRoutineLogs(): Promise<RoutineActivityLog[]>;
  getActivityLogsForDate(date: string): Promise<RoutineActivityLog[]>;
  addActivityLog(log: InsertRoutineActivityLog): Promise<RoutineActivityLog>;
  removeActivityLog(activityId: string, date: string): Promise<boolean>;

  // Atomic routine + habit sync
  toggleRoutineActivityWithHabit(activityId: string, date: string, habitId: string | null, action: "add" | "remove"): Promise<{ success: boolean }>;

  // Todos
  getAllTodos(): Promise<Todo[]>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: string, todo: Partial<InsertTodo>): Promise<Todo | undefined>;
  deleteTodo(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // System Members
  async getAllMembers(): Promise<SystemMember[]> {
    return await db.select().from(systemMembers);
  }

  async getMember(id: string): Promise<SystemMember | undefined> {
    const result = await db.select().from(systemMembers).where(eq(systemMembers.id, id));
    return result[0];
  }

  async createMember(member: InsertSystemMember): Promise<SystemMember> {
    const result = await db.insert(systemMembers).values(member).returning();
    return result[0];
  }

  async updateMember(id: string, member: Partial<InsertSystemMember>): Promise<SystemMember | undefined> {
    const result = await db.update(systemMembers).set(member).where(eq(systemMembers.id, id)).returning();
    return result[0];
  }

  async deleteMember(id: string): Promise<boolean> {
    const result = await db.delete(systemMembers).where(eq(systemMembers.id, id)).returning();
    return result.length > 0;
  }

  // Tracker Entries
  async getAllTrackerEntries(): Promise<TrackerEntry[]> {
    return await db.select().from(trackerEntries).orderBy(desc(trackerEntries.timestamp));
  }

  async getTrackerEntry(id: string): Promise<TrackerEntry | undefined> {
    const result = await db.select().from(trackerEntries).where(eq(trackerEntries.id, id));
    return result[0];
  }

  async createTrackerEntry(entry: InsertTrackerEntry): Promise<TrackerEntry> {
    const result = await db.insert(trackerEntries).values(entry).returning();
    return result[0];
  }

  async getRecentTrackerEntries(limit: number): Promise<TrackerEntry[]> {
    return await db.select().from(trackerEntries).orderBy(desc(trackerEntries.timestamp)).limit(limit);
  }

  // System Messages
  async getAllMessages(): Promise<SystemMessage[]> {
    return await db.select().from(systemMessages).orderBy(desc(systemMessages.createdAt));
  }

  async getMessage(id: string): Promise<SystemMessage | undefined> {
    const result = await db.select().from(systemMessages).where(eq(systemMessages.id, id));
    return result[0];
  }

  async createMessage(message: InsertSystemMessage): Promise<SystemMessage> {
    const result = await db.insert(systemMessages).values(message).returning();
    return result[0];
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(systemMessages).where(eq(systemMessages.id, id)).returning();
    return result.length > 0;
  }

  // Headspace Rooms
  async getAllRooms(): Promise<HeadspaceRoom[]> {
    return await db.select().from(headspaceRooms).orderBy(headspaceRooms.order);
  }

  async getRoom(id: string): Promise<HeadspaceRoom | undefined> {
    const result = await db.select().from(headspaceRooms).where(eq(headspaceRooms.id, id));
    return result[0];
  }

  async createRoom(room: InsertHeadspaceRoom): Promise<HeadspaceRoom> {
    const result = await db.insert(headspaceRooms).values(room).returning();
    return result[0];
  }

  async updateRoom(id: string, room: Partial<InsertHeadspaceRoom>): Promise<HeadspaceRoom | undefined> {
    const result = await db.update(headspaceRooms).set(room).where(eq(headspaceRooms.id, id)).returning();
    return result[0];
  }

  async deleteRoom(id: string): Promise<boolean> {
    const result = await db.delete(headspaceRooms).where(eq(headspaceRooms.id, id)).returning();
    return result.length > 0;
  }

  // System Settings
  async getSettings(): Promise<SystemSettings | undefined> {
    const result = await db.select().from(systemSettings).limit(1);
    if (result.length === 0) {
      // Create default settings if none exist
      const newSettings = await db.insert(systemSettings).values({}).returning();
      return newSettings[0];
    }
    return result[0];
  }

  async updateSettings(settings: Partial<InsertSystemSettings>): Promise<SystemSettings> {
    const existing = await this.getSettings();
    if (!existing) throw new Error("Settings not found");
    
    const result = await db.update(systemSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id))
      .returning();
    return result[0];
  }

  // Habits
  async getAllHabits(): Promise<Habit[]> {
    return await db.select().from(habits).orderBy(habits.createdAt);
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    const result = await db.select().from(habits).where(eq(habits.id, id));
    return result[0];
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const result = await db.insert(habits).values(habit).returning();
    return result[0];
  }

  async updateHabit(id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined> {
    const result = await db.update(habits).set(habit).where(eq(habits.id, id)).returning();
    return result[0];
  }

  async deleteHabit(id: string): Promise<boolean> {
    await db.delete(habitCompletions).where(eq(habitCompletions.habitId, id));
    const result = await db.delete(habits).where(eq(habits.id, id)).returning();
    return result.length > 0;
  }

  // Habit Completions
  async getAllHabitCompletions(): Promise<HabitCompletion[]> {
    return await db.select().from(habitCompletions);
  }

  async getHabitCompletions(habitId: string): Promise<HabitCompletion[]> {
    return await db.select().from(habitCompletions).where(eq(habitCompletions.habitId, habitId));
  }

  async addHabitCompletion(completion: InsertHabitCompletion): Promise<HabitCompletion> {
    const result = await db.insert(habitCompletions).values(completion).returning();
    return result[0];
  }

  async removeHabitCompletion(habitId: string, date: string): Promise<boolean> {
    const result = await db.delete(habitCompletions)
      .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.completedDate, date)))
      .returning();
    return result.length > 0;
  }

  // Routine Blocks
  async getAllRoutineBlocks(): Promise<RoutineBlock[]> {
    return await db.select().from(routineBlocks).orderBy(routineBlocks.order);
  }

  async createRoutineBlock(block: InsertRoutineBlock): Promise<RoutineBlock> {
    const result = await db.insert(routineBlocks).values(block).returning();
    return result[0];
  }

  async updateRoutineBlock(id: string, block: Partial<InsertRoutineBlock>): Promise<RoutineBlock | undefined> {
    const result = await db.update(routineBlocks).set(block).where(eq(routineBlocks.id, id)).returning();
    return result[0];
  }

  async deleteRoutineBlock(id: string): Promise<boolean> {
    const activities = await db.select().from(routineActivities).where(eq(routineActivities.blockId, id));
    for (const activity of activities) {
      await db.delete(routineActivityLogs).where(eq(routineActivityLogs.activityId, activity.id));
    }
    await db.delete(routineActivities).where(eq(routineActivities.blockId, id));
    const result = await db.delete(routineBlocks).where(eq(routineBlocks.id, id)).returning();
    return result.length > 0;
  }

  // Routine Activities
  async getAllRoutineActivities(): Promise<RoutineActivity[]> {
    return await db.select().from(routineActivities).orderBy(routineActivities.order);
  }

  async getActivitiesByBlock(blockId: string): Promise<RoutineActivity[]> {
    return await db.select().from(routineActivities).where(eq(routineActivities.blockId, blockId)).orderBy(routineActivities.order);
  }

  async createRoutineActivity(activity: InsertRoutineActivity): Promise<RoutineActivity> {
    const result = await db.insert(routineActivities).values(activity).returning();
    return result[0];
  }

  async updateRoutineActivity(id: string, activity: Partial<InsertRoutineActivity>): Promise<RoutineActivity | undefined> {
    const result = await db.update(routineActivities).set(activity).where(eq(routineActivities.id, id)).returning();
    return result[0];
  }

  async deleteRoutineActivity(id: string): Promise<boolean> {
    await db.delete(routineActivityLogs).where(eq(routineActivityLogs.activityId, id));
    const result = await db.delete(routineActivities).where(eq(routineActivities.id, id)).returning();
    return result.length > 0;
  }

  // Routine Activity Logs
  async getAllRoutineLogs(): Promise<RoutineActivityLog[]> {
    return await db.select().from(routineActivityLogs);
  }

  async getActivityLogsForDate(date: string): Promise<RoutineActivityLog[]> {
    return await db.select().from(routineActivityLogs).where(eq(routineActivityLogs.completedDate, date));
  }

  async addActivityLog(log: InsertRoutineActivityLog): Promise<RoutineActivityLog> {
    const result = await db.insert(routineActivityLogs).values(log).returning();
    return result[0];
  }

  async removeActivityLog(activityId: string, date: string): Promise<boolean> {
    const result = await db.delete(routineActivityLogs)
      .where(and(eq(routineActivityLogs.activityId, activityId), eq(routineActivityLogs.completedDate, date)))
      .returning();
    return result.length > 0;
  }

  async toggleRoutineActivityWithHabit(activityId: string, date: string, habitId: string | null, action: "add" | "remove"): Promise<{ success: boolean }> {
    try {
      await db.transaction(async (tx) => {
        if (action === "add") {
          const existingLog = await tx.select().from(routineActivityLogs)
            .where(and(eq(routineActivityLogs.activityId, activityId), eq(routineActivityLogs.completedDate, date)));
          if (existingLog.length === 0) {
            await tx.insert(routineActivityLogs).values({ activityId, completedDate: date });
          }
          if (habitId) {
            const existingHabit = await tx.select().from(habitCompletions)
              .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.completedDate, date)));
            if (existingHabit.length === 0) {
              await tx.insert(habitCompletions).values({ habitId, completedDate: date });
            }
          }
        } else {
          await tx.delete(routineActivityLogs)
            .where(and(eq(routineActivityLogs.activityId, activityId), eq(routineActivityLogs.completedDate, date)));
          if (habitId) {
            await tx.delete(habitCompletions)
              .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.completedDate, date)));
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
  async getAllTodos(): Promise<Todo[]> {
    return await db.select().from(todos).orderBy(desc(todos.createdAt));
  }

  async createTodo(todo: InsertTodo): Promise<Todo> {
    const result = await db.insert(todos).values(todo).returning();
    return result[0];
  }

  async updateTodo(id: string, todo: Partial<InsertTodo>): Promise<Todo | undefined> {
    const result = await db.update(todos).set(todo).where(eq(todos.id, id)).returning();
    return result[0];
  }

  async deleteTodo(id: string): Promise<boolean> {
    const result = await db.delete(todos).where(eq(todos.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
