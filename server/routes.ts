import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { 
  insertTrackerEntrySchema, 
  insertHabitSchema,
  insertHabitCompletionSchema,
  insertRoutineBlockSchema,
  insertRoutineActivitySchema,
  insertRoutineActivityLogSchema,
  insertTodoSchema,
  insertDailySummarySchema,
  insertCareerProjectSchema,
  insertCareerTaskSchema,
  insertExpenseSchema,
  insertCareerVisionSchema,
  insertJournalEntrySchema,
  insertFoodOptionSchema,
  insertIncomeStreamSchema,
  insertTransactionSchema,
  insertLoanSchema,
  insertLoanPaymentSchema
} from "@shared/schema";
import { z } from "zod";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { parseTrackerNotes } from "./lib/parse-notes";
import { computeDashboardInsights, DashboardInsightsSchema } from "./lib/dashboard-analytics";
import { aiComplete, aiStream, MODEL_PRIMARY, MODEL_FAST, createRawStream, createRawCompletion, getAnthropicClient } from "./lib/ai-client";

// Simple in-memory cache for AI responses (cost optimization)
const aiCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedAI(key: string): string | null {
  const cached = aiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  aiCache.delete(key);
  return null;
}

function setCachedAI(key: string, data: string): void {
  aiCache.set(key, { data, timestamp: Date.now() });
}

