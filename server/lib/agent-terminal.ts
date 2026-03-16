import { spawn, ChildProcess } from "child_process";
import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import * as repoManager from "./repo-manager";
import { storage } from "../storage";
import type { IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import { db } from "../db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import path from "path";
import * as os from "os";
import * as fs from "fs";

interface ShellSession {
  process: ChildProcess;
  agentId: string;
  agentName: string;
  repoUrl: string;
  outputBuffer: string[];
  clients: Set<WebSocket>;
  alive: boolean;
  outputListeners: Set<(data: string) => void>;
  bootstrapComplete: boolean;
  pendingTask?: string;
}

interface BootstrapState {
  phase: "launching" | "waiting_for_prompts" | "login_required" | "ready" | "done";
  entersSent: number;
  loginUrl?: string;
  lastActivity: number;
  timeoutHandle?: ReturnType<typeof setTimeout>;
  accumulated: string;
}

const MAX_BUFFER_LINES = 2000;
const shells = new Map<string, ShellSession>();
const bootstrapStates = new Map<string, BootstrapState>();

const STRIP_ANSI = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g;

function stripAnsi(s: string): string {
  return s.replace(STRIP_ANSI, "");
}

function startBootstrapWatcher(session: ShellSession) {
  const agentId = session.agentId;
  const state: BootstrapState = {
    phase: "launching",
    entersSent: 0,
    lastActivity: Date.now(),
    accumulated: "",
  };
  bootstrapStates.set(agentId, state);

  const ENTER_PATTERNS = [
    /press enter/i,
    /press return/i,
    /hit enter/i,
    /continue\??\s*$/i,
    /\(y\/n\)/i,
    /\[Y\/n\]/i,
    /\[y\/N\]/i,
  ];

  const LOGIN_URL_PATTERN = /https?:\/\/[^\s]+(?:login|auth|oauth|claude\.ai)[^\s]*/i;
  const TOKEN_PROMPT_PATTERN = /paste.*(?:token|code|key)|enter.*(?:token|code|key)|(?:token|code|key).*:/i;
  const CLAUDE_READY_PATTERN = /[❯>]\s*$/;
  const CLAUDE_RUNNING = /Claude Code v|Opus|Sonnet|model:/i;
  const YES_NO_PROMPT = /\(Y\)es\s*\/\s*\(N\)o|\(y\/n\)|\[Y\/n\]/i;

  const MAX_ENTERS = 8;
  const BOOTSTRAP_TIMEOUT = 120000;

  const processOutput = (data: string) => {
    if (state.phase === "done") return;
    state.accumulated += data;
    state.lastActivity = Date.now();

    const clean = stripAnsi(state.accumulated);
    const recentClean = stripAnsi(data);

    if (state.phase === "launching" && (CLAUDE_RUNNING.test(clean) || clean.includes("Claude Code"))) {
      state.phase = "waiting_for_prompts";
      console.log(`[bootstrap] "${session.agentName}" — Claude Code detected, watching for prompts`);
    }

    if (state.phase === "waiting_for_prompts" || state.phase === "launching") {
      for (const pattern of ENTER_PATTERNS) {
        if (pattern.test(recentClean) && state.entersSent < MAX_ENTERS) {
          state.entersSent++;
          setTimeout(() => {
            if (session.alive && session.process.stdin) {
              session.process.stdin.write("\n");
              console.log(`[bootstrap] "${session.agentName}" — auto-pressed Enter (${state.entersSent}/${MAX_ENTERS})`);
            }
          }, 500);
          break;
        }
      }

      if (YES_NO_PROMPT.test(recentClean)) {
        setTimeout(() => {
          if (session.alive && session.process.stdin) {
            session.process.stdin.write("y\n");
            console.log(`[bootstrap] "${session.agentName}" — auto-answered Yes`);
          }
        }, 500);
      }
    }

    const urlMatch = clean.match(LOGIN_URL_PATTERN);
    if (urlMatch && state.phase !== "done") {
      state.phase = "login_required";
      state.loginUrl = urlMatch[0];
      console.log(`[bootstrap] "${session.agentName}" — login required: ${state.loginUrl}`);
      broadcastBootstrapEvent(session, {
        type: "login_required",
        url: state.loginUrl,
        message: "Claude Code needs authentication. Opening login page...",
      });
    }

    if (TOKEN_PROMPT_PATTERN.test(recentClean) && state.phase === "login_required") {
      console.log(`[bootstrap] "${session.agentName}" — waiting for token paste from user`);
      broadcastBootstrapEvent(session, {
        type: "token_needed",
        message: "Please paste the authentication token from your browser.",
      });
    }

    if (CLAUDE_READY_PATTERN.test(clean.trim()) && state.phase !== "done") {
      const hasClaudeMarkers = CLAUDE_RUNNING.test(clean) || clean.includes("guest passes") || clean.includes("/passes") || clean.includes("context");

      if (hasClaudeMarkers) {
        state.phase = "ready";
        console.log(`[bootstrap] "${session.agentName}" — Claude Code is ready!`);
        session.bootstrapComplete = true;

        broadcastBootstrapEvent(session, {
          type: "ready",
          message: "Claude Code is ready and waiting for commands.",
        });

        if (session.pendingTask) {
          const taskPrompt = session.pendingTask;
          session.pendingTask = undefined;
          setTimeout(() => {
            if (session.alive && session.process.stdin) {
              const escapedPrompt = taskPrompt.replace(/'/g, "'\\''");
              const cmd = `claude -p '${escapedPrompt}' --dangerously-skip-permissions`;
              session.process.stdin.write(cmd + "\n");
              console.log(`[bootstrap] "${session.agentName}" — auto-sent task: ${taskPrompt.slice(0, 80)}`);
              broadcastBootstrapEvent(session, {
                type: "task_sent",
                message: `Running task: ${taskPrompt.slice(0, 100)}...`,
              });
            }
          }, 1000);
        }

        state.phase = "done";
        cleanupBootstrap(agentId);
      }
    }
  };

  (state as any)._listener = processOutput;
  session.outputListeners.add(processOutput);

  state.timeoutHandle = setTimeout(() => {
    if (state.phase !== "done") {
      console.log(`[bootstrap] "${session.agentName}" — bootstrap timeout after ${BOOTSTRAP_TIMEOUT / 1000}s (phase: ${state.phase})`);
      session.bootstrapComplete = true;
      broadcastBootstrapEvent(session, {
        type: "timeout",
        message: "Bootstrap timed out. You can interact with the terminal manually.",
      });
      cleanupBootstrap(agentId);
    }
  }, BOOTSTRAP_TIMEOUT);
}

function cleanupBootstrap(agentId: string) {
  const state = bootstrapStates.get(agentId);
  if (!state) return;
  if (state.timeoutHandle) clearTimeout(state.timeoutHandle);
  const session = shells.get(agentId);
  if (session && (state as any)._listener) {
    session.outputListeners.delete((state as any)._listener);
  }
  bootstrapStates.delete(agentId);
}

function broadcastBootstrapEvent(session: ShellSession, event: { type: string; url?: string; message: string }) {
  const payload = JSON.stringify({ bootstrap: event });
  for (const ws of session.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`\x1b]bootstrap:${payload}\x07`);
    }
  }
}

