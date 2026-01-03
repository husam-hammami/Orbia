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
import { fromError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  return httpServer;
}
