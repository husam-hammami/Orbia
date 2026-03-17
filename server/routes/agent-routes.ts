import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { agentProcessManager } from "../lib/agent-process-manager";
import { injectCommand, hasActiveSession, subscribeToOutput, killSession, getOutputBuffer, updatePermissionMode, getPermissionMode, broadcastBootstrapEventById, execInOrbitShell, queuePromptForClaude, isClaudeCodeIdle, getQueueStatus, watchForCompletion, cancelCompletionWatcher } from "../lib/agent-terminal";
import { triggerFollowUp, hasPendingFollowUp } from "../lib/agent-orchestrator";
import { aiStream, aiComplete, MODEL_FAST } from "../lib/ai-client";
import * as repoManager from "../lib/repo-manager";
import * as githubOAuth from "../lib/github-oauth";
import { requireAuth } from "../auth";
import crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { db } from "../db";
import { agentProfiles, agentTasks, pushSubscriptions, orbitEvents } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

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

async function logOrbitEvent(agentId: string, type: string, title: string, detail?: string, metadata?: any) {
  try {
    await db.insert(orbitEvents).values({ agentId, type, title, detail: detail || null, metadata: metadata || null });
    broadcastToAgent(agentId, "orbit_event", { type, title, detail, metadata, createdAt: new Date().toISOString() });
  } catch (err) {
    console.error("[orbit-event] Failed to log:", (err as Error).message);
  }
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
    const [agentRow] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, data.agentId)).limit(1);
    if (agentRow?.notifyOnComplete && agentRow.userId) {
      const { sendPushToUser } = await import("../lib/push-notify");
      const taskName = task?.name || "Task";
      sendPushToUser(agentRow.userId, {
        title: `${agentRow.name}: ${success ? "Done" : "Failed"}`,
        body: success ? `${taskName} completed successfully` : `${taskName} failed (exit ${data.exitCode})`,
        url: `/agents`,
      }).catch(() => {});
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
const activeTerminalTasks = new Set<string>();

function monitorTerminalTask(agentId: string, taskId: string, userId: string) {
  if (terminalTaskMonitors.has(taskId)) return;
  activeTerminalTasks.add(agentId);

  let outputAccumulator = "";
  let lastOutputTime = Date.now();
  let promptReturnCount = 0;
  let lastPromptTime = 0;

  const SHELL_PROMPT_RE = /\$\s*$/m;
  const TASK_DONE_RE = /Task completed|All done|✓\s*Done|completed successfully/i;

  const unsub = subscribeToOutput(agentId, (data) => {
    outputAccumulator += data;
    lastOutputTime = Date.now();

    const stripped = data.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g, "");
    if (TASK_DONE_RE.test(stripped)) {
      promptReturnCount += 3;
      lastPromptTime = Date.now();
    } else if (SHELL_PROMPT_RE.test(stripped) && outputAccumulator.length > 500) {
      const timeSinceLastPrompt = Date.now() - lastPromptTime;
      if (timeSinceLastPrompt > 5000) {
        promptReturnCount++;
        lastPromptTime = Date.now();
      }
    }
  });

  const checkInterval = setInterval(async () => {
    const timeSinceOutput = Date.now() - lastOutputTime;

    const hasFinished = (promptReturnCount >= 3 && timeSinceOutput > 30000) ||
      timeSinceOutput > 600000;

    if (hasFinished) {
      clearInterval(checkInterval);
      terminalTaskMonitors.delete(taskId);
      activeTerminalTasks.delete(agentId);
      unsub();

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

        const permState = getPermissionMode(agentId);
        if (permState?.notifyOnComplete && hasActiveSession(agentId)) {
          broadcastBootstrapEventById(agentId, {
            type: "notification",
            message: timedOut ? "Task timed out" : "Task completed successfully",
          });
        }

        const [agentRow] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
        if (agentRow?.notifyOnComplete && agentRow.userId) {
          const { sendPushToUser } = await import("../lib/push-notify");
          const taskInfo = await storage.getAgentTask(taskId);
          const taskName = taskInfo?.name || "Task";
          sendPushToUser(agentRow.userId, {
            title: `${agentRow.name}: ${timedOut ? "Timed Out" : "Done"}`,
            body: timedOut ? `${taskName} timed out after 10 minutes` : `${taskName} completed successfully`,
            url: `/agents`,
          }).catch(() => {});
        }

        if (!timedOut && hasPendingFollowUp(agentId)) {
          console.log(`[monitor] Agent ${agentId} task done — triggering follow-up actions`);
          setTimeout(() => triggerFollowUp(agentId), 3000);
        }
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
      isRunning: agentProcessManager.isRunning(a.id) || activeTerminalTasks.has(a.id),
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
      isRunning: agentProcessManager.isRunning(agent.id) || activeTerminalTasks.has(agent.id),
      repoCloned: repoManager.isRepoCloned(agent.id),
    });
  });

  app.post("/api/agents", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    try {
      const { mcpServers, ...profileData } = req.body;
      const agent = await storage.createAgentProfile(userId, { ...profileData, userId });
      const conn = await storage.getGithubConnection(userId);
      if (conn && agent.repoUrl) {
        try {
          await repoManager.cloneRepo(agent.id, agent.repoUrl, agent.repoBranch || "main", conn.accessToken);
        } catch (err: any) {
          console.error("Auto-clone failed:", err.message);
        }
      }
      if (mcpServers && Array.isArray(mcpServers) && mcpServers.length > 0) {
        try {
          const repoDir = repoManager.getRepoDir(agent.id);
          if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });
          const claudeConfigDir = path.join(repoDir, ".claude");
          if (!fs.existsSync(claudeConfigDir)) fs.mkdirSync(claudeConfigDir, { recursive: true });
          const settingsConfig: any = { mcpServers: {} };
          for (const mcp of mcpServers) {
            settingsConfig.mcpServers[mcp.name] = { command: mcp.command, args: mcp.args };
          }
          fs.writeFileSync(path.join(claudeConfigDir, "settings.json"), JSON.stringify(settingsConfig, null, 2));
          fs.writeFileSync(path.join(claudeConfigDir, "settings.local.json"), JSON.stringify(settingsConfig, null, 2));
          console.log(`[agents] MCP config written for "${agent.name}":`, mcpServers.map((m: any) => m.name).join(", "));
        } catch (err: any) {
          console.error("[agents] MCP config write failed:", err.message);
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

  app.post("/api/agents/:id/terminal/restart", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    killSession(ctx.agentId);
    res.json({ ok: true });
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

  app.get("/api/agents/:id/git/branches", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const branches = await repoManager.listBranches(ctx.agentId);
      res.json(branches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/reset", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const { commitHash, confirmed } = req.body;
    if (!commitHash || typeof commitHash !== "string" || !/^[a-f0-9]{4,40}$/i.test(commitHash)) {
      return res.status(400).json({ error: "Invalid commit hash" });
    }
    if (!confirmed) {
      return res.status(400).json({ error: "Reset requires explicit confirmation", requireConfirmation: true });
    }
    try {
      const status = await repoManager.getStatus(ctx.agentId);
      const dirty = (status.modified.length + status.created.length + status.deleted.length) > 0;
      if (dirty) {
        await repoManager.stashChanges(ctx.agentId);
      }
      await repoManager.resetToCommit(ctx.agentId, commitHash, true);
      res.json({ ok: true, stashed: dirty });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/stash", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const result = req.body.pop ? await repoManager.stashPop(ctx.agentId) : await repoManager.stashChanges(ctx.agentId);
      res.json({ ok: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/upload", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;

    const MAX_SIZE = 25 * 1024 * 1024;
    const ALLOWED_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".pdf", ".doc", ".docx", ".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml"];

    try {
      const rawFilename = (req.headers["x-filename"] as string) || "uploaded-file";
      const safeName = path.basename(rawFilename).replace(/[^a-zA-Z0-9._-]/g, "_");
      const ext = path.extname(safeName).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext) && ext !== "") {
        return res.status(400).json({ error: `File type ${ext} not allowed` });
      }

      const chunks: Buffer[] = [];
      let totalSize = 0;
      req.on("data", (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_SIZE) {
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        if (totalSize > MAX_SIZE) {
          return res.status(413).json({ error: "File too large (max 25MB)" });
        }
        const repoDir = repoManager.getRepoDir(ctx.agentId);
        const uploadDir = path.join(repoDir, ".orbia-uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, safeName);
        if (!filePath.startsWith(uploadDir)) {
          return res.status(400).json({ error: "Invalid filename" });
        }
        fs.writeFileSync(filePath, Buffer.concat(chunks));
        res.json({ ok: true, path: `.orbia-uploads/${safeName}` });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/files", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const repoDir = repoManager.getRepoDir(ctx.agentId);
      const relDir = (req.query.path as string) || "";
      const safePath = path.normalize(relDir).replace(/\.\./g, "");
      const absDir = path.join(repoDir, safePath);
      if (!absDir.startsWith(repoDir)) {
        return res.status(400).json({ error: "Invalid path" });
      }
      if (!fs.existsSync(absDir)) {
        return res.json({ files: [], currentPath: safePath });
      }
      const entries = fs.readdirSync(absDir, { withFileTypes: true });
      const files = entries
        .filter(e => !e.name.startsWith(".git") || e.name === ".orbia-uploads")
        .map(e => ({
          name: e.name,
          isDirectory: e.isDirectory(),
          size: e.isFile() ? fs.statSync(path.join(absDir, e.name)).size : 0,
          path: path.join(safePath, e.name),
        }))
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      res.json({ files, currentPath: safePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/files/read", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const repoDir = repoManager.getRepoDir(ctx.agentId);
      const relPath = (req.query.path as string) || "";
      const safePath = path.normalize(relPath).replace(/\.\./g, "");
      const absPath = path.join(repoDir, safePath);
      if (!absPath.startsWith(repoDir)) {
        return res.status(400).json({ error: "Invalid path" });
      }
      if (!fs.existsSync(absPath)) {
        return res.status(404).json({ error: "File not found" });
      }
      const stat = fs.statSync(absPath);
      if (stat.size > 2 * 1024 * 1024) {
        return res.json({ content: null, truncated: true, size: stat.size });
      }
      const content = fs.readFileSync(absPath, "utf-8");
      res.json({ content, size: stat.size });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/agents/:id/files", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    try {
      const repoDir = repoManager.getRepoDir(ctx.agentId);
      const relPath = req.body.path;
      if (!relPath || typeof relPath !== "string") {
        return res.status(400).json({ error: "Path required" });
      }
      const safePath = path.normalize(relPath).replace(/\.\./g, "");
      const absPath = path.join(repoDir, safePath);
      if (!absPath.startsWith(repoDir) || absPath === repoDir) {
        return res.status(400).json({ error: "Invalid path" });
      }
      if (!fs.existsSync(absPath)) {
        return res.status(404).json({ error: "File not found" });
      }
      const stat = fs.statSync(absPath);
      if (stat.isDirectory()) {
        fs.rmSync(absPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(absPath);
      }
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

  const ALLOWED_SHELL_COMMANDS: Record<string, string> = {
    "git-status": "git status --short && git log --oneline -5",
    "run-tests": "npm test 2>&1 || echo 'No test script found'",
    "git-diff": "git diff --stat",
    "git-pull": "git pull --rebase origin $(git branch --show-current)",
    "git-push": "git push origin $(git branch --show-current)",
    "npm-install": "npm install",
  };

  app.post("/api/agents/:id/shell", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const { actionId } = req.body;
    if (!actionId || typeof actionId !== "string") {
      return res.status(400).json({ error: "actionId required" });
    }
    const command = ALLOWED_SHELL_COMMANDS[actionId];
    if (!command) {
      return res.status(400).json({ error: `Unknown action: ${actionId}` });
    }
    if (!hasActiveSession(ctx.agentId)) {
      return res.status(400).json({ error: "No active terminal session" });
    }
    const ok = injectCommand(ctx.agentId, command);
    if (ok) {
      res.json({ ok: true });
    } else {
      res.status(500).json({ error: "Failed to inject command" });
    }
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

  app.patch("/api/agents/:id/settings", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;

    const { notifyOnComplete, permissionMode, autoReview, autoPush } = req.body;
    const updates: any = {};

    if (notifyOnComplete !== undefined) updates.notifyOnComplete = notifyOnComplete ? 1 : 0;
    if (autoReview !== undefined) updates.autoReview = autoReview ? 1 : 0;
    if (autoPush !== undefined) updates.autoPush = autoPush ? 1 : 0;
    if (permissionMode !== undefined && ["manual", "bypass", "auto"].includes(permissionMode)) {
      updates.permissionMode = permissionMode;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid settings provided" });
    }

    await storage.updateAgentProfile(ctx.userId, ctx.agentId, updates);

    if (updates.permissionMode !== undefined || updates.notifyOnComplete !== undefined) {
      const agent = await storage.getAgentProfile(ctx.userId, ctx.agentId);
      if (agent && hasActiveSession(ctx.agentId)) {
        updatePermissionMode(
          ctx.agentId,
          (agent.permissionMode || "manual") as "manual" | "bypass" | "auto",
          !!(agent.notifyOnComplete)
        );
      }
    }

    res.json({ ok: true });
  });

  // Orbit supervisor: chains follow-up actions after Claude Code completes work
  async function setupFollowUpChain(agentId: string, userId: string, steps: string[]) {
    if (steps.length === 0) return;

    const [currentStep, ...remainingSteps] = steps;
    console.log(`[orbit-supervisor] Setting up step "${currentStep}" for agent ${agentId}, ${remainingSteps.length} remaining`);

    watchForCompletion(agentId, async (completedAgentId) => {
      try {
        const agent = await storage.getAgentProfile(userId, completedAgentId);
        if (!agent || !hasActiveSession(completedAgentId)) {
          console.log(`[orbit-supervisor] Agent ${completedAgentId} no longer active, stopping chain`);
          return;
        }

        // Broadcast status update to connected clients
        broadcastToAgent(completedAgentId, "orbit_step", { step: currentStep, remaining: remainingSteps.length });

        if (currentStep === "review") {
          console.log(`[orbit-supervisor] Running review for "${agent.name}"`);
          await logOrbitEvent(completedAgentId, "review_started", "Auto-review started", "Orbit is reviewing the code changes");
          const reviewResult = await runOrbitReview(completedAgentId, userId, agent);
          
          await logOrbitEvent(completedAgentId, reviewResult.approved ? "review_approved" : "review_rejected",
            reviewResult.approved ? "Review passed" : "Review: needs work",
            reviewResult.summary, { approved: reviewResult.approved });

          if (reviewResult.approved && remainingSteps.length > 0) {
            console.log(`[orbit-supervisor] Review APPROVED for "${agent.name}", continuing chain`);
            const nextSteps = [...remainingSteps];
            if (nextSteps[0] === "push_if_approved") {
              nextSteps[0] = "push";
            }
            setupFollowUpChain(completedAgentId, userId, nextSteps);
          } else if (reviewResult.approved && remainingSteps.length === 0) {
            broadcastToAgent(completedAgentId, "orbit_step", { step: "complete", message: "Review passed — workflow complete" });
            await logOrbitEvent(completedAgentId, "chain_complete", "Workflow complete", "Review passed, no further steps");
          } else if (!reviewResult.approved) {
            console.log(`[orbit-supervisor] Review NEEDS_WORK for "${agent.name}", stopping chain`);
            broadcastToAgent(completedAgentId, "orbit_step", { step: "review_failed", message: reviewResult.summary });
            await logOrbitEvent(completedAgentId, "chain_stopped", "Workflow stopped", `Review did not pass: ${reviewResult.summary}`);
          }
        } else if (currentStep === "push" || currentStep === "push_if_approved") {
          console.log(`[orbit-supervisor] Running push for "${agent.name}"`);
          await logOrbitEvent(completedAgentId, "push_started", "Auto-push started", "Committing and pushing changes to remote");
          queuePromptForClaude(completedAgentId,
            "Check git status. Stage all changes, commit with a clear descriptive message summarizing what was implemented, then push to origin. Report the commit hash and branch when done.",
            "orbit-supervisor"
          );
          if (remainingSteps.length > 0) {
            setupFollowUpChain(completedAgentId, userId, remainingSteps);
          } else {
            broadcastToAgent(completedAgentId, "orbit_step", { step: "complete", message: "Work pushed successfully" });
            await logOrbitEvent(completedAgentId, "chain_complete", "Workflow complete", "All automated steps finished successfully");
            if (agent.notifyOnComplete) {
              try {
                const { sendPushNotification } = await import("../lib/push-notify");
                await sendPushNotification(userId, {
                  title: `${agent.name} — Work Complete`,
                  body: "Implementation pushed to repository",
                  data: { agentId: completedAgentId },
                });
              } catch {}
            }
          }
        } else if (currentStep === "test") {
          console.log(`[orbit-supervisor] Running tests for "${agent.name}"`);
          await logOrbitEvent(completedAgentId, "test_started", "Running tests", "Executing project test suite");
          queuePromptForClaude(completedAgentId,
            "Find and run the project's test suite (npm test, pytest, cargo test, etc.). Report all results — which tests passed and which failed.",
            "orbit-supervisor"
          );
          if (remainingSteps.length > 0) {
            setupFollowUpChain(completedAgentId, userId, remainingSteps);
          } else {
            broadcastToAgent(completedAgentId, "orbit_step", { step: "complete", message: "Tests complete — workflow finished" });
            await logOrbitEvent(completedAgentId, "chain_complete", "Workflow complete", "Test suite executed, no further steps");
          }
        } else if (currentStep === "notify") {
          console.log(`[orbit-supervisor] Sending notification for "${agent.name}"`);
          broadcastToAgent(completedAgentId, "orbit_step", { step: "complete", message: "All steps finished" });
          await logOrbitEvent(completedAgentId, "chain_complete", "Workflow complete", "All automated steps finished");
          try {
            const { sendPushNotification } = await import("../lib/push-notify");
            await sendPushNotification(userId, {
              title: `${agent.name} — All Done`,
              body: "All workflow steps completed",
              data: { agentId: completedAgentId },
            });
          } catch {}
        }
      } catch (err) {
        console.error(`[orbit-supervisor] Error in step "${currentStep}":`, (err as Error).message);
      }
    });
  }

  async function runOrbitReview(agentId: string, userId: string, agent: any): Promise<{ approved: boolean; summary: string }> {
    const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g;
    const TOKEN_RE = /(?:ghp_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{82,}|x-access-token:[^\s@]+)/g;
    
    let diffContext = "";
    try {
      const status = await repoManager.getStatus(agentId);
      const changes = [...status.modified, ...status.created, ...status.deleted, ...status.staged];
      diffContext += `Changed files: ${changes.join(", ")}\n`;
      const diff = await repoManager.getDiff(agentId);
      if (diff) diffContext += `Diff:\n${diff.slice(0, 15000)}`;
    } catch {}

    const terminalLines = getOutputBuffer(agentId);
    const terminalClean = terminalLines.join("").replace(ANSI_RE, "").replace(TOKEN_RE, "[REDACTED]").slice(-8000);

    const reviewPrompt = `You are reviewing Claude Code's work for the "${agent.name}" agent.

## Terminal Output (last activity)
\`\`\`
${terminalClean}
\`\`\`

## Git Changes
${diffContext || "No changes detected"}

## Task
Evaluate whether the work is complete and correct. Consider:
1. Did Claude Code finish without errors?
2. Are the changes consistent with what was requested?
3. Are there any obvious issues in the diff?

Respond with EXACTLY this format:
VERDICT: APPROVED or VERDICT: NEEDS_WORK
SUMMARY: One sentence explaining your assessment`;

    try {
      const reviewText = await aiComplete([
        { role: "system", content: "You are a code reviewer. Be concise. Respond only with VERDICT and SUMMARY." },
        { role: "user", content: reviewPrompt }
      ], { model: MODEL_FAST, maxTokens: 500 });

      const approved = /VERDICT:\s*APPROVED/i.test(reviewText);
      const summaryMatch = reviewText.match(/SUMMARY:\s*(.*)/i);
      const summary = summaryMatch ? summaryMatch[1].trim() : reviewText.slice(0, 200);

      console.log(`[orbit-supervisor] Review result for "${agent.name}": ${approved ? "APPROVED" : "NEEDS_WORK"} — ${summary}`);

      // Broadcast review result to frontend
      broadcastToAgent(agentId, "orbit_review", { approved, summary });

      return { approved, summary };
    } catch (err) {
      console.error(`[orbit-supervisor] Review AI error:`, (err as Error).message);
      return { approved: false, summary: "Review failed due to an error" };
    }
  }

  app.post("/api/agents/:id/orbit", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const agent = (await storage.getAgentProfile(ctx.userId, ctx.agentId))!;

    const { action, message, history } = req.body;
    const validActions = ["review", "test", "push_merge", "chat"];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }
    if (action === "chat" && (!message || typeof message !== "string")) {
      return res.status(400).json({ error: "Message required for chat action" });
    }
    const safeMessage = typeof message === "string" ? message.slice(0, 4000) : undefined;
    const safeHistory = Array.isArray(history)
      ? history.slice(-10).filter((h: any) => h.role && h.content && typeof h.content === "string")
          .map((h: any) => ({ role: h.role as string, content: (h.content as string).slice(0, 4000) }))
      : [];

    const repoDir = repoManager.getRepoDir(agent.id);
    const repoCloned = repoManager.isRepoCloned(agent.id);

    let repoContext = "";
    if (repoCloned) {
      try {
        const listDir = (dir: string, prefix = "", depth = 0): string => {
          if (depth > 3) return "";
          const entries = fs.readdirSync(dir, { withFileTypes: true })
            .filter(e => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "__pycache__" && e.name !== ".git")
            .sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1));
          return entries.map(e => {
            const line = `${prefix}${e.isDirectory() ? "📁 " : "  "}${e.name}`;
            if (e.isDirectory()) return line + "\n" + listDir(path.join(dir, e.name), prefix + "  ", depth + 1);
            return line;
          }).join("\n");
        };
        repoContext += "## Repository Structure\n```\n" + listDir(repoDir) + "\n```\n\n";
      } catch {}

      try {
        const status = await repoManager.getStatus(agent.id);
        const changes = [...status.modified, ...status.created, ...status.deleted, ...status.staged];
        if (changes.length > 0) {
          repoContext += "## Uncommitted Changes\n" + changes.map(f => `- ${f}`).join("\n") + "\n\n";
          const diff = await repoManager.getDiff(agent.id);
          if (diff) repoContext += "## Current Diff\n```diff\n" + diff.slice(0, 12000) + "\n```\n\n";
        }
      } catch {}

      try {
        const log = await repoManager.getLog(agent.id, 10);
        if (log.length > 0) {
          repoContext += "## Recent Commits\n" + log.map(c => `- ${c.hash} ${c.message} (${c.author})`).join("\n") + "\n\n";
        }
      } catch {}
    }

    const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g;
    const TOKEN_RE = /(?:ghp_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{82,}|x-access-token:[^\s@]+)/g;
    const terminalLines = getOutputBuffer(agent.id);
    const fullRaw = terminalLines.join("");
    const fullClean = fullRaw.replace(ANSI_RE, "").replace(TOKEN_RE, "[REDACTED]");
    const sessionStart = fullClean.slice(0, 500);
    const recentActivity = fullClean.slice(-10000);
    const cleanTerminal = sessionStart.length + recentActivity.length < fullClean.length
      ? sessionStart + "\n...[earlier output truncated]...\n" + recentActivity
      : fullClean;

    let taskContext = "";
    if (agent.currentTaskSummary) taskContext += `Current Task: ${agent.currentTaskSummary}\n`;
    taskContext += `Agent Status: ${agent.status || "idle"}\n`;

    const claudeIdle = isClaudeCodeIdle(agent.id);
    const queueStatus = getQueueStatus(agent.id);

    const systemPrompt = `You are Orbit — the AI orchestrator and supervisor for the "${agent.name}" agent workspace within Orbia.
You ACTIVELY drive Claude Code CLI to complete work, review results, and push when ready.

## Architecture
- Claude Code CLI is running in the agent's terminal in interactive mode
- You write prompts to Claude Code via [CLAUDE_PROMPT] tags
- Claude Code is currently: ${claudeIdle ? "IDLE — ready for a prompt" : "BUSY — working on something"}

## Tags You Can Use

### [CLAUDE_PROMPT] — Send work to Claude Code
[CLAUDE_PROMPT]your natural language instruction here[/CLAUDE_PROMPT]

### [FOLLOW_UP] — Queue automatic next steps after Claude Code finishes
Use this to chain actions. After Claude Code completes the current prompt, the follow-up runs automatically.
[FOLLOW_UP]{"steps":["review","push_if_approved"]}[/FOLLOW_UP]

Available steps:
- "review" — Orbit reads the diff/terminal output and evaluates the work quality
- "push_if_approved" — If the review passes, Claude Code commits and pushes all changes
- "test" — Tell Claude Code to run the project's test suite
- "notify" — Send a push notification that work is complete

### [AUTO_SETTINGS] — Toggle automation settings based on user intent
When the user's message implies they want automatic review, push, or notifications, set these toggles.
[AUTO_SETTINGS]{"autoReview":true,"autoPush":true,"notifyOnComplete":true}[/AUTO_SETTINGS]

Current settings: autoReview=${agent.autoReview ? "ON" : "OFF"}, autoPush=${agent.autoPush ? "ON" : "OFF"}, notify=${agent.notifyOnComplete ? "ON" : "OFF"}

Examples of when to enable:
- "implement and push when done" → autoReview:true, autoPush:true
- "work on this, let me know when ready" → notifyOnComplete:true
- "implement, review, and push if approved" → autoReview:true, autoPush:true
- "just implement this" (no mention of push/review) → don't change settings

## Context
${repoContext}
${taskContext}
${cleanTerminal ? `## Terminal Output\n\`\`\`\n${cleanTerminal}\n\`\`\`\n` : ""}

## Rules
1. ALWAYS include a [CLAUDE_PROMPT] block when action is needed
2. Write prompts as natural language — Claude Code is an AI developer
3. Be COMPREHENSIVE — give Claude Code everything it needs in ONE prompt
4. When the user wants implementation + review + push, include [FOLLOW_UP] with the right steps
5. Keep commentary to 1-2 sentences. The prompt matters, not analysis.
6. When doing a review (action=review), read the terminal output carefully, evaluate the work, and give a clear APPROVED or NEEDS_WORK verdict

## Style
- Concise. Action over analysis.
- Your output: brief explanation + [CLAUDE_PROMPT] + optional [FOLLOW_UP]. That's it.`;

    let userMessage = "";
    if (action === "review") {
      userMessage = `Review the work this agent has done. Look at the terminal history to understand what was built.

Send a [CLAUDE_PROMPT] telling Claude Code to: run git diff, summarize all changes, rate code quality, and give a verdict on whether it's ready to push.`;
    } else if (action === "test") {
      userMessage = `Run the test suite. Send a [CLAUDE_PROMPT] telling Claude Code to find and run the project's tests (npm test, pytest, cargo test, etc.) and report results.`;
    } else if (action === "push_merge") {
      userMessage = `Push all changes and merge to main. Send a [CLAUDE_PROMPT] telling Claude Code to: check git status, stage and commit any uncommitted changes with a descriptive message, push to origin, and if not on main/master, merge into main and push. Report commit hash, branch, and files changed.`;
    } else if (action === "chat" && safeMessage) {
      userMessage = safeMessage;
    } else {
      return res.status(400).json({ error: "Invalid action or missing message" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      for (const h of safeHistory) {
        messages.push({ role: h.role as "user" | "assistant", content: h.content });
      }

      messages.push({ role: "user", content: userMessage });

      console.log(`[orbit] "${agent.name}" — claudeIdle=${claudeIdle}, queue=${queueStatus.size}, hasSession=${hasActiveSession(agent.id)}, action=${action}`);

      const fullAIText = await aiStream(messages, res, { model: MODEL_FAST, maxTokens: 4096 });

      // Parse [AUTO_SETTINGS] — Orbit AI can toggle settings from its response
      const autoSettingsMatch = fullAIText.match(/\[AUTO_SETTINGS\]([\s\S]*?)\[\/AUTO_SETTINGS\]/);
      if (autoSettingsMatch) {
        try {
          const settings = JSON.parse(autoSettingsMatch[1].trim());
          const updates: any = {};
          if (typeof settings.autoReview === "boolean") updates.autoReview = settings.autoReview ? 1 : 0;
          if (typeof settings.autoPush === "boolean") updates.autoPush = settings.autoPush ? 1 : 0;
          if (typeof settings.notifyOnComplete === "boolean") updates.notifyOnComplete = settings.notifyOnComplete ? 1 : 0;
          if (Object.keys(updates).length > 0) {
            await storage.updateAgentProfile(ctx.userId, agent.id, updates);
            Object.assign(agent, updates);
            broadcastToAgent(agent.id, "settings_updated", updates);
            const labels = Object.entries(updates).map(([k, v]) => `${k}=${v ? "ON" : "OFF"}`).join(", ");
            console.log(`[orbit] Auto-settings for "${agent.name}": ${labels}`);
            await logOrbitEvent(agent.id, "settings_changed", "Settings auto-updated", labels);
          }
        } catch (e) {
          console.log(`[orbit] Failed to parse [AUTO_SETTINGS]: ${(e as Error).message}`);
        }
      }

      const promptMatch = fullAIText.match(/\[CLAUDE_PROMPT\]([\s\S]*?)\[\/CLAUDE_PROMPT\]/)
        || fullAIText.match(/\[TERMINAL_CMD\]([\s\S]*?)\[\/TERMINAL_CMD\]/);
      if (promptMatch) {
        const prompt = promptMatch[1].trim();
        if (prompt && hasActiveSession(agent.id)) {
          queuePromptForClaude(agent.id, prompt, "orbit");
          console.log(`[orbit] Sent prompt for "${agent.name}": ${prompt.slice(0, 200)}`);
          await logOrbitEvent(agent.id, "prompt_sent", "Prompt sent to Claude Code", prompt.slice(0, 500), { action });
        } else {
          console.log(`[orbit] Prompt found but no active session for "${agent.name}"`);
        }
      } else {
        console.log(`[orbit] No [CLAUDE_PROMPT] in AI response for "${agent.name}" (${fullAIText.length} chars)`);
      }

      // Parse follow-up steps and set up completion watcher
      const followUpMatch = fullAIText.match(/\[FOLLOW_UP\]([\s\S]*?)\[\/FOLLOW_UP\]/);
      let followUpHandled = false;
      if (followUpMatch && promptMatch && hasActiveSession(agent.id)) {
        try {
          const followUp = JSON.parse(followUpMatch[1].trim());
          const steps: string[] = followUp.steps || [];
          if (steps.length > 0) {
            console.log(`[orbit] Follow-up steps for "${agent.name}": ${steps.join(" → ")}`);
            setupFollowUpChain(agent.id, ctx.userId, steps);
            followUpHandled = true;
            await logOrbitEvent(agent.id, "chain_started", "Workflow queued", steps.join(" → "), { steps });
          }
        } catch (e) {
          console.log(`[orbit] Failed to parse [FOLLOW_UP] JSON: ${(e as Error).message}`);
        }
      }

      if (!followUpHandled && promptMatch && hasActiveSession(agent.id) && action !== "review") {
        const autoSteps: string[] = [];
        if (agent.autoReview) autoSteps.push("review");
        if (agent.autoPush) autoSteps.push(agent.autoReview ? "push_if_approved" : "push");
        if (agent.notifyOnComplete && autoSteps.length > 0) autoSteps.push("notify");
        if (autoSteps.length > 0) {
          console.log(`[orbit] Auto follow-up for "${agent.name}": ${autoSteps.join(" → ")}`);
          setupFollowUpChain(agent.id, ctx.userId, autoSteps);
          broadcastToAgent(agent.id, "orbit_step", { step: "auto_chain", steps: autoSteps });
          await logOrbitEvent(agent.id, "chain_started", "Auto-workflow queued", autoSteps.join(" → "), { steps: autoSteps, auto: true });
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      console.error("[orbit] AI error:", err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  });

  app.get("/api/agents/:id/events", requireAuth, async (req: Request, res: Response) => {
    try {
      const ctx = await requireAgentOwnership(req, res);
      if (!ctx) return;
      const parsed = parseInt(req.query.limit as string);
      const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 200) : 50;
      const events = await db.select().from(orbitEvents)
        .where(eq(orbitEvents.agentId, ctx.agentId))
        .orderBy(desc(orbitEvents.createdAt))
        .limit(limit);
      res.json(events.reverse());
    } catch (err: any) {
      console.error("[orbit-events] Error fetching events:", err.message);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription" });
      }
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      if (existing.length > 0) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      }
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[push] subscribe error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
    try {
      const { endpoint } = req.body;
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      if (endpoint) {
        const { and } = await import("drizzle-orm");
        await db.delete(pushSubscriptions).where(
          and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId))
        );
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