export function broadcastBootstrapEventById(agentId: string, event: { type: string; url?: string; message: string }) {
  const session = shells.get(agentId);
  if (session) broadcastBootstrapEvent(session, event);
}

interface PermissionWatcherState {
  mode: "manual" | "bypass" | "auto";
  notifyOnComplete: boolean;
  listener: ((data: string) => void) | null;
  accumulated: string;
  lastPromptHandled: number;
}

const permissionWatchers = new Map<string, PermissionWatcherState>();

const PERMISSION_PATTERNS = [
  /Do you want to proceed\?/i,
  /Allow this action\?/i,
  /\(y\/n\)/,
  /\[Y\/n\]/,
  /\[y\/N\]/,
  /Press Enter to continue/i,
  /\(Y\)es\s*\/\s*\(N\)o/i,
  /Do you want to allow/i,
  /Allow .+ to/i,
  /Approve\?/i,
  /Would you like to continue/i,
  /Want to proceed/i,
  /Do you want to run/i,
  /Confirm\?/i,
];

const RISKY_PATTERNS = [
  /rm\s+-rf?\s+\//i,
  /drop\s+(table|database)/i,
  /delete\s+from\s+\w+\s*(;|$)/i,
  /force\s+push/i,
  /--force/i,
  /format\s+/i,
  /truncate\s+/i,
  /destroy/i,
  /nuke/i,
  /wipe/i,
  /git\s+push.*-f/i,
  /overwrite/i,
  /reset\s+--hard/i,
];

const TASK_COMPLETE_PATTERNS = [
  /Task completed/i,
  /All done/i,
  /✓\s*Done/i,
  /completed successfully/i,
  /\$ $/m,
];