const toggleRoutineSchema = z.object({
  activityId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  habitId: z.string().nullable().optional(),
  action: z.enum(["add", "remove"]),
});
import { fromError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Register AI integration routes
  registerChatRoutes(app);
  registerImageRoutes(app);
  
  // Tracker Entries Routes
  app.get("/api/tracker", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const entries = limit 
        ? await storage.getRecentTrackerEntries(userId, limit)
        : await storage.getAllTrackerEntries(userId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tracker entries" });
    }
  });

  app.get("/api/tracker/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const entry = await storage.getTrackerEntry(userId, req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Tracker entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tracker entry" });
    }
  });

  app.post("/api/tracker", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertTrackerEntrySchema.parse({ ...req.body, userId });
      const entry = await storage.createTrackerEntry(userId, validatedData);
      res.status(201).json(entry);

      // Background: extract memories from this tracker entry
      import("./lib/memory-graph").then(({ extractFromTracker, persistMemories }) => {
        const result = extractFromTracker(entry);
        if (result.entities.length > 0 || result.connections.length > 0) {
          persistMemories(userId, result, "tracker_entry", entry.id).catch((err) =>
            console.error("[MemoryGraph] Tracker extraction failed:", err)
          );
        }
      }).catch(() => {});
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.put("/api/tracker/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertTrackerEntrySchema.partial().parse(req.body);
      const entry = await storage.updateTrackerEntry(userId, req.params.id, validatedData);
      if (!entry) {
        return res.status(404).json({ error: "Tracker entry not found" });
      }
      res.json(entry);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/tracker/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteTrackerEntry(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tracker entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tracker entry" });
    }
  });

  // User Profile Routes
  app.get("/api/user/profile", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getUserProfile(userId);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/user/profile", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { displayName, bio } = req.body;
      const updates: { displayName?: string; bio?: string } = {};
      if (typeof displayName === "string") updates.displayName = displayName.trim().slice(0, 100);
      if (typeof bio === "string") updates.bio = bio.trim().slice(0, 500);
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const user = await storage.updateUserProfile(userId, updates);
      // Update session displayName if changed
      if (updates.displayName && req.session) {
        req.session.displayName = updates.displayName;
      }
      res.json({ displayName: user.displayName, bio: user.bio });
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/export", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [habits, habitCompletions, routineBlocks, routineActivities, 
             trackerEntries, journalEntries, todos, visionItems, 
             dailySummaries, expenses, transactions] = await Promise.all([
        storage.getAllHabits(userId),
        storage.getAllHabitCompletions(userId),
        storage.getAllRoutineBlocks(userId),
        storage.getAllRoutineActivities(userId),
        storage.getRecentTrackerEntries(userId, 10000),
        storage.getAllJournalEntries(userId),
        storage.getAllTodos(userId),
        storage.getVision(userId),
        storage.getAllDailySummaries(userId),
        storage.getAllExpenses(userId),
        storage.getAllTransactions(userId),
      ]);
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        data: {
          habits,
          habitCompletions,
          routineBlocks,
          routineActivities,
          trackerEntries,
          journalEntries,
          todos,
          visionItems,
          dailySummaries,
          expenses,
          transactions,
        }
      };
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=orbia-export-${new Date().toISOString().split('T')[0]}.json`);
      res.json(exportData);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Habits Routes
  app.get("/api/habits", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allHabits = await storage.getAllHabits(userId);
      res.json(allHabits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch habits" });
    }
  });

  app.get("/api/habit-completions", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allCompletions = await storage.getAllHabitCompletions(userId);
      res.json(allCompletions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch habit completions" });
    }
  });

  app.get("/api/habits/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const habit = await storage.getHabit(userId, req.params.id);
      if (!habit) {
        return res.status(404).json({ error: "Habit not found" });
      }
      res.json(habit);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch habit" });
    }
  });

  app.post("/api/habits", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertHabitSchema.parse({ ...req.body, userId });
      const habit = await storage.createHabit(userId, validatedData);
      res.status(201).json(habit);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/habits/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertHabitSchema.partial().parse(req.body);
      const habit = await storage.updateHabit(userId, req.params.id, validatedData);
      if (!habit) {
        return res.status(404).json({ error: "Habit not found" });
      }
      res.json(habit);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/habits/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteHabit(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Habit not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete habit" });
    }
  });

  // Habit Completions Routes
  app.get("/api/habits/:id/completions", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const completions = await storage.getHabitCompletions(userId, req.params.id);
      res.json(completions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch completions" });
    }
  });

  app.post("/api/habits/:id/completions", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertHabitCompletionSchema.parse({
        ...req.body,
        userId,
        habitId: req.params.id
      });
      const completion = await storage.addHabitCompletion(userId, validatedData);
      res.status(201).json(completion);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/habits/:id/completions/:date", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.removeHabitCompletion(userId, req.params.id, req.params.date);
      if (!success) {
        return res.status(404).json({ error: "Completion not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete completion" });
    }
  });

  // Smart Icon Generation Endpoint (keyword-based for speed and reliability)
  app.post("/api/generate-icon", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { title, category } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const text = title.toLowerCase();
      
      // Keyword-to-icon mapping
      const iconRules: [string[], string][] = [
        [["walk", "step", "footstep"], "Footprints"],
        [["run", "jog", "sprint"], "Footprints"],
        [["water", "drink", "hydrat"], "Droplets"],
        [["sleep", "bed", "rest", "nap"], "Bed"],
        [["journal", "diary", "write", "log"], "Notebook"],
        [["read", "book"], "BookOpen"],
        [["meditat", "mindful", "breath", "calm"], "Brain"],
        [["stretch", "yoga", "flex"], "PersonStanding"],
        [["swim", "pool"], "Waves"],
        [["gym", "workout", "exercise", "lift", "weight", "dumbbell"], "Dumbbell"],
        [["pill", "med", "vitamin", "supplement"], "Pill"],
        [["meal", "eat", "food", "lunch", "dinner", "breakfast"], "Utensils"],
        [["cook", "chef", "prepar"], "ChefHat"],
        [["coffee", "caffeine"], "Coffee"],
        [["work", "laptop", "computer", "coding"], "Laptop"],
        [["stop work", "quit work", "finish work"], "Clock"],
        [["money", "save", "budget", "finance"], "PiggyBank"],
        [["social", "friend", "call", "talk", "chat"], "MessageCircle"],
        [["music", "song", "listen"], "Music"],
        [["sun", "morning", "sunrise", "wake"], "Sunrise"],
        [["night", "evening", "moon"], "Moon"],
        [["house", "home", "outside", "leave"], "Home"],
        [["ground", "anchor", "center"], "Anchor"],
        [["no porn", "porn"], "ShieldCheck"],
        [["no smok", "quit smok", "cigarette"], "Cigarette"],
        [["no drink", "no alcohol", "sober"], "Wine"],
        [["bike", "cycl"], "Bike"],
        [["car", "driv"], "Car"],
        [["plant", "garden", "nature"], "Leaf"],
        [["clean", "tidy", "organiz"], "Sparkles"],
        [["shower", "bath", "hygien"], "Bath"],
        [["phone", "screen"], "Smartphone"],
        [["gratitude", "thank"], "Heart"],
        [["goal", "target"], "Target"],
      ];

      let icon = "Sparkles"; // default
      for (const [keywords, iconName] of iconRules) {
        if (keywords.some(kw => text.includes(kw))) {
          icon = iconName;
          break;
        }
      }

      // Category fallback if no keyword match
      if (icon === "Sparkles" && category) {
        const categoryIcons: Record<string, string> = {
          health: "Heart",
          work: "Laptop",
          mindfulness: "Brain",
          creativity: "Palette",
          social: "Users",
          finance: "PiggyBank",
          recovery: "Activity",
        };
        icon = categoryIcons[category.toLowerCase()] || "Sparkles";
      }
      
      res.json({ icon });
    } catch (error) {
      console.error("Icon generation error:", error);
      res.json({ icon: "Sparkles" });
    }
  });

  // Regenerate icons for all habits that don't have one (keyword-based)
  app.post("/api/regenerate-all-icons", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allHabits = await storage.getAllHabits(userId);
      const habitsWithoutIcons = allHabits.filter(h => !h.icon);
      
      // Same keyword-to-icon mapping as generate-icon endpoint
      const iconRules: [string[], string][] = [
        [["walk", "step", "footstep"], "Footprints"],
        [["run", "jog", "sprint"], "Footprints"],
        [["water", "drink", "hydrat"], "Droplets"],
        [["sleep", "bed", "rest", "nap"], "Bed"],
        [["journal", "diary", "write", "log"], "Notebook"],
        [["read", "book"], "BookOpen"],
        [["meditat", "mindful", "breath", "calm"], "Brain"],
        [["stretch", "yoga", "flex"], "PersonStanding"],
        [["swim", "pool"], "Waves"],
        [["gym", "workout", "exercise", "lift", "weight", "dumbbell"], "Dumbbell"],
        [["pill", "med", "vitamin", "supplement"], "Pill"],
        [["meal", "eat", "food", "lunch", "dinner", "breakfast"], "Utensils"],
        [["cook", "chef", "prepar"], "ChefHat"],
        [["coffee", "caffeine"], "Coffee"],
        [["work", "laptop", "computer", "coding"], "Laptop"],
        [["stop work", "quit work", "finish work"], "Clock"],
        [["money", "save", "budget", "finance"], "PiggyBank"],
        [["social", "friend", "call", "talk", "chat"], "MessageCircle"],
        [["music", "song", "listen"], "Music"],
        [["sun", "morning", "sunrise", "wake"], "Sunrise"],
        [["night", "evening", "moon"], "Moon"],
        [["house", "home", "outside", "leave"], "Home"],
        [["ground", "anchor", "center"], "Anchor"],
        [["no porn", "porn"], "ShieldCheck"],
        [["no smok", "quit smok", "cigarette"], "Cigarette"],
        [["no drink", "no alcohol", "sober"], "Wine"],
        [["bike", "cycl"], "Bike"],
        [["car", "driv"], "Car"],
        [["plant", "garden", "nature"], "Leaf"],
        [["clean", "tidy", "organiz"], "Sparkles"],
        [["shower", "bath", "hygien"], "Bath"],
        [["phone", "screen"], "Smartphone"],
        [["gratitude", "thank"], "Heart"],
        [["goal", "target"], "Target"],
      ];

      const categoryIcons: Record<string, string> = {
        health: "Heart",
        work: "Laptop",
        mindfulness: "Brain",
        creativity: "Palette",
        social: "Users",
        finance: "PiggyBank",
        recovery: "Activity",
      };

      const results = [];
      for (const habit of habitsWithoutIcons) {
        const text = habit.title.toLowerCase();
        let icon = "Sparkles";
        
        for (const [keywords, iconName] of iconRules) {
          if (keywords.some(kw => text.includes(kw))) {
            icon = iconName;
            break;
          }
        }

        // Category fallback
        if (icon === "Sparkles" && habit.category) {
          icon = categoryIcons[habit.category.toLowerCase()] || "Sparkles";
        }
        
        await storage.updateHabit(userId, habit.id, { icon });
        results.push({ id: habit.id, title: habit.title, icon });
      }

      res.json({ updated: results.length, habits: results });
    } catch (error) {
      console.error("Regenerate icons error:", error);
      res.status(500).json({ error: "Failed to regenerate icons" });
    }
  });

  // Routine Templates Routes
  app.get("/api/routine-templates", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const templates = await storage.getAllRoutineTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routine templates" });
    }
  });

  app.get("/api/routine-templates/default", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const template = await storage.getDefaultRoutineTemplate(userId);
      res.json(template || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch default template" });
    }
  });

  app.get("/api/routine-templates/active", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      
      const templates = await storage.getAllRoutineTemplates(userId);
      
      const matchByDays = templates.filter(t => t.activeDays && t.activeDays.includes(dayOfWeek));
      let active = matchByDays.find(t => t.isDefault === 1) || matchByDays[0];
      
      if (!active) {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayType = isWeekend ? "weekend" : "weekday";
        const matchByType = templates.filter(t => t.dayType === dayType);
        active = matchByType.find(t => t.isDefault === 1) || matchByType[0];
      }
      if (!active) {
        active = templates.find(t => t.isDefault === 1);
      }
      if (!active && templates.length > 0) {
        active = templates[0];
      }
      
      res.json(active || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active template" });
    }
  });

  function getEffectiveDays(t: { activeDays: number[] | null; dayType: string }): number[] {
    if (t.activeDays && t.activeDays.length > 0) return t.activeDays;
    if (t.dayType === "weekend") return [0, 6];
    if (t.dayType === "any") return [0, 1, 2, 3, 4, 5, 6];
    return [1, 2, 3, 4, 5];
  }

  function checkDayConflicts(incomingDays: number[], existing: Array<{ id: string; name: string; activeDays: number[] | null; dayType: string }>, excludeId?: string): string | null {
    for (const t of existing) {
      if (t.id === excludeId) continue;
      const tDays = getEffectiveDays(t);
      const conflict = incomingDays.filter(d => tDays.includes(d));
      if (conflict.length > 0) {
        return `Day conflict with template "${t.name}"`;
      }
    }
    return null;
  }

  app.post("/api/routine-templates", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const incomingDays = getEffectiveDays({ activeDays: req.body.activeDays || null, dayType: req.body.dayType || "weekday" });
      const existing = await storage.getAllRoutineTemplates(userId);
      const conflictMsg = checkDayConflicts(incomingDays, existing);
      if (conflictMsg) {
        return res.status(400).json({ error: conflictMsg });
      }
      const template = await storage.createRoutineTemplate(userId, req.body);
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create routine template" });
    }
  });

  app.patch("/api/routine-templates/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const currentTemplate = (await storage.getAllRoutineTemplates(userId)).find(t => t.id === req.params.id);
      if (!currentTemplate) {
        return res.status(404).json({ error: "Template not found" });
      }
      const mergedDays = req.body.activeDays !== undefined ? req.body.activeDays : currentTemplate.activeDays;
      const mergedDayType = req.body.dayType !== undefined ? req.body.dayType : currentTemplate.dayType;
      const incomingDays = getEffectiveDays({ activeDays: mergedDays, dayType: mergedDayType });
      const existing = await storage.getAllRoutineTemplates(userId);
      const conflictMsg = checkDayConflicts(incomingDays, existing, req.params.id);
      if (conflictMsg) {
        return res.status(400).json({ error: conflictMsg });
      }
      const template = await storage.updateRoutineTemplate(userId, req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update routine template" });
    }
  });

  app.post("/api/routine-templates/:id/set-default", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const template = await storage.setDefaultRoutineTemplate(userId, req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to set default template" });
    }
  });

  app.delete("/api/routine-templates/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteRoutineTemplate(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete routine template" });
    }
  });

  // Routine Blocks Routes
  app.get("/api/routine-blocks", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const templateId = req.query.templateId as string | undefined;
      const blocks = templateId 
        ? await storage.getRoutineBlocksByTemplate(userId, templateId)
        : await storage.getAllRoutineBlocks(userId);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routine blocks" });
    }
  });

  app.post("/api/routine-blocks", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertRoutineBlockSchema.parse({ ...req.body, userId });
      const block = await storage.createRoutineBlock(userId, validatedData);
      res.status(201).json(block);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/routine-blocks/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertRoutineBlockSchema.partial().parse(req.body);
      const block = await storage.updateRoutineBlock(userId, req.params.id, validatedData);
      if (!block) {
        return res.status(404).json({ error: "Routine block not found" });
      }
      res.json(block);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/routine-blocks/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteRoutineBlock(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Routine block not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete routine block" });
    }
  });

  // Routine Activities Routes
  app.get("/api/routine-activities", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const activities = await storage.getAllRoutineActivities(userId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routine activities" });
    }
  });

  app.get("/api/routine-blocks/:id/activities", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const activities = await storage.getActivitiesByBlock(userId, req.params.id);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/routine-activities", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertRoutineActivitySchema.parse({ ...req.body, userId });
      const activity = await storage.createRoutineActivity(userId, validatedData);
      res.status(201).json(activity);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/routine-activities/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertRoutineActivitySchema.partial().parse(req.body);
      const activity = await storage.updateRoutineActivity(userId, req.params.id, validatedData);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/routine-activities/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteRoutineActivity(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete activity" });
    }
  });

  // Routine Activity Logs Routes
  app.get("/api/routine-logs/:date", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const logs = await storage.getActivityLogsForDate(userId, req.params.date);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routine logs" });
    }
  });

  app.post("/api/routine-logs", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertRoutineActivityLogSchema.parse({ ...req.body, userId });
      const log = await storage.addActivityLog(userId, validatedData);
      res.status(201).json(log);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/routine-logs/:activityId/:date", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.removeActivityLog(userId, req.params.activityId, req.params.date);
      if (!success) {
        return res.status(404).json({ error: "Log not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete routine log" });
    }
  });

  // Atomic routine + habit toggle endpoint
  app.post("/api/routine-toggle", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = toggleRoutineSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const { activityId, date, habitId, action } = parsed.data;
      const result = await storage.toggleRoutineActivityWithHabit(userId, activityId, date, habitId || null, action);
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ error: "Failed to toggle activity" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle routine activity" });
    }
  });

  // AI Insights endpoint - analyzes linked data from habits, mood, and routines
  app.get("/api/insights", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const days = parseInt(req.query.days as string) || 14;
      
      // Fetch all linked data for analysis
      const [entries, habits, completions, routineBlocks, routineActivities, routineLogs, dailySummaries, journalEntries] = await Promise.all([
        storage.getAllTrackerEntries(userId),
        storage.getAllHabits(userId),
        storage.getAllHabitCompletions(userId),
        storage.getAllRoutineBlocks(userId),
        storage.getAllRoutineActivities(userId),
        storage.getAllRoutineLogs(userId),
        storage.getAllDailySummaries(userId),
        storage.getAllJournalEntries(userId)
      ]);
      
      // Filter to recent data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoffDate);
      const recentCompletions = completions.filter(c => new Date(c.completedDate) >= cutoffDate);
      const recentRoutineLogs = routineLogs.filter(l => new Date(l.completedDate) >= cutoffDate);
      const recentJournalEntries = journalEntries.filter(j => new Date(j.createdAt) >= cutoffDate);
      
      // Parse all entries once and cache results for efficiency
      const parsedEntries = recentEntries.map(e => ({
        entry: e,
        parsed: parseTrackerNotes(e.notes),
      }));
      
      // Build habit lookup for routine linkage
      const habitById = new Map(habits.map(h => [h.id, h]));
      const habitCompletionsByHabit = new Map<string, typeof recentCompletions>();
      habits.forEach(h => {
        habitCompletionsByHabit.set(h.id, recentCompletions.filter(c => c.habitId === h.id));
      });
      
      // Pre-compute correlation statistics for more meaningful insights
      const computeCorrelations = () => {
        const dateToEntry = new Map(parsedEntries.map(pe => [
          new Date(pe.entry.timestamp).toISOString().split('T')[0],
          pe
        ]));
        
        // Habit-mood correlations
        const habitCorrelations = habits.map(h => {
          const completionDates = new Set(
            (habitCompletionsByHabit.get(h.id) || []).map(c => c.completedDate)
          );
          
          let moodWithHabit = 0, moodWithoutHabit = 0;
          let stressWithHabit = 0, stressWithoutHabit = 0;
          let energyWithHabit = 0, energyWithoutHabit = 0;
          let daysWithHabit = 0, daysWithoutHabit = 0;
          
          parsedEntries.forEach(({ entry }) => {
            const date = new Date(entry.timestamp).toISOString().split('T')[0];
            if (completionDates.has(date)) {
              moodWithHabit += entry.mood || 5;
              stressWithHabit += entry.stress || 0;
              energyWithHabit += entry.energy || 5;
              daysWithHabit++;
            } else {
              moodWithoutHabit += entry.mood || 5;
              stressWithoutHabit += entry.stress || 0;
              energyWithoutHabit += entry.energy || 5;
              daysWithoutHabit++;
            }
          });
          
          return {
            habitName: h.title,
            category: h.category,
            completionRate: parsedEntries.length > 0 
              ? Math.round((completionDates.size / days) * 100) 
              : 0,
            daysCompleted: completionDates.size,
            avgMoodWithHabit: daysWithHabit > 0 ? (moodWithHabit / daysWithHabit).toFixed(1) : null,
            avgMoodWithoutHabit: daysWithoutHabit > 0 ? (moodWithoutHabit / daysWithoutHabit).toFixed(1) : null,
            avgStressWithHabit: daysWithHabit > 0 ? Math.round(stressWithHabit / daysWithHabit) : null,
            avgStressWithoutHabit: daysWithoutHabit > 0 ? Math.round(stressWithoutHabit / daysWithoutHabit) : null,
            avgEnergyWithHabit: daysWithHabit > 0 ? (energyWithHabit / daysWithHabit).toFixed(1) : null,
            avgEnergyWithoutHabit: daysWithoutHabit > 0 ? (energyWithoutHabit / daysWithoutHabit).toFixed(1) : null,
          };
        }).filter(c => c.daysCompleted > 0);
        
        // Sleep-mood correlations
        const sleepCorrelations = (() => {
          const entriesWithSleep = parsedEntries.filter(pe => pe.parsed.normalizedMetrics.sleepHours !== null);
          if (entriesWithSleep.length < 2) return null;
          
          const lowSleep = entriesWithSleep.filter(pe => (pe.parsed.normalizedMetrics.sleepHours || 0) < 6);
          const goodSleep = entriesWithSleep.filter(pe => (pe.parsed.normalizedMetrics.sleepHours || 0) >= 7);
          
          return {
            entriesWithSleepData: entriesWithSleep.length,
            avgSleepHours: (entriesWithSleep.reduce((sum, pe) => sum + (pe.parsed.normalizedMetrics.sleepHours || 0), 0) / entriesWithSleep.length).toFixed(1),
            lowSleepDays: lowSleep.length,
            goodSleepDays: goodSleep.length,
            avgMoodLowSleep: lowSleep.length > 0 ? (lowSleep.reduce((sum, pe) => sum + (pe.entry.mood || 5), 0) / lowSleep.length).toFixed(1) : null,
            avgMoodGoodSleep: goodSleep.length > 0 ? (goodSleep.reduce((sum, pe) => sum + (pe.entry.mood || 5), 0) / goodSleep.length).toFixed(1) : null,
          };
        })();
        
        // Routine block adherence
        const routineAdherence = routineBlocks.map(block => {
          const blockActivities = routineActivities.filter(a => a.blockId === block.id);
          const totalPossible = blockActivities.length * days;
          const completed = blockActivities.reduce((sum, a) => {
            return sum + recentRoutineLogs.filter(l => l.activityId === a.id).length;
          }, 0);
          
          return {
            blockName: block.name,
            purpose: block.purpose,
            activityCount: blockActivities.length,
            completionRate: totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0,
            totalCompleted: completed,
          };
        });
        
        // Overall trends
        const overallMetrics = {
          avgMood: parsedEntries.length > 0 ? (parsedEntries.reduce((sum, pe) => sum + (pe.entry.mood || 5), 0) / parsedEntries.length).toFixed(1) : null,
          avgStress: parsedEntries.length > 0 ? Math.round(parsedEntries.reduce((sum, pe) => sum + (pe.entry.stress || 0), 0) / parsedEntries.length) : null,
          avgEnergy: parsedEntries.length > 0 ? (parsedEntries.reduce((sum, pe) => sum + (pe.entry.energy || 5), 0) / parsedEntries.length).toFixed(1) : null,
          totalHabitCompletions: recentCompletions.length,
          totalRoutineCompletions: recentRoutineLogs.length,
        };
        
        // === HIGH CONFIDENCE MULTI-FACTOR CORRELATIONS ===
        
        // Helper: Calculate confidence level based on sample size
        const getConfidence = (n: number): { level: 'high' | 'moderate' | 'low' | 'insufficient', minSamples: number } => {
          if (n >= 7) return { level: 'high', minSamples: n };
          if (n >= 4) return { level: 'moderate', minSamples: n };
          if (n >= 2) return { level: 'low', minSamples: n };
          return { level: 'insufficient', minSamples: n };
        };
        
        // Helper: Calculate effect size (Cohen's d approximation)
        const calcEffectSize = (mean1: number, mean2: number, pooledStd: number = 2): number => {
          if (pooledStd === 0) return 0;
          return Math.abs(mean1 - mean2) / pooledStd;
        };
        
        // 1. ROUTINE-MOOD DIRECT CORRELATION
        // Compare mood on days with high routine completion vs low completion
        const routineMoodCorrelation = (() => {
          if (parsedEntries.length < 3) return null;
          
          const dateRoutineCompletion = new Map<string, { completed: number; total: number }>();
          
          // Calculate routine completion per day
          routineBlocks.forEach(block => {
            const blockActivities = routineActivities.filter(a => a.blockId === block.id);
            blockActivities.forEach(activity => {
              recentRoutineLogs
                .filter(l => l.activityId === activity.id)
                .forEach(log => {
                  const existing = dateRoutineCompletion.get(log.completedDate) || { completed: 0, total: 0 };
                  existing.completed++;
                  dateRoutineCompletion.set(log.completedDate, existing);
                });
            });
          });
          
          // Count total activities per day
          const totalActivitiesPerDay = routineActivities.length;
          
          // Categorize days by routine completion percentage
          const highRoutineDays: typeof parsedEntries = [];
          const lowRoutineDays: typeof parsedEntries = [];
          
          parsedEntries.forEach(pe => {
            const date = new Date(pe.entry.timestamp).toISOString().split('T')[0];
            const dayCompletion = dateRoutineCompletion.get(date);
            const completionRate = dayCompletion && totalActivitiesPerDay > 0 
              ? (dayCompletion.completed / totalActivitiesPerDay) * 100 
              : 0;
            
            if (completionRate >= 60) highRoutineDays.push(pe);
            else if (completionRate <= 30) lowRoutineDays.push(pe);
          });
          
          if (highRoutineDays.length < 2 || lowRoutineDays.length < 2) return null;
          
          const avgMoodHighRoutine = highRoutineDays.reduce((s, pe) => s + (pe.entry.mood || 5), 0) / highRoutineDays.length;
          const avgMoodLowRoutine = lowRoutineDays.reduce((s, pe) => s + (pe.entry.mood || 5), 0) / lowRoutineDays.length;
          const avgStressHighRoutine = highRoutineDays.reduce((s, pe) => s + (pe.entry.stress || 0), 0) / highRoutineDays.length;
          const avgStressLowRoutine = lowRoutineDays.reduce((s, pe) => s + (pe.entry.stress || 0), 0) / lowRoutineDays.length;
          const moodDiff = avgMoodHighRoutine - avgMoodLowRoutine;
          const stressDiff = avgStressLowRoutine - avgStressHighRoutine;
          
          return {
            highRoutineDays: highRoutineDays.length,
            lowRoutineDays: lowRoutineDays.length,
            avgMoodHighRoutine: avgMoodHighRoutine.toFixed(1),
            avgMoodLowRoutine: avgMoodLowRoutine.toFixed(1),
            moodImprovement: moodDiff.toFixed(1),
            moodImprovementPercent: avgMoodLowRoutine > 0 ? Math.round((moodDiff / avgMoodLowRoutine) * 100) : 0,
            avgStressHighRoutine: Math.round(avgStressHighRoutine),
            avgStressLowRoutine: Math.round(avgStressLowRoutine),
            stressReduction: Math.round(stressDiff),
            confidence: getConfidence(Math.min(highRoutineDays.length, lowRoutineDays.length)),
            effectSize: calcEffectSize(avgMoodHighRoutine, avgMoodLowRoutine) > 0.5 ? 'strong' : calcEffectSize(avgMoodHighRoutine, avgMoodLowRoutine) > 0.2 ? 'moderate' : 'weak',
          };
        })();
        
        // 2. COMBINED HABIT + ROUTINE SYNERGY
        // Find habits that, when combined with routine completion, have the biggest mood impact
        const habitRoutineSynergy = habits.map(h => {
          const habitCompletionDates = new Set(
            (habitCompletionsByHabit.get(h.id) || []).map(c => c.completedDate)
          );
          
          const dateRoutineRate = new Map<string, number>();
          parsedEntries.forEach(pe => {
            const date = new Date(pe.entry.timestamp).toISOString().split('T')[0];
            const totalActivities = routineActivities.length;
            if (totalActivities === 0) {
              dateRoutineRate.set(date, 0);
              return;
            }
            const dayLogs = recentRoutineLogs.filter(l => l.completedDate === date);
            dateRoutineRate.set(date, (dayLogs.length / totalActivities) * 100);
          });
          
          // Four categories: habit+routine, habit only, routine only, neither
          const habitAndRoutine: typeof parsedEntries = [];
          const habitOnly: typeof parsedEntries = [];
          const routineOnly: typeof parsedEntries = [];
          const neither: typeof parsedEntries = [];
          
          parsedEntries.forEach(pe => {
            const date = new Date(pe.entry.timestamp).toISOString().split('T')[0];
            const hasHabit = habitCompletionDates.has(date);
            const hasRoutine = (dateRoutineRate.get(date) || 0) >= 50;
            
            if (hasHabit && hasRoutine) habitAndRoutine.push(pe);
            else if (hasHabit) habitOnly.push(pe);
            else if (hasRoutine) routineOnly.push(pe);
            else neither.push(pe);
          });
          
          // Need sufficient data for meaningful comparison
          const minSamples = Math.min(habitAndRoutine.length, neither.length);
          if (minSamples < 2) return null;
          
          const avgMoodBoth = habitAndRoutine.length > 0 
            ? habitAndRoutine.reduce((s, pe) => s + (pe.entry.mood || 5), 0) / habitAndRoutine.length 
            : null;
          const avgMoodNeither = neither.length > 0 
            ? neither.reduce((s, pe) => s + (pe.entry.mood || 5), 0) / neither.length 
            : null;
          const avgMoodHabitOnly = habitOnly.length > 0 
            ? habitOnly.reduce((s, pe) => s + (pe.entry.mood || 5), 0) / habitOnly.length 
            : null;
          const avgMoodRoutineOnly = routineOnly.length > 0 
            ? routineOnly.reduce((s, pe) => s + (pe.entry.mood || 5), 0) / routineOnly.length 
            : null;
          
          // Calculate synergy: is doing both better than expected?
          const synergyBonus = avgMoodBoth !== null && avgMoodNeither !== null
            ? avgMoodBoth - avgMoodNeither
            : null;
          
          return {
            habitName: h.title,
            category: h.category,
            daysBothCompleted: habitAndRoutine.length,
            daysHabitOnly: habitOnly.length,
            daysRoutineOnly: routineOnly.length,
            daysNeither: neither.length,
            avgMoodBoth: avgMoodBoth?.toFixed(1) || null,
            avgMoodHabitOnly: avgMoodHabitOnly?.toFixed(1) || null,
            avgMoodRoutineOnly: avgMoodRoutineOnly?.toFixed(1) || null,
            avgMoodNeither: avgMoodNeither?.toFixed(1) || null,
            synergyBonus: synergyBonus?.toFixed(1) || null,
            confidence: getConfidence(minSamples),
          };
        }).filter(s => s !== null && s.confidence.level !== 'insufficient');
        
        // 3. HIGH-CONFIDENCE HABIT INSIGHTS (filter to only statistically meaningful)
        const highConfidenceHabits = habitCorrelations
          .map(h => {
            const moodWith = parseFloat(h.avgMoodWithHabit || '0');
            const moodWithout = parseFloat(h.avgMoodWithoutHabit || '0');
            const moodDiff = moodWith - moodWithout;
            const stressDiff = (h.avgStressWithoutHabit || 0) - (h.avgStressWithHabit || 0);
            const minSamples = Math.min(h.daysCompleted, parsedEntries.length - h.daysCompleted);
            const confidence = getConfidence(minSamples);
            
            // Only include if confidence is at least moderate
            if (confidence.level === 'insufficient' || confidence.level === 'low') return null;
            
            const effectSize = calcEffectSize(moodWith, moodWithout);
            
            return {
              ...h,
              moodDifference: moodDiff.toFixed(1),
              moodDifferencePercent: moodWithout > 0 ? Math.round((moodDiff / moodWithout) * 100) : 0,
              stressReduction: stressDiff,
              stressReductionPercent: (h.avgStressWithoutHabit || 0) > 0 ? Math.round((stressDiff / (h.avgStressWithoutHabit || 1)) * 100) : 0,
              confidence,
              effectSize: effectSize > 0.5 ? 'strong' : effectSize > 0.2 ? 'moderate' : 'weak',
              impactDirection: moodDiff > 0.3 ? 'positive' : moodDiff < -0.3 ? 'negative' : 'neutral',
            };
          })
          .filter(h => h !== null)
          .sort((a, b) => parseFloat(b!.moodDifference) - parseFloat(a!.moodDifference));
        
        // 4. SLEEP-HABIT-MOOD TRIPLE CORRELATION
        // Does sleep quality affect how much habits impact mood?
        const sleepHabitInteraction = (() => {
          const entriesWithSleep = parsedEntries.filter(pe => pe.parsed.normalizedMetrics.sleepHours !== null);
          if (entriesWithSleep.length < 4) return null;
          
          // Find the most impactful habit
          const topHabit = highConfidenceHabits[0];
          if (!topHabit) return null;
          
          const topHabitDates = new Set(
            (habitCompletionsByHabit.get(habits.find(h => h.title === topHabit.habitName)?.id || '') || []).map(c => c.completedDate)
          );
          
          // Categorize: good sleep + habit, good sleep no habit, bad sleep + habit, bad sleep no habit
          const goodSleepWithHabit: typeof entriesWithSleep = [];
          const goodSleepNoHabit: typeof entriesWithSleep = [];
          const badSleepWithHabit: typeof entriesWithSleep = [];
          const badSleepNoHabit: typeof entriesWithSleep = [];
          
          entriesWithSleep.forEach(pe => {
            const date = new Date(pe.entry.timestamp).toISOString().split('T')[0];
            const hasHabit = topHabitDates.has(date);
            const goodSleep = (pe.parsed.normalizedMetrics.sleepHours || 0) >= 7;
            
            if (goodSleep && hasHabit) goodSleepWithHabit.push(pe);
            else if (goodSleep) goodSleepNoHabit.push(pe);
            else if (hasHabit) badSleepWithHabit.push(pe);
            else badSleepNoHabit.push(pe);
          });
          
          const avgMood = (arr: typeof entriesWithSleep) => 
            arr.length > 0 ? arr.reduce((s, pe) => s + (pe.entry.mood || 5), 0) / arr.length : null;
          
          return {
            habitName: topHabit.habitName,
            goodSleepWithHabitMood: avgMood(goodSleepWithHabit)?.toFixed(1) || null,
            goodSleepNoHabitMood: avgMood(goodSleepNoHabit)?.toFixed(1) || null,
            badSleepWithHabitMood: avgMood(badSleepWithHabit)?.toFixed(1) || null,
            badSleepNoHabitMood: avgMood(badSleepNoHabit)?.toFixed(1) || null,
            goodSleepWithHabitCount: goodSleepWithHabit.length,
            goodSleepNoHabitCount: goodSleepNoHabit.length,
            badSleepWithHabitCount: badSleepWithHabit.length,
            badSleepNoHabitCount: badSleepNoHabit.length,
            confidence: getConfidence(Math.min(
              goodSleepWithHabit.length, goodSleepNoHabit.length,
              badSleepWithHabit.length, badSleepNoHabit.length
            )),
          };
        })();
        
        // 5. BEST & WORST DAYS PATTERN ANALYSIS
        // What combinations lead to best/worst days?
        const bestWorstDaysAnalysis = (() => {
          if (parsedEntries.length < 5) return null;
          
          const sorted = [...parsedEntries].sort((a, b) => (b.entry.mood || 5) - (a.entry.mood || 5));
          const bestDays = sorted.slice(0, Math.max(2, Math.floor(sorted.length * 0.2)));
          const worstDays = sorted.slice(-Math.max(2, Math.floor(sorted.length * 0.2)));
          
          // Analyze patterns on best days
          const analyzePatterns = (daysArr: typeof parsedEntries) => {
            const avgSleep = daysArr.filter(pe => pe.parsed.normalizedMetrics.sleepHours !== null)
              .reduce((s, pe) => s + (pe.parsed.normalizedMetrics.sleepHours || 0), 0) / 
              Math.max(1, daysArr.filter(pe => pe.parsed.normalizedMetrics.sleepHours !== null).length);
            
            const habitCounts = new Map<string, number>();
            daysArr.forEach(pe => {
              const date = new Date(pe.entry.timestamp).toISOString().split('T')[0];
              habits.forEach(h => {
                const completions = habitCompletionsByHabit.get(h.id) || [];
                if (completions.some(c => c.completedDate === date)) {
                  habitCounts.set(h.title, (habitCounts.get(h.title) || 0) + 1);
                }
              });
            });
            
            const routineCompletionRate = (() => {
              if (routineActivities.length === 0) return 0;
              let totalCompleted = 0;
              daysArr.forEach(pe => {
                const date = new Date(pe.entry.timestamp).toISOString().split('T')[0];
                totalCompleted += recentRoutineLogs.filter(l => l.completedDate === date).length;
              });
              return Math.round((totalCompleted / (routineActivities.length * daysArr.length)) * 100);
            })();
            
            return {
              avgSleep: avgSleep.toFixed(1),
              topHabits: Array.from(habitCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, count]) => ({ name, frequency: Math.round((count / daysArr.length) * 100) })),
              routineCompletionRate,
            };
          };
          
          return {
            bestDaysCount: bestDays.length,
            worstDaysCount: worstDays.length,
            avgMoodBestDays: (bestDays.reduce((s, pe) => s + (pe.entry.mood || 5), 0) / bestDays.length).toFixed(1),
            avgMoodWorstDays: (worstDays.reduce((s, pe) => s + (pe.entry.mood || 5), 0) / worstDays.length).toFixed(1),
            bestDaysPatterns: analyzePatterns(bestDays),
            worstDaysPatterns: analyzePatterns(worstDays),
            confidence: getConfidence(Math.min(bestDays.length, worstDays.length)),
          };
        })();
        
        return { 
          habitCorrelations, 
          sleepCorrelations, 
          routineAdherence, 
          overallMetrics,
          // High-confidence multi-factor insights
          highConfidence: {
            routineMoodCorrelation,
            habitRoutineSynergy: habitRoutineSynergy.slice(0, 5),
            highConfidenceHabits: highConfidenceHabits.slice(0, 5),
            sleepHabitInteraction,
            bestWorstDaysAnalysis,
          }
        };
      };
      
      const correlations = computeCorrelations();
      
      // Build comprehensive context for AI analysis including all parsed tracker data
      const context = {
        moodEntries: parsedEntries.map(({ entry: e, parsed }) => ({
          date: e.timestamp,
          mood: { value: e.mood, scale: "1-10" },
          energy: { value: e.energy, scale: "1-10" },
          stress: { value: e.stress, scale: "0-100" },
          capacity: e.capacity !== null ? { value: e.capacity, scale: "0-5", description: "How much can they handle right now (not mood or energy)" } : null,
          triggerTag: e.triggerTag || null,
          workLoad: e.workLoad !== null ? { value: e.workLoad, scale: "0-10", description: "How hostile/draining was work (0=no work, 5=difficult, 10=toxic)" } : null,
          workTag: e.workTag || null,
          timeOfDay: e.timeOfDay || null,
          journalText: parsed.text,
          tags: parsed.tags,
          stressTriggers: parsed.triggers,
          meals: parsed.meals,
          sleepHours: parsed.normalizedMetrics.sleepHours,
          painLevel: parsed.normalizedMetrics.painLevel !== null 
            ? { value: parsed.normalizedMetrics.painLevel, scale: "0-10" } 
            : null,
          comfortScore: parsed.normalizedMetrics.comfortScore !== null
            ? { value: parsed.normalizedMetrics.comfortScore, scale: "1-10" }
            : null,
          communicationScore: parsed.normalizedMetrics.communicationScore !== null
            ? { value: parsed.normalizedMetrics.communicationScore, scale: "1-10" }
            : null,
          urgesLevel: parsed.normalizedMetrics.urgesLevel !== null
            ? { value: parsed.normalizedMetrics.urgesLevel, scale: "0-10" }
            : null,
          rawMetrics: parsed.rawMetrics
        })),
        dailySummaries: dailySummaries.filter(s => new Date(s.date) >= cutoffDate).map(s => ({
          date: s.date,
          feeling: s.feeling,
        })),
        habitData: habits.map(h => {
          const hCompletions = habitCompletionsByHabit.get(h.id) || [];
          return {
            id: h.id,
            name: h.title,
            description: h.description,
            category: h.category,
            color: h.color,
            target: h.target,
            unit: h.unit,
            frequency: h.frequency,
            currentStreak: h.streak,
            completionCount: hCompletions.length,
            completionDates: hCompletions.map(c => c.completedDate)
          };
        }),
        routineData: routineBlocks.map(b => ({
          block: b.name,
          startTime: b.startTime,
          endTime: b.endTime,
          purpose: b.purpose,
          activities: routineActivities
            .filter(a => a.blockId === b.id)
            .map(a => {
              const activityLogs = recentRoutineLogs.filter(l => l.activityId === a.id);
              const linkedHabit = a.habitId ? habitById.get(a.habitId) : null;
              const linkedHabitCompletions = a.habitId ? habitCompletionsByHabit.get(a.habitId) : null;
              return {
                name: a.name,
                description: a.description,
                linkedHabitId: a.habitId,
                linkedHabitName: linkedHabit?.title || null,
                linkedHabitTarget: linkedHabit?.target || null,
                linkedHabitCompletionDates: linkedHabitCompletions?.map(c => c.completedDate) || [],
                completionCount: activityLogs.length,
                completionDates: activityLogs.map(l => l.completedDate)
              };
            })
        })),
        journalEntries: recentJournalEntries.map(j => ({
          id: j.id,
          date: j.createdAt,
          mood: j.mood,
          energy: j.energy,
          timeOfDay: j.timeOfDay,
          isPrivate: j.isPrivate,
          primaryDriver: j.primaryDriver,
          secondaryDriver: j.secondaryDriver,
          contentPreview: j.content.length > 300 ? j.content.slice(0, 300) + "..." : j.content
        })),
        journalAnalytics: (() => {
          const driverFrequency = recentJournalEntries.reduce((acc, j) => {
            if (j.primaryDriver) acc[j.primaryDriver] = (acc[j.primaryDriver] || 0) + 1;
            if (j.secondaryDriver) acc[j.secondaryDriver] = (acc[j.secondaryDriver] || 0) + 0.5;
            return acc;
          }, {} as Record<string, number>);
          
          const withMood = recentJournalEntries.filter(j => j.mood !== null);
          const withEnergy = recentJournalEntries.filter(j => j.energy !== null);
          
          return {
            totalEntries: recentJournalEntries.length,
            driverFrequency: Object.entries(driverFrequency).sort((a, b) => b[1] - a[1]).slice(0, 5),
            avgMood: withMood.length > 0 ? (withMood.reduce((s, j) => s + (j.mood || 0), 0) / withMood.length).toFixed(1) : null,
            avgEnergy: withEnergy.length > 0 ? (withEnergy.reduce((s, j) => s + (j.energy || 0), 0) / withEnergy.length).toFixed(1) : null,
            entriesByTimeOfDay: recentJournalEntries.reduce((acc, j) => {
              if (j.timeOfDay) acc[j.timeOfDay] = (acc[j.timeOfDay] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          };
        })(),
        dataQualitySummary: {
          totalMoodEntries: parsedEntries.length,
          entriesWithSleep: parsedEntries.filter(({ parsed }) => parsed.normalizedMetrics.sleepHours !== null).length,
          entriesWithTriggers: parsedEntries.filter(({ parsed }) => parsed.triggers.length > 0).length,
          entriesWithMeals: parsedEntries.filter(({ parsed }) => parsed.meals.length > 0).length,
          habitsTracked: habits.length,
          routineBlocksActive: routineBlocks.length,
          journalEntriesCount: recentJournalEntries.length
        },
        preComputedCorrelations: correlations
      };
      
      // Generate AI insights using GPT-5.1
      const systemPrompt = `You are a compassionate mental health insights assistant for Orbia, a holistic wellness and productivity tracker.

You have access to comprehensive tracking data WITH PRE-COMPUTED CORRELATIONS. Use these computed statistics to provide SPECIFIC, DATA-BACKED insights.

KEY DATA AVAILABLE:
1. preComputedCorrelations.habitCorrelations - Shows for each habit:
   - completionRate (%), daysCompleted
   - avgMoodWithHabit vs avgMoodWithoutHabit (compare these!)
   - avgStressWithHabit vs avgStressWithoutHabit (compare these!)
   - avgEnergyWithHabit vs avgEnergyWithoutHabit (compare these!)

2. preComputedCorrelations.sleepCorrelations - Shows:
   - avgMoodLowSleep vs avgMoodGoodSleep

3. preComputedCorrelations.routineAdherence - Shows per routine block:
   - completionRate (%), which blocks are being followed

4. preComputedCorrelations.overallMetrics - Period averages

