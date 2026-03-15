import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { agentProcessManager } from "../lib/agent-process-manager";
import { injectCommand, hasActiveSession, subscribeToOutput } from "../lib/agent-terminal";
import * as repoManager from "../lib/repo-manager";
import * as githubOAuth from "../lib/github-oauth";
import { requireAuth } from "../auth";
import crypto from "crypto";
import { db } from "../db";
import { agentProfiles, agentTasks } from "@shared/schema";
import { eq } from "drizzle-orm";

const sseClients = new Map<string, Set<Response>>();

function broadcastToAgent(agentId: string, event: string, data: any) {
  const clients = sseClients.get(agentId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

function getUserId(req: Request): string {
  return req.session.userId!;
}

agentProcessManager.on("agent:started", (data) => broadcastToAgent(data.agentId, "started", data));
agentProcessManager.on("agent:output", async (data) => {
  broadcastToAgent(data.agentId, "output", data);
  try {
    await storage.createAgentActivityLogEntry({
      taskId: data.taskId,
      eventType: data.type,
      content: data.content,
      metadata: data.metadata || null,
    });
  } catch (err) {
    console.error("Failed to log agent activity:", err);
  }
});
agentProcessManager.on("agent:completed", async (data) => {
  broadcastToAgent(data.agentId, "completed", data);
  try {
    const success = data.exitCode === 0;
    const task = await storage.getAgentTask(data.taskId);
    const alreadyFailed = task?.status === "failed";
    if (!alreadyFailed) {
      await storage.updateAgentTask(data.taskId, {
        status: success ? "completed" : "failed",
        completedAt: new Date(),
        errorMessage: !success ? `Process exited with code ${data.exitCode}` : undefined,
      });
    }
    await storage.updateAgentProfileInternal(data.agentId, {
      status: success ? "idle" : "error",
      currentTaskSummary: null,
    } as any);
    if (success) {
      await storage.incrementAgentTasksCompleted(data.agentId);
    }
  } catch (err) {
    console.error("Failed to update agent on completion:", err);
  }
});
agentProcessManager.on("agent:error", async (data) => {
  broadcastToAgent(data.agentId, "error", data);
  try {
    await storage.updateAgentTask(data.taskId, {
      status: "failed",
      completedAt: new Date(),
      errorMessage: data.error || "Agent process error",
    });
    await storage.updateAgentProfileInternal(data.agentId, {
      status: "error",
      currentTaskSummary: null,
    } as any);
  } catch (err) {
    console.error("Failed to update agent on error:", err);
  }
});

async function recoverStaleAgentStates() {
  try {
    await db.update(agentProfiles)
      .set({ status: "idle", currentTaskSummary: null })
      .where(eq(agentProfiles.status, "working"));
    await db.update(agentTasks)
      .set({ status: "failed", errorMessage: "Server restarted while task was running", completedAt: new Date() })
      .where(eq(agentTasks.status, "running"));
    console.log("[agents] Recovered stale agent states after restart");
  } catch (err) {
    console.error("[agents] Failed to recover stale states:", err);
  }
}
recoverStaleAgentStates();

const terminalTaskMonitors = new Map<string, NodeJS.Timeout>();

function monitorTerminalTask(agentId: string, taskId: string, userId: string) {
  if (terminalTaskMonitors.has(taskId)) return;

  let outputAccumulator = "";
  let lastOutputTime = Date.now();
  let promptReturnCount = 0;

  const unsub = subscribeToOutput(agentId, (data) => {
    outputAccumulator += data;
    lastOutputTime = Date.now();
    if (data.includes("$ ") && outputAccumulator.length > 100) {
      promptReturnCount++;
    }
  });

  const checkInterval = setInterval(async () => {
    const timeSinceOutput = Date.now() - lastOutputTime;

    const hasFinished = (promptReturnCount > 0 && timeSinceOutput > 5000) ||
      timeSinceOutput > 600000;

    if (hasFinished) {
      clearInterval(checkInterval);
      terminalTaskMonitors.delete(taskId);

      const timedOut = timeSinceOutput > 600000;
      try {
        await storage.updateAgentTask(taskId, {
          status: timedOut ? "failed" : "completed",
          completedAt: new Date(),
          errorMessage: timedOut ? "Task timed out (10 min)" : undefined,
        });
        await storage.updateAgentProfileInternal(agentId, {
          status: "idle",
          currentTaskSummary: null,
        } as any);
        if (!timedOut) {
          await storage.incrementAgentTasksCompleted(agentId);
        }
        broadcastToAgent(agentId, timedOut ? "error" : "completed", { agentId, taskId });
      } catch (err) {
        console.error("[monitor] Failed to update task:", err);
      }
    }
  }, 3000);

  terminalTaskMonitors.set(taskId, checkInterval);
}

async function requireAgentOwnership(req: Request, res: Response): Promise<{ userId: string; agentId: string } | null> {
  const userId = getUserId(req);
  const agentId = req.params.id;
  const agent = await storage.getAgentProfile(userId, agentId);
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return null;
  }
  return { userId, agentId };
}

export function registerAgentRoutes(app: Express) {
  // GitHub OAuth
  app.get("/api/agents/github/auth-url", requireAuth, (req: Request, res: Response) => {
    if (!githubOAuth.isConfigured()) {
      return res.status(503).json({ error: "GitHub OAuth is not configured. Contact admin to set up GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." });
    }
    const userId = getUserId(req);
    const state = `${userId}:${crypto.randomBytes(16).toString("hex")}`;
    try {
      res.json({ url: githubOAuth.getAuthUrl(state) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/github/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) return res.status(400).json({ error: "Missing code or state" });
      const userId = (state as string).split(":")[0];
      const tokenData = await githubOAuth.exchangeCodeForToken(code as string);
      const ghUser = await githubOAuth.getGithubUser(tokenData.access_token);
      await storage.upsertGithubConnection(userId, {
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        githubUserId: String(ghUser.id),
        username: ghUser.login,
        email: ghUser.email,
        avatarUrl: ghUser.avatar_url,
        status: "active",
      });
      res.redirect("/agents?github=connected");
    } catch (err: any) {
      console.error("GitHub OAuth error:", err);
      res.redirect("/agents?github=error");
    }
  });

  app.get("/api/agents/github/status", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const conn = await storage.getGithubConnection(userId);
    res.json({
      configured: githubOAuth.isConfigured(),
      connected: !!conn,
      username: conn?.username,
      avatarUrl: conn?.avatarUrl,
    });
  });

  app.delete("/api/agents/github/disconnect", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    await storage.deleteGithubConnection(userId);
    res.json({ ok: true });
  });

  app.get("/api/agents/github/repos", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const conn = await storage.getGithubConnection(userId);
    if (!conn) return res.status(400).json({ error: "GitHub not connected" });
    try {
      const repos = await githubOAuth.listRepos(conn.accessToken);
      res.json(repos.map((r: any) => ({
        id: r.id, name: r.name, full_name: r.full_name,
        description: r.description, html_url: r.html_url,
        language: r.language, private: r.private,
        default_branch: r.default_branch, updated_at: r.updated_at,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/github/repos/:owner/:repo/branches", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const conn = await storage.getGithubConnection(userId);
    if (!conn) return res.status(400).json({ error: "GitHub not connected" });
    try {
      const branches = await githubOAuth.listBranches(conn.accessToken, req.params.owner, req.params.repo);
      res.json(branches.map((b: any) => ({ name: b.name, sha: b.commit?.sha })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // System status (must be before :id routes)
  app.get("/api/agents/system/status", requireAuth, (_req: Request, res: Response) => {
    res.json({
      runningAgents: agentProcessManager.getRunningAgents(),
      totalRunning: agentProcessManager.getRunningCount(),
    });
  });

  // Activity log (must be before :id routes)
  app.get("/api/agents/tasks/:taskId/activity", requireAuth, async (req: Request, res: Response) => {
    const log = await storage.getAgentActivityLog(req.params.taskId);
    res.json(log);
  });

  // Agent CRUD
  app.get("/api/agents", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const agents = await storage.getAllAgentProfiles(userId);
    const enriched = agents.map((a) => ({
      ...a,
      isRunning: agentProcessManager.isRunning(a.id),
      repoCloned: repoManager.isRepoCloned(a.id),
    }));
    res.json(enriched);
  });

  app.get("/api/agents/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const agent = await storage.getAgentProfile(userId, req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json({
      ...agent,
      isRunning: agentProcessManager.isRunning(agent.id),
      repoCloned: repoManager.isRepoCloned(agent.id),
    });
  });

  app.post("/api/agents", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    try {
      const agent = await storage.createAgentProfile(userId, { ...req.body, userId });
      const conn = await storage.getGithubConnection(userId);
      if (conn && agent.repoUrl) {
        try {
          await repoManager.cloneRepo(agent.id, agent.repoUrl, agent.repoBranch || "main", conn.accessToken);
        } catch (err: any) {
          console.error("Auto-clone failed:", err.message);
        }
      }
      res.json(agent);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/agents/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const agent = await storage.updateAgentProfile(userId, req.params.id, req.body);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  app.delete("/api/agents/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const agent = await storage.getAgentProfile(userId, req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    if (agentProcessManager.isRunning(agent.id)) {
      agentProcessManager.stopAgent(agent.id);
    }
    await repoManager.deleteRepo(agent.id);
    await storage.deleteAgentProfile(userId, agent.id);
    res.json({ ok: true });
  });

  // Tasks (with ownership check)
  app.get("/api/agents/:id/tasks", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const tasks = await storage.getAgentTasks(ctx.agentId);
    res.json(tasks);
  });

  app.post("/api/agents/:id/tasks", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const task = await storage.createAgentTask({
      agentId: ctx.agentId,
      description: req.body.description,
      priority: req.body.priority || 0,
      status: "queued",
    });
    res.json(task);
  });

  app.post("/api/agents/:id/tasks/:taskId/run", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const agent = (await storage.getAgentProfile(ctx.userId, ctx.agentId))!;
    const task = await storage.getAgentTask(req.params.taskId);
    if (!task || task.agentId !== ctx.agentId) return res.status(404).json({ error: "Task not found" });

    if (!repoManager.isRepoCloned(agent.id)) {
      return res.status(400).json({ error: "Repo not cloned" });
    }

    let session = await storage.getLatestAgentSession(agent.id);
    if (!session || session.status !== "active") {
      session = await storage.createAgentSession({ agentId: agent.id, status: "active" });
    }

    await storage.updateAgentTask(task.id, { status: "running", startedAt: new Date(), sessionId: session.id });
    await storage.updateAgentProfile(ctx.userId, agent.id, {
      status: "working",
      currentTaskSummary: task.description,
    } as any);

    const escapedPrompt = task.description.replace(/'/g, "'\\''");
    const claudeCmd = `claude -p '${escapedPrompt}' --dangerously-skip-permissions`;

    if (hasActiveSession(agent.id)) {
      injectCommand(agent.id, claudeCmd);
      monitorTerminalTask(agent.id, task.id, ctx.userId);
      res.json({ ok: true, sessionId: session.id, mode: "terminal" });
    } else {
      try {
        await agentProcessManager.startAgent({
          agentId: agent.id,
          taskId: task.id,
          sessionId: session.id,
          workdir: repoManager.getRepoDir(agent.id),
          prompt: task.description,
          conversationId: session.claudeConversationId || undefined,
        });
        res.json({ ok: true, sessionId: session.id, mode: "process" });
      } catch (err: any) {
        await storage.updateAgentTask(task.id, { status: "failed", errorMessage: err.message });
        await storage.updateAgentProfile(ctx.userId, agent.id, { status: "idle", currentTaskSummary: null } as any);
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.post("/api/agents/:id/stop", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const stopped = agentProcessManager.stopAgent(ctx.agentId);
    if (!stopped && hasActiveSession(ctx.agentId)) {
      injectCommand(ctx.agentId, "\x03");
      return res.json({ stopped: true, mode: "terminal-interrupt" });
    }
    res.json({ stopped });
  });

  // Git operations (all with ownership check)
  app.post("/api/agents/:id/git/clone", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const agent = (await storage.getAgentProfile(ctx.userId, ctx.agentId))!;
    const conn = await storage.getGithubConnection(ctx.userId);
    try {
      const dir = await repoManager.cloneRepo(agent.id, agent.repoUrl, agent.repoBranch || "main", conn?.accessToken);
      res.json({ ok: true, dir });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/pull", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const result = await repoManager.pullRepo(ctx.agentId);
      res.json({ ok: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/git/status", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const status = await repoManager.getStatus(ctx.agentId);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/git/diff", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const diff = await repoManager.getDiff(ctx.agentId, req.query.staged === "true");
      res.json({ diff });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/git/log", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const log = await repoManager.getLog(ctx.agentId, Number(req.query.count) || 20);
      res.json(log);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/commit", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const hash = await repoManager.commitChanges(ctx.agentId, req.body.message || "Agent commit");
      res.json({ ok: true, hash });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/push", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      await repoManager.pushChanges(ctx.agentId, req.body.branch);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/checkout", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      await repoManager.checkoutBranch(ctx.agentId, req.body.branch, req.body.create === true);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SSE Stream (with session auth)
  app.get("/api/agents/:id/stream", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const agentId = ctx.agentId;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ agentId })}\n\n`);

    if (!sseClients.has(agentId)) sseClients.set(agentId, new Set());
    sseClients.get(agentId)!.add(res);

    const heartbeat = setInterval(() => {
      try { res.write(":heartbeat\n\n"); } catch { clearInterval(heartbeat); }
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.get(agentId)?.delete(res);
    });
  });

  // Quick send prompt (create task + run immediately)
  app.post("/api/agents/:id/send", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const agent = (await storage.getAgentProfile(ctx.userId, ctx.agentId))!;

    if (!repoManager.isRepoCloned(agent.id)) {
      const conn = await storage.getGithubConnection(ctx.userId);
      try {
        await repoManager.cloneRepo(agent.id, agent.repoUrl, agent.repoBranch || "main", conn?.accessToken);
      } catch (err: any) {
        return res.status(500).json({ error: `Clone failed: ${err.message}` });
      }
    }

    const task = await storage.createAgentTask({
      agentId: agent.id,
      description: req.body.prompt,
      priority: 1,
      status: "running",
    });

    let session = await storage.getLatestAgentSession(agent.id);
    if (!session || session.status !== "active") {
      session = await storage.createAgentSession({ agentId: agent.id, status: "active" });
    }

    await storage.updateAgentTask(task.id, { startedAt: new Date(), sessionId: session.id });
    await storage.updateAgentProfile(ctx.userId, agent.id, {
      status: "working",
      currentTaskSummary: req.body.prompt,
    } as any);

    const escapedPrompt = req.body.prompt.replace(/'/g, "'\\''");
    const claudeCmd = `claude -p '${escapedPrompt}' --dangerously-skip-permissions`;

    if (hasActiveSession(agent.id)) {
      injectCommand(agent.id, claudeCmd);
      monitorTerminalTask(agent.id, task.id, ctx.userId);
      res.json({ ok: true, taskId: task.id, sessionId: session.id, mode: "terminal" });
    } else {
      try {
        await agentProcessManager.startAgent({
          agentId: agent.id,
          taskId: task.id,
          sessionId: session.id,
          workdir: repoManager.getRepoDir(agent.id),
          prompt: req.body.prompt,
          conversationId: session.claudeConversationId || undefined,
        });
        res.json({ ok: true, taskId: task.id, sessionId: session.id, mode: "process" });
      } catch (err: any) {
        await storage.updateAgentTask(task.id, { status: "failed", errorMessage: err.message });
        await storage.updateAgentProfile(ctx.userId, agent.id, { status: "idle", currentTaskSummary: null } as any);
        res.status(500).json({ error: err.message });
      }
    }
  });
}