function startPermissionWatcher(session: ShellSession, mode: "manual" | "bypass" | "auto", notifyOnComplete: boolean) {
  stopPermissionWatcher(session.agentId);

  const state: PermissionWatcherState = {
    mode,
    notifyOnComplete,
    listener: null,
    accumulated: "",
    lastPromptHandled: 0,
  };

  if (mode === "manual") {
    permissionWatchers.set(session.agentId, state);
    return;
  }

  const processOutput = (data: string) => {
    state.accumulated += data;
    if (state.accumulated.length > 8000) {
      state.accumulated = state.accumulated.slice(-4000);
    }

    if (!session.bootstrapComplete) return;

    const clean = stripAnsi(data);
    const now = Date.now();

    if (now - state.lastPromptHandled < 1000) return;

    const isPermissionPrompt = PERMISSION_PATTERNS.some(p => p.test(clean));
    if (!isPermissionPrompt) return;

    if (state.mode === "bypass") {
      state.lastPromptHandled = now;
      setTimeout(() => {
        if (session.alive && session.process.stdin) {
          session.process.stdin.write("y\n");
          console.log(`[permission-watcher] "${session.agentName}" — bypass: auto-approved`);
        }
      }, 300);
      return;
    }

    if (state.mode === "auto") {
      const recentContext = stripAnsi(state.accumulated).slice(-2000);
      const isRisky = RISKY_PATTERNS.some(p => p.test(recentContext));

      if (isRisky) {
        console.log(`[permission-watcher] "${session.agentName}" — auto: RISKY operation detected, skipping auto-approve`);
        broadcastBootstrapEvent(session, {
          type: "permission_risky",
          message: "Risky operation detected — needs manual approval",
        });
        return;
      }

      state.lastPromptHandled = now;
      setTimeout(() => {
        if (session.alive && session.process.stdin) {
          session.process.stdin.write("y\n");
          console.log(`[permission-watcher] "${session.agentName}" — auto: approved safe operation`);
        }
      }, 300);
    }
  };

  state.listener = processOutput;
  session.outputListeners.add(processOutput);
  permissionWatchers.set(session.agentId, state);
  console.log(`[permission-watcher] "${session.agentName}" — started in ${mode} mode (notify: ${notifyOnComplete})`);
}

function stopPermissionWatcher(agentId: string) {
  const state = permissionWatchers.get(agentId);
  if (!state) return;
  if (state.listener) {
    const session = shells.get(agentId);
    if (session) session.outputListeners.delete(state.listener);
  }
  permissionWatchers.delete(agentId);
}

function sendNotification(session: ShellSession, message: string) {
  broadcastBootstrapEvent(session, {
    type: "notification",
    message,
  });
}

export function updatePermissionMode(agentId: string, mode: "manual" | "bypass" | "auto", notifyOnComplete: boolean) {
  const session = shells.get(agentId);
  if (!session || !session.alive) return false;
  startPermissionWatcher(session, mode, notifyOnComplete);
  return true;
}

export function getPermissionMode(agentId: string): { mode: string; notifyOnComplete: boolean } | null {
  const state = permissionWatchers.get(agentId);
  if (!state) return null;
  return { mode: state.mode, notifyOnComplete: state.notifyOnComplete };
}

function getClaudePath(): string {
  return path.join(process.cwd(), ".config/npm/node_global/bin");
}