6. preComputedCorrelations.highConfidence - HIGH-CONFIDENCE MULTI-FACTOR INSIGHTS (PRIORITIZE THESE):
   - routineMoodCorrelation: Mood on high routine completion days vs low (with confidence level)
   - habitRoutineSynergy: How combining habits + routines creates synergy effects
   - highConfidenceHabits: Only habits with statistically meaningful sample sizes
   - sleepHabitInteraction: How sleep quality modifies habit effectiveness
   - bestWorstDaysAnalysis: Pattern analysis of your best vs worst mood days

6. journalEntries - Full journal data with:
   - mood and energy scores, timeOfDay
   - primaryDriver/secondaryDriver (HIGH WEIGHT - user-tagged: Sleep, Work, Relationships, Body, Anxiety, Urges/Escape, Shame, Trauma, Joy, Connection, Growth, Peace)
   - contentPreview (first 300 chars of content)

7. journalAnalytics - Aggregated journal statistics:
   - driverFrequency: Most common drivers tagged in journal entries (HIGH WEIGHT EVIDENCE - primary source of categorization)
   - avgMood/avgEnergy: Journal-specific averages
   - entriesByTimeOfDay: When journaling happens most

JOURNAL-SPECIFIC PATTERNS TO LOOK FOR:
- Driver patterns: Which drivers appear most frequently? (driverFrequency in journalAnalytics)
- Driver chains: When primaryDriver=Work, what secondaryDriver often follows? (e.g., Work → Urges/Escape)
- Mood correlation by driver: Compare mood on Work-driven days vs Sleep-driven days
- Vent entry frequency correlating with stress levels
- Gratitude entries correlating with improved mood
- Tags that appear more frequently on high-stress days
- Time-of-day patterns in journaling (night venting vs morning reflection)
- Mood/energy differences between entry types

DRIVER WEIGHTING (HIGH PRIORITY):
- primaryDriver/secondaryDriver in journalEntries are USER-SELECTED markers of what's affecting them
- These are HIGH WEIGHT evidence - prioritize driver-tagged patterns over inferred patterns
- Use driverFrequency to identify the most common drivers and build insights around them

8. NEW CONTEXT FIELDS - Use these for deeper pattern analysis:
   - capacity (0-5): How much they can handle RIGHT NOW (distinct from mood/energy - someone can be calm but have low capacity)
   - triggerTag: What influenced the entry (work, loneliness, pain, noise, sleep, body, unknown)
   - workLoad (0-10): How hostile/draining was work? (0 = no work, 5 = difficult, 10 = toxic/unsafe)
   - workTag: Specific work stressor (deadlines, conflict, firefighting, unclear, blame, chaos)
   - timeOfDay: When the entry was made (morning, afternoon, evening, night)
   - dailySummaries: End-of-day reflections (lighter, average, heavier than usual)

IMPORTANT PATTERNS TO LOOK FOR:
   - Capacity vs mood discrepancies (calm but low capacity = different from high energy high capacity)
   - Daily summary correlations with actual metrics (does "heavier" correlate with specific triggers?)
   - Work environment load impact on mood/stress - separate external pressure from internal state
   - Work tag patterns (e.g., "blame/criticism days have 2x stress")
   - Helps prevent self-blame by identifying external stressors

CRITICAL INSTRUCTIONS:
- PRIORITIZE insights from highConfidence section - these have validated sample sizes
- Only report correlations with "high" or "moderate" confidence levels
- Use SPECIFIC NUMBERS from the correlations (e.g., "Mood is 7.2 on days you complete X vs 5.1 on days without")
- Calculate and state DIFFERENCES (e.g., "23% lower stress", "+1.5 mood points")
- Reference SPECIFIC habits and routines by name
- State effect size: "strong", "moderate", or "weak" 
- Highlight SYNERGY effects (e.g., "Doing X AND Y together yields +2.3 mood points")
- Group insights by category: SLEEP, HABITS, ROUTINES, SYNERGIES, JOURNAL

Be supportive, non-judgmental, and use trauma-informed language. Keep insights QUANTITATIVE and ACTIONABLE.`;

      const userPrompt = `Analyze this ${days}-day data and provide insights WITH SPECIFIC NUMBERS from the correlations:

${JSON.stringify(context, null, 2)}

REQUIREMENTS:
1. Each insight MUST cite specific numbers from preComputedCorrelations
2. Calculate and state percentage differences or point differences
3. Name specific habits, routines, or members when discussing patterns
4. Include a "dataPoint" field with the key metric for each insight

Format as JSON:
{
  "insights": [
    {
      "category": "sleep" | "habits" | "routines" | "system" | "context" | "journal" | "overall",
      "title": "Brief title",
      "observation": "The pattern with SPECIFIC NUMBERS (e.g., 'Mood averages 7.2 on days you complete Morning Routine vs 5.1 without - a 2.1 point improvement')",
      "dataPoint": "The key metric (e.g., '+41% mood improvement')",
      "suggestion": "Actionable next step or null",
      "confidence": "strong" | "moderate" | "limited" (based on data volume)
    }
  ],
  "correlationHighlights": [
    {
      "factor1": "string (e.g., 'Sleep 7+ hours')",
      "factor2": "string (e.g., 'Dissociation')", 
      "relationship": "positive" | "negative" | "neutral",
      "strength": "strong" | "moderate" | "weak",
      "summary": "Brief statement with numbers"
    }
  ],
  "overallTrend": "improving" | "stable" | "needs_attention",
  "encouragement": "Brief encouraging message referencing a specific achievement"
}`;

      const responseText = await aiComplete(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        { maxTokens: 2500 }
      );
      const insights = JSON.parse(responseText || "{}");
      
      res.json({
        ...insights,
        rawCorrelations: correlations,
        dataRange: {
          days,
          entriesAnalyzed: recentEntries.length,
          habitsTracked: habits.length,
          routineBlocksActive: routineBlocks.length
        }
      });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // AI pattern analysis endpoint - streaming version for real-time analysis
  app.post("/api/insights/analyze", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { question, days = 14 } = req.body;
      
      // Fetch all linked data
      const [entries, habits, completions, routineBlocks, routineActivities, routineLogs] = await Promise.all([
        storage.getAllTrackerEntries(userId),
        storage.getAllHabits(userId),
        storage.getAllHabitCompletions(userId),
        storage.getAllRoutineBlocks(userId),
        storage.getAllRoutineActivities(userId),
        storage.getAllRoutineLogs(userId)
      ]);
      
      // Filter to recent data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoffDate);
      const recentCompletions = completions.filter(c => new Date(c.completedDate) >= cutoffDate);
      const recentRoutineLogs = routineLogs.filter(l => new Date(l.completedDate) >= cutoffDate);
      
      // Parse all entries once and cache results for efficiency
      const parsedEntries = recentEntries.map(e => ({
        entry: e,
        parsed: parseTrackerNotes(e.notes),
      }));
      
      // Build habit lookup for routine linkage
      const habitById = new Map(habits.map(h => [h.id, h]));
      const habitCompletionsByHabit = new Map<string, typeof recentCompletions>();
      habits.forEach(h => {
        habitCompletionsByHabit.set(h.id, recentCompletions.filter(c => c.habitId === h.id));
      });
      
      const dataContext = {
        moodEntries: parsedEntries.map(({ entry: e, parsed }) => ({
          date: e.timestamp,
          mood: { value: e.mood, scale: "1-10" },
          energy: { value: e.energy, scale: "1-10" },
          stress: { value: e.stress, scale: "0-100" },
          capacity: e.capacity !== null ? { value: e.capacity, scale: "0-5", description: "How much can they handle right now" } : null,
          triggerTag: e.triggerTag || null,
          workLoad: e.workLoad !== null ? { value: e.workLoad, scale: "0-10", description: "How hostile/draining was work (0=no work, 5=difficult, 10=toxic)" } : null,
          workTag: e.workTag || null,
          timeOfDay: e.timeOfDay || null,
          journalText: parsed.text,
          tags: parsed.tags,
          stressTriggers: parsed.triggers,
          sleepHours: parsed.normalizedMetrics.sleepHours,
          painLevel: parsed.normalizedMetrics.painLevel !== null 
            ? { value: parsed.normalizedMetrics.painLevel, scale: "0-10" } 
            : null,
          comfortScore: parsed.normalizedMetrics.comfortScore !== null
            ? { value: parsed.normalizedMetrics.comfortScore, scale: "1-10" }
            : null,
          communicationScore: parsed.normalizedMetrics.communicationScore !== null
            ? { value: parsed.normalizedMetrics.communicationScore, scale: "1-10" }
            : null,
          urgesLevel: parsed.normalizedMetrics.urgesLevel !== null
            ? { value: parsed.normalizedMetrics.urgesLevel, scale: "0-10" }
            : null,
          rawMetrics: parsed.rawMetrics
        })),
        habits: habits.map(h => {
          const hCompletions = habitCompletionsByHabit.get(h.id) || [];
          return {
            id: h.id,
            name: h.title,
            category: h.category,
            target: h.target,
            unit: h.unit,
            frequency: h.frequency,
            currentStreak: h.streak,
            completionCount: hCompletions.length,
            completions: hCompletions.map(c => c.completedDate)
          };
        }),
        routineBlocks: routineBlocks.map(b => ({
          name: b.name,
          startTime: b.startTime,
          endTime: b.endTime,
          purpose: b.purpose,
          activities: routineActivities
            .filter(a => a.blockId === b.id)
            .map(a => {
              const activityLogs = recentRoutineLogs.filter(l => l.activityId === a.id);
              const linkedHabit = a.habitId ? habitById.get(a.habitId) : null;
              const linkedHabitCompletions = a.habitId ? habitCompletionsByHabit.get(a.habitId) : null;
              return {
                name: a.name,
                linkedHabitId: a.habitId,
                linkedHabitName: linkedHabit?.title || null,
                linkedHabitTarget: linkedHabit?.target || null,
                linkedHabitCompletions: linkedHabitCompletions?.map(c => c.completedDate) || [],
                completions: activityLogs.map(l => l.completedDate)
              };
            })
        })),
      };
      
      // Set up SSE for streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      const systemPrompt = `You are a compassionate mental health pattern analyst for Orbia, a holistic wellness and productivity tracker. 

You have access to the user's linked tracking data including:
- Mood, energy, stress entries
- Habit completions
- Daily routine activity logs

