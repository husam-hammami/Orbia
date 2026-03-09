import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IChatStorage {
  getConversation(userId: string, id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(userId: string): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(userId: string, title: string): Promise<typeof conversations.$inferSelect>;
  deleteConversation(userId: string, id: number): Promise<void>;
  getMessagesByConversation(userId: string, conversationId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(userId: string, conversationId: number, role: string, content: string): Promise<typeof messages.$inferSelect>;
}

export const chatStorage: IChatStorage = {
  async getConversation(userId: string, id: number) {
    const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return conversation;
  },

  async getAllConversations(userId: string) {
    return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.createdAt));
  },

  async createConversation(userId: string, title: string) {
    const [conversation] = await db.insert(conversations).values({ userId, title }).returning();
    return conversation;
  },

  async deleteConversation(userId: string, id: number) {
    await db.delete(messages).where(and(eq(messages.conversationId, id), eq(messages.userId, userId)));
    await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  },

  async getMessagesByConversation(userId: string, conversationId: number) {
    return db.select().from(messages).where(and(eq(messages.conversationId, conversationId), eq(messages.userId, userId))).orderBy(messages.createdAt);
  },

  async createMessage(userId: string, conversationId: number, role: string, content: string) {
    const [message] = await db.insert(messages).values({ userId, conversationId, role, content }).returning();
    return message;
  },
};
