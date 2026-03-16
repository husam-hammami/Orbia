import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { agentProcessManager } from "../lib/agent-process-manager";
import { injectCommand, hasActiveSession, subscribeToOutput, killSession, getOutputBuffer } from "../lib/agent-terminal";
import { aiStream, MODEL_FAST } from "../lib/ai-client";
import * as repoManager from "../lib/repo-manager";
import * as githubOAuth from "../lib/github-oauth";
import { requireAuth } from "../auth";
import crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
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
const activeTerminalTasks = new Set<string>();

function monitorTerminalTask(agentId: string, taskId: string, userId: string) {
  if (terminalTaskMonitors.has(taskId)) return;
  activeTerminalTasks.add(agentId);

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

    const hasFinished = (promptReturnCount > 0 && timeSinceOutput > 15000) ||
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

  app.post("/api/agents/:id/orbit", requireAuth, async (req: Request, res: Response) => {
    const ctx = await requireAgentOwnership(req, res);
    if (!ctx) return;
    const agent = (await storage.getAgentProfile(ctx.userId, ctx.agentId))!;

    const { action, message, history } = req.body;
    if (!action || !["analyze", "review", "plan", "monitor", "chat"].includes(action)) {
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
          if (diff) repoContext += "## Current Diff\n```diff\n" + diff.slice(0, 8000) + "\n```\n\n";
        }
      } catch {}

      try {
        const log = await repoManager.getLog(agent.id, 10);
        if (log.length > 0) {
          repoContext += "## Recent Commits\n" + log.map(c => `- ${c.hash} ${c.message} (${c.author})`).join("\n") + "\n\n";
        }
      } catch {}
    }

    const terminalLines = getOutputBuffer(agent.id);
    const recentTerminal = terminalLines.slice(-100).join("");
    const cleanTerminal = recentTerminal.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").slice(-4000);

    let taskContext = "";
    if (agent.currentTaskSummary) taskContext += `Current Task: ${agent.currentTaskSummary}\n`;
    taskContext += `Agent Status: ${agent.status || "idle"}\n`;

    const systemPrompt = `You are Orbit — an AI analysis companion embedded in the "${agent.name}" agent workspace within Orbia.
Your role is to be a brilliant, concise technical advisor. You have full context of this agent's repository, terminal activity, and current work.

${repoContext}
${taskContext}
${cleanTerminal ? `## Recent Terminal Output\n\`\`\`\n${cleanTerminal}\n\`\`\`\n` : ""}

## Your Capabilities
- **Analyze**: Deep repo structure analysis, code quality review, dependency assessment
- **Review**: Review uncommitted changes, diffs, recent commits with actionable feedback
- **Plan**: Generate detailed task plans, suggest next steps, architecture recommendations
- **Monitor**: Interpret what the CLI agent is doing from terminal output

## Style
- Be concise but thorough. Use markdown formatting.
- When reviewing code, be specific about file paths and line-level feedback.
- When generating plans, use numbered steps with clear outcomes.
- Speak as a senior architect — confident, direct, actionable.`;

    let userMessage = "";
    if (action === "analyze") {
      userMessage = `Analyze this repository structure and give me a clear, structured breakdown:

1. **Stack** — List the main technologies, frameworks, and tools (be specific about versions if visible in package.json)
2. **Architecture** — How is the project organized? What patterns does it follow?
3. **Key Files** — The 5-8 most important files and what each does (one line each)
4. **Health Check** — Any red flags: missing tests, no CI config, outdated deps, security concerns
5. **Quick Assessment** — One sentence: is this codebase in good shape or does it need work?

Keep it scannable. Use bullet points, not paragraphs.`;
    } else if (action === "review") {
      userMessage = `Review the uncommitted changes and recent commits. Structure your response as:

1. **Summary** — What changed, in one sentence
2. **Changes Breakdown** — For each modified file, explain what changed and rate it:
   - ✅ Good — Clean, follows conventions
   - ⚠️ Concern — Works but has issues (explain what)
   - 🔴 Problem — Bug, security issue, or breaking change
3. **Suggestions** — Concrete improvements with code snippets if applicable

If there are no uncommitted changes, review the last 3-5 commits instead. Be direct and specific — no filler.`;
    } else if (action === "plan") {
      userMessage = `Based on the current state of this repo, generate an actionable task plan:

1. **Current State** — Where the project is right now (one sentence)
2. **Immediate Tasks** — 3-5 things that should be done next, ordered by priority
   - For each: what to do, which files to touch, expected outcome
3. **Technical Debt** — Any cleanup or refactoring worth doing
4. **Blockers** — Anything that might prevent progress

Format as a numbered checklist that could be handed to a developer. Be specific about file paths and function names.`;
    } else if (action === "monitor") {
      userMessage = `Analyze the recent terminal output and tell me:

1. **Status** — What is the agent currently doing? (one clear sentence)
2. **Progress** — What has it completed so far?
3. **Issues** — Any errors, warnings, or stuck processes?
4. **Action Needed?** — Does anything require human intervention? Yes/No with explanation.

Be concise. If the terminal is idle, just say so.`;
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

      await aiStream(messages, res, { model: MODEL_FAST, maxTokens: 4096 });
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      console.error("[orbit] AI error:", err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  });
}
