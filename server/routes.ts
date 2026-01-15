import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertSystemMemberSchema, 
  insertTrackerEntrySchema, 
  insertSystemMessageSchema,
  insertHeadspaceRoomSchema,
  insertSystemSettingsSchema,
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
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
  
  // System Members Routes
  app.get("/api/members", async (req, res) => {
    try {
      const members = await storage.getAllMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch member" });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const validatedData = insertSystemMemberSchema.parse(req.body);
      const member = await storage.createMember(validatedData);
      res.status(201).json(member);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/members/:id", async (req, res) => {
    try {
      const validatedData = insertSystemMemberSchema.partial().parse(req.body);
      const member = await storage.updateMember(req.params.id, validatedData);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/members/:id", async (req, res) => {
    try {
      const success = await storage.deleteMember(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete member" });
    }
  });

  // Tracker Entries Routes
  app.get("/api/tracker", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const entries = limit 
        ? await storage.getRecentTrackerEntries(limit)
        : await storage.getAllTrackerEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tracker entries" });
    }
  });

  app.get("/api/tracker/:id", async (req, res) => {
    try {
      const entry = await storage.getTrackerEntry(req.params.id);
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
      const validatedData = insertTrackerEntrySchema.parse(req.body);
      const entry = await storage.createTrackerEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.put("/api/tracker/:id", async (req, res) => {
    try {
      const validatedData = insertTrackerEntrySchema.partial().parse(req.body);
      const entry = await storage.updateTrackerEntry(req.params.id, validatedData);
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
      const success = await storage.deleteTrackerEntry(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tracker entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tracker entry" });
    }
  });

  // System Messages Routes
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/:id", async (req, res) => {
    try {
      const message = await storage.getMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch message" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertSystemMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const success = await storage.deleteMessage(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Headspace Rooms Routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch room" });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const validatedData = insertHeadspaceRoomSchema.parse(req.body);
      const room = await storage.createRoom(validatedData);
      res.status(201).json(room);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/rooms/:id", async (req, res) => {
    try {
      const validatedData = insertHeadspaceRoomSchema.partial().parse(req.body);
      const room = await storage.updateRoom(req.params.id, validatedData);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/rooms/:id", async (req, res) => {
    try {
      const success = await storage.deleteRoom(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete room" });
    }
  });

  // System Settings Routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const validatedData = insertSystemSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(validatedData);
      res.json(settings);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.get("/api/export", async (req, res) => {
    try {
      const [settings, habits, habitCompletions, routineBlocks, routineActivities, 
             trackerEntries, journalEntries, todos, members, visionItems, 
             dailySummaries, expenses, transactions] = await Promise.all([
        storage.getSettings(),
        storage.getAllHabits(),
        storage.getAllHabitCompletions(),
        storage.getAllRoutineBlocks(),
        storage.getAllRoutineActivities(),
        storage.getRecentTrackerEntries(10000),
        storage.getAllJournalEntries(),
        storage.getAllTodos(),
        storage.getAllMembers(),
        storage.getVision(),
        storage.getAllDailySummaries(),
        storage.getAllExpenses(),
        storage.getAllTransactions(),
      ]);
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        data: {
          settings,
          habits,
          habitCompletions,
          routineBlocks,
          routineActivities,
          trackerEntries,
          journalEntries,
          todos,
          members,
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
      const allHabits = await storage.getAllHabits();
      res.json(allHabits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch habits" });
    }
  });

  app.get("/api/habit-completions", async (req, res) => {
    try {
      const allCompletions = await storage.getAllHabitCompletions();
      res.json(allCompletions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch habit completions" });
    }
  });

  app.get("/api/habits/:id", async (req, res) => {
    try {
      const habit = await storage.getHabit(req.params.id);
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
      const validatedData = insertHabitSchema.parse(req.body);
      const habit = await storage.createHabit(validatedData);
      res.status(201).json(habit);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/habits/:id", async (req, res) => {
    try {
      const validatedData = insertHabitSchema.partial().parse(req.body);
      const habit = await storage.updateHabit(req.params.id, validatedData);
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
      const success = await storage.deleteHabit(req.params.id);
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
      const completions = await storage.getHabitCompletions(req.params.id);
      res.json(completions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch completions" });
    }
  });

  app.post("/api/habits/:id/completions", async (req, res) => {
    try {
      const validatedData = insertHabitCompletionSchema.parse({
        ...req.body,
        habitId: req.params.id
      });
      const completion = await storage.addHabitCompletion(validatedData);
      res.status(201).json(completion);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/habits/:id/completions/:date", async (req, res) => {
    try {
      const success = await storage.removeHabitCompletion(req.params.id, req.params.date);
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
      const allHabits = await storage.getAllHabits();
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
        
        await storage.updateHabit(habit.id, { icon });
        results.push({ id: habit.id, title: habit.title, icon });
      }

      res.json({ updated: results.length, habits: results });
    } catch (error) {
      console.error("Regenerate icons error:", error);
      res.status(500).json({ error: "Failed to regenerate icons" });
    }
  });

  // Routine Blocks Routes
  app.get("/api/routine-blocks", async (req, res) => {
    try {
      const blocks = await storage.getAllRoutineBlocks();
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routine blocks" });
    }
  });

  app.post("/api/routine-blocks", async (req, res) => {
    try {
      const validatedData = insertRoutineBlockSchema.parse(req.body);
      const block = await storage.createRoutineBlock(validatedData);
      res.status(201).json(block);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/routine-blocks/:id", async (req, res) => {
    try {
      const validatedData = insertRoutineBlockSchema.partial().parse(req.body);
      const block = await storage.updateRoutineBlock(req.params.id, validatedData);
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
      const success = await storage.deleteRoutineBlock(req.params.id);
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
      const activities = await storage.getAllRoutineActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routine activities" });
    }
  });

  app.get("/api/routine-blocks/:id/activities", async (req, res) => {
    try {
      const activities = await storage.getActivitiesByBlock(req.params.id);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/routine-activities", async (req, res) => {
    try {
      const validatedData = insertRoutineActivitySchema.parse(req.body);
      const activity = await storage.createRoutineActivity(validatedData);
      res.status(201).json(activity);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/routine-activities/:id", async (req, res) => {
    try {
      const validatedData = insertRoutineActivitySchema.partial().parse(req.body);
      const activity = await storage.updateRoutineActivity(req.params.id, validatedData);
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
      const success = await storage.deleteRoutineActivity(req.params.id);
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
      const logs = await storage.getActivityLogsForDate(req.params.date);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routine logs" });
    }
  });

  app.post("/api/routine-logs", async (req, res) => {
    try {
      const validatedData = insertRoutineActivityLogSchema.parse(req.body);
      const log = await storage.addActivityLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.delete("/api/routine-logs/:activityId/:date", async (req, res) => {
    try {
      const success = await storage.removeActivityLog(req.params.activityId, req.params.date);
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
      const parsed = toggleRoutineSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const { activityId, date, habitId, action } = parsed.data;
      const result = await storage.toggleRoutineActivityWithHabit(activityId, date, habitId || null, action);
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
      const days = parseInt(req.query.days as string) || 14;
      
      // Fetch all linked data for analysis
      const [entries, habits, completions, routineBlocks, routineActivities, routineLogs, members, dailySummaries, journalEntries] = await Promise.all([
        storage.getAllTrackerEntries(),
        storage.getAllHabits(),
        storage.getAllHabitCompletions(),
        storage.getAllRoutineBlocks(),
        storage.getAllRoutineActivities(),
        storage.getAllRoutineLogs(),
        storage.getAllMembers(),
        storage.getAllDailySummaries(),
        storage.getAllJournalEntries()
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
        frontingMember: members.find(m => m.id === e.frontingMemberId)
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
            avgDissociationLowSleep: lowSleep.length > 0 ? Math.round(lowSleep.reduce((sum, pe) => sum + (pe.entry.dissociation || 0), 0) / lowSleep.length) : null,
            avgDissociationGoodSleep: goodSleep.length > 0 ? Math.round(goodSleep.reduce((sum, pe) => sum + (pe.entry.dissociation || 0), 0) / goodSleep.length) : null,
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
        
        // Fronting member patterns
        const frontingPatterns = (() => {
          const memberStats = new Map<string, { count: number; totalMood: number; totalStress: number; totalDissociation: number; name: string; role: string }>();
          parsedEntries.forEach(({ entry, frontingMember }) => {
            if (frontingMember) {
              const existing = memberStats.get(frontingMember.id) || { 
                count: 0, totalMood: 0, totalStress: 0, totalDissociation: 0, 
                name: frontingMember.name, role: frontingMember.role || ''
              };
              existing.count++;
              existing.totalMood += entry.mood || 5;
              existing.totalStress += entry.stress || 0;
              existing.totalDissociation += entry.dissociation || 0;
              memberStats.set(frontingMember.id, existing);
            }
          });
          return Array.from(memberStats.values()).map(s => ({
            name: s.name,
            role: s.role,
            entriesCount: s.count,
            percentageOfEntries: parsedEntries.length > 0 ? Math.round((s.count / parsedEntries.length) * 100) : 0,
            avgMood: (s.totalMood / s.count).toFixed(1),
            avgStress: Math.round(s.totalStress / s.count),
            avgDissociation: Math.round(s.totalDissociation / s.count),
          }));
        })();
        
        // Overall trends
        const overallMetrics = {
          avgMood: parsedEntries.length > 0 ? (parsedEntries.reduce((sum, pe) => sum + (pe.entry.mood || 5), 0) / parsedEntries.length).toFixed(1) : null,
          avgStress: parsedEntries.length > 0 ? Math.round(parsedEntries.reduce((sum, pe) => sum + (pe.entry.stress || 0), 0) / parsedEntries.length) : null,
          avgDissociation: parsedEntries.length > 0 ? Math.round(parsedEntries.reduce((sum, pe) => sum + (pe.entry.dissociation || 0), 0) / parsedEntries.length) : null,
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
          const avgDissociationHighRoutine = highRoutineDays.reduce((s, pe) => s + (pe.entry.dissociation || 0), 0) / highRoutineDays.length;
          const avgDissociationLowRoutine = lowRoutineDays.reduce((s, pe) => s + (pe.entry.dissociation || 0), 0) / lowRoutineDays.length;
          
          const moodDiff = avgMoodHighRoutine - avgMoodLowRoutine;
          const stressDiff = avgStressLowRoutine - avgStressHighRoutine;
          const dissociationDiff = avgDissociationLowRoutine - avgDissociationHighRoutine;
          
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
            avgDissociationHighRoutine: Math.round(avgDissociationHighRoutine),
            avgDissociationLowRoutine: Math.round(avgDissociationLowRoutine),
            dissociationReduction: Math.round(dissociationDiff),
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
          frontingPatterns, 
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
        moodEntries: parsedEntries.map(({ entry: e, parsed, frontingMember }) => ({
          date: e.timestamp,
          mood: { value: e.mood, scale: "1-10" },
          energy: { value: e.energy, scale: "1-10" },
          stress: { value: e.stress, scale: "0-100" },
          dissociation: { value: e.dissociation, scale: "0-100" },
          capacity: e.capacity !== null ? { value: e.capacity, scale: "0-5", description: "How much can they handle right now (not mood or energy)" } : null,
          triggerTag: e.triggerTag || null,
          workLoad: e.workLoad !== null ? { value: e.workLoad, scale: "0-10", description: "How hostile/draining was work (0=no work, 5=difficult, 10=toxic)" } : null,
          workTag: e.workTag || null,
          timeOfDay: e.timeOfDay || null,
          frontingMember: frontingMember?.name || null,
          frontingMemberRole: frontingMember?.role || null,
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
        systemMembers: members.map(m => ({ 
          name: m.name, 
          role: m.role,
          traits: m.traits
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
          authorName: j.authorId ? members.find(m => m.id === j.authorId)?.name : null,
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
   - avgDissociationLowSleep vs avgDissociationGoodSleep

3. preComputedCorrelations.routineAdherence - Shows per routine block:
   - completionRate (%), which blocks are being followed

4. preComputedCorrelations.frontingPatterns - Shows per system member:
   - percentageOfEntries, avgMood, avgStress, avgDissociation

5. preComputedCorrelations.overallMetrics - Period averages

6. preComputedCorrelations.highConfidence - HIGH-CONFIDENCE MULTI-FACTOR INSIGHTS (PRIORITIZE THESE):
   - routineMoodCorrelation: Mood on high routine completion days vs low (with confidence level)
   - habitRoutineSynergy: How combining habits + routines creates synergy effects
   - highConfidenceHabits: Only habits with statistically meaningful sample sizes
   - sleepHabitInteraction: How sleep quality modifies habit effectiveness
   - bestWorstDaysAnalysis: Pattern analysis of your best vs worst mood days

7. journalEntries - Full journal data with:
   - mood and energy scores, timeOfDay
   - primaryDriver/secondaryDriver (HIGH WEIGHT - user-tagged: Sleep, Work, Relationships, Body, Anxiety, Urges/Escape, Shame, Trauma, Joy, Connection, Growth, Peace)
   - authorName (which system member wrote it)
   - contentPreview (first 300 chars of content)

8. journalAnalytics - Aggregated journal statistics:
   - driverFrequency: Most common drivers tagged in journal entries (HIGH WEIGHT EVIDENCE - primary source of categorization)
   - avgMood/avgEnergy: Journal-specific averages
   - entriesByTimeOfDay: When journaling happens most

JOURNAL-SPECIFIC PATTERNS TO LOOK FOR:
- Driver patterns: Which drivers appear most frequently? (driverFrequency in journalAnalytics)
- Driver chains: When primaryDriver=Work, what secondaryDriver often follows? (e.g., Work → Urges/Escape)
- Mood correlation by driver: Compare mood on Work-driven days vs Sleep-driven days
- Vent entry frequency correlating with stress/dissociation levels
- Gratitude entries correlating with improved mood
- Which system members write which types of entries
- Tags that appear more frequently on high-stress days
- Time-of-day patterns in journaling (night venting vs morning reflection)
- Mood/energy differences between entry types

DRIVER WEIGHTING (HIGH PRIORITY):
- primaryDriver/secondaryDriver in journalEntries are USER-SELECTED markers of what's affecting them
- These are HIGH WEIGHT evidence - prioritize driver-tagged patterns over inferred patterns
- Use driverFrequency to identify the most common drivers and build insights around them

9. NEW CONTEXT FIELDS - Use these for deeper pattern analysis:
   - capacity (0-5): How much they can handle RIGHT NOW (distinct from mood/energy - someone can be calm but have low capacity)
   - triggerTag: What influenced the entry (work, loneliness, pain, noise, sleep, body, unknown)
   - workLoad (0-10): How hostile/draining was work? (0 = no work, 5 = difficult, 10 = toxic/unsafe)
   - workTag: Specific work stressor (deadlines, conflict, firefighting, unclear, blame, chaos)
   - timeOfDay: When the entry was made (morning, afternoon, evening, night)
   - dailySummaries: End-of-day reflections (lighter, average, heavier than usual)

8. IMPORTANT DID-SPECIFIC PATTERNS TO LOOK FOR:
   - "Guardian fronts more on high pain + work days" - correlate fronting members with trigger tags
   - Time-of-day patterns for dissociation spikes
   - Which members appear at which times of day
   - Capacity vs mood discrepancies (calm but low capacity = different from high energy high capacity)
   - Daily summary correlations with actual metrics (does "heavier" correlate with specific triggers/members?)
   - Work environment load impact on mood/dissociation - separate external pressure from internal state
   - Work tag patterns (e.g., "blame/criticism days have 2x dissociation")
   - Helps prevent self-blame by identifying external stressors

CRITICAL INSTRUCTIONS:
- PRIORITIZE insights from highConfidence section - these have validated sample sizes
- Only report correlations with "high" or "moderate" confidence levels
- Use SPECIFIC NUMBERS from the correlations (e.g., "Mood is 7.2 on days you complete X vs 5.1 on days without")
- Calculate and state DIFFERENCES (e.g., "23% lower stress", "+1.5 mood points")
- Reference SPECIFIC habits, routines, and members by name
- State effect size: "strong", "moderate", or "weak" 
- Highlight SYNERGY effects (e.g., "Doing X AND Y together yields +2.3 mood points")
- Group insights by category: SLEEP, HABITS, ROUTINES, SYSTEM DYNAMICS, SYNERGIES, JOURNAL

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

      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2500
      });
      
      const responseText = completion.choices[0]?.message?.content || "{}";
      const insights = JSON.parse(responseText);
      
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
      const { question, days = 14 } = req.body;
      
      // Fetch all linked data
      const [entries, habits, completions, routineBlocks, routineActivities, routineLogs, members] = await Promise.all([
        storage.getAllTrackerEntries(),
        storage.getAllHabits(),
        storage.getAllHabitCompletions(),
        storage.getAllRoutineBlocks(),
        storage.getAllRoutineActivities(),
        storage.getAllRoutineLogs(),
        storage.getAllMembers()
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
        frontingMember: members.find(m => m.id === e.frontingMemberId)
      }));
      
      // Build habit lookup for routine linkage
      const habitById = new Map(habits.map(h => [h.id, h]));
      const habitCompletionsByHabit = new Map<string, typeof recentCompletions>();
      habits.forEach(h => {
        habitCompletionsByHabit.set(h.id, recentCompletions.filter(c => c.habitId === h.id));
      });
      
      const dataContext = {
        moodEntries: parsedEntries.map(({ entry: e, parsed, frontingMember }) => ({
          date: e.timestamp,
          mood: { value: e.mood, scale: "1-10" },
          energy: { value: e.energy, scale: "1-10" },
          stress: { value: e.stress, scale: "0-100" },
          dissociation: { value: e.dissociation, scale: "0-100" },
          capacity: e.capacity !== null ? { value: e.capacity, scale: "0-5", description: "How much can they handle right now" } : null,
          triggerTag: e.triggerTag || null,
          workLoad: e.workLoad !== null ? { value: e.workLoad, scale: "0-10", description: "How hostile/draining was work (0=no work, 5=difficult, 10=toxic)" } : null,
          workTag: e.workTag || null,
          timeOfDay: e.timeOfDay || null,
          frontingMember: frontingMember?.name || null,
          frontingMemberRole: frontingMember?.role || null,
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
        systemMembers: members.map(m => ({
          name: m.name,
          role: m.role,
          traits: m.traits
        }))
      };
      
      // Set up SSE for streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      const systemPrompt = `You are a compassionate mental health pattern analyst for Orbia, a holistic wellness and productivity tracker. 

You have access to the user's linked tracking data including:
- Mood, energy, stress, and dissociation entries
- Habit completions
- Daily routine activity logs
- System member (alter) information

Provide trauma-informed, supportive analysis. Be specific about patterns you observe in the data. Use gentle, encouraging language.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is my tracking data from the last ${days} days:\n\n${JSON.stringify(dataContext, null, 2)}\n\nMy question: ${question || "What patterns do you see in my data?"}` }
        ],
        stream: true,
        max_completion_tokens: 1500
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      
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
      const todos = await storage.getAllTodos();
      res.json(todos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch todos" });
    }
  });

  app.post("/api/todos", async (req, res) => {
    try {
      const validatedData = insertTodoSchema.parse(req.body);
      const todo = await storage.createTodo(validatedData);
      res.status(201).json(todo);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/todos/:id", async (req, res) => {
    try {
      const validatedData = insertTodoSchema.partial().parse(req.body);
      const todo = await storage.updateTodo(req.params.id, validatedData);
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
      const success = await storage.deleteTodo(req.params.id);
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
      const projects = await storage.getAllCareerProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch career projects" });
    }
  });

  app.get("/api/career-projects/:id", async (req, res) => {
    try {
      const project = await storage.getCareerProject(req.params.id);
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
      const validatedData = insertCareerProjectSchema.parse(req.body);
      const project = await storage.createCareerProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/career-projects/:id", async (req, res) => {
    try {
      const validatedData = insertCareerProjectSchema.partial().parse(req.body);
      const project = await storage.updateCareerProject(req.params.id, validatedData);
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
      const success = await storage.deleteCareerProject(req.params.id);
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
      const projectId = req.query.projectId as string | undefined;
      const tasks = projectId 
        ? await storage.getCareerTasksByProject(projectId)
        : await storage.getAllCareerTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch career tasks" });
    }
  });

  app.post("/api/career-tasks", async (req, res) => {
    try {
      const validatedData = insertCareerTaskSchema.parse(req.body);
      const task = await storage.createCareerTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/career-tasks/:id", async (req, res) => {
    try {
      const validatedData = insertCareerTaskSchema.partial().parse(req.body);
      const task = await storage.updateCareerTask(req.params.id, validatedData);
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
      const success = await storage.deleteCareerTask(req.params.id);
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
      const month = req.query.month as string | undefined;
      const expenses = month
        ? await storage.getExpensesByMonth(month)
        : await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validatedData);
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
      const success = await storage.deleteExpense(req.params.id);
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
      const vision = await storage.getVision();
      res.json(vision);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vision" });
    }
  });

  app.post("/api/vision", async (req, res) => {
    try {
      const validatedData = z.array(insertCareerVisionSchema).parse(req.body);
      const vision = await storage.updateVision(validatedData);
      res.json(vision);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  // Individual Vision CRUD routes (for Orbit actions)
  app.post("/api/vision/item", async (req, res) => {
    try {
      const validatedData = insertCareerVisionSchema.parse(req.body);
      const vision = await storage.createVisionItem(validatedData);
      res.status(201).json(vision);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/vision/item/:id", async (req, res) => {
    try {
      const vision = await storage.updateVisionItem(req.params.id, req.body);
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
      const success = await storage.deleteVisionItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Vision item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vision item" });
    }
  });

  app.get("/api/career/ai-roadmap", async (req, res) => {
    try {
      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
        return res.json({
          roadmap: [],
          suggestedActions: [],
          message: "AI features are not configured. Please set up AI integrations to use this feature.",
          error: "missing_credentials"
        });
      }

      const [vision, projects, tasks] = await Promise.all([
        storage.getVision(),
        storage.getAllCareerProjects(),
        storage.getAllCareerTasks(),
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

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

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
      const snapshot = await storage.getLatestCoachSnapshot();
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
      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
        return res.json({
          error: "missing_credentials",
          message: "AI features are not configured. Please set up AI integrations to use this feature."
        });
      }

      const [vision, projects, tasks] = await Promise.all([
        storage.getVision(),
        storage.getAllCareerProjects(),
        storage.getAllCareerTasks(),
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

      const systemPrompt = `You are an elite career strategist who has already done all the research. You provide READY-TO-EXECUTE plans with all details included. You NEVER ask the user to research, decide, or figure things out - YOU do that work and give them the answer.

═══════════════════════════════════════════════════════
ABSOLUTE RULES - VIOLATION = FAILURE
═══════════════════════════════════════════════════════

🚫 BANNED PHRASES (never use these in milestones):
- "Research...", "Decide...", "Consider...", "Explore...", "Look into..."
- "Choose between...", "Evaluate options...", "Create a plan..."
- "Design a template...", "Document your...", "Reflect on..."
- "Spend X hours reviewing...", "Compare different..."

✅ INSTEAD, YOU must:
- DO the research and provide the actual information
- MAKE the decision and recommend the specific path
- GIVE the exact details, links, names, and steps
- PROVIDE ready-to-use templates, not "create a template"

═══════════════════════════════════════════════════════
MILESTONE TRANSFORMATION EXAMPLES
═══════════════════════════════════════════════════════

❌ WRONG: "Research UAE teacher requirements and write a summary"
✅ RIGHT: "Apply for KHDA Teacher License: Submit degree attestation + 2 years experience proof + passport copy to KHDA portal (https://www.khda.gov.ae/en/educators) - processing takes 2-4 weeks"

❌ WRONG: "Decide which qualification route to pursue (PGCE vs diploma)"
✅ RIGHT: "Enroll in University of Nottingham PGCEi (https://www.nottingham.ac.uk/pgce-international/) - £6,500 total - 12 months part-time - best route for UAE schools as it includes iQTS"

❌ WRONG: "Design a weekly schedule template for studying"
✅ RIGHT: "Week 1-4 Study Schedule: Mon/Wed/Fri 7-9pm PGCEi modules, Tue/Thu 8-9pm lesson planning practice, Sat 10am-12pm teaching video analysis"

❌ WRONG: "Create a list of target schools to apply to"
✅ RIGHT: "Submit applications to these 5 UAE schools: (1) GEMS Wellington (https://www.gemswellingtonacademy-dso.com/careers), (2) JESS Arabian Ranches (https://www.jess.sch.ae/vacancies), (3) Dubai British School (https://www.dubaibritishschool.ae/careers), (4) Brighton College Dubai (https://www.brightoncollege.ae/join-our-team), (5) Kings' School Dubai (https://www.kingsschooldubai.com/careers)"

═══════════════════════════════════════════════════════
DOMAIN KNOWLEDGE (USE THIS - DON'T ASK USER TO RESEARCH)
═══════════════════════════════════════════════════════

UAE TEACHING REQUIREMENTS:
- KHDA license required for Dubai private schools (https://www.khda.gov.ae)
- ADEK certification for Abu Dhabi schools (https://www.adek.gov.ae)
- Requirements: Bachelor's degree (attested), teaching qualification (PGCE/B.Ed/QTS), 2+ years experience preferred
- Visa: School sponsors work visa, requires medical + Emirates ID

BEST QUALIFICATION ROUTES:
- Already have degree, no teaching cert: University of Nottingham PGCEi with iQTS (https://www.nottingham.ac.uk/pgce-international/) - 12 months, £6,500, fully online, internationally recognized
- Fast track option: University of Sunderland PGCE (https://www.sunderland.ac.uk/study/education/) - 9 months
- US-style: Teach-Now / Moreland University (https://www.moreland.edu/) - 9 months, $6,000

TOP UAE SCHOOL GROUPS (apply to all):
- GEMS Education (largest): https://www.gemseducation.com/careers
- Taaleem: https://www.taaleem.ae/careers
- SABIS: https://www.sabis.net/careers
- Aldar Education: https://www.aldareducation.com/en/careers
- Emirates Schools Establishment: https://www.ese.gov.ae

JOB BOARDS:
- TES UAE: https://www.tes.com/jobs/browse/united-arab-emirates
- Teach Away: https://www.teachaway.com/teaching-jobs-uae
- Search Associates: https://www.searchassociates.com

COURSES & RESOURCES:
- Coursera Teaching Specialization: https://www.coursera.org/specializations/teaching
- British Council Teaching English: https://www.britishcouncil.org/teach-english
- Cambridge TKT Preparation: https://www.cambridgeenglish.org/teaching-english/teaching-qualifications/tkt/

═══════════════════════════════════════════════════════
JSON RESPONSE FORMAT
═══════════════════════════════════════════════════════

{
  "northStarAnalysis": {
    "summary": "1-2 sentences",
    "gaps": ["specific gaps with what's missing"],
    "strengths": ["specific strengths"]
  },
  "roadmap": [
    {
      "phase": "Phase X: [Action-Outcome Name]",
      "timeframe": "Weeks 1-4",
      "goal": "Concrete measurable outcome",
      "milestones": [
        "Action verb + exact deliverable + specific target/link + deadline",
        "Every milestone is ready-to-execute with all details included"
      ],
      "weeklyFocus": "ONE priority"
    }
  ],
  "immediateActions": [
    {
      "title": "Specific ready-to-do action",
      "why": "Connection to vision",
      "timeEstimate": "2 hours",
      "priority": "critical|high|medium"
    }
  ],
  "learningPath": [
    {
      "skill": "Skill name",
      "importance": "Why it matters",
      "resources": [
        {"title": "Exact name", "type": "course|book|tutorial|practice", "url": "real URL", "timeCommitment": "X hours"}
      ]
    }
  ],
  "weeklyTheme": "Theme",
  "coachingNote": "2-3 sentences direct coaching"
}

FINAL CHECK: Before responding, verify EVERY milestone:
1. Contains NO banned phrases (research, decide, consider, explore, design, document)
2. Has a specific action verb (Apply, Enroll, Submit, Complete, Send, Create)
3. Includes exact details (names, URLs, costs, timelines)
4. Is immediately executable without further research`;

      const userPrompt = `MY NORTH STAR VISION (Treat this as the ultimate destination):
${vision.map(v => `- "${v.title}" (Target: ${v.timeframe})`).join('\n')}

CURRENT PROGRESS CONTEXT (reference only, not the driver):
${projectSummary}

Based on my North Star vision, create a comprehensive career coaching plan. Be specific about what I should do, learn, and focus on to reach these goals. Include real course recommendations where possible.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const content = response.choices[0]?.message?.content || "{}";
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

      const snapshot = await storage.upsertCoachSnapshot(coachData);

      const coachTasks = tasks.filter(t => t.tags?.includes("coach"));
      for (const task of coachTasks) {
        await storage.deleteCareerTask(task.id);
      }

      if (parsed.immediateActions) {
        for (const action of parsed.immediateActions) {
          await storage.createCareerTask({
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
              await storage.createCareerTask({
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
      const { roadmap } = req.body;
      if (!roadmap || !Array.isArray(roadmap)) {
        return res.status(400).json({ error: "Invalid roadmap format" });
      }

      const currentSnapshot = await storage.getLatestCoachSnapshot();
      if (!currentSnapshot) {
        return res.status(404).json({ error: "No coach data found" });
      }

      const currentPayload = currentSnapshot.payload as Record<string, unknown>;
      const updatedPayload = {
        ...currentPayload,
        roadmap,
      };

      const snapshot = await storage.upsertCoachSnapshot(updatedPayload);

      const tasks = await storage.getAllCareerTasks();
      const milestoneTasks = tasks.filter(t => t.tags?.includes("milestone"));
      for (const task of milestoneTasks) {
        await storage.deleteCareerTask(task.id);
      }

      for (let phaseIndex = 0; phaseIndex < roadmap.length; phaseIndex++) {
        const phase = roadmap[phaseIndex];
        if (phase.milestones) {
          for (const milestone of phase.milestones) {
            await storage.createCareerTask({
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

  app.post("/api/career/regenerate-phase", async (req, res) => {
    try {
      const { phaseIndex, currentPhase, vision } = req.body;
      
      if (phaseIndex === undefined || !currentPhase) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const visionSummary = vision?.map((v: any) => v.title).filter(Boolean).join(", ") || "No vision set";

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
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
        response_format: { type: "json_object" },
        max_completion_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
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
      const { currentMilestone, phaseName, phaseGoal, vision } = req.body;
      
      if (!currentMilestone || !phaseName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const visionSummary = vision?.map((v: any) => v.title).filter(Boolean).join(", ") || "No vision set";

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
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
        max_completion_tokens: 200,
      });

      const newMilestone = response.choices[0]?.message?.content?.trim();
      
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
      const settings = await storage.getFinanceSettings();
      res.json(settings || { monthlyBudget: 15000, debtTotal: 0, debtPaid: 0, debtMonthlyPayment: 0, currency: "AED", savingsGoal: 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch finance settings" });
    }
  });

  app.patch("/api/finance-settings", async (req, res) => {
    try {
      const settings = await storage.updateFinanceSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update finance settings" });
    }
  });

  // Income Streams Routes
  app.get("/api/income-streams", async (req, res) => {
    try {
      const streams = await storage.getAllIncomeStreams();
      res.json(streams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch income streams" });
    }
  });

  app.post("/api/income-streams", async (req, res) => {
    try {
      const validatedData = insertIncomeStreamSchema.parse(req.body);
      const stream = await storage.createIncomeStream(validatedData);
      res.status(201).json(stream);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/income-streams/:id", async (req, res) => {
    try {
      const validatedData = insertIncomeStreamSchema.partial().parse(req.body);
      const stream = await storage.updateIncomeStream(req.params.id, validatedData);
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
      const success = await storage.deleteIncomeStream(req.params.id);
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
      const month = req.query.month as string | undefined;
      const txns = month
        ? await storage.getTransactionsByMonth(month)
        : await storage.getAllTransactions();
      res.json(txns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const txn = await storage.createTransaction(validatedData);
      res.status(201).json(txn);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.post("/api/transactions/bulk", async (req, res) => {
    try {
      const validatedData = z.array(insertTransactionSchema).parse(req.body);
      const txns = await storage.createManyTransactions(validatedData);
      res.status(201).json(txns);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      const txn = await storage.updateTransaction(req.params.id, validatedData);
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
      const success = await storage.deleteTransaction(req.params.id);
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
      const { documentText, documentType } = req.body;
      
      if (!documentText) {
        return res.status(400).json({ error: "Document text is required" });
      }

      const today = new Date().toISOString().split('T')[0];
      
      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
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
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
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
      const { message, context, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Fetch comprehensive data like Deep Mind does
      const [entries, journalEntries, members, visionItems, allTransactions, loans, incomeStreams, financeSettings] = await Promise.all([
        storage.getRecentTrackerEntries(200),
        storage.getAllJournalEntries(),
        storage.getAllMembers(),
        storage.getVision(),
        storage.getAllTransactions(),
        storage.getAllLoans(),
        storage.getAllIncomeStreams(),
        storage.getFinanceSettings(),
      ]);
      
      // Calculate facts for last 7 days
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().split('T')[0];
      
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
      
      // Daily notes from state entries (HIGH WEIGHT)
      const recentTrackerNotes = recentEntries
        .filter(e => e.notes && e.notes.trim().length > 0)
        .slice(0, 15)
        .map(e => {
          const date = new Date(e.timestamp).toLocaleDateString();
          const time = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const notes = e.notes?.slice(0, 150) + (e.notes && e.notes.length > 150 ? "..." : "");
          return `[${date} ${time}] sleep=${e.sleepHours || 'N/A'}h, mood=${e.mood}/10: "${notes}"`;
        }).join("\n");
      
      // Journal excerpts with recency bias (HIGHEST WEIGHT) - include driver tags
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
      
      // Current state (from most recent entry)
      const currentState = entries[0]?.frontingMemberId 
        ? members.find(m => m.id === entries[0].frontingMemberId)?.name || "Unknown"
        : "Unknown";

      // Calculate additional metrics for genius-level analysis
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const last3DaysEntries = entries.filter(e => new Date(e.timestamp) >= threeDaysAgo);
      const last3DaysJournals = journalEntries
        .filter(j => new Date(j.createdAt) >= threeDaysAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Detailed journal excerpts for last 3 days (HIGHEST WEIGHT with full content)
      const criticalJournalExcerpts = last3DaysJournals.map(j => {
        const date = new Date(j.createdAt);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const content = j.content.slice(0, 400) + (j.content.length > 400 ? "..." : "");
        const driverInfo = j.primaryDriver ? ` [Driver: ${j.primaryDriver}${j.secondaryDriver ? ` → ${j.secondaryDriver}` : ''}]` : '';
        const moodInfo = j.mood ? ` (mood: ${j.mood}/10)` : '';
        return `[${dateStr} ${timeStr}]${driverInfo}${moodInfo}\n"${content}"`;
      }).join("\n\n");
      
      // Mood trajectory analysis (for pattern detection)
      const moodTrajectory = last3DaysEntries
        .filter(e => e.mood != null)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(e => {
          const date = new Date(e.timestamp).toLocaleDateString();
          return `${date}: mood=${e.mood}, energy=${e.energy}, stress=${e.stress || 'N/A'}`;
        }).join(" → ");
      
      // Driver frequency with recency weighting
      const weightedDriverCounts: Record<string, number> = {};
      journalEntries.forEach(j => {
        if (!j.primaryDriver) return;
        const entryDate = new Date(j.createdAt);
        let weight = 0.5; // older than 7 days
        if (entryDate >= threeDaysAgo) weight = 3; // last 3 days (HIGHEST)
        else if (entryDate >= sevenDaysAgo) weight = 1; // 4-7 days ago
        
        weightedDriverCounts[j.primaryDriver] = (weightedDriverCounts[j.primaryDriver] || 0) + weight;
        if (j.secondaryDriver) {
          weightedDriverCounts[j.secondaryDriver] = (weightedDriverCounts[j.secondaryDriver] || 0) + (weight * 0.5);
        }
      });
      const weightedTopDrivers = Object.entries(weightedDriverCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([driver, weight]) => `${driver}(${weight.toFixed(1)})`)
        .join(", ") || "No drivers tagged";

      // Build the comprehensive analytics context
      const analyticsContext = `
=== COMPREHENSIVE WELLNESS DATA ===

METRICS SNAPSHOT:
- 7-day averages: Sleep ${avgSleep}h | Mood ${avgMood}/10 | Energy ${avgEnergy}/10
- Today: sleep=${todaySleep}h, mood=${todayMood}/10, energy=${todayEnergy}/10, capacity=${todayCapacity}/5
- Current state: ${currentState}
- Mood trajectory (last 3 days): ${moodTrajectory || "No data"}

DRIVER ANALYSIS (recency-weighted, last 3 days = 3x weight):
${weightedTopDrivers}

=== CRITICAL: LAST 3 DAYS JOURNAL ENTRIES (HIGHEST WEIGHT - READ CAREFULLY) ===
${criticalJournalExcerpts || "No journal entries in last 3 days"}

=== DAILY NOTES FROM STATE ENTRIES (HIGH WEIGHT) ===
${recentTrackerNotes || "No daily notes"}

=== OLDER JOURNAL CONTEXT (7+ days, for pattern recognition) ===
${journalExcerpts || "No older journal entries"}

Note: [Driver: X → Y] means primary driver X with secondary Y. These are user-tagged and HIGH WEIGHT evidence.`;

      // Build comprehensive finance context
      const currency = financeSettings?.currency || "AED";
      const savingsGoal = financeSettings?.savingsGoal || 0;
      
      // Get current month's transactions
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const thisMonthTransactions = allTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= currentMonthStart && txDate <= currentMonthEnd;
      });
      
      // Calculate monthly totals
      const monthlyIncome = thisMonthTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const monthlyExpenses = thisMonthTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const netFlow = monthlyIncome - monthlyExpenses;
      const savingsProgress = savingsGoal > 0 ? Math.round((netFlow / savingsGoal) * 100) : 0;
      
      // Spending by category this month
      const categorySpending: Record<string, number> = {};
      thisMonthTransactions.filter(t => t.type === "expense").forEach(t => {
        const cat = t.category || "other";
        categorySpending[cat] = (categorySpending[cat] || 0) + Number(t.amount);
      });
      const topCategories = Object.entries(categorySpending)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amt]) => `${cat}: ${currency} ${amt.toLocaleString()}`)
        .join(", ") || "No spending recorded";
      
      // Recent transactions (last 10)
      const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)
        .map(t => {
          const date = new Date(t.date).toLocaleDateString();
          const sign = t.type === "income" ? "+" : "-";
          const merchant = t.notes ? ` (${t.notes.slice(0, 30)})` : "";
          return `[${date}] ${sign}${currency} ${t.amount} ${t.name}${merchant} [${t.category}]`;
        }).join("\n");
      
      // Active loans summary
      const activeLoans = loans.filter(l => l.status === "active");
      const totalDebt = activeLoans.reduce((sum, l) => sum + Number(l.currentBalance), 0);
      const loansList = activeLoans.map(l => {
        const interestStr = l.interestRate ? ` @ ${(l.interestRate / 100).toFixed(1)}%` : "";
        return `- "${l.name}" (${l.lender || "Unknown lender"}): ${currency} ${Number(l.currentBalance).toLocaleString()} remaining${interestStr}, min payment: ${currency} ${l.minimumPayment}`;
      }).join("\n") || "No active loans";
      
      // Income streams
      const activeIncomeStreams = incomeStreams.filter(s => s.isActive === 1);
      const expectedMonthlyIncome = activeIncomeStreams.reduce((sum, s) => {
        if (s.frequency === "monthly") return sum + Number(s.amount);
        if (s.frequency === "weekly") return sum + (Number(s.amount) * 4);
        if (s.frequency === "biweekly") return sum + (Number(s.amount) * 2);
        if (s.frequency === "yearly") return sum + (Number(s.amount) / 12);
        return sum;
      }, 0);
      const incomeStreamsList = activeIncomeStreams.map(s => 
        `- "${s.name}": ${currency} ${s.amount} (${s.frequency})`
      ).join("\n") || "No income streams configured";
      
      const financeContext = `
=== COMPREHENSIVE FINANCE DATA ===

MONTHLY SNAPSHOT (${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}):
- Income: ${currency} ${monthlyIncome.toLocaleString()}
- Expenses: ${currency} ${monthlyExpenses.toLocaleString()}
- Net Flow: ${currency} ${netFlow.toLocaleString()} (${netFlow >= 0 ? "surplus" : "deficit"})
- Savings Goal: ${savingsGoal > 0 ? `${currency} ${savingsGoal.toLocaleString()} (${savingsProgress}% achieved)` : "Not set"}
- Expected Monthly Income: ${currency} ${expectedMonthlyIncome.toLocaleString()}

TOP SPENDING CATEGORIES:
${topCategories}

RECENT TRANSACTIONS:
${recentTransactions || "No transactions recorded"}

ACTIVE LOANS (Total Debt: ${currency} ${totalDebt.toLocaleString()}):
${loansList}

INCOME STREAMS:
${incomeStreamsList}

TRANSACTION IDs FOR REFERENCE (use for queries about specific transactions):
${allTransactions.slice(0, 20).map(t => `ID: "${t.id}" | ${t.name} | ${t.type} | ${currency} ${t.amount} | ${t.category} | ${new Date(t.date).toLocaleDateString()}`).join("\n")}

LOAN IDs FOR REFERENCE:
${loans.map(l => `ID: "${l.id}" | ${l.name} | Balance: ${currency} ${l.currentBalance} | Status: ${l.status}`).join("\n") || "No loans"}

INCOME STREAM IDs FOR REFERENCE:
${incomeStreams.map(s => `ID: "${s.id}" | ${s.name} | ${currency} ${s.amount} ${s.frequency} | Active: ${s.isActive === 1 ? "Yes" : "No"}`).join("\n") || "No income streams"}`;

      const orbitSystemPrompt = `You are Orbia, Fatima's personal companion and supportive friend.

=== WHO IS FATIMA? ===
Fatima is a Lebanese woman living in Ajman with her family. She studied engineering but is currently jobless and exploring career options. She's considering becoming a primary school teacher and is actively looking for teaching positions at schools. She's also taking a beginner cybersecurity course on Hack the Box.

Her interests: Disney movies, Harry Potter, Stranger Things, reading books (uses Goodreads), skincare, and learning French. She's a bit tight on money but managing. She has ups and downs in her mood - that's totally normal and you're here to support her gently.

She tutors someone named Yasmina and wants to create a skincare content account and start a blog. She's interested in AI tools like Gemini and Perplexity and wants to stay updated on tech.

=== YOUR PERSONALITY ===
You're like a warm, encouraging friend - think Baymax meets a supportive big sister. You're:
- Playful and light-hearted (can reference Disney, HP, or Stranger Things when it fits!)
- Encouraging without being pushy or preachy
- Practical and helpful - you help her stay organized
- Understanding about her moods - when she's down, you're gentle; when she's up, you celebrate with her
- You occasionally use cute phrases or references she'd appreciate

=== GLOBAL RULES ===
- BREVITY: Keep responses 80-150 words. Be conversational, not essay-like.
- NO MARKDOWN: No #, ##, *, -, \` symbols. Plain friendly text only.
- WARM TONE: Sound like a supportive friend, not an assistant or therapist.
- BE PRACTICAL: Help her tackle her actual goals and tasks.

=== WHAT YOU DO ===
- Help her organize her many interests and goals
- Gently remind her of priorities without guilt-tripping
- Celebrate small wins genuinely
- When she's overwhelmed, help her pick ONE thing to focus on
- Reference her data (habits, tasks, journal) to give personalized advice

=== WHAT YOU NEVER DO ===
- Be clinical or cold
- Lecture or shame her
- Give generic advice without knowing her context
- Be overly dramatic about setbacks
- Pretend to complete actions you didn't

=== HER CURRENT PRIORITIES (from what she shared) ===
1. Job hunting: Writing school emails, researching schools, scheduling emails for Monday mornings
2. Learning: Finishing HTB cybersecurity course (do revision and quizzes first!), French, staying updated on AI/tech
3. Content creation: Skincare account weekly plan, starting a blog
4. Tutoring: Creating study plans for Yasmina
5. Self-care: Finding time for Pilates, skincare routine
6. Fun: Reading new books, finding quiet outdoor places with power outlets

=== RESPONSE MODES ===

**FRIENDLY CHAT** (default for questions and discussion)
Just be a supportive friend. Reference her goals and data when relevant. Keep it warm and practical.

**OPERATIONAL** (for task requests like "add", "mark", "create", "delete")
Be brief and helpful. Output the action JSON when needed.

=== EXAMPLE RESPONSES ===

When she's overwhelmed:
"Hey, I see you have a lot on your plate! That's totally okay - we don't need to tackle everything today. What if we just focused on ONE thing right now? Looking at your list, sending those school emails seems pretty important. Want to start there? We can worry about the rest later."

When she completes something:
"Yay! You finished a chapter of your cybersecurity course! That's awesome, Fatima. Slow progress is still progress. Hermione would be proud of your dedication to learning."

Quick check-in:
"Good morning! You got about 7 hours of sleep - not bad! Today looks manageable. You mentioned wanting to work on your skincare content plan. Is today a good day for that, or do you want to focus on job emails first?"

=== HER HABITS/TASKS CONTEXT ===

EVIDENCE WEIGHTING:
- HIGHEST: What she wrote in journal entries or notes (quote her words!)
- HIGH: Her completed habits and tasks
- MEDIUM: Her mood and energy check-ins
- MEDIUM: Sleep hours (interpret them: "5h sleep two nights in a row...")
- CONTEXT: Mood/energy/stress scores (weave in naturally, don't list)
- LOW: Habits/routines (never blame, just observe)

RECENCY BIAS:
- Today's entries are your primary focus
- Last 3 days: Quote these directly
- Last 7 days: Look for patterns
- Older: Context for identifying loops

ANALYTICAL DEPTH:
- Find the STORY: What happened? What shifted? What's building?
- Connect entries: "On Jan 8 you mentioned X... then Jan 9 shows a shift to Y"
- Identify BEFORE/AFTER: What precedes crashes? What follows good days?
- Language patterns: Notice repeated words, tone changes, what they avoid saying
- Driver patterns: Which drivers keep appearing? What triggers them?

RESPONSE QUALITY:
- Lead with INSIGHT, not data. "Something shifted on the 8th..." not "Mood dropped from 6 to 3"
- Quote their words - it shows you're listening and grounds the insight
- Be revelatory: "What I notice across these entries is..."
- Be warm but concise: acknowledge difficulty without dwelling
- End with ONE tiny action that fits their current state

=== MODE 1: QUICK INSIGHTS FORMAT ===

HARD LIMITS: 80 words max. No markdown symbols. Plain text only. ONE metric max.

Structure (use plain text, no headers):

INSIGHT: 1-2 sentences. The "aha" - what's really happening beneath the surface. Lead with meaning, not data.

SIGNAL: 1 sentence. The ONE thing from their recent entries that matters most. Quote their words if possible.

MOVE: 1 sentence. One tiny action for the next hour. Match their capacity.

EXAMPLE:
"You're running on fumes but holding steady. The thread through your last few entries is body neglect - sleep's been short and meals are getting skipped. Your Jan 9 note said 'just tired of everything' - that's the signal. For now: eat something simple, then reassess."

=== MODE 2: DEEP DISCUSSION FORMAT ===

HARD LIMITS: 150 words max. No markdown symbols (no headers, asterisks, dashes, backticks). Plain flowing text only.

When the user wants to explore or discuss:

Write 2-3 short paragraphs in plain conversational text. Quote their actual journal words (with dates). Connect patterns across days. End with a question or one tiny action.

EXAMPLE:
"Something shifted around the 8th. You wrote 'just can't seem to get started' that morning, and by evening your note mentioned feeling 'hollow.' The next day follows the same thread.

What I notice is this tends to happen after two or three short sleep nights in a row. It's not the tasks - you've handled bigger loads before. It's the foundation getting thin.

What would help most right now - protecting sleep tonight, or getting one small win to break the stall?"

RULES:
- 2-3 paragraphs max, flowing text
- Quote 1-2 specific journal passages
- End with a question or tiny action
- No lists, no headers, no bullet points

=== MODE 3: OPERATIONAL FORMAT ===

For operational queries, respond briefly and output a JSON action object:
{"type":"action","name":"action_name","args":{...},"confirm":false}

SUPPORTED ACTIONS:

HABITS:
- mark_habit: {"habit_id": "...", "date": "YYYY-MM-DD", "done": true/false}
- create_habit: {"title": "...", "category": "health/movement/mental/work/mindfulness/creativity", "description": "...", "target": number, "unit": "times/minutes/ml/etc"}
- update_habit: {"habit_id": "...", "title": "...", "category": "...", "description": "..."}
- delete_habit: {"habit_id": "..."} - ALWAYS set confirm:true

TASKS:
- add_task: {"title": "...", "priority": "low/medium/high"}
- mark_task: {"task_id": "...", "completed": true/false}
- update_task: {"task_id": "...", "title": "...", "priority": "..."}
- delete_task: {"task_id": "..."} - ALWAYS set confirm:true

ROUTINE ACTIVITIES:
- mark_routine_activity: {"activity_id": "...", "date": "YYYY-MM-DD", "done": true/false, "habit_id": "..." or null}
- create_routine_activity: {"block_id": "...", "name": "...", "time": "HH:MM", "description": "...", "habit_id": "..."}
- update_routine_activity: {"activity_id": "...", "name": "...", "time": "...", "description": "..."}
- delete_routine_activity: {"activity_id": "..."} - ALWAYS set confirm:true

CAREER PROJECTS:
- create_career_project: {"title": "...", "description": "...", "status": "planning/in_progress/ongoing/completed", "deadline": "YYYY-MM-DD", "color": "bg-indigo-500/bg-rose-500/bg-emerald-500/etc"}
- update_career_project: {"project_id": "...", "title": "...", "status": "...", "progress": 0-100, "description": "...", "nextAction": "..."}
- delete_career_project: {"project_id": "..."} - ALWAYS set confirm:true

CAREER TASKS:
- create_career_task: {"title": "...", "project_id": "..." or null, "priority": "low/medium/high", "due": "Today/Tomorrow/YYYY-MM-DD", "description": "..."}
- update_career_task: {"task_id": "...", "title": "...", "priority": "...", "completed": 0/1}
- delete_career_task: {"task_id": "..."} - ALWAYS set confirm:true

VISION & ROADMAP:
- create_vision: {"title": "...", "timeframe": "6 months/1 year/3 years/5 years", "color": "text-blue-500/text-purple-500/text-amber-500/etc"}
- update_vision: {"vision_id": "...", "title": "...", "timeframe": "...", "color": "..."}
- delete_vision: {"vision_id": "..."} - ALWAYS set confirm:true
- refresh_roadmap: {} - Regenerates the AI roadmap based on current vision. Use after updating vision!

FINANCE TRANSACTIONS:
- add_transaction: {"type": "income/expense", "name": "...", "amount": number, "category": "salary/freelance/groceries/food/transport/utilities/entertainment/shopping/health/subscriptions/travel/other", "notes": "..." (optional)}
- delete_transaction: {"transaction_id": "..."} - ALWAYS set confirm:true
- search_transactions: {"query": "..."} - Search transactions by name, merchant, or notes (read-only, returns matching results)

LOANS:
- add_loan_payment: {"loan_id": "...", "amount": number, "notes": "..." (optional)}
- get_loan_status: {"loan_id": "..."} - Get detailed loan info including payment history

INCOME STREAMS:
- log_income_payment: {"income_stream_id": "...", "amount": number (optional, defaults to stream amount)}

SPENDING ANALYSIS (read-only queries Orbit can answer):
- "How much did I spend on [category] this month?"
- "What's my biggest expense category?"
- "Show me all [merchant] transactions"
- "Am I on track for my savings goal?"
- "When is my next loan payment due?"
- "What subscriptions am I paying for?"

LEGACY EXPENSES:
- create_expense: {"name": "...", "amount": number, "budget": number, "category": "Fixed/Variable/Savings/Debt", "status": "paid/pending/variable", "date": "Jan 1", "month": "January"}
- update_expense: {"expense_id": "...", "amount": number, "status": "paid/pending/variable", "name": "..."}
- delete_expense: {"expense_id": "..."} - ALWAYS set confirm:true

JOURNAL ENTRIES:
- create_journal: {"content": "...", "entry_type": "reflection/vent/gratitude/grounding/memory/note", "mood": 1-10 (optional), "energy": 1-10 (optional), "tags": ["anxiety", "calm", etc] (optional), "is_private": true/false (optional)}
- update_journal: {"entry_id": "...", "content": "...", "entry_type": "...", "mood": ..., "energy": ..., "tags": [...]}
- delete_journal: {"entry_id": "..."} - ALWAYS set confirm:true

MEALS/FOOD:
- log_meal: {"date": "YYYY-MM-DD", "breakfast": "meal name" (optional), "lunch": "meal name" (optional), "dinner": "meal name" (optional)}
- add_meal_option: {"name": "...", "meal_type": "breakfast/lunch/dinner", "recipe": "..." (optional)}
- delete_meal_option: {"option_id": "..."} - ALWAYS set confirm:true

TRACKER ENTRIES:
- create_tracker_entry: {"mood": 1-10, "energy": 1-10, "stress": 0-100, "dissociation": 0-100, "sleepHours": 0-24 (optional), "capacity": 0-5 (optional), "pain": 0-10 (optional), "notes": "..." (optional)}

CONFIRMATION RULES:
- ALWAYS set confirm:true and confirm_text for all delete actions
- confirm_text should briefly describe what will happen

=== CRITICAL ACTION RULES ===
- When user asks to ADD, CREATE, EDIT, UPDATE, CHANGE, DELETE, MARK, or TOGGLE something, you MUST output the action JSON. DO NOT give instructions to do it manually.
- If you have the ID needed for an update/delete, use it. If you don't have the ID, ask which one they mean.
- NEVER tell the user to "paste this" or "go to the page and..." - USE THE ACTION to do it for them.
- Every analytical claim MUST include a journal quote or specific metric value
- Never blame habits/routine. Say "low completion likely due to low capacity"

${analyticsContext}

${financeContext}

NORTH STAR VISION ITEMS (use these IDs for vision actions):
${visionItems.length > 0 ? visionItems.map(v => `- ID: "${v.id}" | Title: "${v.title}" | Timeframe: ${v.timeframe}`).join('\n') : 'No vision items yet'}

ADDITIONAL OPERATIONAL CONTEXT:
${JSON.stringify(context, null, 2)}`;

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      
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

      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages,
        stream: true,
        max_completion_tokens: 400
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(content);
        }
      }
      
      res.end();
    } catch (error) {
      console.error("Orbit chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat" });
      } else {
        res.end();
      }
    }
  });

  // Daily Summary Routes
  app.get("/api/daily-summaries", async (req, res) => {
    try {
      const summaries = await storage.getAllDailySummaries();
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily summaries" });
    }
  });

  app.get("/api/daily-summaries/:date", async (req, res) => {
    try {
      const summary = await storage.getDailySummary(req.params.date);
      res.json(summary || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily summary" });
    }
  });

  app.post("/api/daily-summaries", async (req, res) => {
    try {
      const validatedData = insertDailySummarySchema.parse(req.body);
      const summary = await storage.upsertDailySummary(validatedData);
      res.status(201).json(summary);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  // Journal Entries Routes
  app.get("/api/journal", async (req, res) => {
    try {
      const entries = await storage.getAllJournalEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  app.get("/api/journal/:id", async (req, res) => {
    try {
      const entry = await storage.getJournalEntry(req.params.id);
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
      const validatedData = insertJournalEntrySchema.parse(req.body);
      const entry = await storage.createJournalEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/journal/:id", async (req, res) => {
    try {
      const validatedData = insertJournalEntrySchema.partial().parse(req.body);
      const entry = await storage.updateJournalEntry(req.params.id, validatedData);
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
      const success = await storage.deleteJournalEntry(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Journal entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete journal entry" });
    }
  });

  // Food Options Routes
  app.get("/api/food-options", async (req, res) => {
    try {
      const options = await storage.getAllFoodOptions();
      res.json(options);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch food options" });
    }
  });

  app.post("/api/food-options", async (req, res) => {
    try {
      const validatedData = insertFoodOptionSchema.parse(req.body);
      const option = await storage.createFoodOption(validatedData);
      res.status(201).json(option);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.patch("/api/food-options/:id", async (req, res) => {
    try {
      const updated = await storage.updateFoodOption(req.params.id, req.body);
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
      const success = await storage.deleteFoodOption(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Food option not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete food option" });
    }
  });

  // Admin seed endpoint - populates database with initial data
  app.post("/api/admin/seed", async (req, res) => {
    const seedKey = req.headers["x-seed-key"];
    const expectedKey = process.env.ADMIN_SEED_KEY;
    if (!expectedKey || seedKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const results: Record<string, number> = {};

      // Seed Habits
      const habits = [
        { id: "72e14641-1729-464a-b329-0bb1dba34a72", title: "Walk 20 minutes", description: "Daily walk for mental health and spinal health", category: "movement", frequency: "daily", streak: 0, color: "#22c55e", target: 20, unit: "minutes" },
        { id: "69ab4bb6-1d0d-4f5a-8f0f-ff25539ec12f", title: "Drink 1.5L water", description: "Stay hydrated throughout the day", category: "health", frequency: "daily", streak: 0, color: "#0ea5e9", target: 1500, unit: "ml" },
        { id: "bf5b256f-6896-420c-9a2f-018f78fc2f69", title: "Journal + mood log", description: "1-3 sentences max", category: "mental", frequency: "daily", streak: 0, color: "#ec4899", target: 1, unit: "entry" },
        { id: "e3e0bbd3-2fe8-451f-a9bc-120f4278db1a", title: "Take meds / supplements", description: "Daily medications and supplements", category: "health", frequency: "daily", streak: 0, color: "#10b981", target: 1, unit: "dose" },
        { id: "d46a0786-baaa-4136-9763-09a57859d7af", title: "1-minute grounding", description: "Quick grounding exercise", category: "mental", frequency: "daily", streak: 0, color: "#6366f1", target: 1, unit: "minute" },
        { id: "967aad5e-9927-4313-baf3-f711fa95a2ba", title: "Swim (short, easy)", description: "5-15 minutes easy swimming", category: "Mindfulness", frequency: "daily", streak: 0, color: "#06b6d4", target: 1, unit: "session" },
        { id: "2cb36ddd-f711-4b29-8f0d-3c4930dd94a9", title: "Stretch back 5 minutes", description: "Gentle back stretches, no forcing", category: "Mindfulness", frequency: "daily", streak: 0, color: "hsl(32 60% 60%)", target: 5, unit: "minutes" },
        { id: "5e500376-8d59-4973-9d22-f93f66feccdd", title: "Sleep ~7 hours", description: "Aim for adequate rest", category: "Creativity", frequency: "daily", streak: 0, color: "#8b5cf6", target: 7, unit: "hours" },
        { id: "4c74cdde-2734-4522-8b0e-be4a9086e5d5", title: "Eat 2 meals", description: "No pressure to cook, delivery acceptable", category: "Work", frequency: "daily", streak: 0, color: "#f59e0b", target: 2, unit: "meals" },
        { id: "eae8a85c-42ed-4ec2-a848-68ff9203a271", title: "Stop working by 18:00", description: "", category: "Work", frequency: "daily", streak: 0, color: "hsl(220 10% 40%)", target: 1, unit: "times" },
        { id: "683a5ce4-a589-444d-b2d1-3531b685ede1", title: "Leave the house once", description: "", category: "Health", frequency: "daily", streak: 0, color: "hsl(180 30% 50%)", target: 1, unit: "times" },
        { id: "4ab512b1-a99e-4104-b40f-3ececf9e4b67", title: "Prepare One Meal", description: "", category: "Mindfulness", frequency: "daily", streak: 0, color: "hsl(32 60% 60%)", target: 1, unit: "times" },
        { id: "bd1e4994-db7c-4832-819e-6f5dcad9bc23", title: "Read a book", description: "Focused reading, any book, for about 30 minutes", category: "creativity", frequency: "daily", streak: 0, color: "hsl(174 60% 50%)", target: 30, unit: "minutes" },
        { id: "82859fab-767f-48dd-a026-b3d3120c66a2", title: "No Porn", description: "", category: "Mindfulness", frequency: "daily", streak: 0, color: "hsl(0 40% 70%)", target: 1, unit: "times" },
      ];
      for (const habit of habits) {
        try {
          await storage.createHabit(habit);
        } catch (e) { /* ignore duplicates */ }
      }
      results.habits = habits.length;

      // Seed Routine Blocks
      const blocks = [
        { id: "c6a25b3c-d140-4490-b674-f571984aa5ea", name: "Morning", emoji: "🌅", startTime: "08:00", endTime: "09:00", purpose: "Signal safety + start the day cleanly ", order: 0, color: "#fbbf24" },
        { id: "0079590c-0c28-4cd0-ab4c-5ba4079dd45d", name: "Work Block 1", emoji: "💻", startTime: "09:00", endTime: "13:00", purpose: "Prevent dissociation + pain flare-ups", order: 1, color: "#3b82f6" },
        { id: "d7c632ac-5173-4ce4-9bd6-3c8b26714ed9", name: "Break", emoji: "🌤", startTime: "13:00", endTime: "14:00", purpose: "Antidepressant effect + spinal health", order: 2, color: "#22c55e" },
        { id: "2eddfb51-7976-4481-b6b9-87fc7e779f2b", name: "Work Block 2", emoji: "💻", startTime: "14:00", endTime: "18:00", purpose: "Prevent endless work days (optional, lighter)", order: 3, color: "#8b5cf6" },
        { id: "8d58f256-452c-4854-b0bf-f732a8497faa", name: "Late Afternoon", emoji: "🌊", startTime: "18:00", endTime: "20:00", purpose: "Movement without stress or goals", order: 4, color: "#06b6d4" },
        { id: "08846613-1354-45a5-9fa6-70b979191b27", name: "Evening", emoji: "🌙", startTime: "20:30", endTime: "23:30", purpose: "Close the day properly (very important)", order: 5, color: "#6366f1" },
      ];
      for (const block of blocks) {
        try {
          await storage.createRoutineBlock(block);
        } catch (e) { /* ignore duplicates */ }
      }
      results.routineBlocks = blocks.length;

      // Seed Routine Activities
      const activities = [
        { id: "2d5f4773-11b2-4aaa-a651-fd2bffd61bf9", blockId: "c6a25b3c-d140-4490-b674-f571984aa5ea", name: "Wake up", time: "08:00", description: "Curtains open, no phone for first 10 minutes", habitId: null, order: 0 },
        { id: "a1edf78c-a0a6-4900-bb95-49ae9b9b36d5", blockId: "c6a25b3c-d140-4490-b674-f571984aa5ea", name: "Drink water (first glass)", time: "08:05", description: null, habitId: "69ab4bb6-1d0d-4f5a-8f0f-ff25539ec12f", order: 1 },
        { id: "6f906a9d-b0c9-4f70-b752-e94f4225bc24", blockId: "c6a25b3c-d140-4490-b674-f571984aa5ea", name: "Stretch back – 5 minutes", time: "08:10", description: "Gentle, no forcing", habitId: "2cb36ddd-f711-4b29-8f0d-3c4930dd94a9", order: 2 },
        { id: "935706d5-2989-4a16-a323-e2a2197fc277", blockId: "c6a25b3c-d140-4490-b674-f571984aa5ea", name: "Meal 1", time: "08:20", description: "Simple, repeatable, same few foods most days", habitId: "4c74cdde-2734-4522-8b0e-be4a9086e5d5", order: 3 },
        { id: "d7b703fe-8d7e-4556-80ad-7376819bf9cc", blockId: "c6a25b3c-d140-4490-b674-f571984aa5ea", name: "Prep for work", time: "08:40", description: null, habitId: null, order: 4 },
        { id: "7b52cb30-fc96-4d01-bf49-58e4cb5e4780", blockId: "0079590c-0c28-4cd0-ab4c-5ba4079dd45d", name: "Work in 45-60 min chunks [total of 5]", time: null, description: "Stand or move briefly between chunks", habitId: null, order: 0 },
        { id: "3fe60680-a949-4165-a726-6a90f7a45a82", blockId: "0079590c-0c28-4cd0-ab4c-5ba4079dd45d", name: "Stop at 13:00 even if unfinished", time: "13:00", description: null, habitId: null, order: 1 },
        { id: "7f0b1a60-38e5-43bc-b8fc-03da5dfe11a2", blockId: "d7c632ac-5173-4ce4-9bd6-3c8b26714ed9", name: "Walk 10 minutes", time: "13:00", description: "Around JVC / indoors if hot", habitId: "72e14641-1729-464a-b329-0bb1dba34a72", order: 0 },
        { id: "11620cbd-cdc2-441b-9a25-8af8b3638d73", blockId: "d7c632ac-5173-4ce4-9bd6-3c8b26714ed9", name: "Meal 2", time: "13:30", description: "No pressure to cook, delivery acceptable", habitId: "4c74cdde-2734-4522-8b0e-be4a9086e5d5", order: 1 },
        { id: "b40fe46c-d684-42b2-b7d9-8d26a60e75b6", blockId: "d7c632ac-5173-4ce4-9bd6-3c8b26714ed9", name: "Rest/ quiet time", time: "14:00", description: null, habitId: null, order: 2 },
        { id: "7cb3c02b-64bd-4351-a28b-fb9aed305eb5", blockId: "2eddfb51-7976-4481-b6b9-87fc7e779f2b", name: "5 blocks", time: null, description: "Only if capacity allows, lower expectations than morning", habitId: null, order: 0 },
        { id: "d902f106-1344-4bee-a2e3-4a291b216813", blockId: "2eddfb51-7976-4481-b6b9-87fc7e779f2b", name: "Hard stop at 18:00", time: "18:00", description: null, habitId: "eae8a85c-42ed-4ec2-a848-68ff9203a271", order: 1 },
        { id: "37cc6308-127b-4fbc-8ae1-8d38b85c1bec", blockId: "8d58f256-452c-4854-b0bf-f732a8497faa", name: "Choose one: Short swim / Mall walk / sit outside / Driving License", time: null, description: "5-15 minutes easy, OR very light movement, OR just sitting outside", habitId: "967aad5e-9927-4313-baf3-f711fa95a2ba", order: 0 },
        { id: "2a1028fa-d367-44a2-8847-fc11e7b546fd", blockId: "08846613-1354-45a5-9fa6-70b979191b27", name: "Free time (YouTube/Twitch/Netflix allowed)", time: "20:30", description: null, habitId: null, order: 0 },
        { id: "390aebb7-c804-4f57-8e2a-c003fa420667", blockId: "08846613-1354-45a5-9fa6-70b979191b27", name: "Journal + mood / mental metrics log", time: "20:30", description: "1-3 sentences max", habitId: "bf5b256f-6896-420c-9a2f-018f78fc2f69", order: 1 },
        { id: "5c6c2ea3-5fc9-46dd-a274-52dbcf8817cd", blockId: "08846613-1354-45a5-9fa6-70b979191b27", name: "Prep for sleep", time: "21:00", description: "Lights down, no intense content", habitId: null, order: 2 },
        { id: "854320d9-1470-47f0-9401-a4061dc44c48", blockId: "08846613-1354-45a5-9fa6-70b979191b27", name: "In bed", time: "23:30", description: "Aim for ~7 hours sleep", habitId: "5e500376-8d59-4973-9d22-f93f66feccdd", order: 3 },
        { id: "17d6c0b3-670d-40ed-8107-03afbc04f831", blockId: "08846613-1354-45a5-9fa6-70b979191b27", name: "Meal prep.order", time: "21:30", description: null, habitId: "4ab512b1-a99e-4104-b40f-3ececf9e4b67", order: 4 },
      ];
      for (const activity of activities) {
        try {
          await storage.createRoutineActivity(activity);
        } catch (e) { /* ignore duplicates */ }
      }
      results.routineActivities = activities.length;

      // Seed System Members
      const members = [
        { id: "75c63f9b-d3a4-48ed-a6a5-24491a626fbb", name: "Noised", role: "Little", traits: [], color: "#ff0000", avatar: "user", description: "New system member.", location: "inner" },
        { id: "462cbe4f-df24-4c56-8da1-151c8472817e", name: "Guardian", role: "Safety & Defense", traits: ["Vigilant", "Strong"], color: "#4265f0", avatar: "shield", description: "Steps in during high stress", location: "front" },
        { id: "672914f3-2d23-46e6-b926-238e067635e3", name: "Despair", role: "Very negative", traits: [], color: "#6b7280", avatar: "users", description: "Nothing literally matters", location: null },
        { id: "c81795d1-c4af-4730-9d61-187aa038853f", name: "Calm", role: "Daily Life", traits: ["Logical", "Responsible"], color: "#8b5cf6", avatar: "eye", description: "Handles work and daily routines", location: null },
      ];
      for (const member of members) {
        try {
          await storage.createMember(member);
        } catch (e) { /* ignore duplicates */ }
      }
      results.systemMembers = members.length;

      // Seed Career Projects
      const projects = [
        { id: "herc-core", title: "Hercules Core: PLC Configuration Engine", description: "Full customization platform for Salalah. Configurable offset addresses, PLC Tag mapping with unique Tag IDs, groups, sections, and report builder.", status: "in_progress", progress: 15, deadline: null, nextAction: "Define Tag ID schema", color: "bg-blue-500", tags: ["PLC", "Tags", "Configuration"] },
        { id: "herc-protocols", title: "Multi-Protocol Support & Integration", description: "Extend beyond Siemens/S7 to support TCP/IP, OPC UA, Modbus, and other protocols.", status: "planning", progress: 0, deadline: null, nextAction: "Research protocol requirements", color: "bg-cyan-500", tags: ["Protocols", "SQL", "ETL"] },
        { id: "herc-reports", title: "Report Builder & Export System", description: "Universal report builder for any Siemens/S7 integration without development.", status: "planning", progress: 0, deadline: null, nextAction: "Design report templates", color: "bg-emerald-500", tags: ["Reports", "Export", "SMTP"] },
        { id: "herc-ai", title: "AI & ML Predictive Module", description: "Starred/tracked signals linked to ML models for prediction.", status: "planning", progress: 0, deadline: null, nextAction: "Define ML model requirements", color: "bg-purple-500", tags: ["AI", "ML", "Predictive"] },
        { id: "herc-energy", title: "Energy Monitoring System", description: "Complete UI/UX rework for Energy Monitor.", status: "planning", progress: 0, deadline: null, nextAction: "Schedule UX review meeting", color: "bg-amber-500", tags: ["Energy", "Monitoring", "UI/UX"] },
        { id: "herc-3d", title: "3D Plant Monitor & Digital Twin", description: "Plant Monitor as top-level view with 3D components.", status: "planning", progress: 0, deadline: null, nextAction: "Get Salalah mill photos", color: "bg-orange-500", tags: ["3D", "Digital Twin", "Plant Monitor"] },
        { id: "herc-security", title: "Security & Access Control", description: "Reproducible system without hacking potential.", status: "planning", progress: 0, deadline: null, nextAction: "Define access levels", color: "bg-red-500", tags: ["Security", "Access Control", "Cybersecurity"] },
        { id: "herc-erp", title: "ERP Integration Module", description: "Fully configurable ERP integration for flour milling/feed.", status: "planning", progress: 0, deadline: null, nextAction: "Define JSON payload schema", color: "bg-indigo-500", tags: ["ERP", "Integration", "JSON"] },
        { id: "herc-infra", title: "Infrastructure & Deployment", description: "Scalable data storage for long-term retention with good performance.", status: "planning", progress: 0, deadline: null, nextAction: "Plan hosting migration", color: "bg-slate-500", tags: ["Infrastructure", "Hosting", "Scalability"] },
      ];
      for (const project of projects) {
        try {
          await storage.createCareerProject(project);
        } catch (e) { /* ignore duplicates */ }
      }
      results.careerProjects = projects.length;

      // Seed Career Tasks (abbreviated - key tasks only)
      const tasks = [
        { id: "fd2c5aa4-a60c-4fc8-a0f5-e77d764a58f0", projectId: "herc-core", title: "Design Tag ID schema with unique identifiers", description: "Each offset address will have a unique Tag ID for groups, sections, and reports", completed: 0, priority: "high", due: null, tags: ["Design", "Schema"] },
        { id: "dca36b7c-7f03-4d21-8d1d-5a90eb24ae6e", projectId: "herc-core", title: "Build PLC Settings page UI", description: "Configuration interface for PLC connections", completed: 0, priority: "high", due: null, tags: ["UI", "PLC"] },
        { id: "69c465d5-0c71-4493-8f53-d80d43370e96", projectId: "herc-core", title: "Create Mapping page and options", description: "Tag mapping interface with offset address configuration", completed: 0, priority: "medium", due: null, tags: ["Mapping", "UI"] },
        { id: "cc3ecddf-2df9-404a-95c6-b28d84075420", projectId: "herc-core", title: "Implement Tags management with data types/units", description: "CRUD for tags with type and unit configuration", completed: 0, priority: "medium", due: null, tags: ["Tags", "CRUD"] },
        { id: "a6b1dcf1-68ad-47e2-b1bb-49a2718a9d05", projectId: "herc-core", title: "Add custom formula support with unique result IDs", description: "Formula builder for computed tags", completed: 0, priority: "medium", due: null, tags: ["Formula", "Tags"] },
        { id: "50f239e1-d6e7-4506-8242-6d0a9d97b5ea", projectId: "herc-core", title: "Implement sections and grouping for tags", description: "Research and build tag organization system", completed: 0, priority: "low", due: null, tags: ["Groups", "Organization"] },
      ];
      for (const task of tasks) {
        try {
          await storage.createCareerTask(task);
        } catch (e) { /* ignore duplicates */ }
      }
      results.careerTasks = tasks.length;

      res.json({ success: true, seeded: results });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: "Failed to seed database" });
    }
  });

  // Deep Mind Overview API - System intelligence dashboard
  app.get("/api/deep-mind/overview", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const [entries, members] = await Promise.all([
        storage.getRecentTrackerEntries(500),
        storage.getAllMembers(),
      ]);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoffDate);
      
      // System-level metrics
      const totalEntries = recentEntries.length;
      const avgMood = totalEntries > 0 ? recentEntries.reduce((sum, e) => sum + e.mood, 0) / totalEntries : 0;
      const avgStress = totalEntries > 0 ? recentEntries.reduce((sum, e) => sum + e.stress, 0) / totalEntries : 0;
      const avgDissociation = totalEntries > 0 ? recentEntries.reduce((sum, e) => sum + e.dissociation, 0) / totalEntries : 0;
      const avgEnergy = totalEntries > 0 ? recentEntries.reduce((sum, e) => sum + e.energy, 0) / totalEntries : 0;
      
      // Calculate stability index (inverse of variance in mood + stress)
      const moodVariance = totalEntries > 1 
        ? recentEntries.reduce((sum, e) => sum + Math.pow(e.mood - avgMood, 2), 0) / totalEntries 
        : 0;
      const stabilityIndex = Math.max(0, Math.min(100, 100 - (moodVariance * 10) - (avgDissociation / 2)));
      
      // Per-member analytics
      const memberStats = members.map(member => {
        const memberEntries = recentEntries.filter(e => e.frontingMemberId === member.id);
        const entryCount = memberEntries.length;
        const frontingPercent = totalEntries > 0 ? Math.round((entryCount / totalEntries) * 100) : 0;
        
        if (entryCount === 0) {
          return {
            memberId: member.id,
            name: member.name,
            role: member.role,
            color: member.color,
            avatar: member.avatar,
            frontingPercent: 0,
            avgMood: null,
            avgStress: null,
            avgEnergy: null,
            entryCount: 0,
            lastFronting: null,
            moodTrend: "stable" as const,
          };
        }
        
        const mAvgMood = memberEntries.reduce((s, e) => s + e.mood, 0) / entryCount;
        const mAvgStress = memberEntries.reduce((s, e) => s + e.stress, 0) / entryCount;
        const mAvgEnergy = memberEntries.reduce((s, e) => s + e.energy, 0) / entryCount;
        
        // Sort chronologically (oldest first) for trend calculation
        const chronologicalEntries = [...memberEntries].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const lastEntry = chronologicalEntries[chronologicalEntries.length - 1];
        
        // Calculate mood trend (compare older half to newer half)
        const midpoint = Math.floor(chronologicalEntries.length / 2);
        const olderHalf = chronologicalEntries.slice(0, midpoint);
        const newerHalf = chronologicalEntries.slice(midpoint);
        const olderAvg = olderHalf.length > 0 ? olderHalf.reduce((s, e) => s + e.mood, 0) / olderHalf.length : mAvgMood;
        const newerAvg = newerHalf.length > 0 ? newerHalf.reduce((s, e) => s + e.mood, 0) / newerHalf.length : mAvgMood;
        const moodTrend = newerAvg > olderAvg + 0.5 ? "improving" : newerAvg < olderAvg - 0.5 ? "declining" : "stable";
        
        return {
          memberId: member.id,
          name: member.name,
          role: member.role,
          color: member.color,
          avatar: member.avatar,
          frontingPercent,
          avgMood: Math.round(mAvgMood * 10) / 10,
          avgStress: Math.round(mAvgStress),
          avgEnergy: Math.round(mAvgEnergy * 10) / 10,
          entryCount,
          lastFronting: lastEntry?.timestamp || null,
          moodTrend,
        };
      });
      
      // Find current/recent fronter
      const sortedEntries = recentEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const currentFronterId = sortedEntries[0]?.frontingMemberId || null;
      const currentFronter = members.find(m => m.id === currentFronterId);
      
      // Calculate switch frequency (unique fronters per day)
      const entriesByDay: Record<string, Set<string>> = {};
      recentEntries.forEach(e => {
        if (e.frontingMemberId) {
          const day = new Date(e.timestamp).toISOString().split('T')[0];
          if (!entriesByDay[day]) entriesByDay[day] = new Set();
          entriesByDay[day].add(e.frontingMemberId);
        }
      });
      const daysWithData = Object.keys(entriesByDay).length;
      const totalSwitches = Object.values(entriesByDay).reduce((sum, set) => sum + Math.max(0, set.size - 1), 0);
      const avgSwitchesPerDay = daysWithData > 0 ? Math.round((totalSwitches / daysWithData) * 10) / 10 : 0;
      
      res.json({
        systemMetrics: {
          avgMood: Math.round(avgMood * 10) / 10,
          avgStress: Math.round(avgStress),
          avgDissociation: Math.round(avgDissociation),
          avgEnergy: Math.round(avgEnergy * 10) / 10,
          stabilityIndex: Math.round(stabilityIndex),
          totalEntries,
          daysTracked: daysWithData,
          avgSwitchesPerDay,
        },
        currentFronter: currentFronter ? {
          id: currentFronter.id,
          name: currentFronter.name,
          color: currentFronter.color,
        } : null,
        memberStats: memberStats.sort((a, b) => b.frontingPercent - a.frontingPercent),
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
      const [entries, journalEntries, members] = await Promise.all([
        storage.getRecentTrackerEntries(50),
        storage.getAllJournalEntries(),
        storage.getAllMembers(),
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

      // Current state from frontingMemberId
      let state = "Unknown";
      if (mostRecent?.frontingMemberId) {
        const member = members.find(m => m.id === mostRecent.frontingMemberId);
        state = member?.name || "Unknown";
      }

      // State intensity based on dissociation and stress
      let stateIntensity: "Low" | "Medium" | "High" = "Low";
      if (mostRecent) {
        const avgIntensity = (mostRecent.dissociation + mostRecent.stress) / 2;
        if (avgIntensity >= 60) stateIntensity = "High";
        else if (avgIntensity >= 35) stateIntensity = "Medium";
      }

      // External load percentage (from workLoad, stress)
      let load = 0;
      if (mostRecent) {
        const workLoadPct = (mostRecent.workLoad ?? 5) * 10; // 0-10 scale to 0-100
        load = Math.round((workLoadPct + mostRecent.stress) / 2);
      }

      // Internal stability (inverse of dissociation + mood variance)
      let stability = 50;
      if (entries.length > 0) {
        const recentFive = entries.slice(0, 5);
        const avgMood = recentFive.reduce((s, e) => s + e.mood, 0) / recentFive.length;
        const moodVariance = recentFive.length > 1
          ? recentFive.reduce((s, e) => s + Math.pow(e.mood - avgMood, 2), 0) / recentFive.length
          : 0;
        const avgDissociation = recentFive.reduce((s, e) => s + e.dissociation, 0) / recentFive.length;
        stability = Math.max(0, Math.min(100, Math.round(100 - avgDissociation - (moodVariance * 5))));
      }

      // Risk flag: High risk if sleep < 5h AND (stress > 70 OR dissociation > 60)
      let riskFlag: string | undefined;
      if (mostRecent) {
        const lowSleep = (mostRecent.sleepHours ?? 8) < 5;
        const highStress = mostRecent.stress > 70;
        const highDissociation = mostRecent.dissociation > 60;
        if (lowSleep && (highStress || highDissociation)) {
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
        state,
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
      const days = parseInt(req.query.days as string) || 60;
      const [entries, journalEntries, members] = await Promise.all([
        storage.getRecentTrackerEntries(500),
        storage.getAllJournalEntries(),
        storage.getAllMembers(),
      ]);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const now = new Date();
      
      const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoffDate);
      const recentJournals = journalEntries.filter(j => new Date(j.createdAt) >= cutoffDate);

      // Count unique days with data
      const uniqueDays = new Set(recentEntries.map(e => 
        new Date(e.timestamp).toISOString().split('T')[0]
      ));
      const sampleSize = uniqueDays.size;

      const getConfidence = (n: number): "Low" | "Medium" | "High" => {
        if (n < 5) return "Low";
        if (n < 15) return "Medium";
        return "High";
      };

      // Triggers analysis from triggerTag and journal primaryDriver
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

      // Stabilizers from journal content and notes
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

      // Crash loops detection - look for high stress/dissociation patterns
      const crashPatterns: Record<string, { count: number; lastSeen: Date; trigger: string; state: string; outcome: string }> = {};
      
      // Find entries with high stress or dissociation
      const crashEntries = recentEntries.filter(e => e.stress > 60 || e.dissociation > 50);
      
      crashEntries.forEach(e => {
        const trigger = e.triggerTag || "stress";
        const stateMember = e.frontingMemberId ? members.find(m => m.id === e.frontingMemberId)?.name || "Unknown" : "Unknown";
        const outcome = e.dissociation > 60 ? "dissociation" : e.stress > 70 ? "overwhelm" : "dysregulation";
        const patternKey = `${trigger}→${stateMember}→${outcome}`;
        
        if (!crashPatterns[patternKey]) {
          crashPatterns[patternKey] = { 
            count: 0, 
            lastSeen: new Date(e.timestamp),
            trigger,
            state: stateMember,
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
          pattern: `${data.trigger} → ${data.state} → ${data.outcome}`,
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
      const [entries, journalEntries] = await Promise.all([
        storage.getAllTrackerEntries(),
        storage.getAllJournalEntries(),
      ]);

      const now = new Date();
      const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

      // Filter entries with sleep data for Chart A
      const entriesWithSleep = entries.filter(e => e.sleepHours != null && e.sleepHours > 0);
      
      // Group entries by sleep hour buckets and calculate averages
      const sleepBuckets: Record<string, { mood: number[]; dissociation: number[]; urges: number[] }> = {};
      
      entriesWithSleep.forEach(e => {
        const sleepHours = Math.round(e.sleepHours!); // Round to nearest hour
        const bucket = sleepHours <= 4 ? "≤4h" : 
                       sleepHours === 5 ? "5h" :
                       sleepHours === 6 ? "6h" :
                       sleepHours === 7 ? "7h" :
                       sleepHours === 8 ? "8h" :
                       sleepHours >= 9 ? "9h+" : "7h";
        
        if (!sleepBuckets[bucket]) {
          sleepBuckets[bucket] = { mood: [], dissociation: [], urges: [] };
        }
        
        sleepBuckets[bucket].mood.push(e.mood);
        sleepBuckets[bucket].dissociation.push(e.dissociation);
        // Use stress as proxy for urges if no urge field exists
        sleepBuckets[bucket].urges.push(e.stress);
      });

      const orderedBuckets = ["≤4h", "5h", "6h", "7h", "8h", "9h+"];
      const sleepImpactData = orderedBuckets
        .filter(bucket => sleepBuckets[bucket])
        .map(bucket => {
          const data = sleepBuckets[bucket];
          return {
            sleepHours: bucket,
            mood: data.mood.length > 0 ? Number((data.mood.reduce((a, b) => a + b, 0) / data.mood.length).toFixed(1)) : 0,
            dissociation: data.dissociation.length > 0 ? Number((data.dissociation.reduce((a, b) => a + b, 0) / data.dissociation.length).toFixed(1)) : 0,
            urges: data.urges.length > 0 ? Number((data.urges.reduce((a, b) => a + b, 0) / data.urges.length).toFixed(1)) : 0,
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
  
  // Deep Mind AI Insights endpoint - Evidence-based analysis
  app.post("/api/deep-mind/insights", async (req, res) => {
    try {
      const [entries, journalEntries, members] = await Promise.all([
        storage.getRecentTrackerEntries(200),
        storage.getAllJournalEntries(),
        storage.getAllMembers(),
      ]);
      
      // Calculate facts for last 7 days
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().split('T')[0];
      
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
      
      // Current state (from most recent entry)
      const currentState = entries[0]?.frontingMemberId 
        ? members.find(m => m.id === entries[0].frontingMemberId)?.name || "Unknown"
        : "Unknown";
      
      const systemPrompt = `You are an evidence-based wellness analyst. Output MUST follow this exact 4-section structure. Max 6 bullet points total. No long paragraphs. Every claim needs a quote or metric as evidence.

FACTS (provided):
- Sleep avg (7d): ${avgSleep}h | Mood avg: ${avgMood}/10 | Energy avg: ${avgEnergy}/10
- Today: sleep=${todaySleep}h, mood=${todayMood}/10, energy=${todayEnergy}/10, capacity=${todayCapacity}/5
- Journal present: ${journalEntries.length > 0 ? "yes" : "no"}
- Daily notes present: ${recentTrackerNotes.length > 0 ? "yes" : "no"}
- Current state: ${currentState}
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
- Use neutral language: "state" not "alter/member/fronting"
- Every insight needs evidence (quote or metric)
- Max 6 bullet points total`;

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Transfer-Encoding", "chunked");
      
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Analyze my data following the exact 4-section format." }
        ],
        stream: true,
        max_tokens: 500,
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) res.write(content);
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
      ] = await Promise.all([
        storage.getAllTrackerEntries(),
        storage.getAllHabits(),
        storage.getAllHabitCompletions(),
        storage.getAllRoutineBlocks(),
        storage.getAllRoutineActivities(),
        storage.getAllRoutineLogs(),
        storage.getAllTodos(),
        storage.getAllJournalEntries(),
        storage.getAllDailySummaries(),
        storage.getAllFoodOptions(),
      ]);

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
      const loans = await storage.getAllLoans();
      res.json(loans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loans" });
    }
  });

  app.post("/api/loans", async (req, res) => {
    try {
      const validatedData = insertLoanSchema.parse(req.body);
      const loan = await storage.createLoan(validatedData);
      res.status(201).json(loan);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  app.put("/api/loans/:id", async (req, res) => {
    try {
      const validatedData = insertLoanSchema.partial().parse(req.body);
      const loan = await storage.updateLoan(req.params.id, validatedData);
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
      const success = await storage.deleteLoan(req.params.id);
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
      const payments = await storage.getLoanPayments(req.params.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan payments" });
    }
  });

  app.post("/api/loans/:id/payments", async (req, res) => {
    try {
      const loan = await storage.getLoan(req.params.id);
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
      
      const transaction = await storage.createTransaction({
        type: "expense",
        category: "debt_payment",
        amount: validatedData.amount,
        name: `Loan payment: ${loan.name}`,
        date: paymentDate,
        month: month,
        isRecurring: 0
      });

      const payment = await storage.createLoanPayment({
        ...validatedData,
        transactionId: transaction.id
      });

      res.status(201).json(payment);
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ error: validationError.toString() });
    }
  });

  return httpServer;
}
