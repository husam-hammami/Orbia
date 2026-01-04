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
  insertRoutineActivityLogSchema
} from "@shared/schema";
import { z } from "zod";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { parseTrackerNotes } from "./lib/parse-notes";
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
        dataQualitySummary: {
          totalMoodEntries: parsedEntries.length,
          entriesWithSleep: parsedEntries.filter(({ parsed }) => parsed.normalizedMetrics.sleepHours !== null).length,
          entriesWithTriggers: parsedEntries.filter(({ parsed }) => parsed.triggers.length > 0).length,
          entriesWithMeals: parsedEntries.filter(({ parsed }) => parsed.meals.length > 0).length,
          habitsTracked: habits.length,
          routineBlocksActive: routineBlocks.length
        },
        preComputedCorrelations: correlations
      };
      
      // Generate AI insights using GPT-5.1
      const systemPrompt = `You are a compassionate mental health insights assistant for NeuroZen, an app designed for individuals with dissociative identity disorder (DID) or complex trauma.

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

CRITICAL INSTRUCTIONS:
- PRIORITIZE insights from highConfidence section - these have validated sample sizes
- Only report correlations with "high" or "moderate" confidence levels
- Use SPECIFIC NUMBERS from the correlations (e.g., "Mood is 7.2 on days you complete X vs 5.1 on days without")
- Calculate and state DIFFERENCES (e.g., "23% lower stress", "+1.5 mood points")
- Reference SPECIFIC habits, routines, and members by name
- State effect size: "strong", "moderate", or "weak" 
- Highlight SYNERGY effects (e.g., "Doing X AND Y together yields +2.3 mood points")
- Group insights by category: SLEEP, HABITS, ROUTINES, SYSTEM DYNAMICS, SYNERGIES

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
      "category": "sleep" | "habits" | "routines" | "system" | "overall",
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
      
      const systemPrompt = `You are a compassionate mental health pattern analyst for NeuroZen, an app for individuals with DID/complex trauma. 

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

  return httpServer;
}