async function ensureShell(agentId: string, agentName: string, repoUrl: string, repoBranch?: string): Promise<ShellSession> {
  const existing = shells.get(agentId);
  if (existing && existing.alive) return existing;

  if (existing) {
    try { existing.process.kill(); } catch {}
    shells.delete(agentId);
  }

  let repoDir: string;
  if (repoManager.isRepoCloned(agentId)) {
    repoDir = repoManager.getRepoDir(agentId);
  } else if (repoUrl) {
    try {
      let token: string | undefined;
      try {
        const agents = await db.execute(sql`SELECT "userId" FROM agent_profiles WHERE id = ${agentId} LIMIT 1`);
        const row = (agents as any).rows?.[0] || (agents as any)[0];
        if (row?.userId) {
          const conn = await storage.getGithubConnection(row.userId);
          if (conn?.accessToken) token = conn.accessToken;
        }
      } catch {}
      repoDir = await repoManager.cloneRepo(agentId, repoUrl, repoBranch || "main", token);
      console.log(`[agent-terminal] Auto-cloned repo for "${agentName}" into ${repoDir}`);
    } catch (err: any) {
      console.error(`[agent-terminal] Auto-clone failed for "${agentName}":`, err.message);
      repoDir = "/tmp";
    }
  } else {
    repoDir = "/tmp";
  }

  const claudeBinDir = getClaudePath();
  const currentPath = process.env.PATH || "";
  const enhancedPath = `${claudeBinDir}:${currentPath}`;

  const envVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) envVars[k] = v;
  }
  envVars.TERM = "xterm-256color";
  envVars.PATH = enhancedPath;
  envVars.PS1 = `\\[\\033[1;36m\\]${agentName}\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]$ `;
  envVars.COLUMNS = "180";
  envVars.LINES = "50";

  const shell = spawn("script", ["-qfc", "bash --norc --noprofile -i", "/dev/null"], {
    cwd: repoDir,
    env: envVars,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const session: ShellSession = {
    process: shell,
    agentId,
    agentName,
    repoUrl,
    outputBuffer: [],
    clients: new Set(),
    alive: true,
    outputListeners: new Set(),
    bootstrapComplete: false,
  };

  const welcome = `\x1b[1;36m=== ${agentName} ===\x1b[0m\r\n` +
    `\x1b[90mRepo: ${repoUrl}\x1b[0m\r\n` +
    `\x1b[90mDir: ${repoDir}\x1b[0m\r\n` +
    `\x1b[90mClaude Code launching automatically...\x1b[0m\r\n\r\n`;
  session.outputBuffer.push(welcome);

  const handleOutput = (data: Buffer) => {
    const text = data.toString();
    if (text.length === 0) return;

    session.outputBuffer.push(text);
    if (session.outputBuffer.length > MAX_BUFFER_LINES) {
      session.outputBuffer = session.outputBuffer.slice(-MAX_BUFFER_LINES / 2);
    }
    for (const ws of session.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(text);
    }
    for (const listener of session.outputListeners) {
      try { listener(text); } catch {}
    }
  };

  shell.stdout?.on("data", handleOutput);
  shell.stderr?.on("data", handleOutput);

  shell.on("close", (code) => {
    session.alive = false;
    stopPermissionWatcher(agentId);
    const msg = `\r\n\x1b[33m[Shell exited with code ${code}]\x1b[0m\r\n`;
    session.outputBuffer.push(msg);
    for (const ws of session.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
    shells.delete(agentId);
    console.log(`[agent-terminal] Shell exited for "${agentName}" (code ${code})`);
  });

  shell.on("error", (err) => {
    session.alive = false;
    stopPermissionWatcher(agentId);
    const msg = `\r\n\x1b[31m[Shell error: ${err.message}]\x1b[0m\r\n`;
    session.outputBuffer.push(msg);
    for (const ws of session.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
    shells.delete(agentId);
  });

  if (shell.stdin) {
    const initCmds = [
      `export PS1='\\[\\033[1;36m\\]${agentName}\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]$ '`,
      `export PATH="${enhancedPath}"`,
      `cd "${repoDir}"`,
      `clear`,
    ].join(" && ");
    shell.stdin.write(initCmds + "\n");
  }

  setTimeout(() => {
    if (session.alive && shell.stdin) {
      shell.stdin.write("clear\n");
      setTimeout(() => {
        if (session.alive && shell.stdin) {
          shell.stdin.write("claude\n");
          startBootstrapWatcher(session);
        }
      }, 200);
    }
  }, 600);

  shells.set(agentId, session);
  console.log(`[agent-terminal] PTY shell started for "${agentName}" (${agentId}) in ${repoDir}`);
  return session;
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) result[key.trim()] = rest.join("=").trim();
  }
  return result;
}

function unsignCookie(val: string, secret: string): string | false {
  if (!val.startsWith("s:")) return false;
  const raw = val.slice(2);
  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx < 0) return false;
  const sid = raw.slice(0, dotIdx);
  const mac = raw.slice(dotIdx + 1);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(sid)
    .digest("base64")
    .replace(/=+$/, "");
  try {
    if (crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
      return sid;
    }
  } catch {
    return false;
  }
  return false;
}

async function getSessionFromCookie(cookie: string | undefined): Promise<any> {
  if (!cookie) return null;
  const cookies = parseCookies(cookie);
  const rawSid = cookies["connect.sid"];
  if (!rawSid) return null;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const decoded = decodeURIComponent(rawSid);
  const sid = unsignCookie(decoded, secret);
  if (!sid) return null;

  try {
    const result = await db.execute(
      sql`SELECT sess FROM "user_sessions" WHERE sid = ${sid} AND expire > NOW()`
    );
    if (!result.rows?.[0]) return null;
    const sess = (result.rows[0] as any).sess;
    return typeof sess === "string" ? JSON.parse(sess) : sess;
  } catch {
    return null;
  }
}

