import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { agentProcessManager } from "../lib/agent-process-manager";
import * as repoManager from "../lib/repo-manager";
import * as githubOAuth from "../lib/github-oauth";
import crypto from "crypto";

const sseClients = new Map<string, Set<Response>>();

function broadcastToAgent(agentId: string, event: string, data: any) {
  const clients = sseClients.get(agentId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
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
  } catch {}
});
agentProcessManager.on("agent:completed", async (data) => {
  broadcastToAgent(data.agentId, "completed", data);
  try {
    await storage.updateAgentTask(data.taskId, {
      status: data.exitCode === 0 ? "completed" : "failed",
      completedAt: new Date(),
      errorMessage: data.exitCode !== 0 ? `Process exited with code ${data.exitCode}` : undefined,
    });
    await storage.updateAgentProfile(
      "",
      data.agentId,
      { status: "idle", currentTaskSummary: null } as any
    );
    if (data.exitCode === 0) {
      const agent = await storage.getAgentTask(data.taskId);
      if (agent) {
        const profile = await storage.getAgentProfile("", data.agentId);
      }
    }
  } catch {}
});
agentProcessManager.on("agent:error", (data) => broadcastToAgent(data.agentId, "error", data));

export function registerAgentRoutes(app: Express) {
  // GitHub OAuth
  app.get("/api/agents/github/auth-url", (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const state = `${userId}:${crypto.randomBytes(16).toString("hex")}`;
    res.json({ url: githubOAuth.getAuthUrl(state) });
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

  app.get("/api/agents/github/status", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const conn = await storage.getGithubConnection(userId);
    res.json({ connected: !!conn, username: conn?.username, avatarUrl: conn?.avatarUrl });
  });

  app.delete("/api/agents/github/disconnect", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    await storage.deleteGithubConnection(userId);
    res.json({ ok: true });
  });

  app.get("/api/agents/github/repos", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
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

  app.get("/api/agents/github/repos/:owner/:repo/branches", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const conn = await storage.getGithubConnection(userId);
    if (!conn) return res.status(400).json({ error: "GitHub not connected" });
    try {
      const branches = await githubOAuth.listBranches(conn.accessToken, req.params.owner, req.params.repo);
      res.json(branches.map((b: any) => ({ name: b.name, sha: b.commit?.sha })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Agent CRUD
  app.get("/api/agents", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const agents = await storage.getAllAgentProfiles(userId);
    const enriched = agents.map((a) => ({
      ...a,
      isRunning: agentProcessManager.isRunning(a.id),
      repoCloned: repoManager.isRepoCloned(a.id),
    }));
    res.json(enriched);
  });

  app.get("/api/agents/:id", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const agent = await storage.getAgentProfile(userId, req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json({
      ...agent,
      isRunning: agentProcessManager.isRunning(agent.id),
      repoCloned: repoManager.isRepoCloned(agent.id),
    });
  });

  app.post("/api/agents", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
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

  app.patch("/api/agents/:id", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const agent = await storage.updateAgentProfile(userId, req.params.id, req.body);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  app.delete("/api/agents/:id", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (agentProcessManager.isRunning(req.params.id)) {
      agentProcessManager.stopAgent(req.params.id);
    }
    await repoManager.deleteRepo(req.params.id);
    const ok = await storage.deleteAgentProfile(userId, req.params.id);
    res.json({ ok });
  });

  // Tasks
  app.get("/api/agents/:id/tasks", async (req: Request, res: Response) => {
    const tasks = await storage.getAgentTasks(req.params.id);
    res.json(tasks);
  });

  app.post("/api/agents/:id/tasks", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const task = await storage.createAgentTask({
      agentId: req.params.id,
      description: req.body.description,
      priority: req.body.priority || 0,
      status: "queued",
    });
    res.json(task);
  });

  app.post("/api/agents/:id/tasks/:taskId/run", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const agent = await storage.getAgentProfile(userId, req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    const task = await storage.getAgentTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (!repoManager.isRepoCloned(agent.id)) {
      return res.status(400).json({ error: "Repo not cloned" });
    }

    let session = await storage.getLatestAgentSession(agent.id);
    if (!session || session.status !== "active") {
      session = await storage.createAgentSession({ agentId: agent.id, status: "active" });
    }

    await storage.updateAgentTask(task.id, { status: "running", startedAt: new Date(), sessionId: session.id });
    await storage.updateAgentProfile(userId, agent.id, {
      status: "working",
      currentTaskSummary: task.description,
    } as any);

    try {
      await agentProcessManager.startAgent({
        agentId: agent.id,
        taskId: task.id,
        sessionId: session.id,
        workdir: repoManager.getRepoDir(agent.id),
        prompt: task.description,
        conversationId: session.claudeConversationId || undefined,
      });
      res.json({ ok: true, sessionId: session.id });
    } catch (err: any) {
      await storage.updateAgentTask(task.id, { status: "failed", errorMessage: err.message });
      await storage.updateAgentProfile(userId, agent.id, { status: "idle", currentTaskSummary: null } as any);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/stop", async (req: Request, res: Response) => {
    const stopped = agentProcessManager.stopAgent(req.params.id);
    res.json({ stopped });
  });

  // Activity log
  app.get("/api/agents/tasks/:taskId/activity", async (req: Request, res: Response) => {
    const log = await storage.getAgentActivityLog(req.params.taskId);
    res.json(log);
  });

  // Git operations
  app.post("/api/agents/:id/git/clone", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const agent = await storage.getAgentProfile(userId, req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    const conn = await storage.getGithubConnection(userId);
    try {
      const dir = await repoManager.cloneRepo(agent.id, agent.repoUrl, agent.repoBranch || "main", conn?.accessToken);
      res.json({ ok: true, dir });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/pull", async (req: Request, res: Response) => {
    try {
      const result = await repoManager.pullRepo(req.params.id);
      res.json({ ok: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/git/status", async (req: Request, res: Response) => {
    try {
      const status = await repoManager.getStatus(req.params.id);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/git/diff", async (req: Request, res: Response) => {
    try {
      const diff = await repoManager.getDiff(req.params.id, req.query.staged === "true");
      res.json({ diff });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/git/log", async (req: Request, res: Response) => {
    try {
      const log = await repoManager.getLog(req.params.id, Number(req.query.count) || 20);
      res.json(log);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/commit", async (req: Request, res: Response) => {
    try {
      const hash = await repoManager.commitChanges(req.params.id, req.body.message || "Agent commit");
      res.json({ ok: true, hash });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/push", async (req: Request, res: Response) => {
    try {
      await repoManager.pushChanges(req.params.id, req.body.branch);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/:id/git/checkout", async (req: Request, res: Response) => {
    try {
      await repoManager.checkoutBranch(req.params.id, req.body.branch, req.body.create === true);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SSE Stream
  app.get("/api/agents/:id/stream", (req: Request, res: Response) => {
    const agentId = req.params.id;
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
  app.post("/api/agents/:id/send", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const agent = await storage.getAgentProfile(userId, req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    if (!repoManager.isRepoCloned(agent.id)) {
      const conn = await storage.getGithubConnection(userId);
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
    await storage.updateAgentProfile(userId, agent.id, {
      status: "working",
      currentTaskSummary: req.body.prompt,
    } as any);

    try {
      await agentProcessManager.startAgent({
        agentId: agent.id,
        taskId: task.id,
        sessionId: session.id,
        workdir: repoManager.getRepoDir(agent.id),
        prompt: req.body.prompt,
        conversationId: session.claudeConversationId || undefined,
      });
      res.json({ ok: true, taskId: task.id, sessionId: session.id });
    } catch (err: any) {
      await storage.updateAgentTask(task.id, { status: "failed", errorMessage: err.message });
      await storage.updateAgentProfile(userId, agent.id, { status: "idle", currentTaskSummary: null } as any);
      res.status(500).json({ error: err.message });
    }
  });

  // System status
  app.get("/api/agents/system/status", (_req: Request, res: Response) => {
    res.json({
      runningAgents: agentProcessManager.getRunningAgents(),
      totalRunning: agentProcessManager.getRunningCount(),
    });
  });
}
