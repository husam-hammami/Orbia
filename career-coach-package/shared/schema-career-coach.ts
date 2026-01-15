// ============================================
// CAREER COACH DATABASE TABLES
// Add these to your shared/schema.ts file
// ============================================

import { pgTable, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Career Coach Snapshots (persisted AI coaching data)
export const careerCoachSnapshots = pgTable("career_coach_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// ============================================
// COACH DATA PAYLOAD STRUCTURE (TypeScript types)
// ============================================

export interface CoachNorthStarAnalysis {
  summary: string;
  gaps: string[];
  strengths: string[];
}

export interface CoachRoadmapPhase {
  phase: string;
  timeframe: string;
  goal: string;
  milestones: string[];
  weeklyFocus: string;
}

export interface CoachImmediateAction {
  title: string;
  why: string;
  timeEstimate: string;
  priority: "critical" | "high" | "medium";
}

export interface CoachLearningResource {
  title: string;
  type: "course" | "book" | "tutorial" | "practice";
  url: string;
  timeCommitment: string;
}

export interface CoachLearningPath {
  skill: string;
  importance: string;
  resources: CoachLearningResource[];
}

export interface CoachPayload {
  northStarAnalysis: CoachNorthStarAnalysis;
  roadmap: CoachRoadmapPhase[];
  immediateActions: CoachImmediateAction[];
  learningPath: CoachLearningPath[];
  weeklyTheme: string;
  coachingNote: string;
  vision?: any[];
}
