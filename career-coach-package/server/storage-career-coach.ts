// ============================================
// CAREER COACH STORAGE METHODS
// Add these to your server/storage.ts file
// ============================================

// ============================================
// STEP 1: ADD IMPORTS (at top of storage.ts)
// ============================================
// Make sure you have these imports:
//
// import { eq, asc, desc } from "drizzle-orm";
// import {
//   careerCoachSnapshots,
//   careerVision,
//   type CareerCoachSnapshot,
//   type CareerVision,
//   type InsertCareerVision,
// } from "@shared/schema";

// ============================================
// STEP 2: ADD TO IStorage INTERFACE
// ============================================
// Find your IStorage interface and add these methods:

interface IStorage {
  // ... existing methods ...
  
  // Career Vision
  getVision(): Promise<CareerVision[]>;
  updateVision(items: InsertCareerVision[]): Promise<CareerVision[]>;
  
  // Career Coach Snapshots
  getLatestCoachSnapshot(): Promise<CareerCoachSnapshot | undefined>;
  upsertCoachSnapshot(payload: any): Promise<CareerCoachSnapshot>;
}

// ============================================
// STEP 3: ADD TO DatabaseStorage CLASS
// ============================================
// Find your DatabaseStorage class and add these method implementations:

class DatabaseStorage implements IStorage {
  // ... existing methods ...

  // ---- Career Vision ----
  async getVision(): Promise<CareerVision[]> {
    return await db.select().from(careerVision).orderBy(asc(careerVision.order));
  }

  async updateVision(items: InsertCareerVision[]): Promise<CareerVision[]> {
    try {
      return await db.transaction(async (tx) => {
        await tx.delete(careerVision);
        if (items.length === 0) return [];
        return await tx.insert(careerVision).values(items).returning();
      });
    } catch (error) {
      console.error("Error updating vision:", error);
      throw error;
    }
  }

  // ---- Career Coach Snapshots ----
  async getLatestCoachSnapshot(): Promise<CareerCoachSnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(careerCoachSnapshots)
      .orderBy(desc(careerCoachSnapshots.generatedAt))
      .limit(1);
    return snapshot;
  }

  async upsertCoachSnapshot(payload: any): Promise<CareerCoachSnapshot> {
    const existing = await this.getLatestCoachSnapshot();
    if (existing) {
      const [updated] = await db
        .update(careerCoachSnapshots)
        .set({ payload, generatedAt: new Date() })
        .where(eq(careerCoachSnapshots.id, existing.id))
        .returning();
      return updated;
    } else {
      const [snapshot] = await db
        .insert(careerCoachSnapshots)
        .values({
          payload,
          generatedAt: new Date(),
        })
        .returning();
      return snapshot;
    }
  }
}

// ============================================
// VERIFICATION CHECKLIST
// ============================================
// After adding the methods, verify:
// [ ] IStorage interface has all 4 methods
// [ ] DatabaseStorage class implements all 4 methods
// [ ] Imports include careerCoachSnapshots, careerVision from schema
// [ ] No TypeScript errors in storage.ts