Provide supportive analysis. Be specific about patterns you observe in the data. Use gentle, encouraging language.`;

      await aiStream(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is my tracking data from the last ${days} days:\n\n${JSON.stringify(dataContext, null, 2)}\n\nMy question: ${question || "What patterns do you see in my data?"}` }
        ],
        res,
        { maxTokens: 1500 }
      );

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in pattern analysis:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to analyze patterns" });
      }
    }
  });

  // Todos Routes
  app.get("/api/todos", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const todos = await storage.getAllTodos(userId);
      res.json(todos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch todos" });
    }
  });

  app.post("/api/todos", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertTodoSchema.parse({ ...req.body, userId });
      const todo = await storage.createTodo(userId, validatedData);
      res.status(201).json(todo);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/todos/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertTodoSchema.partial().parse(req.body);
      const todo = await storage.updateTodo(userId, req.params.id, validatedData);
      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }
      res.json(todo);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/todos/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteTodo(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Todo not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete todo" });
    }
  });

  // Career Projects Routes
  app.get("/api/career-projects", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const projects = await storage.getAllCareerProjects(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch career projects" });
    }
  });

  app.get("/api/career-projects/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const project = await storage.getCareerProject(userId, req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/career-projects", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertCareerProjectSchema.parse({ ...req.body, userId });
      const project = await storage.createCareerProject(userId, validatedData);
      res.status(201).json(project);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/career-projects/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertCareerProjectSchema.partial().parse(req.body);
      const project = await storage.updateCareerProject(userId, req.params.id, validatedData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/career-projects/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteCareerProject(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Career Tasks Routes
  app.get("/api/career-tasks", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const projectId = req.query.projectId as string | undefined;
      const tasks = projectId 
        ? await storage.getCareerTasksByProject(userId, projectId)
        : await storage.getAllCareerTasks(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch career tasks" });
    }
  });

  app.post("/api/career-tasks", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertCareerTaskSchema.parse({ ...req.body, userId });
      const task = await storage.createCareerTask(userId, validatedData);
      res.status(201).json(task);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/career-tasks/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertCareerTaskSchema.partial().parse(req.body);
      const task = await storage.updateCareerTask(userId, req.params.id, validatedData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/career-tasks/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteCareerTask(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Expenses Routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const month = req.query.month as string | undefined;
      const expenses = month
        ? await storage.getExpensesByMonth(userId, month)
        : await storage.getAllExpenses(userId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertExpenseSchema.parse({ ...req.body, userId });
      const expense = await storage.createExpense(userId, validatedData);
      res.status(201).json(expense);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(userId, req.params.id, validatedData);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteExpense(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Career Vision Routes
  app.get("/api/vision", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const vision = await storage.getVision(userId);
      res.json(vision);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vision" });
    }
  });

  app.post("/api/vision", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = z.array(insertCareerVisionSchema).parse(req.body);
      const vision = await storage.updateVision(userId, validatedData);
      res.json(vision);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  // Individual Vision CRUD routes (for Orbit actions)
  app.post("/api/vision/item", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertCareerVisionSchema.parse({ ...req.body, userId });
      const vision = await storage.createVisionItem(userId, validatedData);
      res.status(201).json(vision);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/vision/item/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertCareerVisionSchema.partial().parse(req.body);
      const vision = await storage.updateVisionItem(userId, req.params.id, validatedData);
      if (!vision) {
        return res.status(404).json({ error: "Vision item not found" });
      }
      res.json(vision);
    } catch (error) {
      res.status(500).json({ error: "Failed to update vision item" });
    }
  });

  app.delete("/api/vision/item/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteVisionItem(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Vision item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vision item" });
    }
  });

  // Define available RSS feeds for news topics
  const rssFeedsByTopic: Record<string, { name: string; feeds: { url: string; source: string }[] }> = {
    teaching: {
      name: "Teaching",
      feeds: [
        { url: "https://www.teachthought.com/feed/", source: "TeachThought" },
        { url: "https://hnrss.org/newest?q=education+teaching", source: "Hacker News" },
        { url: "https://news.google.com/rss/search?q=teaching+education+classroom&hl=en-US&gl=US&ceid=US:en", source: "Google News" }
      ]
    },
    cybersecurity: {
      name: "Security",
      feeds: [
        { url: "https://www.bleepingcomputer.com/feed/", source: "BleepingComputer" },
        { url: "https://krebsonsecurity.com/feed/", source: "Krebs on Security" },
        { url: "https://www.darkreading.com/rss.xml", source: "Dark Reading" },
        { url: "https://hnrss.org/newest?q=cybersecurity+hacking+infosec", source: "Hacker News" }
      ]
    },
    technology: {
      name: "Tech",
      feeds: [
        { url: "https://hnrss.org/frontpage", source: "Hacker News" },
        { url: "https://www.theverge.com/rss/index.xml", source: "The Verge" },
        { url: "https://techcrunch.com/feed/", source: "TechCrunch" },
        { url: "https://thenewstack.io/feed/", source: "The New Stack" }
      ]
    },
    career: {
      name: "Career",
      feeds: [
        { url: "https://news.google.com/rss/search?q=career+development+professional+growth&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
        { url: "https://hnrss.org/newest?q=career+hiring+job+interview", source: "Hacker News" }
      ]
    },
    wellness: {
      name: "Wellness",
      feeds: [
        { url: "https://jamesclear.com/feed", source: "James Clear" },
        { url: "https://news.google.com/rss/search?q=mental+health+wellness+mindfulness&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
        { url: "https://hnrss.org/newest?q=mental+health+wellness", source: "Hacker News" }
      ]
    },
    skincare: {
      name: "Skincare & Dermatology",
      feeds: [
        { url: "https://news.google.com/rss/search?q=skincare+dermatology+skin+health&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
        { url: "https://www.sciencedaily.com/rss/health_medicine/skin_care.xml", source: "ScienceDaily" }
      ]
    },
    french: {
      name: "French",
      feeds: [
        { url: "https://www.france24.com/en/rss", source: "France 24" },
        { url: "https://news.google.com/rss/search?q=france+french+culture+language&hl=en-US&gl=US&ceid=US:en", source: "Google News" }
      ]
    },
    finance: {
      name: "Personal Finance",
      feeds: [
        { url: "https://news.google.com/rss/search?q=personal+finance+budgeting+investing&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
        { url: "https://hnrss.org/newest?q=personal+finance+investing", source: "Hacker News" }
      ]
    },
    productivity: {
      name: "Productivity",
      feeds: [
        { url: "https://jamesclear.com/feed", source: "James Clear" },
        { url: "https://news.google.com/rss/search?q=productivity+time+management+focus&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
        { url: "https://hnrss.org/newest?q=productivity", source: "Hacker News" }
      ]
    },
    ai: {
      name: "AI & Machine Learning",
      feeds: [
        { url: "https://hnrss.org/newest?q=AI+LLM+machine+learning+GPT+Claude", source: "Hacker News" },
        { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch" },
        { url: "https://news.google.com/rss/search?q=artificial+intelligence+AI+machine+learning&hl=en-US&gl=US&ceid=US:en", source: "Google News" }
      ]
    }
  };

  // Generate RSS feeds for custom topics dynamically via Google News
  function getFeedsForTopic(topic: string): { url: string; source: string }[] {
    const config = rssFeedsByTopic[topic];
    if (config) return config.feeds;
    // Custom topic — use Google News RSS
    const query = encodeURIComponent(topic.replace(/-/g, " "));
    return [
      { url: `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`, source: "Google News" },
      { url: `https://hnrss.org/newest?q=${query}`, source: "Hacker News" }
    ];
  }

  // Get suggested topics based on user's goals, projects, and visions
  app.get("/api/news/suggested-topics", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [vision, projects, habits] = await Promise.all([
        storage.getVision(userId),
        storage.getAllCareerProjects(userId),
        storage.getAllHabits(userId)
      ]);

      const suggestions: { topic: string; name: string; reason: string }[] = [];
      const addedTopics = new Set<string>();

      const addSuggestion = (topic: string, reason: string) => {
        if (!addedTopics.has(topic) && rssFeedsByTopic[topic]) {
          addedTopics.add(topic);
          suggestions.push({ topic, name: rssFeedsByTopic[topic].name, reason });
        }
      };

      // Analyze visions
      vision.forEach(v => {
        const title = v.title.toLowerCase();
        if (title.includes("teach") || title.includes("education") || title.includes("tutor")) 
          addSuggestion("teaching", `Based on your vision: "${v.title}"`);
        if (title.includes("cyber") || title.includes("security") || title.includes("hack") || title.includes("htb")) 
          addSuggestion("cybersecurity", `Based on your vision: "${v.title}"`);
        if (title.includes("tech") || title.includes("software") || title.includes("code") || title.includes("developer")) 
          addSuggestion("technology", `Based on your vision: "${v.title}"`);
        if (title.includes("career") || title.includes("job") || title.includes("professional")) 
          addSuggestion("career", `Based on your vision: "${v.title}"`);
        if (title.includes("wellness") || title.includes("health") || title.includes("mental") || title.includes("balance")) 
          addSuggestion("wellness", `Based on your vision: "${v.title}"`);
        if (title.includes("skin") || title.includes("beauty") || title.includes("glow")) 
          addSuggestion("skincare", `Based on your vision: "${v.title}"`);
        if (title.includes("french") || title.includes("language") || title.includes("bilingual")) 
          addSuggestion("french", `Based on your vision: "${v.title}"`);
        if (title.includes("money") || title.includes("finance") || title.includes("invest") || title.includes("debt")) 
          addSuggestion("finance", `Based on your vision: "${v.title}"`);
        if (title.includes("ai") || title.includes("artificial") || title.includes("machine learning")) 
          addSuggestion("ai", `Based on your vision: "${v.title}"`);
      });

      // Analyze projects
      projects.forEach(p => {
        const title = p.title.toLowerCase();
        if (title.includes("htb") || title.includes("hack") || title.includes("security")) 
          addSuggestion("cybersecurity", `Based on your project: "${p.title}"`);
        if (title.includes("french") || title.includes("language")) 
          addSuggestion("french", `Based on your project: "${p.title}"`);
        if (title.includes("skin") || title.includes("content")) 
          addSuggestion("skincare", `Based on your project: "${p.title}"`);
      });

      // Analyze habits
      habits.forEach(h => {
        const title = h.title.toLowerCase();
        if (title.includes("french")) addSuggestion("french", `Based on your habit: "${h.title}"`);
        if (title.includes("htb") || title.includes("hack")) addSuggestion("cybersecurity", `Based on your habit: "${h.title}"`);
        if (title.includes("read")) addSuggestion("technology", `Based on your habit: "${h.title}"`);
        if (title.includes("pilates") || title.includes("workout")) addSuggestion("wellness", `Based on your habit: "${h.title}"`);
        if (title.includes("skin")) addSuggestion("skincare", `Based on your habit: "${h.title}"`);
      });

      // Add default suggestions if we have few
      if (suggestions.length < 3) {
        addSuggestion("career", "Great for professional growth");
        addSuggestion("productivity", "Help you stay focused and efficient");
        addSuggestion("wellness", "Support your overall wellbeing");
      }

      // Get all available topics
      const allTopics = Object.entries(rssFeedsByTopic).map(([key, val]) => ({
        topic: key,
        name: val.name
      }));

      res.json({ suggestions, allTopics });
    } catch (error) {
      console.error("Topic suggestions error:", error);
      res.status(500).json({ error: "Failed to get topic suggestions" });
    }
  });

  // User's saved topics CRUD
  app.get("/api/news/topics", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const topics = await storage.getAllNewsTopics(userId);
      res.json(topics);
    } catch (error) {
      res.status(500).json({ error: "Failed to get news topics" });
    }
  });

  app.post("/api/news/topics", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { topic, isCustom } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }
      const newTopic = await storage.createNewsTopic(userId, { 
        topic: topic.toLowerCase(), 
        isCustom: isCustom ? 1 : 0,
        isActive: 1
      });
      res.status(201).json(newTopic);
    } catch (error) {
      res.status(500).json({ error: "Failed to create news topic" });
    }
  });

  app.patch("/api/news/topics/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const topic = await storage.updateNewsTopic(userId, req.params.id, req.body);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(topic);
    } catch (error) {
      res.status(500).json({ error: "Failed to update news topic" });
    }
  });

  app.delete("/api/news/topics/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteNewsTopic(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete news topic" });
    }
  });

  // Saved articles CRUD
  app.get("/api/news/saved", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const articles = await storage.getAllSavedArticles(userId);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to get saved articles" });
    }
  });

  app.post("/api/news/saved", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { title, link, description, category, source, pubDate } = req.body;
      if (!title || !link) {
        return res.status(400).json({ error: "Title and link are required" });
      }
      
      // Check if already saved
      const existing = await storage.getSavedArticle(userId, link);
      if (existing) {
        return res.status(400).json({ error: "Article already saved" });
      }
      
      const article = await storage.createSavedArticle(userId, {
        title,
        link,
        description,
        category: category || "general",
        source,
        pubDate: pubDate ? new Date(pubDate) : undefined
      });
      res.status(201).json(article);
    } catch (error) {
      res.status(500).json({ error: "Failed to save article" });
    }
  });

  app.delete("/api/news/saved/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteSavedArticle(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Saved article not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete saved article" });
    }
  });

  // News/Updates API - fetches and summarizes news based on user's selected topics
  app.get("/api/news", async (req, res) => {
    try {
      const userId = req.session.userId!;
      // Get user's active topics, or use suggestions if none selected
      let userTopics = await storage.getActiveNewsTopics(userId);
      
      let activeTopics: string[];
      if (userTopics.length > 0) {
        activeTopics = userTopics.map(t => t.topic);
      } else {
        // Fallback: auto-detect from visions
        const vision = await storage.getVision(userId);
        const detectedInterests: string[] = [];
        
        vision.forEach(v => {
          const title = v.title.toLowerCase();
          if (title.includes("teach") || title.includes("education")) detectedInterests.push("teaching");
          if (title.includes("cyber") || title.includes("security") || title.includes("htb")) detectedInterests.push("cybersecurity");
          if (title.includes("tech") || title.includes("software")) detectedInterests.push("technology");
          if (title.includes("career") || title.includes("job")) detectedInterests.push("career");
          if (title.includes("wellness") || title.includes("health")) detectedInterests.push("wellness");
          if (title.includes("skin") || title.includes("beauty")) detectedInterests.push("skincare");
          if (title.includes("french") || title.includes("language")) detectedInterests.push("french");
        });
        
        activeTopics = Array.from(new Set(detectedInterests));
        if (activeTopics.length === 0) {
          activeTopics = ["career", "technology", "wellness"];
        }
      }

      // Fetch RSS feeds for active topics (supports both preset and custom topics)
      const feedsToFetch: { category: string; url: string; source: string }[] = [];
      activeTopics.forEach(topic => {
        const feeds = getFeedsForTopic(topic);
        feeds.forEach(feed => {
          feedsToFetch.push({ category: topic, url: feed.url, source: feed.source });
        });
      });

      // Fetch and parse RSS feeds with enhanced metadata
      interface EnhancedArticle {
        title: string;
        link: string;
        description: string;
        category: string;
        source: string;
        pubDate?: string;
        readingTime?: number;
        imageUrl?: string;
      }
      
      const fetchedArticles: EnhancedArticle[] = [];
      
      await Promise.allSettled(
        feedsToFetch.slice(0, 15).map(async ({ category, url, source }) => {
          try {
            const response = await fetch(url, { 
              headers: { 'User-Agent': 'Orbya/1.0' },
              signal: AbortSignal.timeout(5000)
            });
            const text = await response.text();
            
            // Parse RSS/Atom items
            const items = text.match(/<item>[\s\S]*?<\/item>/gi) || 
                         text.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
            
            items.slice(0, 4).forEach(item => {
              const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
              const linkMatch = item.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i) ||
                               item.match(/<link[^>]*href="([^"]+)"/i);
              const descMatch = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                               item.match(/<summary>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i) ||
                               item.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
              const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i) ||
                               item.match(/<published>(.*?)<\/published>/i) ||
                               item.match(/<updated>(.*?)<\/updated>/i);
              const imageMatch = item.match(/<enclosure[^>]*url="([^"]+)"/i) ||
                                item.match(/<media:content[^>]*url="([^"]+)"/i) ||
                                item.match(/<image>\s*<url>(.*?)<\/url>/i);
              
              if (titleMatch && linkMatch) {
                const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').slice(0, 250).trim() : '';
                const wordCount = description.split(/\s+/).length;
                
                fetchedArticles.push({
                  title: titleMatch[1].replace(/<[^>]*>/g, '').trim(),
                  link: linkMatch[1].trim(),
                  description,
                  category,
                  source,
                  pubDate: dateMatch ? dateMatch[1] : undefined,
                  readingTime: Math.max(1, Math.ceil(wordCount / 200)),
                  imageUrl: imageMatch ? imageMatch[1].trim() : undefined
                });
              }
            });
          } catch (e) {
            // Skip failed feeds silently
          }
        })
      );

      // Sort by date (newest first)
      fetchedArticles.sort((a, b) => {
        if (!a.pubDate) return 1;
        if (!b.pubDate) return -1;
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });

      // AI relevance filter — batch-check all articles in one call
      let relevantArticles = fetchedArticles;
      if (fetchedArticles.length > 0 && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
        try {
          const articleList = fetchedArticles.map((a, i) =>
            `${i}. [${a.category}] "${a.title}" — ${a.description?.slice(0, 80) || "no description"}`
          ).join("\n");

          const topicDescriptions = activeTopics.map(t => {
            const config = rssFeedsByTopic[t];
            return config ? `${t} (${config.name})` : t;
          }).join(", ");

          const filterResult = await aiComplete(
            [
              {
                role: "system",
                content: `You are a strict news relevance filter. Given a list of articles tagged with topics, return ONLY the indices of articles that are genuinely, directly relevant to their assigned topic. Remove articles that are:
- Tangentially related or clickbait
- About celebrities/gossip that merely mention the topic keyword
- Clearly miscategorized or off-topic
- Duplicate/near-duplicate content
Be strict — only keep articles a professional in that field would find useful.`
              },
              {
                role: "user",
                content: `Topics the user follows: ${topicDescriptions}

Articles:
${articleList}

Return ONLY a JSON array of the index numbers of relevant articles, e.g. [0,1,3,5]. Nothing else.`
              }
            ],
            { model: MODEL_FAST, maxTokens: 200, temperature: 0 }
          );

          const match = filterResult?.match(/\[[\d,\s]*\]/);
          if (match) {
            const keepIndices: number[] = JSON.parse(match[0]);
            const filtered = keepIndices
              .filter(i => i >= 0 && i < fetchedArticles.length)
              .map(i => fetchedArticles[i]);
            if (filtered.length > 0) {
              relevantArticles = filtered;
            }
          }
        } catch (e) {
          // If AI filter fails, fall back to unfiltered articles
        }
      }

      // Get saved article links to mark which are saved
      const savedArticles = await storage.getAllSavedArticles(userId);
      const savedLinks = new Set(savedArticles.map(a => a.link));

      // Add isSaved flag to articles
      const articlesWithSaveStatus = relevantArticles.map(a => ({
        ...a,
        isSaved: savedLinks.has(a.link)
      }));

      // Generate AI summary if available
      let aiSummary = null;
      if (articlesWithSaveStatus.length > 0 && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
        try {
          const vision = await storage.getVision(userId);
          const visionSummary = vision.map(v => v.title).join(", ");
          const articlesList = articlesWithSaveStatus.slice(0, 8).map((a, i) => 
            `${i + 1}. [${a.category}] ${a.title}`
          ).join("\n");

          aiSummary = await aiComplete(
            [
              {
                role: "system",
                content: `You provide brief, actionable daily briefings. User's goals: ${visionSummary || "career growth and personal wellbeing"}. Be warm and concise.`
              },
              {
                role: "user",
                content: `Give a 2-sentence summary of today's most relevant updates for my goals. Mention specific article topics that matter most.\n\nToday's articles:\n${articlesList}`
              }
            ],
            { model: MODEL_FAST, maxTokens: 400 }
          ) || null;
        } catch (e) {
          // AI summary is optional
        }
      }

      res.json({
        topics: activeTopics,
        topicNames: activeTopics.map(t => rssFeedsByTopic[t]?.name || t.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())),
        articles: articlesWithSaveStatus.slice(0, 20),
        aiSummary,
        hasUserTopics: userTopics.length > 0,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("News fetch error:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/career/ai-roadmap", async (req, res) => {
    try {
      const userId = req.session.userId!;
      if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
        return res.json({
          roadmap: [],
          suggestedActions: [],
          message: "AI features are not configured. Please set up AI integrations to use this feature.",
          error: "missing_credentials"
        });
      }

      const [vision, projects, tasks] = await Promise.all([
        storage.getVision(userId),
        storage.getAllCareerProjects(userId),
        storage.getAllCareerTasks(userId),
      ]);

      if (vision.length === 0) {
        return res.json({
          roadmap: [],
          suggestedActions: [],
          message: "Set up your North Star vision to get AI-powered roadmap suggestions."
        });
      }

      const projectsWithTasks = projects.map(p => ({
        ...p,
        tasks: tasks.filter(t => t.projectId === p.id),
        completedTasks: tasks.filter(t => t.projectId === p.id && t.completed === 1).length,
        totalTasks: tasks.filter(t => t.projectId === p.id).length,
      }));

      const systemPrompt = `You are a career strategist and productivity coach. Analyze the user's North Star vision and current projects to provide actionable roadmap suggestions.

Your response MUST be valid JSON with this structure:
{
  "roadmap": [
    {
      "phase": "string (e.g., Phase 1: Foundation)",
      "timeframe": "string (e.g., Next 2 weeks)",
      "milestones": ["string array of key milestones"],
      "focusAreas": ["string array of areas to focus on"]
    }
  ],
  "suggestedActions": [
    {
      "title": "string (actionable task title)",
      "description": "string (why this matters)",
      "priority": "high" | "medium" | "low",
      "relatedProject": "string or null (project title if related)",
      "estimatedEffort": "string (e.g., 30 min, 2 hours)"
    }
  ],
  "insights": "string (brief strategic insight connecting vision to current work)"
}

Provide 2-3 roadmap phases and 4-6 suggested actions. Be specific and actionable.`;

      const userPrompt = `NORTH STAR VISION:
${vision.map(v => `- ${v.title} (${v.timeframe})`).join('\n')}

CURRENT PROJECTS (${projects.length} total):
${projectsWithTasks.map(p => `
Project: ${p.title}
Status: ${p.status}
Progress: ${p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0}% (${p.completedTasks}/${p.totalTasks} tasks)
Next Action: ${p.nextAction || 'Not set'}
Description: ${p.description || 'No description'}
`).join('\n')}

Based on this vision and current project state, create a strategic roadmap and suggest the most impactful next actions to move toward these goals.`;

      const content = await aiComplete(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        { maxTokens: 2048 }
      );
      const parsed = JSON.parse(content || "{}");

      res.json({
        ...parsed,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("AI roadmap generation error:", error);
      res.status(500).json({ error: "Failed to generate AI roadmap" });
    }
  });

  app.get("/api/career/coach", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const snapshot = await storage.getLatestCoachSnapshot(userId);
      if (!snapshot) {
        return res.json({ empty: true, message: "No coaching data yet. Click Refresh to generate." });
      }
      res.json({
        ...(snapshot.payload as Record<string, unknown>),
        generatedAt: snapshot.generatedAt,
      });
    } catch (error) {
      console.error("Failed to get coach snapshot:", error);
      res.status(500).json({ error: true, message: "Failed to load coaching data" });
    }
  });

  app.post("/api/career/coach", async (req, res) => {
    try {
      const userId = req.session.userId!;
      if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
        return res.json({
          error: "missing_credentials",
          message: "AI features are not configured. Please set up AI integrations to use this feature."
        });
      }

      const [vision, projects, tasks] = await Promise.all([
        storage.getVision(userId),
        storage.getAllCareerProjects(userId),
        storage.getAllCareerTasks(userId),
      ]);

      if (vision.length === 0) {
        return res.json({
          error: "no_vision",
          message: "Set up your North Star vision to get AI career coaching."
        });
      }

      const projectSummary = projects.length > 0 
        ? projects.map(p => {
            const projectTasks = tasks.filter(t => t.projectId === p.id);
            const completed = projectTasks.filter(t => t.completed === 1).length;
            return `- ${p.title}: ${p.status}, ${completed}/${projectTasks.length} tasks done`;
          }).join('\n')
        : "No active projects yet.";

      const systemPrompt = `You are an elite career strategist providing READY-TO-EXECUTE plans with all details included. Never ask users to research or decide - YOU do that work.

BANNED PHRASES (never use): "Research...", "Decide...", "Consider...", "Explore...", "Look into...", "Choose between...", "Evaluate options...", "Create a plan...", "Design a template...", "Document your..."

REQUIRED:
- FREE courses first: Coursera audit, edX audit, Khan Academy, freeCodeCamp, YouTube, Alison
- For scheduling: "Add to Orbia routine" (user has the app)
- Every milestone needs: action verb + specific URL/name + cost + timeline
- Region-specific: research user's location for certifications, job boards, requirements

Example: ❌ "Research requirements" → ✅ "Apply at [URL], submit [docs], costs [X], takes [Y weeks]"

FINAL CHECK - verify each milestone:
1. No banned phrases
2. Has action verb (Apply, Enroll, Submit, Complete)
3. Includes exact URL/name/cost/timeline
4. Immediately executable

JSON FORMAT:
{"northStarAnalysis": {"summary": "1-2 sentences", "gaps": ["gaps"], "strengths": ["strengths"]},
"roadmap": [{"phase": "Phase X: Name", "timeframe": "Weeks 1-4", "goal": "outcome", "milestones": ["action + details + link"], "weeklyFocus": "priority"}],
"immediateActions": [{"title": "action", "why": "reason", "timeEstimate": "2h", "priority": "high"}],
"learningPath": [{"skill": "name", "importance": "why", "resources": [{"title": "name", "type": "course", "url": "URL", "timeCommitment": "Xh"}]}],
"weeklyTheme": "Theme",
"coachingNote": "2-3 sentences coaching"}`;

      const userPrompt = `MY NORTH STAR VISION (Treat this as the ultimate destination):
${vision.map(v => `- "${v.title}" (Target: ${v.timeframe})`).join('\n')}

CURRENT PROGRESS CONTEXT (reference only, not the driver):
${projectSummary}

Based on my North Star vision, create a comprehensive career coaching plan. Be specific about what I should do, learn, and focus on to reach these goals. Include real course recommendations where possible.`;

      const content = await aiComplete(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        { maxTokens: 8192 }
      );
      console.log("[Career Coach] Response length:", content.length, "chars");
      
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error("[Career Coach] JSON parse error:", parseError);
        console.error("[Career Coach] Raw content:", content.substring(0, 500));
        return res.status(500).json({ error: "Failed to parse AI response" });
      }
      
      if (!parsed.roadmap || parsed.roadmap.length === 0) {
        console.error("[Career Coach] Missing roadmap in response:", Object.keys(parsed));
        return res.status(500).json({ error: "AI response missing roadmap data" });
      }

      const coachData = {
        ...parsed,
        vision: vision,
      };

      const snapshot = await storage.upsertCoachSnapshot(userId, coachData);

      const coachTasks = tasks.filter(t => t.tags?.includes("coach"));
      for (const task of coachTasks) {
        await storage.deleteCareerTask(userId, task.id);
      }

      if (parsed.immediateActions) {
        for (const action of parsed.immediateActions) {
          await storage.createCareerTask(userId, {
            title: action.title,
            description: action.why || "",
            projectId: null,
            completed: 0,
            priority: action.priority || "medium",
            due: null,
            tags: ["coach"],
          });
        }
      }

      if (parsed.roadmap) {
        for (let phaseIndex = 0; phaseIndex < parsed.roadmap.length; phaseIndex++) {
          const phase = parsed.roadmap[phaseIndex];
          if (phase.milestones) {
            for (const milestone of phase.milestones) {
              await storage.createCareerTask(userId, {
                title: milestone,
                description: `Phase: ${phase.phase} | ${phase.timeframe}`,
                projectId: null,
                completed: 0,
                priority: "medium",
                due: null,
                tags: ["coach", "milestone", `phase-${phaseIndex}`],
              });
            }
          }
        }
      }

      res.json({
        ...coachData,
        generatedAt: snapshot.generatedAt,
      });
    } catch (error) {
      console.error("AI career coach error:", error);
      res.status(500).json({ error: true, message: "Failed to generate career coaching" });
    }
  });

  app.patch("/api/career/coach/roadmap", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { roadmap } = req.body;
      if (!roadmap || !Array.isArray(roadmap)) {
        return res.status(400).json({ error: "Invalid roadmap format" });
      }

      const currentSnapshot = await storage.getLatestCoachSnapshot(userId);
      if (!currentSnapshot) {
        return res.status(404).json({ error: "No coach data found" });
      }

      const currentPayload = currentSnapshot.payload as Record<string, unknown>;
      const updatedPayload = {
        ...currentPayload,
        roadmap,
      };

      const snapshot = await storage.upsertCoachSnapshot(userId, updatedPayload);

      const tasks = await storage.getAllCareerTasks(userId);
      const milestoneTasks = tasks.filter(t => t.tags?.includes("milestone"));
      for (const task of milestoneTasks) {
        await storage.deleteCareerTask(userId, task.id);
      }

      for (let phaseIndex = 0; phaseIndex < roadmap.length; phaseIndex++) {
        const phase = roadmap[phaseIndex];
        if (phase.milestones) {
          for (const milestone of phase.milestones) {
            await storage.createCareerTask(userId, {
              title: milestone,
              description: `Phase: ${phase.phase} | ${phase.timeframe}`,
              projectId: null,
              completed: 0,
              priority: "medium",
              due: null,
              tags: ["coach", "milestone", `phase-${phaseIndex}`],
            });
          }
        }
      }

      res.json({
        ...updatedPayload,
        generatedAt: snapshot.generatedAt,
      });
    } catch (error) {
      console.error("Update roadmap error:", error);
      res.status(500).json({ error: "Failed to update roadmap" });
    }
  });

  app.patch("/api/career/coach", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { learningPath, immediateActions, weeklyTheme, coachingNote } = req.body;
      
      const currentSnapshot = await storage.getLatestCoachSnapshot(userId);
      if (!currentSnapshot) {
        return res.status(404).json({ error: "No coach data found" });
      }

      const currentPayload = currentSnapshot.payload as Record<string, unknown>;
      const updatedPayload = { ...currentPayload };
      
      if (learningPath !== undefined) {
        updatedPayload.learningPath = learningPath;
      }
      if (immediateActions !== undefined) {
        updatedPayload.immediateActions = immediateActions;
      }
      if (weeklyTheme !== undefined) {
        updatedPayload.weeklyTheme = weeklyTheme;
      }
      if (coachingNote !== undefined) {
        updatedPayload.coachingNote = coachingNote;
      }

      const snapshot = await storage.upsertCoachSnapshot(userId, updatedPayload);

      res.json({
        ...updatedPayload,
        generatedAt: snapshot.generatedAt,
      });
    } catch (error) {
      console.error("Update coach data error:", error);
      res.status(500).json({ error: "Failed to update coach data" });
    }
  });

  app.post("/api/career/regenerate-phase", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { phaseIndex, currentPhase, vision } = req.body;
      
      if (phaseIndex === undefined || !currentPhase) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const visionSummary = vision?.map((v: any) => v.title).filter(Boolean).join(", ") || "No vision set";

      const content = await aiComplete(
        [
          {
            role: "system",
            content: `You are a career coach. Regenerate a complete phase for a career roadmap with fresh, specific milestones. Return ONLY valid JSON matching this exact format:
{
  "phase": "Phase X: [descriptive name]",
  "timeframe": "[specific timeframe like Weeks 1-4]",
  "goal": "[what success looks like]",
  "milestones": ["milestone 1", "milestone 2", "milestone 3", "milestone 4"],
  "weeklyFocus": "[one key focus]"
}`
          },
          {
            role: "user",
            content: `Vision: ${visionSummary}
Current Phase to Replace:
- Name: ${currentPhase.phase}
- Timeframe: ${currentPhase.timeframe}
- Goal: ${currentPhase.goal}
- Current Milestones: ${currentPhase.milestones?.join(", ")}

Generate a fresh version of this phase with new, specific milestones that still serve the vision but offer alternative approaches.`
          }
        ],
        { maxTokens: 500 }
      );
      if (!content) {
        return res.status(500).json({ error: "Failed to generate new phase" });
      }

      const newPhase = JSON.parse(content);
      res.json({ newPhase });
    } catch (error) {
      console.error("Regenerate phase error:", error);
      res.status(500).json({ error: "Failed to regenerate phase" });
    }
  });

  app.post("/api/career/regenerate-milestone", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { currentMilestone, phaseName, phaseGoal, vision } = req.body;
      
      if (!currentMilestone || !phaseName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const visionSummary = vision?.map((v: any) => v.title).filter(Boolean).join(", ") || "No vision set";

      const newMilestone = (await aiComplete(
        [
          {
            role: "system",
            content: `You are a career coach. Generate ONE alternative milestone for a career roadmap phase. The milestone should be specific, measurable, and achievable. Return ONLY the new milestone text, nothing else.`
          },
          {
            role: "user",
            content: `Vision: ${visionSummary}
Phase: ${phaseName}
Phase Goal: ${phaseGoal || "Not specified"}
Current Milestone (to replace): ${currentMilestone}

Generate a different, equally specific milestone that serves the same purpose but offers a fresh approach or alternative action.`
          }
        ],
        { maxTokens: 200 }
      ))?.trim();
      
      if (!newMilestone) {
        return res.status(500).json({ error: "Failed to generate new milestone" });
      }

      res.json({ newMilestone });
    } catch (error) {
      console.error("Regenerate milestone error:", error);
      res.status(500).json({ error: "Failed to regenerate milestone" });
    }
  });

  // Finance Settings Routes
  app.get("/api/finance-settings", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const settings = await storage.getFinanceSettings(userId);
      res.json(settings || { monthlyBudget: 15000, debtTotal: 0, debtPaid: 0, debtMonthlyPayment: 0, currency: "AED", savingsGoal: 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch finance settings" });
    }
  });

  app.patch("/api/finance-settings", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const settings = await storage.updateFinanceSettings(userId, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update finance settings" });
    }
  });

  // Income Streams Routes
  app.get("/api/income-streams", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const streams = await storage.getAllIncomeStreams(userId);
      res.json(streams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch income streams" });
    }
  });

  app.post("/api/income-streams", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertIncomeStreamSchema.parse({ ...req.body, userId });
      const stream = await storage.createIncomeStream(userId, validatedData);
      res.status(201).json(stream);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/income-streams/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertIncomeStreamSchema.partial().parse(req.body);
      const stream = await storage.updateIncomeStream(userId, req.params.id, validatedData);
      if (!stream) {
        return res.status(404).json({ error: "Income stream not found" });
      }
      res.json(stream);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/income-streams/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteIncomeStream(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Income stream not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete income stream" });
    }
  });

  // Transactions Routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const month = req.query.month as string | undefined;
      const txns = month
        ? await storage.getTransactionsByMonth(userId, month)
        : await storage.getAllTransactions(userId);
      res.json(txns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertTransactionSchema.parse({ ...req.body, userId });
      const txn = await storage.createTransaction(userId, validatedData);
      res.status(201).json(txn);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.post("/api/transactions/bulk", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = z.array(insertTransactionSchema).parse(req.body);
      const txns = await storage.createManyTransactions(userId, validatedData);
      res.status(201).json(txns);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      const txn = await storage.updateTransaction(userId, req.params.id, validatedData);
      if (!txn) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(txn);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteTransaction(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // AI-powered document import for bank statements
  app.post("/api/transactions/import", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { documentText, documentType } = req.body;
      
      if (!documentText) {
        return res.status(400).json({ error: "Document text is required" });
      }

      const today = new Date().toISOString().split('T')[0];
      
      const content = await aiComplete(
        [
          {
            role: "system",
            content: `You are an expert financial document parser specializing in UAE bank statements.

Return JSON: {"transactions": [...]}

Each transaction MUST have:
{
  "type": "income" or "expense",
  "name": "Merchant/description",
  "amount": number (positive),
  "category": string,
  "date": "YYYY-MM-DD" (REQUIRED - extract from statement, default to ${today} if not found),
  "merchant": "Recognized app/brand name if applicable",
  "notes": "optional"
}

CATEGORY RULES (be precise):
- "groceries": Carrefour, Lulu, Spinneys, Noon (daily items), Union Coop, Choithrams, mini marts, supermarkets
- "food": Talabat, Keeta, Deliveroo, Zomato, restaurants, cafes, Starbucks, food delivery
- "transport": Careem, Uber, RTA, Salik, petrol stations, Emirates, Etihad, taxi
- "travel": Travel agencies, hotels, booking.com, Airbnb, visa fees, airlines (NOT entertainment)
- "utilities": DU, Etisalat, DEWA, internet, phone bills, Telec/telecom payments
- "entertainment": Netflix, Spotify, cinema, gaming, MBC, streaming services
- "shopping": Noon (electronics/fashion), Amazon, clothing stores, electronics, furniture
- "healthcare": Pharmacies, hospitals, clinics, medical
- "debt_payment": Loan payments, credit card payments
- "savings": Transfers to savings
- "salary": Salary credits
- "freelance": Freelance income
- "other": If uncertain

KEY DISTINCTIONS:
- Noon for groceries vs Noon for electronics = check amount (small = groceries, large = shopping)
- Travel agencies = "travel", NOT "entertainment"
- Mini marts (MINI MART, MART, GROCERY) = "groceries"
- Food apps (KEETA, TALABAT) = "food"

DATE EXTRACTION (CRITICAL):
- Look for date columns in the statement (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MMM-YY)
- Each transaction row usually has a date - EXTRACT IT
- Convert to YYYY-MM-DD format
- If date is ambiguous, prefer DD/MM/YYYY (UAE format)

MERCHANT FIELD:
- For recognized apps/brands, include the merchant name: Talabat, Keeta, Noon, Careem, etc.
- This helps users track spending by app`
          },
          {
            role: "user",
            content: `Document type: ${documentType || "bank statement"}\n\nExtract ALL transactions with dates:\n${documentText}`
          }
        ],
        { maxTokens: 4000 }
      );
      if (!content) {
        return res.status(500).json({ error: "Failed to parse document" });
      }

      const parsed = JSON.parse(content);
      const extractedTransactions = parsed.transactions || parsed || [];
      
      const now = new Date();
      const formattedTransactions = extractedTransactions.map((t: any) => {
        let txDate: Date;
        if (t.date && t.date !== "null" && t.date !== "undefined") {
          txDate = new Date(t.date);
          if (isNaN(txDate.getTime())) {
            txDate = now;
          }
        } else {
          txDate = now;
        }
        const monthName = txDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        return {
          type: t.type,
          name: t.name,
          amount: Math.round(Math.abs(Number(t.amount))),
          category: t.category || "other",
          date: txDate.toISOString(),
          month: monthName,
          isRecurring: 0,
          notes: t.notes || null,
          merchant: t.merchant || null,
          importSource: "ai_import"
        };
      });

      res.json({ 
        transactions: formattedTransactions,
        count: formattedTransactions.length 
      });
    } catch (error) {
      console.error("Document import error:", error);
      res.status(500).json({ error: "Failed to parse document" });
    }
  });

  // Orbit Chat Route - Enhanced with comprehensive data like Deep Mind
  app.post("/api/orbit/chat", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { message, context, history, therapyMode } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const { buildUnifiedContextWithMemory, buildUnifiedSystemPrompt, buildTherapeuticPrompt } = await import("./lib/unified-context");
      const { context: unifiedContext, msToken } = await buildUnifiedContextWithMemory(userId, "orbit");

      let orbitSystemPrompt: string;
      if (therapyMode) {
        // Load clinical formulation for therapy mode
        let clinicalContext = "";
        try {
          const therapeuticNarratives = await storage.getMemoryNarratives(userId);
          const clinical = therapeuticNarratives.filter((n: any) => n.domain === "therapeutic");
          if (clinical.length > 0) {
            clinicalContext = clinical.map((n: any) => `${n.narrativeKey}: ${n.narrative}`).join("\n");
          }
        } catch (err) {
          console.error("[TherapyMode] Failed to load clinical formulation:", err);
        }
        const therapeuticPrompt = buildTherapeuticPrompt(clinicalContext || undefined);
        orbitSystemPrompt = `${therapeuticPrompt}

## CONTEXT DATA (use silently)
${unifiedContext}`;
      } else {
        const systemPrompt = buildUnifiedSystemPrompt("orbit");
        orbitSystemPrompt = `${systemPrompt}

## CONTEXT DATA (use silently)
${unifiedContext}

ADDITIONAL OPERATIONAL CONTEXT:
${JSON.stringify(context, null, 2)}`;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: orbitSystemPrompt }
      ];
      
      if (history && Array.isArray(history)) {
        for (const h of history.slice(-10)) {
          if (h.role === "user" || h.role === "assistant") {
            messages.push({ role: h.role, content: h.content });
          }
        }
      }
      
      messages.push({ role: "user", content: message });

      // Separate system message from chat messages
      const systemContent = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
      const chatMessages = messages.filter(m => m.role !== "system").map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
      if (chatMessages.length === 0 || chatMessages[0].role !== "user") {
        chatMessages.unshift({ role: "user", content: "(continuing)" });
      }

      const stream = await createRawStream(systemContent, chatMessages, { model: MODEL_PRIMARY, maxTokens: therapyMode ? 2000 : 800 });

      let fullResponse = "";
      const executedActions = new Set<string>();

      const ACTION_PATTERNS = [
        { name: "teams_send", regex: /\[TEAMS_SEND\s+chatId="([^"]+)"\s+message="([^"]+)"\]/ },
        { name: "create_event", regex: /\[CREATE_EVENT\s+subject="([^"]+)"\s+start="([^"]+)"\s+end="([^"]+)"\s+online="([^"]+)"\]/ },
        { name: "create_task", regex: /\[CREATE_TASK\s+title="([^"]+)"(?:\s+due="([^"]*)")?\]/ },
        { name: "send_email", regex: /\[SEND_EMAIL\s+to="([^"]+)"\s+subject="([^"]+)"\s+body="([^"]+)"\]/ },
        { name: "schedule_message", regex: /\[SCHEDULE_MESSAGE\s+chatId="([^"]+)"\s+recipient="([^"]+)"\s+message="([^"]+)"\s+time="([^"]+)"\s+recurrence="([^"]+)"\]/ },
        { name: "create_project", regex: /\[CREATE_PROJECT\s+title="([^"]+)"(?:\s+description="([^"]*)")?(?:\s+status="([^"]*)")?(?:\s+deadline="([^"]*)")?\]/ },
        { name: "add_project_task", regex: /\[ADD_TASK\s+project="([^"]+)"\s+title="([^"]+)"(?:\s+priority="([^"]*)")?(?:\s+due="([^"]*)")?\]/ },
        { name: "update_project_status", regex: /\[UPDATE_PROJECT_STATUS\s+project="([^"]+)"\s+status="([^"]+)"\]/ },
        { name: "complete_task", regex: /\[COMPLETE_TASK\s+task="([^"]+)"\]/ },
      ];

      async function executeWorkActions(text: string): Promise<void> {
        const graphLib = msToken ? await import("./lib/microsoft-graph") : null;
        for (const { name, regex } of ACTION_PATTERNS) {
          let match;
          const globalRegex = new RegExp(regex.source, 'g');
          while ((match = globalRegex.exec(text)) !== null) {
            const actionKey = match[0];
            if (executedActions.has(actionKey)) continue;
            executedActions.add(actionKey);
            try {
              switch (name) {
                case "teams_send":
                  if (!msToken || !graphLib) break;
                  await graphLib.sendChatMessage(msToken!, match[1], match[2]);
                  res.write(`data: ${JSON.stringify({ action: "teams_sent", chatId: match[1], message: match[2] })}\n\n`);
                  break;
                case "create_event":
                  if (!msToken || !graphLib) break;
                  await graphLib.createCalendarEvent(msToken!, match[1], match[2], match[3], { isOnline: match[4] === "true" });
                  res.write(`data: ${JSON.stringify({ action: "event_created", subject: match[1], start: match[2], end: match[3] })}\n\n`);
                  break;
                case "create_task":
                  if (!msToken || !graphLib) break;
                  await graphLib.createTask(msToken!, match[1], match[2] || undefined);
                  res.write(`data: ${JSON.stringify({ action: "task_created", title: match[1], due: match[2] || null })}\n\n`);
                  break;
                case "send_email":
                  if (!msToken || !graphLib) break;
                  await graphLib.sendEmail(msToken!, match[1], match[2], match[3]);
                  res.write(`data: ${JSON.stringify({ action: "email_sent", to: match[1], subject: match[2] })}\n\n`);
                  break;
                case "schedule_message":
                  await storage.createScheduledMessage(userId, {
                    userId, chatId: match[1], recipientName: match[2],
                    message: match[3], timeOfDay: match[4],
                    recurrence: match[5] || "daily", active: true,
                  });
                  res.write(`data: ${JSON.stringify({ action: "message_scheduled", recipient: match[2], message: match[3], time: match[4], recurrence: match[5] })}\n\n`);
                  break;
                case "create_project": {
                  const project = await storage.createCareerProject(userId, {
                    title: match[1],
                    description: match[2] || null,
                    status: match[3] || "planning",
                    deadline: match[4] || null,
                    progress: 0,
                    nextAction: null,
                    color: null,
                    tags: null,
                  });
                  res.write(`data: ${JSON.stringify({ action: "project_created", id: project.id, title: match[1] })}\n\n`);
                  break;
                }
                case "add_project_task": {
                  const projects = await storage.getAllCareerProjects(userId);
                  const proj = projects.find((p: any) => p.title.toLowerCase() === match[1].toLowerCase());
                  if (!proj) {
                    res.write(`data: ${JSON.stringify({ action: "add_task_failed", error: `Project "${match[1]}" not found` })}\n\n`);
                    break;
                  }
                  const task = await storage.createCareerTask(userId, {
                    title: match[2],
                    projectId: proj.id,
                    parentId: null,
                    completed: false,
                    priority: match[3] || "medium",
                    due: match[4] || null,
                    tags: null,
                    description: null,
                  });
                  res.write(`data: ${JSON.stringify({ action: "project_task_added", id: task.id, title: match[2], project: match[1] })}\n\n`);
                  break;
                }
                case "update_project_status": {
                  const projects2 = await storage.getAllCareerProjects(userId);
                  const proj2 = projects2.find((p: any) => p.title.toLowerCase() === match[1].toLowerCase());
                  if (!proj2) {
                    res.write(`data: ${JSON.stringify({ action: "update_project_failed", error: `Project "${match[1]}" not found` })}\n\n`);
                    break;
                  }
                  await storage.updateCareerProject(userId, proj2.id, { status: match[2] });
                  res.write(`data: ${JSON.stringify({ action: "project_status_updated", project: match[1], status: match[2] })}\n\n`);
                  break;
                }
                case "complete_task": {
                  const allTasks = await storage.getAllCareerTasks(userId);
                  const foundTask = allTasks.find((t: any) => t.title.toLowerCase() === match[1].toLowerCase());
                  if (!foundTask) {
                    res.write(`data: ${JSON.stringify({ action: "complete_task_failed", error: `Task "${match[1]}" not found` })}\n\n`);
                    break;
                  }
                  await storage.updateCareerTask(userId, foundTask.id, { completed: true });
                  res.write(`data: ${JSON.stringify({ action: "task_completed", task: match[1] })}\n\n`);
                  break;
                }
              }
            } catch (err: any) {
              console.error(`Orbit action ${name} failed:`, err.message);
              res.write(`data: ${JSON.stringify({ action: `${name}_failed`, error: err.message })}\n\n`);
            }
          }
        }
      }

      const allActionRegex = /\[(TEAMS_SEND|CREATE_EVENT|CREATE_TASK|SEND_EMAIL|SCHEDULE_MESSAGE|CREATE_PROJECT|ADD_TASK|UPDATE_PROJECT_STATUS|COMPLETE_TASK)\s[^\]]+\]/g;
      let bufferedContent = "";
      let hasActionTag = false;

      for await (const event of stream) {
        if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
        const content = event.delta.text;
        if (content) {
          fullResponse += content;
          bufferedContent += content;

          if (bufferedContent.includes("[") && !allActionRegex.test(bufferedContent)) {
            allActionRegex.lastIndex = 0;
            hasActionTag = true;
            continue;
          }
          allActionRegex.lastIndex = 0;

          if (hasActionTag && allActionRegex.test(bufferedContent)) {
            allActionRegex.lastIndex = 0;
            await executeWorkActions(bufferedContent);
            const cleaned = bufferedContent.replace(allActionRegex, "");
            allActionRegex.lastIndex = 0;
            if (cleaned.trim()) {
              res.write(`data: ${JSON.stringify({ content: cleaned })}\n\n`);
            }
            bufferedContent = "";
            hasActionTag = false;
          } else if (!hasActionTag) {
            if (!bufferedContent.includes("[")) {
              res.write(`data: ${JSON.stringify({ content: bufferedContent })}\n\n`);
              bufferedContent = "";
            }
          }
        }
      }

      if (bufferedContent.trim()) {
        await executeWorkActions(bufferedContent);
        const cleaned = bufferedContent.replace(allActionRegex, "");
        allActionRegex.lastIndex = 0;
        if (cleaned.trim()) {
          res.write(`data: ${JSON.stringify({ content: cleaned })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Background: extract personal insights from conversation
      if (fullResponse && message) {
        (async () => {
          try {
            const { extractFromConversation, persistMemories } = await import("./lib/memory-graph");
            const convMessages = [
              ...(history || []).slice(-6).map((h: any) => ({ role: h.role, content: h.content })),
              { role: "user", content: message },
              { role: "assistant", content: fullResponse },
            ];
            const existingEntities = await storage.getMemoryEntities(userId);
            const result = await extractFromConversation(convMessages, "orbit", existingEntities);
            if (result.entities.length > 0 || result.connections.length > 0) {
              await persistMemories(userId, result, "conversation_orbit", new Date().toISOString());
            }
          } catch (err) {
            console.error("[PostChat] Orbit conversation extraction failed:", err);
          }
        })();

        // Therapy mode: post-session reflection & clinical formulation update
        if (therapyMode) {
          (async () => {
            try {
              const { buildClinicalFormulation } = await import("./lib/memory-graph");
              await buildClinicalFormulation(userId);
              console.log("[TherapyMode] Post-session clinical formulation updated");
            } catch (err) {
              console.error("[TherapyMode] Post-session reflection failed:", err);
            }
          })();
        }
      }
    } catch (error) {
      console.error("Orbit chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Failed to process chat" })}\n\n`);
        res.end();
      }
    }
  });

  // ==================== UNLOAD (Brain Dump) ====================
  app.post("/api/orbit/unload", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { text } = req.body;

      if (!text || typeof text !== "string" || text.trim().length < 5) {
        return res.status(400).json({ error: "Please share what's on your mind (at least a few words)" });
      }

      const { parseUnload } = await import("./lib/unload");
      const result = await parseUnload(userId, text.trim());
      res.json(result);
    } catch (error) {
      console.error("Unload parse error:", error);
      res.status(500).json({ error: "Failed to process your unload" });
    }
  });

  // Daily Summary Routes
  app.get("/api/daily-summaries", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const summaries = await storage.getAllDailySummaries(userId);
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily summaries" });
    }
  });

  app.get("/api/daily-summaries/:date", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const summary = await storage.getDailySummary(userId, req.params.date);
      res.json(summary || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily summary" });
    }
  });

  app.post("/api/daily-summaries", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertDailySummarySchema.parse({ ...req.body, userId });
      const summary = await storage.upsertDailySummary(userId, validatedData);
      res.status(201).json(summary);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  // Journal Entries Routes
  app.get("/api/journal", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const entries = await storage.getAllJournalEntries(userId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  app.get("/api/journal/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const entry = await storage.getJournalEntry(userId, req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Journal entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch journal entry" });
    }
  });

  app.post("/api/journal", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertJournalEntrySchema.parse({ ...req.body, userId });
      const entry = await storage.createJournalEntry(userId, validatedData);
      res.status(201).json(entry);

      // Background: AI-extract memories from this journal entry
      import("./lib/memory-graph").then(async ({ extractFromJournalAI, persistMemories }) => {
        const existingEntities = await storage.getMemoryEntities(userId);
        const result = await extractFromJournalAI(entry, existingEntities);
        if (result.entities.length > 0 || result.connections.length > 0) {
          await persistMemories(userId, result, "journal_entry", entry.id);
        }
      }).catch((err) => console.error("[MemoryGraph] Journal extraction failed:", err));
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/journal/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertJournalEntrySchema.partial().parse(req.body);
      const entry = await storage.updateJournalEntry(userId, req.params.id, validatedData);
      if (!entry) {
        return res.status(404).json({ error: "Journal entry not found" });
      }
      res.json(entry);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/journal/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteJournalEntry(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Journal entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete journal entry" });
    }
  });

  // Food Options Routes
  app.get("/api/food-options", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const options = await storage.getAllFoodOptions(userId);
      res.json(options);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch food options" });
    }
  });

  app.post("/api/food-options", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertFoodOptionSchema.parse({ ...req.body, userId });
      const option = await storage.createFoodOption(userId, validatedData);
      res.status(201).json(option);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/food-options/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertFoodOptionSchema.partial().parse(req.body);
      const updated = await storage.updateFoodOption(userId, req.params.id, validatedData);
      if (!updated) {
        return res.status(404).json({ error: "Food option not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update food option" });
    }
  });

  app.delete("/api/food-options/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteFoodOption(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Food option not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete food option" });
    }
  });

  // Deep Mind Overview API - Wellness intelligence dashboard
  app.get("/api/deep-mind/overview", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const days = parseInt(req.query.days as string) || 30;
      const entries = await storage.getRecentTrackerEntries(userId, 500);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoffDate);
      
      const totalEntries = recentEntries.length;
      const avgMood = totalEntries > 0 ? recentEntries.reduce((sum, e) => sum + e.mood, 0) / totalEntries : 0;
      const avgStress = totalEntries > 0 ? recentEntries.reduce((sum, e) => sum + e.stress, 0) / totalEntries : 0;
      const avgEnergy = totalEntries > 0 ? recentEntries.reduce((sum, e) => sum + e.energy, 0) / totalEntries : 0;
      
      const moodVariance = totalEntries > 1 
        ? recentEntries.reduce((sum, e) => sum + Math.pow(e.mood - avgMood, 2), 0) / totalEntries 
        : 0;
      const stabilityIndex = Math.max(0, Math.min(100, 100 - (moodVariance * 10)));
      
      const entriesByDay: Record<string, number> = {};
      recentEntries.forEach(e => {
        const day = new Date(e.timestamp).toISOString().split('T')[0];
        entriesByDay[day] = (entriesByDay[day] || 0) + 1;
      });
      const daysWithData = Object.keys(entriesByDay).length;
      
      res.json({
        metrics: {
          avgMood: Math.round(avgMood * 10) / 10,
          avgStress: Math.round(avgStress),
          avgEnergy: Math.round(avgEnergy * 10) / 10,
          stabilityIndex: Math.round(stabilityIndex),
          totalEntries,
          daysTracked: daysWithData,
        },
        timeRange: days,
      });
    } catch (error) {
      console.error("Deep mind overview error:", error);
      res.status(500).json({ error: "Failed to compute deep mind overview" });
    }
  });

  // Deep Mind NOW API - Current snapshot for reworked Deep Mind page
  app.get("/api/deep-mind/now", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [entries, journalEntries] = await Promise.all([
        storage.getRecentTrackerEntries(userId, 50),
        storage.getAllJournalEntries(userId),
      ]);

      const sampleSize = entries.length;
      
      // Helper to determine confidence level
      const getConfidence = (n: number): "Low" | "Medium" | "High" => {
        if (n < 5) return "Low";
        if (n < 15) return "Medium";
        return "High";
      };

      // Get the most recent entry for current state analysis
      const mostRecent = entries[0];
      
      // Determine main driver from most recent entry
      let driver = "Unknown";
      if (mostRecent) {
        if (mostRecent.sleepHours !== null && mostRecent.sleepHours < 5) {
          driver = "Sleep";
        } else if (mostRecent.triggerTag) {
          const tagMap: Record<string, string> = {
            work: "Work",
            loneliness: "Loneliness",
            pain: "Pain",
            noise: "Stress",
            sleep: "Sleep",
            body: "Pain",
            unknown: "Unknown"
          };
          driver = tagMap[mostRecent.triggerTag] || mostRecent.triggerTag;
        } else if (mostRecent.workLoad !== null && mostRecent.workLoad >= 7) {
          driver = "Work";
        }
      }
      
      // Also check recent journal drivers
      const recentJournals = journalEntries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      if (driver === "Unknown" && recentJournals.length > 0) {
        const driverCounts: Record<string, number> = {};
        recentJournals.forEach(j => {
          if (j.primaryDriver) {
            driverCounts[j.primaryDriver] = (driverCounts[j.primaryDriver] || 0) + 1;
          }
        });
        const topDriver = Object.entries(driverCounts).sort((a, b) => b[1] - a[1])[0];
        if (topDriver) {
          driver = topDriver[0];
        }
      }

      let stateIntensity: "Low" | "Medium" | "High" = "Low";
      if (mostRecent) {
        if (mostRecent.stress >= 60) stateIntensity = "High";
        else if (mostRecent.stress >= 35) stateIntensity = "Medium";
      }

      // External load percentage (from workLoad, stress)
      let load = 0;
      if (mostRecent) {
        const workLoadPct = (mostRecent.workLoad ?? 5) * 10; // 0-10 scale to 0-100
        load = Math.round((workLoadPct + mostRecent.stress) / 2);
      }

      let stability = 50;
      if (entries.length > 0) {
        const recentFive = entries.slice(0, 5);
        const avgMood = recentFive.reduce((s, e) => s + e.mood, 0) / recentFive.length;
        const moodVariance = recentFive.length > 1
          ? recentFive.reduce((s, e) => s + Math.pow(e.mood - avgMood, 2), 0) / recentFive.length
          : 0;
        stability = Math.max(0, Math.min(100, Math.round(100 - (moodVariance * 5))));
      }

      let riskFlag: string | undefined;
      if (mostRecent) {
        const lowSleep = (mostRecent.sleepHours ?? 8) < 5;
        const highStress = mostRecent.stress > 70;
        if (lowSleep && highStress) {
          riskFlag = "High risk of crash in next 12h";
        }
      }

      // Suggestion based on current state
      const suggestions: Record<string, { do: string; avoid: string }> = {
        Sleep: { do: "10-min power nap or dim lights", avoid: "Coffee after 2pm" },
        Work: { do: "5-min walk or stretch", avoid: "Starting new big tasks" },
        Loneliness: { do: "Text one person", avoid: "Doom scrolling alone" },
        Pain: { do: "Gentle stretch or heat pad", avoid: "Pushing through it" },
        Stress: { do: "Box breathing 4-4-4-4", avoid: "Checking work messages" },
        Unknown: { do: "5-min grounding exercise", avoid: "Making big decisions" },
      };
      const suggestion = suggestions[driver] || suggestions.Unknown;

      res.json({
        driver,
        driverConfidence: getConfidence(sampleSize),
        stateIntensity,
        load,
        stability,
        riskFlag,
        suggestion,
        sampleSize,
      });
    } catch (error) {
      console.error("Deep mind now error:", error);
      res.status(500).json({ error: "Failed to compute deep mind now snapshot" });
    }
  });

  // Deep Mind LOOPS API - Pattern data for last 30-90 days
  app.get("/api/deep-mind/loops", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const days = parseInt(req.query.days as string) || 60;
      const [entries, journalEntries] = await Promise.all([
        storage.getRecentTrackerEntries(userId, 500),
        storage.getAllJournalEntries(userId),
      ]);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const now = new Date();
      
      const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoffDate);
      const recentJournals = journalEntries.filter(j => new Date(j.createdAt) >= cutoffDate);

      const uniqueDays = new Set(recentEntries.map(e => 
        new Date(e.timestamp).toISOString().split('T')[0]
      ));
      const sampleSize = uniqueDays.size;

      const getConfidence = (n: number): "Low" | "Medium" | "High" => {
        if (n < 5) return "Low";
        if (n < 15) return "Medium";
        return "High";
      };

      const triggerCounts: Record<string, { count: number; lastSeen: Date }> = {};
      
      recentEntries.forEach(e => {
        if (e.triggerTag && e.triggerTag !== "unknown") {
          const key = e.triggerTag;
          if (!triggerCounts[key]) {
            triggerCounts[key] = { count: 0, lastSeen: new Date(e.timestamp) };
          }
          triggerCounts[key].count++;
          if (new Date(e.timestamp) > triggerCounts[key].lastSeen) {
            triggerCounts[key].lastSeen = new Date(e.timestamp);
          }
        }
      });

      recentJournals.forEach(j => {
        if (j.primaryDriver) {
          const key = j.primaryDriver.toLowerCase();
          if (!triggerCounts[key]) {
            triggerCounts[key] = { count: 0, lastSeen: new Date(j.createdAt) };
          }
          triggerCounts[key].count++;
          if (new Date(j.createdAt) > triggerCounts[key].lastSeen) {
            triggerCounts[key].lastSeen = new Date(j.createdAt);
          }
        }
      });

      const triggers = Object.entries(triggerCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([name, data]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          count: data.count,
          recency: Math.round((now.getTime() - data.lastSeen.getTime()) / (1000 * 60 * 60 * 24)),
        }));

      const stabilizerKeywords = [
        { keyword: "walk", name: "Walking" },
        { keyword: "sleep", name: "Rest/Sleep" },
        { keyword: "friend", name: "Social connection" },
        { keyword: "breath", name: "Breathing exercises" },
        { keyword: "music", name: "Music" },
        { keyword: "outside", name: "Going outside" },
        { keyword: "shower", name: "Shower/Bath" },
        { keyword: "food", name: "Eating well" },
        { keyword: "water", name: "Hydration" },
        { keyword: "stretch", name: "Stretching" },
      ];

      const stabilizerCounts: Record<string, { count: number; effect: string }> = {};
      
      const allText = [
        ...recentJournals.map(j => j.content.toLowerCase()),
        ...recentEntries.filter(e => e.notes).map(e => e.notes!.toLowerCase()),
      ].join(" ");

      stabilizerKeywords.forEach(({ keyword, name }) => {
        const matches = (allText.match(new RegExp(keyword, "gi")) || []).length;
        if (matches > 0) {
          stabilizerCounts[name] = { 
            count: matches, 
            effect: matches >= 5 ? "Strong" : matches >= 2 ? "Moderate" : "Mild" 
          };
        }
      });

      const stabilizers = Object.entries(stabilizerCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([name, data]) => ({
          name,
          count: data.count,
          effect: data.effect,
        }));

      const crashPatterns: Record<string, { count: number; lastSeen: Date; trigger: string; outcome: string }> = {};
      
      const crashEntries = recentEntries.filter(e => e.stress > 60);
      
      crashEntries.forEach(e => {
        const trigger = e.triggerTag || "stress";
        const outcome = e.stress > 70 ? "overwhelm" : "dysregulation";
        const patternKey = `${trigger}→${outcome}`;
        
        if (!crashPatterns[patternKey]) {
          crashPatterns[patternKey] = { 
            count: 0, 
            lastSeen: new Date(e.timestamp),
            trigger,
            outcome
          };
        }
        crashPatterns[patternKey].count++;
        if (new Date(e.timestamp) > crashPatterns[patternKey].lastSeen) {
          crashPatterns[patternKey].lastSeen = new Date(e.timestamp);
        }
      });

      const interruptSuggestions: Record<string, string> = {
        work: "5-min walk away from desk",
        loneliness: "Text one person right now",
        pain: "Gentle stretch + heat",
        sleep: "10-min power nap",
        stress: "Box breathing 3 rounds",
        noise: "Noise-canceling headphones",
        body: "Splash cold water on face",
        unknown: "Grounding: 5 things you can see",
      };

      const crashLoops = Object.entries(crashPatterns)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([pattern, data]) => ({
          pattern: `${data.trigger} → ${data.outcome}`,
          count: data.count,
          recency: Math.round((now.getTime() - data.lastSeen.getTime()) / (1000 * 60 * 60 * 24)),
          interrupt: interruptSuggestions[data.trigger.toLowerCase()] || interruptSuggestions.unknown,
        }));

      res.json({
        triggers,
        stabilizers,
        crashLoops,
        sampleSize,
        confidence: getConfidence(sampleSize),
      });
    } catch (error) {
      console.error("Deep mind loops error:", error);
      res.status(500).json({ error: "Failed to compute deep mind loops" });
    }
  });

  // Deep Mind Visualizations endpoint - Sleep impact and driver frequency charts
  app.get("/api/deep-mind/visualizations", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [entries, journalEntries] = await Promise.all([
        storage.getAllTrackerEntries(userId),
        storage.getAllJournalEntries(userId),
      ]);

      const now = new Date();
      const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

      // Filter entries with sleep data for Chart A
      const entriesWithSleep = entries.filter(e => e.sleepHours != null && e.sleepHours > 0);
      
      // Group entries by sleep hour buckets and calculate averages
      const sleepBuckets: Record<string, { mood: number[]; stress: number[] }> = {};
      
      entriesWithSleep.forEach(e => {
        const sleepHours = Math.round(e.sleepHours!);
        const bucket = sleepHours <= 4 ? "≤4h" : 
                       sleepHours === 5 ? "5h" :
                       sleepHours === 6 ? "6h" :
                       sleepHours === 7 ? "7h" :
                       sleepHours === 8 ? "8h" :
                       sleepHours >= 9 ? "9h+" : "7h";
        
        if (!sleepBuckets[bucket]) {
          sleepBuckets[bucket] = { mood: [], stress: [] };
        }
        
        sleepBuckets[bucket].mood.push(e.mood);
        sleepBuckets[bucket].stress.push(e.stress);
      });

      const orderedBuckets = ["≤4h", "5h", "6h", "7h", "8h", "9h+"];
      const sleepImpactData = orderedBuckets
        .filter(bucket => sleepBuckets[bucket])
        .map(bucket => {
          const data = sleepBuckets[bucket];
          return {
            sleepHours: bucket,
            mood: data.mood.length > 0 ? Number((data.mood.reduce((a, b) => a + b, 0) / data.mood.length).toFixed(1)) : 0,
            stress: data.stress.length > 0 ? Number((data.stress.reduce((a, b) => a + b, 0) / data.stress.length).toFixed(1)) : 0,
            count: data.mood.length,
          };
        });

      // Chart B: Driver frequency by week
      const driverWeeks: Record<string, Record<string, number>> = {};
      const validDrivers = ["sleep", "work", "loneliness", "pain", "urges", "body", "anxiety", "relationships", "trauma"];
      
      // Get week start (Monday) helper
      const getWeekStart = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split('T')[0];
      };

      // Count drivers from journal entries (primaryDriver)
      journalEntries
        .filter(j => new Date(j.createdAt) >= eightWeeksAgo && j.primaryDriver)
        .forEach(j => {
          const week = getWeekStart(new Date(j.createdAt));
          if (!driverWeeks[week]) driverWeeks[week] = {};
          
          const driver = j.primaryDriver!.toLowerCase();
          if (validDrivers.includes(driver)) {
            driverWeeks[week][driver] = (driverWeeks[week][driver] || 0) + 1;
          }
        });

      // Count drivers from tracker entries (triggerTag)
      entries
        .filter(e => new Date(e.timestamp) >= eightWeeksAgo && e.triggerTag)
        .forEach(e => {
          const week = getWeekStart(new Date(e.timestamp));
          if (!driverWeeks[week]) driverWeeks[week] = {};
          
          const driver = e.triggerTag!.toLowerCase();
          if (validDrivers.includes(driver)) {
            driverWeeks[week][driver] = (driverWeeks[week][driver] || 0) + 1;
          }
        });

      // Format driver frequency data sorted by week
      const driverFrequencyData = Object.entries(driverWeeks)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-8) // Last 8 weeks
        .map(([week, drivers]) => {
          const weekDate = new Date(week);
          const weekLabel = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;
          return {
            week: weekLabel,
            sleep: drivers["sleep"] || 0,
            work: drivers["work"] || 0,
            loneliness: drivers["loneliness"] || 0,
            pain: drivers["pain"] || 0,
            urges: drivers["urges"] || 0,
            body: drivers["body"] || 0,
            anxiety: drivers["anxiety"] || 0,
          };
        });

      const sleepSampleSize = entriesWithSleep.length;
      const driverSampleSize = Object.values(driverWeeks).reduce((sum, week) => 
        sum + Object.values(week).reduce((a, b) => a + b, 0), 0);

      const getConfidence = (n: number): "Low" | "Medium" | "High" => {
        if (n >= 30) return "High";
        if (n >= 14) return "Medium";
        return "Low";
      };

      res.json({
        sleepImpact: {
          data: sleepImpactData,
          sampleSize: sleepSampleSize,
          confidence: getConfidence(sleepSampleSize),
        },
        driverFrequency: {
          data: driverFrequencyData,
          sampleSize: driverSampleSize,
          confidence: getConfidence(driverSampleSize),
        },
      });
    } catch (error) {
      console.error("Deep mind visualizations error:", error);
      res.status(500).json({ error: "Failed to compute visualizations" });
    }
  });
  
  // Deep Mind AI Insights endpoint - Evidence-based analysis (with 24h caching)
  app.post("/api/deep-mind/insights", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [entries, journalEntries] = await Promise.all([
        storage.getRecentTrackerEntries(userId, 200),
        storage.getAllJournalEntries(userId),
      ]);
      
      // Calculate facts for last 7 days
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().split('T')[0];
      
      // Create cache key with full content fingerprint (invalidates when any data changes)
      // Simple hash function for cache key
      const simpleHash = (str: string): string => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0;
        }
        return Math.abs(hash).toString(36);
      };
      
      // Hash ALL entries and journals to detect any edits
      const entriesFingerprint = entries.map(e => 
        `${e.id}:${e.mood}:${e.energy}:${e.sleepHours || 0}:${(e.notes || "").length}`
      ).join("|");
      const journalsFingerprint = journalEntries.map(j => 
        `${j.id}:${j.content.length}:${j.primaryDriver || ""}`
      ).join("|");
      const contentHash = simpleHash(entriesFingerprint + journalsFingerprint);
      const cacheKey = `deep-mind-${todayStr}-${contentHash}`;
      
      const recentEntries = entries.filter(e => new Date(e.timestamp) >= sevenDaysAgo);
      const todayEntries = entries.filter(e => new Date(e.timestamp).toISOString().split('T')[0] === todayStr);
      
      // Compute averages (7 days)
      const avgSleep = recentEntries.filter(e => e.sleepHours != null).length > 0
        ? (recentEntries.filter(e => e.sleepHours != null).reduce((s, e) => s + (e.sleepHours || 0), 0) / recentEntries.filter(e => e.sleepHours != null).length).toFixed(1)
        : "N/A";
      const avgMood = recentEntries.length > 0
        ? (recentEntries.reduce((s, e) => s + e.mood, 0) / recentEntries.length).toFixed(1)
        : "N/A";
      const avgEnergy = recentEntries.length > 0
        ? (recentEntries.reduce((s, e) => s + e.energy, 0) / recentEntries.length).toFixed(1)
        : "N/A";
      
      // Today's values
      const todaySleep = todayEntries.find(e => e.sleepHours != null)?.sleepHours ?? "N/A";
      const todayMood = todayEntries.length > 0 ? todayEntries[0].mood : "N/A";
      const todayEnergy = todayEntries.length > 0 ? todayEntries[0].energy : "N/A";
      const todayCapacity = todayEntries.find(e => e.capacity != null)?.capacity ?? "N/A";
      
      // Tracker entry notes (daily notes from State input - HIGH WEIGHT)
      const recentTrackerNotes = recentEntries
        .filter(e => e.notes && e.notes.trim().length > 0)
        .slice(0, 15)
        .map(e => {
          const date = new Date(e.timestamp).toLocaleDateString();
          const time = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const notes = e.notes?.slice(0, 150) + (e.notes && e.notes.length > 150 ? "..." : "");
          return `[${date} ${time}] sleep=${e.sleepHours || 'N/A'}h, mood=${e.mood}/10: "${notes}"`;
        }).join("\n");
      
      // Journal excerpts (most recent with recency bias) - include drivers for HIGH weight
      const recentJournals = journalEntries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      const journalExcerpts = recentJournals.map(j => {
        const date = new Date(j.createdAt).toLocaleDateString();
        const content = j.content.slice(0, 200) + (j.content.length > 200 ? "..." : "");
        const driverInfo = j.primaryDriver ? ` [Driver: ${j.primaryDriver}${j.secondaryDriver ? ` → ${j.secondaryDriver}` : ''}]` : '';
        return `[${date}]${driverInfo} ${content}`;
      }).join("\n\n");
      
      // Aggregate driver frequencies from journals (HIGH WEIGHT evidence)
      const driverCounts: Record<string, number> = {};
      journalEntries
        .filter(j => new Date(j.createdAt) >= sevenDaysAgo && j.primaryDriver)
        .forEach(j => {
          if (j.primaryDriver) driverCounts[j.primaryDriver] = (driverCounts[j.primaryDriver] || 0) + 1;
          if (j.secondaryDriver) driverCounts[j.secondaryDriver] = (driverCounts[j.secondaryDriver] || 0) + 0.5;
        });
      const topDrivers = Object.entries(driverCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([driver, count]) => `${driver}(${count})`)
        .join(", ") || "No drivers tagged";
      
      // Build rolling memory from journal analysis
      const allJournalText = journalEntries.map(j => j.content).join(" ").toLowerCase();
      const triggerKeywords = ["stressed", "anxious", "overwhelmed", "exhausted", "lonely", "pain", "work", "deadline", "conflict"];
      const stabilizerKeywords = ["walk", "rest", "sleep", "friend", "calm", "better", "helped", "relaxed"];
      
      const systemPrompt = `You are an evidence-based wellness analyst. Output MUST follow this exact 4-section structure. Max 6 bullet points total. No long paragraphs. Every claim needs a quote or metric as evidence.

FACTS (provided):
- Sleep avg (7d): ${avgSleep}h | Mood avg: ${avgMood}/10 | Energy avg: ${avgEnergy}/10
- Today: sleep=${todaySleep}h, mood=${todayMood}/10, energy=${todayEnergy}/10, capacity=${todayCapacity}/5
- Journal present: ${journalEntries.length > 0 ? "yes" : "no"}
- Daily notes present: ${recentTrackerNotes.length > 0 ? "yes" : "no"}
- Top journal drivers (7d, HIGH WEIGHT): ${topDrivers}

DAILY NOTES FROM STATE ENTRIES (HIGH WEIGHT - analyze these first):
${recentTrackerNotes || "No daily notes"}

JOURNAL EXCERPTS WITH DRIVERS (analyze deeply, link patterns across entries):
${journalExcerpts || "No journal entries"}

Note: [Driver: X → Y] means primary driver is X with secondary driver Y. Use these tagged drivers as HIGH WEIGHT evidence when identifying the Main Driver.

OUTPUT FORMAT (follow exactly):

**Facts** (last 7 days + today)
• sleepHours avg: ${avgSleep}h, mood avg: ${avgMood}, energy avg: ${avgEnergy}
• today: sleep ${todaySleep}h / mood ${todayMood} / energy ${todayEnergy} / capacity ${todayCapacity}

**Main Driver** (pick 1 from: Sleep, Work, Relationships, Body, Anxiety, Urges/Escape, Shame, Trauma, Joy, Connection, Growth, Peace - PREFER drivers tagged in journals)
• Driver: [one word matching a journal driver if available]
• Confidence: [High/Med/Low]
• Evidence: [quote from daily notes OR journal OR specific metric + journal driver tag if present]

**Pattern** (1-2 lines max, from daily notes/journal history)
• Cycle: [trigger] → [coping] → [outcome]

**Action**
• Do: [1 tiny action ≤10 min, matched to capacity]
• Avoid: [1 "minimize damage" suggestion for next 12-24h]

RULES:
- Weight priority: Daily notes + Journal text (HIGHEST, recency bias) > Journal drivers (HIGH) > sleep hours (HIGH) > mood/energy/stress/pain/capacity (MEDIUM) > habits/routine (LOW, context only)
- If journal entries have tagged drivers, PREFER those as Main Driver - they are user-selected HIGH WEIGHT evidence
- ALWAYS include sleep hours in your analysis - it's a key metric
- Never blame habits/routine completion. Say "low completion likely due to low capacity" not "you failed"
- Use neutral, supportive language
- Every insight needs evidence (quote or metric)
- Max 6 bullet points total`;

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Transfer-Encoding", "chunked");
      
      // Check cache first (saves AI costs) - bypass with ?refresh=true
      const forceRefresh = req.body?.refresh === true || req.query?.refresh === "true";
      const cachedResponse = !forceRefresh ? getCachedAI(cacheKey) : null;
      if (cachedResponse) {
        res.write(cachedResponse);
        res.end();
        return;
      }
      
      const stream = await createRawStream(systemPrompt, [
        { role: "user", content: "Analyze my data following the exact 4-section format." }
      ], { model: MODEL_FAST, maxTokens: 500 });

      let fullResponse = "";
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const content = event.delta.text;
          res.write(content);
          fullResponse += content;
        }
      }
      
      // Cache the response for 24 hours
      if (fullResponse) {
        setCachedAI(cacheKey, fullResponse);
      }
      
      res.end();
    } catch (error) {
      console.error("Deep mind insights error:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Dashboard Insights API
  app.get("/api/insights/dashboard", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [
        trackerEntries,
        habits,
        habitCompletions,
        routineBlocks,
        routineActivities,
        routineActivityLogs,
        todos,
        journalEntries,
        dailySummaries,
        foodOptions,
        allTransactions,
        allLoans,
        allIncomeStreams,
        finSettings,
        careerProjects,
        careerTasks,
        userProfile,
        memoryNarratives,
      ] = await Promise.all([
        storage.getAllTrackerEntries(userId),
        storage.getAllHabits(userId),
        storage.getAllHabitCompletions(userId),
        storage.getAllRoutineBlocks(userId),
        storage.getAllRoutineActivities(userId),
        storage.getAllRoutineLogs(userId),
        storage.getAllTodos(userId),
        storage.getAllJournalEntries(userId),
        storage.getAllDailySummaries(userId),
        storage.getAllFoodOptions(userId),
        storage.getAllTransactions(userId),
        storage.getAllLoans(userId),
        storage.getAllIncomeStreams(userId),
        storage.getFinanceSettings(userId),
        storage.getAllCareerProjects(userId),
        storage.getAllCareerTasks(userId),
        storage.getUserProfile(userId),
        storage.getMemoryNarratives(userId).catch(() => []),
      ]);

      // Compute current state from recent tracker data (inline deep-mind/now logic)
      let currentState = null;
      if (trackerEntries.length > 0) {
        const recentEntries = [...trackerEntries]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50);
        const mostRecent = recentEntries[0];

        let driver = "Unknown";
        if (mostRecent.sleepHours !== null && mostRecent.sleepHours < 5) {
          driver = "Sleep";
        } else if (mostRecent.triggerTag) {
          const tagMap: Record<string, string> = {
            work: "Work", loneliness: "Loneliness", pain: "Pain",
            noise: "Stress", sleep: "Sleep", body: "Pain", unknown: "Unknown"
          };
          driver = tagMap[mostRecent.triggerTag] || mostRecent.triggerTag;
        } else if (mostRecent.workLoad !== null && mostRecent.workLoad >= 7) {
          driver = "Work";
        }

        if (driver === "Unknown") {
          const recentJournals = [...journalEntries]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
          const driverCounts: Record<string, number> = {};
          recentJournals.forEach(j => {
            if (j.primaryDriver) driverCounts[j.primaryDriver] = (driverCounts[j.primaryDriver] || 0) + 1;
          });
          const topDriver = Object.entries(driverCounts).sort((a, b) => b[1] - a[1])[0];
          if (topDriver) driver = topDriver[0];
        }

        const sampleSize = recentEntries.length;
        const driverConfidence = sampleSize < 5 ? "Low" : sampleSize < 15 ? "Medium" : "High";

        let stability = 50;
        const recentFive = recentEntries.slice(0, 5);
        const avgMood = recentFive.reduce((s, e) => s + e.mood, 0) / recentFive.length;
        const moodVariance = recentFive.length > 1
          ? recentFive.reduce((s, e) => s + Math.pow(e.mood - avgMood, 2), 0) / recentFive.length : 0;
        const avgDissociation = recentFive.reduce((s, e) => s + e.dissociation, 0) / recentFive.length;
        stability = Math.max(0, Math.min(100, Math.round(100 - avgDissociation - (moodVariance * 5))));

        let riskFlag: string | null = null;
        const lowSleep = (mostRecent.sleepHours ?? 8) < 5;
        const highStress = mostRecent.stress > 70;
        const highDissociation = mostRecent.dissociation > 60;
        if (lowSleep && (highStress || highDissociation)) {
          riskFlag = "High risk of crash in next 12h";
        }

        const suggestions: Record<string, { do: string; avoid: string }> = {
          Sleep: { do: "10-min power nap or dim lights", avoid: "Coffee after 2pm" },
          Work: { do: "5-min walk or stretch", avoid: "Starting new big tasks" },
          Loneliness: { do: "Text one person", avoid: "Doom scrolling alone" },
          Pain: { do: "Gentle stretch or heat pad", avoid: "Pushing through it" },
          Stress: { do: "Box breathing 4-4-4-4", avoid: "Checking work messages" },
          Unknown: { do: "5-min grounding exercise", avoid: "Making big decisions" },
        };

        currentState = {
          driver,
          driverConfidence,
          stability,
          riskFlag,
          suggestion: suggestions[driver] || suggestions.Unknown,
        };
      }

      // Map memory narratives for dashboard — prioritize cross-domain insights
      // and high-confidence patterns, skip obvious single-domain statements
      const narratives = (memoryNarratives as any[])
        .filter((n: any) => n.confidence >= 0.55)
        .sort((a: any, b: any) => {
          // Prefer cross-domain insights over single-domain ones
          const aCross = a.domain === "cross_domain" ? 1 : 0;
          const bCross = b.domain === "cross_domain" ? 1 : 0;
          if (aCross !== bCross) return bCross - aCross;
          return b.confidence - a.confidence;
        })
        .slice(0, 4)
        .map((n: any) => ({
          domain: n.domain,
          narrative: n.narrative,
          confidence: n.confidence,
        }));

      const insights = await computeDashboardInsights({
        trackerEntries,
        habits,
        habitCompletions,
        routineBlocks,
        routineActivities,
        routineActivityLogs,
        todos,
        journalEntries,
        dailySummaries,
        foodOptions,
        transactions: allTransactions,
        loans: allLoans,
        incomeStreams: allIncomeStreams,
        financeSettings: finSettings,
        careerProjects,
        careerTasks,
        displayName: userProfile.displayName,
        currentState,
        narratives,
      });

      const validated = DashboardInsightsSchema.parse(insights);
      res.json(validated);
    } catch (error) {
      console.error("Dashboard insights error:", error);
      res.status(500).json({ error: "Failed to compute dashboard insights" });
    }
  });

  // Loans Routes
  app.get("/api/loans", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const loans = await storage.getAllLoans(userId);
      res.json(loans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loans" });
    }
  });

  app.post("/api/loans", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertLoanSchema.parse({ ...req.body, userId });
      const loan = await storage.createLoan(userId, validatedData);
      res.status(201).json(loan);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/loans/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertLoanSchema.partial().parse(req.body);
      const loan = await storage.updateLoan(userId, req.params.id, validatedData);
      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }
      res.json(loan);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/loans/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.deleteLoan(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Loan not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete loan" });
    }
  });

  // Loan Payments Routes
  app.get("/api/loans/:id/payments", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const payments = await storage.getLoanPayments(userId, req.params.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan payments" });
    }
  });

  app.post("/api/loans/:id/payments", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const loan = await storage.getLoan(userId, req.params.id);
      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      const validatedData = insertLoanPaymentSchema.parse({
        ...req.body,
        loanId: req.params.id
      });

      const paymentDate = validatedData.paymentDate || new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = `${monthNames[paymentDate.getMonth()]} ${paymentDate.getFullYear()}`;
      
      const transaction = await storage.createTransaction(userId, {
        type: "expense",
        category: "debt_payment",
        amount: validatedData.amount,
        name: `Loan payment: ${loan.name}`,
        date: paymentDate,
        month: month,
        isRecurring: 0
      });

      const payment = await storage.createLoanPayment(userId, {
        ...validatedData,
        transactionId: transaction.id
      });

      res.status(201).json(payment);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  // Admin Routes (protected by admin password)
  app.post("/api/admin/users", async (req, res) => {
    try {
      const { password, displayName, adminPassword } = req.body;
      if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ error: "Invalid admin password" });
      }
      if (!password || typeof password !== "string" || password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }
      const bcrypt = await import("bcrypt");
      const passwordHash = await bcrypt.hash(password, 12);
      const { users } = await import("@shared/schema");
      const [user] = await (await import("./db")).db.insert(users).values({
        passwordHash,
        displayName: displayName || null,
      }).returning();
      res.status(201).json({ id: user.id, displayName: user.displayName });
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const adminPassword = req.query.adminPassword as string;
      if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ error: "Invalid admin password" });
      }
      const { users } = await import("@shared/schema");
      const { db } = await import("./db");
      const allUsers = await db.select({
        id: users.id,
        displayName: users.displayName,
        createdAt: users.createdAt,
      }).from(users);
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const { adminPassword } = req.body;
      if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ error: "Invalid admin password" });
      }
      const { users } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const result = await db.delete(users).where(eq(users.id, req.params.id)).returning();
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ==================== MEDICAL MODULE ROUTES ====================

  const medResources = [
    { path: "diagnoses", get: "getMedDiagnoses", create: "createMedDiagnosis", update: "updateMedDiagnosis", del: "deleteMedDiagnosis" },
    { path: "priorities", get: "getMedPriorities", create: "createMedPriority", update: "updateMedPriority", del: "deleteMedPriority" },
    { path: "pain-mechanisms", get: "getMedPainMechanisms", create: "createMedPainMechanism", update: "updateMedPainMechanism", del: "deleteMedPainMechanism" },
    { path: "medications", get: "getMedMedications", create: "createMedMedication", update: "updateMedMedication", del: "deleteMedMedication" },
    { path: "timeline-events", get: "getMedTimelineEvents", create: "createMedTimelineEvent", update: "updateMedTimelineEvent", del: "deleteMedTimelineEvent" },
    { path: "medical-network", get: "getMedMedicalNetwork", create: "createMedMedicalNetworkEntry", update: "updateMedMedicalNetworkEntry", del: "deleteMedMedicalNetworkEntry" },
    { path: "vault-documents", get: "getMedVaultDocuments", create: "createMedVaultDocument", update: "updateMedVaultDocument", del: "deleteMedVaultDocument" },
  ] as const;

  function sanitizeMedBody(body: any) {
    const { userId, id, ...safe } = body || {};
    return safe;
  }

  for (const r of medResources) {
    app.get(`/api/medical/${r.path}`, async (req, res) => {
      try {
        const userId = req.session.userId!;
        const data = await (storage as any)[r.get](userId);
        res.json(data);
      } catch (e: any) { res.status(500).json({ error: "Internal server error" }); }
    });
    app.post(`/api/medical/${r.path}`, async (req, res) => {
      try {
        const userId = req.session.userId!;
        const row = await (storage as any)[r.create](userId, sanitizeMedBody(req.body));
        res.status(201).json(row);
      } catch (e: any) { res.status(400).json({ error: "Invalid data" }); }
    });
    app.patch(`/api/medical/${r.path}/:id`, async (req, res) => {
      try {
        const userId = req.session.userId!;
        const row = await (storage as any)[r.update](userId, parseInt(req.params.id), sanitizeMedBody(req.body));
        if (!row) return res.status(404).json({ error: "Not found" });
        res.json(row);
      } catch (e: any) { res.status(400).json({ error: "Invalid data" }); }
    });
    app.delete(`/api/medical/${r.path}/:id`, async (req, res) => {
      try {
        const userId = req.session.userId!;
        const success = await (storage as any)[r.del](userId, parseInt(req.params.id));
        if (!success) return res.status(404).json({ error: "Not found" });
        res.status(204).send();
      } catch (e: any) { res.status(500).json({ error: "Internal server error" }); }
    });
  }

  app.get("/api/medical/profile", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getMedicalProfile(userId);
      res.json(profile || {});
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/medical/profile", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.upsertMedicalProfile(userId, sanitizeMedBody(req.body));
      res.json(profile);
    } catch (e: any) { res.status(400).json({ error: "Invalid data" }); }
  });

  app.post("/api/medical/reset", async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.resetMedicalData(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Medical reset error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/medical/upload", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { fileName, fileData, mimeType } = req.body;

      if (!fileName || !fileData || !mimeType) {
        return res.status(400).json({ error: "fileName, fileData, and mimeType are required" });
      }

      const isImage = mimeType.startsWith("image/");
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      const [profile, diagnoses, medications] = await Promise.all([
        storage.getMedicalProfile(userId),
        storage.getMedDiagnoses(userId),
        storage.getMedMedications(userId),
      ]);

      let existingContext = "";
      if (diagnoses.length > 0) existingContext += `Existing diagnoses: ${diagnoses.map(d => d.label).join(", ")}\n`;
      if (medications.length > 0) existingContext += `Current medications: ${medications.map(m => m.name).join(", ")}\n`;

      const analysisPrompt = `You are a senior clinical analyst embedded in a personal health tracking system. Your job is NOT to parse documents — it is to UNDERSTAND them like a doctor would, then distill the clinically meaningful information for the patient.

${existingContext ? `EXISTING PATIENT DATA (do not duplicate these):\n${existingContext}` : ""}

CLINICAL ANALYSIS RULES — READ CAREFULLY:

1. CONSOLIDATE, DON'T LIST EVERYTHING.
   A document may describe 15 findings. Most are sub-findings of a single clinical picture. Your job is to identify the PRIMARY DIAGNOSES — the root conditions that a treating physician would put on a problem list. Sub-findings, supporting evidence, and imaging details are NOT separate diagnoses.
   
   Example: If a spine MRI report mentions disc herniation, foraminal stenosis, nerve root compression, epidural fibrosis, and neuritis — these are all part of ONE clinical picture (e.g., "Failed back surgery syndrome with L5-S1 disc herniation and S1 radiculopathy"). Do NOT create 5 separate conditions.

2. MAXIMUM LIMITS — BE SELECTIVE.
   - newDiagnoses: Maximum 3-4. Only PRIMARY clinical conditions. Consolidate related findings into one diagnosis. Use the "description" field (keep it to 1 concise sentence) to note the key supporting findings.
   - priorities: Maximum 2-3. Only the MOST IMPORTANT next steps — things that would change patient outcomes. Not every recommendation in a document deserves to be an action item.
   - timelineEvents: Maximum 3-4. Only major clinical milestones (surgeries, key scans, diagnosis dates). Not every mention of a date is an event.
   - newMedications: ONLY medications the patient is CURRENTLY TAKING or has been formally PRESCRIBED. If a document merely suggests, recommends, or discusses a medication as a potential option, do NOT add it. A recommendation to "discuss pregabalin with your doctor" is NOT a prescription.

3. SEVERITY MUST REFLECT CLINICAL JUDGMENT.
   - "critical": Immediate danger or urgent intervention needed
   - "high": Significant active condition requiring treatment
   - "medium": Condition present, being managed or monitored
   - "low": Minor finding, stable, or resolved

4. DESCRIPTIONS MUST BE CONCISE.
   - Diagnosis descriptions: 1 sentence max. State the core finding, not the MRI interpretation.
   - Priority descriptions: 1 sentence. What to do and why.
   - Timeline descriptions: 1 sentence. What happened.
   - Do NOT copy medical report language. Translate to clear, patient-friendly language.

5. DOCUMENT CLASSIFICATION.
   - "summary": 2 sentences maximum. What this document IS and what it MEANS for the patient.
   - "docType": Use standard categories: "MRI Study", "Lab Report", "Surgical Report", "Prescription", "Clinical Note", "Radiology", "Pathology", "Discharge Summary", "Clinical Analysis"
   - "suggestedName": Short, clear title (e.g., "Lumbar Spine MRI Analysis — Mar 2026")

Return a JSON object with these fields:
{
  "summary": string,
  "docType": string,
  "suggestedName": string,
  "newDiagnoses": [{label, description, severity}],
  "newMedications": [{name, dosage, purpose}],
  "timelineEvents": [{date, title, description, eventType}],
  "priorities": [{label, description, severity}]
}

severity values: "low", "medium", "high", "critical"
eventType values: "surgery", "appointment", "scan", "diagnosis"

Think like a doctor building a patient's problem list — not like a text parser extracting every noun. Return ONLY valid JSON.`;

      const userContent: any[] = [];
      const isTextFile = mimeType === "text/plain" || mimeType === "text/csv";
      const isPdf = mimeType === "application/pdf";

      if (isPdf) {
        let pdfText = "";
        try {
          const { PDFParse } = await import("pdf-parse");
          const pdfBuffer = Buffer.from(fileData, "base64");
          const uint8 = new Uint8Array(pdfBuffer);
          const parser = new PDFParse(uint8);
          const result = await parser.getText();
          pdfText = result.text || "";
          parser.destroy();
        } catch (pdfErr) {
          console.error("PDF parse error:", pdfErr);
          pdfText = "";
        }

        if (pdfText.trim().length > 100) {
          userContent.push({ type: "text", text: `Analyze this medical PDF document: "${fileName}"\n\nFull document text (${pdfText.length} characters):\n\n${pdfText.slice(0, 30000)}` });
        } else {
          userContent.push({ type: "text", text: `A medical PDF file named "${fileName}" was uploaded but text could not be extracted (scanned/image PDF). Based on the filename, provide your best categorization. Summary: "PDF document uploaded — text extraction was not possible. Manual review recommended."` });
        }
      } else if (isImage) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: mimeType, data: fileData },
        });
        userContent.push({ type: "text", text: `Analyze this medical image: "${fileName}"` });
      } else if (isTextFile) {
        const textContent = Buffer.from(fileData, "base64").toString("utf-8");
        userContent.push({ type: "text", text: `Analyze this medical document: "${fileName}"\n\nDocument content:\n${textContent.slice(0, 30000)}` });
      } else {
        userContent.push({ type: "text", text: `A medical file named "${fileName}" (type: ${mimeType}) was uploaded. Based on the filename and type, provide your best categorization. Note that full content extraction is not available for this file format.` });
      }

      const rawAnalysis = await createRawCompletion(analysisPrompt, [
        { role: "user", content: userContent },
      ], { model: MODEL_PRIMARY, maxTokens: 8192 });
      let analysis: any;
      try {
        analysis = JSON.parse(rawAnalysis);
      } catch {
        analysis = { summary: "Document uploaded but could not be fully analyzed.", docType: "Unknown", suggestedName: fileName };
      }

      const vaultDoc = await storage.createMedVaultDocument(userId, {
        userId,
        name: analysis.suggestedName || fileName,
        docType: analysis.docType || "Document",
        date: today,
        description: analysis.summary || "",
        fileData,
        mimeType,
        aiAnalysis: rawAnalysis,
        aiProcessed: 1,
      });

      const created: any = { document: vaultDoc, diagnoses: [], medications: [], timeline: [], priorities: [] };

      if (analysis.newDiagnoses?.length) {
        for (const d of analysis.newDiagnoses) {
          try {
            const row = await storage.createMedDiagnosis(userId, { userId, label: d.label, description: d.description || "", severity: d.severity || "medium" });
            created.diagnoses.push(row);
          } catch {}
        }
      }
      if (analysis.newMedications?.length) {
        for (const m of analysis.newMedications) {
          try {
            const row = await storage.createMedMedication(userId, { userId, name: m.name, dosage: m.dosage || "", purpose: m.purpose || "" });
            created.medications.push(row);
          } catch {}
        }
      }
      if (analysis.timelineEvents?.length) {
        for (const t of analysis.timelineEvents) {
          try {
            const row = await storage.createMedTimelineEvent(userId, { userId, date: t.date || today, title: t.title, description: t.description || "", eventType: t.eventType || "appointment" });
            created.timeline.push(row);
          } catch {}
        }
      }
      if (analysis.priorities?.length) {
        for (const p of analysis.priorities) {
          try {
            const row = await storage.createMedPriority(userId, { userId, label: p.label, description: p.description || "", severity: p.severity || "medium" });
            created.priorities.push(row);
          } catch {}
        }
      }

      res.json({
        success: true,
        analysis: analysis.summary,
        document: vaultDoc,
        autoCreated: {
          diagnoses: created.diagnoses.length,
          medications: created.medications.length,
          timeline: created.timeline.length,
          priorities: created.priorities.length,
        },
      });
    } catch (error: any) {
      console.error("Medical upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/medical/chat", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { messages: chatMessages } = req.body;

      const { buildUnifiedContextWithMemory, buildUnifiedSystemPrompt } = await import("./lib/unified-context");
      const { context: unifiedContext } = await buildUnifiedContextWithMemory(userId, "medical");

      const [painMechanisms, timelineEvents, vaultDocs] = await Promise.all([
        storage.getMedPainMechanisms(userId),
        storage.getMedTimelineEvents(userId),
        storage.getMedVaultDocuments(userId),
      ]);

      let extraMedContext = "";
      if (painMechanisms.length > 0) {
        extraMedContext += `\n<PAIN_MECHANISMS>\n${painMechanisms.map(p => `- ${p.label}: ${p.description}`).join("\n")}\n</PAIN_MECHANISMS>`;
      }
      if (timelineEvents.length > 0) {
        extraMedContext += `\n<CLINICAL_TIMELINE>\n${timelineEvents.slice(0, 10).map(t => `- ${t.date}: ${t.title} — ${t.description}`).join("\n")}\n</CLINICAL_TIMELINE>`;
      }
      if (vaultDocs.length > 0) {
        const analyzed = vaultDocs.filter(d => d.aiAnalysis);
        if (analyzed.length > 0) {
          extraMedContext += `\n<VAULT_DOCUMENTS>\n${analyzed.map(d => `- ${d.name} (${d.docType}, ${d.date}): ${d.description}`).join("\n")}\n</VAULT_DOCUMENTS>`;
        }
      }

      const basePrompt = buildUnifiedSystemPrompt("medical");
      const systemPrompt = `${basePrompt}

## CONTEXT DATA (use silently)
${unifiedContext}${extraMedContext}`;


      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const fullMedResponse = await aiStream(
        [
          { role: "system", content: systemPrompt },
          ...chatMessages.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        res,
        { maxTokens: 2048 }
      );

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Background: extract personal insights from medical conversation
      if (fullMedResponse && chatMessages.length > 0) {
        (async () => {
          try {
            const { extractFromConversation, persistMemories } = await import("./lib/memory-graph");
            const convMessages = [
              ...chatMessages.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
              { role: "assistant", content: fullMedResponse },
            ];
            const existingEntities = await storage.getMemoryEntities(userId);
            const result = await extractFromConversation(convMessages, "medical", existingEntities);
            if (result.entities.length > 0 || result.connections.length > 0) {
              await persistMemories(userId, result, "conversation_medical", new Date().toISOString());
            }
          } catch (err) {
            console.error("[PostChat] Medical conversation extraction failed:", err);
          }
        })();
      }
    } catch (error: any) {
      console.error("Medical chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // ==================== COMMAND CENTER (WORK) ROUTES ====================

  app.get("/api/work/microsoft/status", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const connection = await storage.getMicrosoftConnection(userId);
      if (!connection) {
        return res.json({ connected: false });
      }
      res.json({
        connected: true,
        displayName: connection.displayName,
        email: connection.email,
        connectedAt: connection.connectedAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/work/microsoft/auth", async (req, res) => {
    try {
      const { getAuthUrl } = await import("./lib/microsoft-graph");
      const { randomBytes } = await import("crypto");
      const oauthState = randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await db.execute(sql`
        INSERT INTO oauth_states (state, user_id, expires_at) VALUES (${oauthState}, ${req.session.userId!}, ${expiresAt})
      `);
      const authUrl = getAuthUrl(oauthState);
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to initiate authentication" });
    }
  });

  app.get("/api/work/microsoft/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.status(400).send("Missing code or state");
      }

      const result = await db.execute(sql`
        SELECT user_id, expires_at FROM oauth_states WHERE state = ${state as string}
      `);
      const pending = result.rows[0] as { user_id: string; expires_at: string } | undefined;
      await db.execute(sql`DELETE FROM oauth_states WHERE state = ${state as string}`);

      if (!pending || Date.now() > Number(pending.expires_at)) {
        return res.status(403).send("Invalid or expired OAuth state");
      }
      const userId = pending.user_id;

      const { exchangeCodeForTokens, getProfile } = await import("./lib/microsoft-graph");
      const tokens = await exchangeCodeForTokens(code as string);
      const tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);

      const profile = await getProfile(tokens.accessToken);

      await storage.upsertMicrosoftConnection(userId, {
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry,
        microsoftUserId: profile.id,
        displayName: profile.displayName || null,
        email: profile.mail || profile.userPrincipalName || null,
        status: "active",
      });

      res.send(`<html><body><h2>Connected successfully!</h2><p>You can close this tab and return to Orbia.</p><script>window.close();</script></body></html>`);
    } catch (error: any) {
      console.error("Microsoft OAuth callback error:", error);
      res.status(500).send(`<html><body><h2>Connection failed</h2><p>Please close this tab and try again in Orbia.</p></body></html>`);
    }
  });

  app.post("/api/work/microsoft/disconnect", async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.deleteMicrosoftConnection(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/work/calendar", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, getCalendarEvents, getUserTimezone } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const userTimezone = await getUserTimezone(token);

      const dateParam = req.query.date as string | undefined;
      let startDate: string;
      let endDate: string;

      if (dateParam) {
        startDate = new Date(dateParam + "T00:00:00Z").toISOString();
        endDate = new Date(dateParam + "T23:59:59Z").toISOString();
      } else {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        endDate = weekLater.toISOString();
      }

      const events = await getCalendarEvents(token, startDate, endDate, userTimezone);
      res.json(events);
    } catch (error: any) {
      console.error("Calendar fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/work/teams/chats", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, getRecentChats, getProfile } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const [chats, profile] = await Promise.all([
        getRecentChats(token),
        getProfile(token),
      ]);

      const myEmail = profile?.mail || profile?.userPrincipalName || "";
      const myId = profile?.id || "";

      if (chats?.value) {
        for (const chat of chats.value) {
          if (chat.chatType === "oneOnOne" && chat.members?.length) {
            const otherMember = chat.members.find((m: any) => {
              const memberId = m.userId || m.id;
              const memberEmail = m.email || "";
              return memberId !== myId && memberEmail.toLowerCase() !== myEmail.toLowerCase();
            });
            if (otherMember) {
              chat.resolvedName = otherMember.displayName || "Unknown";
            }
          }
        }
      }

      res.json(chats);
    } catch (error: any) {
      console.error("Teams chats fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/work/teams/chats/:chatId/messages", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, getChatMessages } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const messages = await getChatMessages(token, req.params.chatId);
      res.json(messages);
    } catch (error: any) {
      console.error("Teams messages fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/work/teams/chats/:chatId/messages", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, sendChatMessage } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Message content required" });

      const message = await sendChatMessage(token, req.params.chatId, content);
      res.json(message);
    } catch (error: any) {
      console.error("Teams send message error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/work/calendar/events", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, createCalendarEvent } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const { subject, start, end, isOnline, attendees, location } = req.body;
      if (!subject || !start || !end) {
        return res.status(400).json({ error: "subject, start, and end are required" });
      }

      const event = await createCalendarEvent(token, subject, start, end, {
        isOnline,
        attendees,
        location,
      });
      res.json(event);
    } catch (error: any) {
      console.error("Create calendar event error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/work/emails", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, getRecentEmails } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const top = req.query.top ? parseInt(req.query.top as string) : 10;
      const emails = await getRecentEmails(token, top);
      res.json(emails);
    } catch (error: any) {
      console.error("Emails fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/work/emails/summarize", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, getRecentEmails } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const allEmails = await getRecentEmails(token, 20);
      const emailsList = (allEmails?.value || []).slice(0, 10);
      if (emailsList.length === 0) return res.json({});

      const emailData = emailsList.map((e: any, i: number) => {
        const from = e.from?.emailAddress?.name || e.from?.emailAddress?.address || "Unknown";
        const subject = (e.subject || "No subject").substring(0, 80);
        const preview = (e.bodyPreview || "").substring(0, 120);
        return `${i + 1}. From: ${from} | Subject: ${subject} | Latest message preview: ${preview}`;
      }).join("\n");

      const raw = await aiComplete(
        [
          {
            role: "system",
            content: `Summarize ONLY the latest/most recent message in each email — ignore older replies, forwarded threads, or quoted history. Return ONLY a valid JSON object mapping index numbers (as strings) to summaries. Each summary: max 50 chars, plain language, no sender name (already shown separately). Focus on what the latest message says or asks. Examples: {"1":"New architect role in Germany (remote)","2":"Final test results are ready","3":"Livestream schedule update"}`
          },
          {
            role: "user",
            content: emailData
          }
        ],
        { model: MODEL_FAST, maxTokens: 400, temperature: 0.2 }
      );
      let parsed: Record<string, string> = {};
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch { parsed = {}; }

      const result: Record<string, string> = {};
      emailsList.forEach((e: any, i: number) => {
        const summary = parsed[String(i + 1)];
        if (e.id && summary && typeof summary === "string") {
          result[e.id] = summary.substring(0, 70);
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error("Email summarize error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/work/emails/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, getEmailById } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const email = await getEmailById(token, req.params.id);
      res.json(email);
    } catch (error: any) {
      console.error("Email fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/work/emails/:id/reply", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, replyToEmail } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const { comment } = req.body;
      if (!comment) return res.status(400).json({ error: "comment is required" });

      await replyToEmail(token, req.params.id, comment);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Reply email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/work/emails/send", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, sendEmail } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const { to, subject, body } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "to, subject, and body are required" });
      }

      await sendEmail(token, to, subject, body);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Send email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/work/tasks", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, createTask } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const { title, dueDate, body } = req.body;
      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }

      const task = await createTask(token, title, dueDate, body);
      res.json(task);
    } catch (error: any) {
      console.error("Create task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/work/contacts/search", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, searchContacts } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: "Search query (q) is required" });
      }

      const contacts = await searchContacts(token, q);
      res.json(contacts);
    } catch (error: any) {
      console.error("Search contacts error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/work/meetings", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { getValidToken, createOnlineMeeting } = await import("./lib/microsoft-graph");
      const token = await getValidToken(userId);
      if (!token) return res.status(401).json({ error: "Microsoft account not connected" });

      const { subject, start, end } = req.body;
      if (!subject || !start || !end) {
        return res.status(400).json({ error: "subject, start, and end are required" });
      }

      const meeting = await createOnlineMeeting(token, subject, start, end);
      res.json(meeting);
    } catch (error: any) {
      console.error("Create meeting error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/work/scheduled-messages", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const messages = await storage.getScheduledMessages(userId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/work/scheduled-messages", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { chatId, recipientName, message, timeOfDay, recurrence } = req.body;
      if (!chatId || !recipientName || !message || !timeOfDay) {
        return res.status(400).json({ error: "chatId, recipientName, message, and timeOfDay are required" });
      }
      const scheduled = await storage.createScheduledMessage(userId, {
        userId,
        chatId,
        recipientName,
        message,
        timeOfDay,
        recurrence: recurrence || "daily",
        active: true,
      });
      res.json(scheduled);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/work/scheduled-messages/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const id = parseInt(req.params.id);
      const updated = await storage.updateScheduledMessage(userId, id, req.body);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/work/scheduled-messages/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteScheduledMessage(userId, id);
      if (!deleted) return res.status(404).json({ error: "Not found" });
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/work/chat", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { messages: chatMessages } = req.body;
      if (!chatMessages || !Array.isArray(chatMessages)) {
        return res.status(400).json({ error: "Messages array required" });
      }

      const { buildUnifiedContextWithMemory, buildUnifiedSystemPrompt } = await import("./lib/unified-context");
      const { context: unifiedContext, msToken } = await buildUnifiedContextWithMemory(userId, "work");
      const basePrompt = buildUnifiedSystemPrompt("work");

      const systemPrompt = `${basePrompt}

## CONTEXT DATA (use silently)
${unifiedContext}`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Separate system message from chat messages
      const workMsgs = chatMessages.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));
      if (workMsgs.length === 0 || workMsgs[0].role !== "user") {
        workMsgs.unshift({ role: "user" as const, content: "(continuing)" });
      }

      const stream = await createRawStream(systemPrompt, workMsgs, { model: MODEL_PRIMARY, maxTokens: 2048 });

      let fullResponse = "";
      const executedActions = new Set<string>();

      const ACTION_PATTERNS = [
        { name: "teams_send", regex: /\[TEAMS_SEND\s+chatId="([^"]+)"\s+message="([^"]+)"\]/ },
        { name: "create_event", regex: /\[CREATE_EVENT\s+subject="([^"]+)"\s+start="([^"]+)"\s+end="([^"]+)"\s+online="([^"]+)"\]/ },
        { name: "create_task", regex: /\[CREATE_TASK\s+title="([^"]+)"(?:\s+due="([^"]*)")?\]/ },
        { name: "send_email", regex: /\[SEND_EMAIL\s+to="([^"]+)"\s+subject="([^"]+)"\s+body="([^"]+)"\]/ },
        { name: "schedule_message", regex: /\[SCHEDULE_MESSAGE\s+chatId="([^"]+)"\s+recipient="([^"]+)"\s+message="([^"]+)"\s+time="([^"]+)"\s+recurrence="([^"]+)"\]/ },
        { name: "create_project", regex: /\[CREATE_PROJECT\s+title="([^"]+)"(?:\s+description="([^"]*)")?(?:\s+status="([^"]*)")?(?:\s+deadline="([^"]*)")?\]/ },
        { name: "add_project_task", regex: /\[ADD_TASK\s+project="([^"]+)"\s+title="([^"]+)"(?:\s+priority="([^"]*)")?(?:\s+due="([^"]*)")?\]/ },
        { name: "update_project_status", regex: /\[UPDATE_PROJECT_STATUS\s+project="([^"]+)"\s+status="([^"]+)"\]/ },
        { name: "complete_task", regex: /\[COMPLETE_TASK\s+task="([^"]+)"\]/ },
      ];

      async function executeActions(text: string): Promise<void> {
        const graphLib = msToken ? await import("./lib/microsoft-graph") : null;

        for (const { name, regex } of ACTION_PATTERNS) {
          let match;
          const globalRegex = new RegExp(regex.source, 'g');
          while ((match = globalRegex.exec(text)) !== null) {
            const actionKey = match[0];
            if (executedActions.has(actionKey)) continue;
            executedActions.add(actionKey);

            try {
              switch (name) {
                case "teams_send": {
                  if (!msToken || !graphLib) break;
                  await graphLib.sendChatMessage(msToken!, match[1], match[2]);
                  res.write(`data: ${JSON.stringify({ action: "teams_sent", chatId: match[1], message: match[2] })}\n\n`);
                  break;
                }
                case "create_event": {
                  if (!msToken || !graphLib) break;
                  await graphLib.createCalendarEvent(msToken!, match[1], match[2], match[3], { isOnline: match[4] === "true" });
                  res.write(`data: ${JSON.stringify({ action: "event_created", subject: match[1], start: match[2], end: match[3] })}\n\n`);
                  break;
                }
                case "create_task": {
                  if (!msToken || !graphLib) break;
                  await graphLib.createTask(msToken!, match[1], match[2] || undefined);
                  res.write(`data: ${JSON.stringify({ action: "task_created", title: match[1], due: match[2] || null })}\n\n`);
                  break;
                }
                case "send_email": {
                  if (!msToken || !graphLib) break;
                  await graphLib.sendEmail(msToken!, match[1], match[2], match[3]);
                  res.write(`data: ${JSON.stringify({ action: "email_sent", to: match[1], subject: match[2] })}\n\n`);
                  break;
                }
                case "schedule_message": {
                  await storage.createScheduledMessage(userId, {
                    userId,
                    chatId: match[1],
                    recipientName: match[2],
                    message: match[3],
                    timeOfDay: match[4],
                    recurrence: match[5] || "daily",
                    active: true,
                  });
                  res.write(`data: ${JSON.stringify({ action: "message_scheduled", recipient: match[2], message: match[3], time: match[4], recurrence: match[5] })}\n\n`);
                  break;
                }
                case "create_project": {
                  const project = await storage.createCareerProject(userId, {
                    title: match[1],
                    description: match[2] || null,
                    status: match[3] || "planning",
                    deadline: match[4] || null,
                    progress: 0,
                    nextAction: null,
                    color: null,
                    tags: null,
                  });
                  res.write(`data: ${JSON.stringify({ action: "project_created", id: project.id, title: match[1] })}\n\n`);
                  break;
                }
                case "add_project_task": {
                  const projects = await storage.getAllCareerProjects(userId);
                  const proj = projects.find((p: any) => p.title.toLowerCase() === match[1].toLowerCase());
                  if (!proj) {
                    res.write(`data: ${JSON.stringify({ action: "add_task_failed", error: `Project "${match[1]}" not found` })}\n\n`);
                    break;
                  }
                  const task = await storage.createCareerTask(userId, {
                    title: match[2],
                    projectId: proj.id,
                    parentId: null,
                    completed: false,
                    priority: match[3] || "medium",
                    due: match[4] || null,
                    tags: null,
                    description: null,
                  });
                  res.write(`data: ${JSON.stringify({ action: "project_task_added", id: task.id, title: match[2], project: match[1] })}\n\n`);
                  break;
                }
                case "update_project_status": {
                  const projects2 = await storage.getAllCareerProjects(userId);
                  const proj2 = projects2.find((p: any) => p.title.toLowerCase() === match[1].toLowerCase());
                  if (!proj2) {
                    res.write(`data: ${JSON.stringify({ action: "update_project_failed", error: `Project "${match[1]}" not found` })}\n\n`);
                    break;
                  }
                  await storage.updateCareerProject(userId, proj2.id, { status: match[2] });
                  res.write(`data: ${JSON.stringify({ action: "project_status_updated", project: match[1], status: match[2] })}\n\n`);
                  break;
                }
                case "complete_task": {
                  const allTasks = await storage.getAllCareerTasks(userId);
                  const foundTask = allTasks.find((t: any) => t.title.toLowerCase() === match[1].toLowerCase());
                  if (!foundTask) {
                    res.write(`data: ${JSON.stringify({ action: "complete_task_failed", error: `Task "${match[1]}" not found` })}\n\n`);
                    break;
                  }
                  await storage.updateCareerTask(userId, foundTask.id, { completed: true });
                  res.write(`data: ${JSON.stringify({ action: "task_completed", task: match[1] })}\n\n`);
                  break;
                }
              }
            } catch (err: any) {
              console.error(`Action ${name} failed:`, err.message);
              res.write(`data: ${JSON.stringify({ action: `${name}_failed`, error: err.message })}\n\n`);
            }
          }
        }
      }

      const allActionRegex = /\[(TEAMS_SEND|CREATE_EVENT|CREATE_TASK|SEND_EMAIL|SCHEDULE_MESSAGE|CREATE_PROJECT|ADD_TASK|UPDATE_PROJECT_STATUS|COMPLETE_TASK)\s[^\]]+\]/g;
      let bufferedContent = "";
      let hasActionTag = false;

      for await (const event of stream) {
        if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
        const content = event.delta.text;
        if (content) {
          fullResponse += content;
          bufferedContent += content;

          if (bufferedContent.includes("[") && !allActionRegex.test(bufferedContent)) {
            allActionRegex.lastIndex = 0;
            hasActionTag = true;
            continue;
          }
          allActionRegex.lastIndex = 0;

          if (hasActionTag && allActionRegex.test(bufferedContent)) {
            allActionRegex.lastIndex = 0;
            await executeActions(bufferedContent);
            const cleaned = bufferedContent.replace(allActionRegex, "");
            allActionRegex.lastIndex = 0;
            if (cleaned.trim()) {
              res.write(`data: ${JSON.stringify({ content: cleaned })}\n\n`);
            }
            bufferedContent = "";
            hasActionTag = false;
          } else if (!hasActionTag) {
            if (!bufferedContent.includes("[")) {
              res.write(`data: ${JSON.stringify({ content: bufferedContent })}\n\n`);
              bufferedContent = "";
            }
          }
        }
      }

      if (bufferedContent.trim()) {
        await executeActions(bufferedContent);
        const cleaned = bufferedContent.replace(allActionRegex, "");
        allActionRegex.lastIndex = 0;
        if (cleaned.trim()) {
          res.write(`data: ${JSON.stringify({ content: cleaned })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Background: extract personal insights from work conversation
      if (fullResponse && chatMessages.length > 0) {
        (async () => {
          try {
            const { extractFromConversation, persistMemories } = await import("./lib/memory-graph");
            const convMessages = [
              ...chatMessages.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
              { role: "assistant", content: fullResponse },
            ];
            const existingEntities = await storage.getMemoryEntities(userId);
            const result = await extractFromConversation(convMessages, "work", existingEntities);
            if (result.entities.length > 0 || result.connections.length > 0) {
              await persistMemories(userId, result, "conversation_work", new Date().toISOString());
            }
          } catch (err) {
            console.error("[PostChat] Work conversation extraction failed:", err);
          }
        })();
      }
    } catch (error: any) {
      console.error("Work chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // ==================== MEMORY GRAPH API ====================

  // Get the full memory graph (entities, connections, narratives)
  app.get("/api/memory/graph", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [entities, connections, narratives] = await Promise.all([
        storage.getMemoryEntities(userId),
        storage.getMemoryConnections(userId),
        storage.getMemoryNarratives(userId),
      ]);
      res.json({ entities, connections, narratives });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch memory graph" });
    }
  });

  // Get just the narratives (synthesized understandings)
  app.get("/api/memory/narratives", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const narratives = await storage.getMemoryNarratives(userId);
      res.json(narratives);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch narratives" });
    }
  });

  // Trigger full memory processing (process all unprocessed data + consolidate)
  app.post("/api/memory/process", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { processUnprocessedData } = await import("./lib/memory-graph");
      const result = await processUnprocessedData(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Memory processing failed" });
    }
  });

  // Trigger consolidation only (re-synthesize narratives from existing entities)
  app.post("/api/memory/consolidate", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { consolidateMemories } = await import("./lib/memory-graph");
      await consolidateMemories(userId);
      const narratives = await storage.getMemoryNarratives(userId);
      res.json({ narratives });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Consolidation failed" });
    }
  });

  // Get memory graph stats
  app.get("/api/memory/stats", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [entities, connections, narratives, processingLog] = await Promise.all([
        storage.getMemoryEntities(userId),
        storage.getMemoryConnections(userId),
        storage.getMemoryNarratives(userId),
        storage.getMemoryProcessingLog(userId),
      ]);

      const entityTypes: Record<string, number> = {};
      const categories: Record<string, number> = {};
      entities.forEach((e) => {
        entityTypes[e.entityType] = (entityTypes[e.entityType] || 0) + 1;
        categories[e.category] = (categories[e.category] || 0) + 1;
      });

      res.json({
        totalEntities: entities.length,
        totalConnections: connections.length,
        totalNarratives: narratives.length,
        sourcesProcessed: processingLog.length,
        entityTypes,
        categories,
        strongestConnections: connections
          .sort((a, b) => b.strength * b.occurrences - a.strength * a.occurrences)
          .slice(0, 5)
          .map((c) => {
            const source = entities.find((e) => e.id === c.sourceId);
            const target = entities.find((e) => e.id === c.targetId);
            return { from: source?.name, to: target?.name, type: c.relationType, strength: c.strength, occurrences: c.occurrences };
          }),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch memory stats" });
    }
  });

  // Clear the entire memory graph (reset)
  app.delete("/api/memory/graph", async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.clearMemoryGraph(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear memory graph" });
    }
  });

  // Delete a specific memory entity
  app.delete("/api/memory/entities/:id", async (req, res) => {
    try {
      const userId = req.session.userId!;
      const deleted = await storage.deleteMemoryEntity(userId, req.params.id);
      if (!deleted) return res.status(404).json({ error: "Entity not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete entity" });
    }
  });

  app.post("/api/voice/transcribe", async (req, res) => {
    try {
      const { audioData, mimeType } = req.body;
      if (!audioData) {
        return res.status(400).json({ error: "audioData is required" });
      }

      const audioBuffer = Buffer.from(audioData, "base64");
      console.log("[voice] Received audio:", { base64Length: audioData.length, bufferSize: audioBuffer.length, mimeType });

      if (audioBuffer.length < 100) {
        return res.status(400).json({ error: "Audio data too small" });
      }

      const userId = req.session?.userId;
      let contextPrompt = [
        "Orbia is a personal AI companion and wellness app. Orbia is NOT Olivia or Orbea.",
        "",
        "APP FEATURES AND SECTIONS the user may reference:",
        "- Orbit: the main AI chat page where users talk to Orbia",
        "- Unload: a journaling feature where users vent or reflect on their day",
        "- Workstation: Microsoft 365 integration showing Teams chats, Calendar events, and Emails",
        "- Dashboard: overview of habits, routines, todos, and daily progress",
        "- Daily Tracker: habit tracking page with streaks, completions, and habit management",
        "- Vision & Coach: goal setting and life coaching features",
        "- Medical: health tracking with conditions, medications, care team, and medical documents",
        "- Finance: financial tracking with income, expenses, budgets, and transactions",
        "- Orbital News: news feed",
        "- Settings: app preferences and account settings",
        "- Habits, Routines, Todos: task management features within the Daily Tracker",
        "- Career Projects: project and task management within Workstation",
        "",
        "COMMON ACTIONS the user may say:",
        "- Add a habit, create a routine, add a todo, log a journal entry",
        "- Track a medication, add a condition, upload a document",
        "- Add a transaction, set a budget, log an expense or income",
        "- Create a project, add a task, check my calendar, read my emails",
        "- Show my dashboard, open settings, check my streaks",
      ].join("\n");

      if (userId) {
        try {
          const entities = await storage.getMemoryEntities(userId);
          if (entities.length > 0) {
            const names = new Set<string>();
            const terms = new Set<string>();

            for (const e of entities.slice(0, 50)) {
              names.add(e.name);
              if (e.entityType === "person") names.add(e.name);
              if (e.entityType === "medication") terms.add(e.name);
              if (e.entityType === "condition") terms.add(e.name);
              if (e.entityType === "goal") terms.add(e.name);
            }

            const user = await storage.getUser(userId);
            if (user?.displayName) names.add(user.displayName);

            const uniqueTerms = [...new Set([...names, ...terms])].filter(t => t.length > 1).slice(0, 40);
            if (uniqueTerms.length > 0) {
              contextPrompt += `\n\nUSER-SPECIFIC TERMS (names, medications, conditions, goals): ${uniqueTerms.join(", ")}`;
            }
          }
        } catch (e) {
          console.warn("[voice] Could not load memory context (non-fatal):", e);
        }
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const ext = mimeType?.includes("webm") ? "webm" : mimeType?.includes("mp4") ? "mp4" : mimeType?.includes("ogg") ? "ogg" : "webm";
      const { toFile } = await import("openai");
      const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType || "audio/webm" });

      console.log("[voice] Sending to transcription API with context prompt length:", contextPrompt.length);
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
        prompt: contextPrompt,
      });

      const rawText = transcription.text?.trim();
      console.log("[voice] Raw transcription:", rawText?.substring(0, 100));

      if (!rawText || rawText.length < 30) {
        res.json({ text: rawText || "" });
        return;
      }

      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const anthropic = new Anthropic();
        const formatResult = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `You are a text formatter. Take the following raw speech transcription and format it cleanly for a chat input. Rules:
- If the person mentioned multiple distinct points, topics, or requests, use bullet points or numbered lists
- If it's a single thought or question, keep it as a clean paragraph — do NOT add bullets
- Add line breaks between distinct sections or topic shifts
- Fix obvious speech artifacts (repeated words, filler words like "um", "uh", "like")
- Keep the person's voice and tone — do NOT rewrite or summarize, just format
- Do NOT add any introduction, explanation, or commentary — output ONLY the formatted text

Raw transcription:
${rawText}`
          }],
        });

        const formatted = formatResult.content[0].type === "text" ? formatResult.content[0].text.trim() : rawText;
        console.log("[voice] Formatted transcription:", formatted?.substring(0, 100));
        res.json({ text: formatted });
      } catch (formatError) {
        console.warn("[voice] Formatting failed, returning raw text:", formatError);
        res.json({ text: rawText });
      }
    } catch (error: any) {
      console.error("[voice] Transcription error:", error?.message || error);
      res.status(500).json({ error: error.message || "Transcription failed" });
    }
  });

  app.post("/api/voice/converse", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { message, history, therapyMode, mode } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "message is required and must be a string" });
      }
      if (message.length > 10000) {
        return res.status(400).json({ error: "message too long" });
      }
      const validModes = ["orbit", "work", "medical"];
      const safeMode = validModes.includes(mode) ? mode : "orbit";

      console.log("[voice-converse] Starting conversation for user:", userId, "mode:", safeMode);

      const { buildUnifiedContextWithMemory, buildUnifiedSystemPrompt, buildTherapeuticPrompt } = await import("./lib/unified-context");
      const { context: unifiedContext } = await buildUnifiedContextWithMemory(userId, safeMode);

      let systemPrompt: string;
      if (therapyMode) {
        let clinicalContext = "";
        try {
          const therapeuticNarratives = await storage.getMemoryNarratives(userId);
          const clinical = therapeuticNarratives.filter((n: any) => n.domain === "therapeutic");
          if (clinical.length > 0) {
            clinicalContext = clinical.map((n: any) => `${n.narrativeKey}: ${n.narrative}`).join("\n");
          }
        } catch (err) {}
        const therapeuticPrompt = buildTherapeuticPrompt(clinicalContext || undefined);
        systemPrompt = `${therapeuticPrompt}\n\n## CONTEXT DATA (use silently)\n${unifiedContext}`;
      } else {
        const basePrompt = buildUnifiedSystemPrompt(safeMode);
        systemPrompt = `${basePrompt}\n\n## CONTEXT DATA (use silently)\n${unifiedContext}`;
      }

      systemPrompt += `\n\nIMPORTANT: This is a VOICE conversation. The user is speaking to you and your response will be read aloud. Keep your response concise, conversational, and natural for spoken delivery. Avoid markdown formatting, bullet points, or structured lists — speak as you would in a natural conversation. Keep responses under 3-4 sentences unless the user asked for detailed information.`;

      const chatMessages: { role: "user" | "assistant"; content: string }[] = [];
      if (history && Array.isArray(history)) {
        for (const h of history.slice(-6)) {
          if (h.role === "user" || h.role === "assistant") {
            chatMessages.push({ role: h.role, content: h.content });
          }
        }
      }
      chatMessages.push({ role: "user", content: message });

      if (chatMessages[0]?.role !== "user") {
        chatMessages.unshift({ role: "user", content: "(continuing)" });
      }

      const { createRawCompletion } = await import("./lib/ai-client");
      const textResponse = await createRawCompletion(systemPrompt, chatMessages, {
        model: "claude-sonnet-4-6",
        maxTokens: 600,
      });

      console.log("[voice-converse] AI response generated, length:", textResponse.length);

      let audioData: string | null = null;
      try {
        const OpenAI = (await import("openai")).default;
        const openai = new OpenAI({
          apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
          baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        });

        const ttsResponse = await openai.chat.completions.create({
          model: "gpt-audio-mini",
          modalities: ["text", "audio"],
          audio: { voice: "sage", format: "mp3" },
          messages: [
            { role: "system", content: "You are reading a response aloud. Repeat the following text exactly as given, naturally and warmly. Do not add, remove, or change any words." },
            { role: "user", content: textResponse },
          ],
          max_tokens: 2000,
        });

        const audio = ttsResponse.choices[0]?.message?.audio;
        if (audio?.data) {
          audioData = audio.data;
          console.log("[voice-converse] Audio generated, size:", audioData.length);
        }
      } catch (ttsError: any) {
        console.error("[voice-converse] TTS failed (returning text only):", ttsError?.message);
      }

      res.json({
        text: textResponse,
        audio: audioData,
        audioFormat: "mp3",
      });
    } catch (error: any) {
      console.error("[voice-converse] Error:", error?.message || error);
      res.status(500).json({ error: error.message || "Voice conversation failed" });
    }
  });

  return httpServer;
}
