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
        }
      };
      
      // Generate AI insights using GPT-5.1
      const systemPrompt = `You are a compassionate mental health insights assistant for NeuroZen, an app designed for individuals with dissociative identity disorder (DID) or complex trauma. 

You have access to comprehensive tracking data including:
- Mood, energy, stress, and dissociation levels (daily metrics)
- Additional metrics from notes: sleep, pain, communication quality, urges, comfort levels
- Journal text with emotional context
- Tags describing the day (e.g., "therapy day", "work", "rest day")
- Stress triggers identified by the user
- Meal tracking data
- System member (alter) fronting patterns with their roles and traits
- Habit tracking with completion dates and targets
- Daily routine activities linked to habits

Analyze this data to identify patterns and provide helpful, trauma-informed insights. Focus on:
1. Correlations between sleep, meals, and mood/dissociation
2. Stress trigger patterns and their impact on metrics
3. Habit and routine consistency and their relationship to wellbeing
4. System member fronting patterns and when different parts tend to be present
5. Positive reinforcement for consistency and progress
6. Gentle suggestions based on observed patterns

Be supportive, non-judgmental, and use trauma-informed language. Avoid triggering content. Keep insights actionable and specific to the data provided.`;

      const userPrompt = `Please analyze the following ${days}-day data snapshot and provide insights:

${JSON.stringify(context, null, 2)}

Provide 3-5 key insights with:
- A brief title for each insight
- The pattern or observation
- A gentle, actionable suggestion if applicable

Format your response as JSON with this structure:
{
  "insights": [
    {
      "title": "string",
      "observation": "string",
      "suggestion": "string or null"
    }
  ],
  "overallTrend": "improving" | "stable" | "needs_attention",
  "encouragement": "A brief encouraging message"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1500
      });
      
      const responseText = completion.choices[0]?.message?.content || "{}";
      const insights = JSON.parse(responseText);
      
      res.json({
        ...insights,
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
