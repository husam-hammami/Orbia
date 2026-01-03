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
  systemMembers,
  trackerEntries,
  systemMessages,
  headspaceRooms,
  systemSettings,
  habits,
  habitCompletions
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
  getHabitCompletions(habitId: string): Promise<HabitCompletion[]>;
  addHabitCompletion(completion: InsertHabitCompletion): Promise<HabitCompletion>;
  removeHabitCompletion(habitId: string, date: string): Promise<boolean>;
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
}

export const storage = new DatabaseStorage();