export function setupAgentTerminalWS(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request: IncomingMessage, socket, head) => {
    const { pathname } = parseUrl(request.url || "");
    const match = pathname?.match(/^\/ws\/agent-terminal\/(.+)$/);
    if (!match) return;

    const agentId = match[1];
    console.log(`[agent-terminal] WebSocket upgrade request for agent ${agentId}`);

    const session = await getSessionFromCookie(request.headers.cookie);
    if (!session?.userId) {
      console.log(`[agent-terminal] Auth failed for agent ${agentId}`);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const agent = await storage.getAgentProfile(session.userId, agentId);
    if (!agent) {
      console.log(`[agent-terminal] Agent ${agentId} not found`);
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, agent);
    });
  });

  wss.on("connection", async (ws: WebSocket, _req: IncomingMessage, agent: any) => {
    const agentId = agent.id;
    console.log(`[agent-terminal] Client connected to "${agent.name}" (${agentId})`);
    const shellSession = await ensureShell(agentId, agent.name, agent.repoUrl, agent.repoBranch);

    const existingWatcher = permissionWatchers.get(agentId);
    const mode = (agent.permissionMode || "manual") as "manual" | "bypass" | "auto";
    const notify = !!(agent.notifyOnComplete);
    if (!existingWatcher || existingWatcher.mode !== mode || existingWatcher.notifyOnComplete !== notify) {
      stopPermissionWatcher(agentId);
      startPermissionWatcher(shellSession, mode, notify);
    }

    shellSession.clients.add(ws);

    const history = shellSession.outputBuffer.join("");
    if (history) ws.send(history);

    ws.on("message", (msg: Buffer | string) => {
      const data = msg.toString();
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "resize") {
          return;
        }
        if (parsed.type === "input") {
          if (shellSession.alive && shellSession.process.stdin) {
            shellSession.process.stdin.write(parsed.data);
          }
          return;
        }
      } catch {}
      if (shellSession.alive && shellSession.process.stdin) {
        shellSession.process.stdin.write(data);
      }
    });

    ws.on("close", () => {
      shellSession.clients.delete(ws);
      console.log(`[agent-terminal] Client left "${agent.name}" (${shellSession.clients.size} remaining)`);
    });
  });

  console.log("[agent-terminal] WebSocket terminal handler registered (PTY via script)");
}

export function subscribeToOutput(agentId: string, callback: (data: string) => void): (() => void) | null {
  const session = shells.get(agentId);
  if (!session || !session.alive) return null;

  session.outputListeners.add(callback);
  return () => { session.outputListeners.delete(callback); };
}

export function getOutputBuffer(agentId: string): string[] {
  const session = shells.get(agentId);
  if (!session) return [];
  return session.outputBuffer;
}

export function injectCommand(agentId: string, command: string): boolean {
  const session = shells.get(agentId);
  if (!session || !session.alive || !session.process.stdin) return false;
  session.process.stdin.write(command + "\n");
  return true;
}

export function killSession(agentId: string): boolean {
  const session = shells.get(agentId);
  if (!session) return false;
  stopPermissionWatcher(agentId);
  try {
    session.process.kill("SIGTERM");
    setTimeout(() => {
      try { session.process.kill("SIGKILL"); } catch {}
    }, 2000);
  } catch {}
  session.alive = false;
  shells.delete(agentId);
  const msg = `\r\n\x1b[33m[Shell restarting...]\x1b[0m\r\n`;
  for (const ws of session.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
  return true;
}

export function hasActiveSession(agentId: string): boolean {
  const session = shells.get(agentId);
  return !!session && session.alive;
}

export function isBootstrapComplete(agentId: string): boolean {
  const session = shells.get(agentId);
  return !!session && session.bootstrapComplete;
}

export function setPendingTask(agentId: string, task: string): boolean {
  const session = shells.get(agentId);
  if (!session) return false;
  if (session.bootstrapComplete) {
    return false;
  }
  session.pendingTask = task;
  console.log(`[bootstrap] "${session.agentName}" — queued pending task: ${task.slice(0, 80)}`);
  return true;
}

export function getActiveShellCount(): number {
  return shells.size;
}

export function getShellInfo(): { agentId: string; agentName: string; alive: boolean; clients: number }[] {
  return Array.from(shells.values()).map(s => ({
    agentId: s.agentId,
    agentName: s.agentName,
    alive: s.alive,
    clients: s.clients.size,
  }));
}
