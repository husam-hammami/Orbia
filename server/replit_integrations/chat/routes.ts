import type { Express, Request, Response } from "express";
import { chatStorage } from "./storage";
import { aiStream, MODEL_PRIMARY } from "../../lib/ai-client";

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const conversations = await chatStorage.getAllConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(userId, id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(userId, id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(userId, title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(userId, id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      await chatStorage.createMessage(userId, conversationId, "user", content);

      const messages = await chatStorage.getMessagesByConversation(userId, conversationId);
      const chatMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const fullResponse = await aiStream(
        chatMessages,
        res,
        { maxTokens: 2048 }
      );

      await chatStorage.createMessage(userId, conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
