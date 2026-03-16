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
}

const MAX_BUFFER_LINES = 2000;
const shells = new Map<string, ShellSession>();

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
  envVars.COLUMNS = "80";
  envVars.LINES = "24";

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
  };

  const welcome = `\x1b[1;36m=== ${agentName} ===\x1b[0m\r\n` +
    `\x1b[90mRepo: ${repoUrl}\x1b[0m\r\n` +
    `\x1b[90mDir: ${repoDir}\x1b[0m\r\n` +
    `\x1b[90mClaude Code launching automatically...\x1b[0m\r\n\r\n`;
  session.outputBuffer.push(welcome);

  const sttyRegex = /^.*stty cols \d+ rows \d+ 2>\/dev\/null\r?\n?/gm;

  const handleOutput = (data: Buffer) => {
    let text = data.toString();
    const filtered = text.replace(sttyRegex, "");
    if (filtered.length === 0) return;

    session.outputBuffer.push(filtered);
    if (session.outputBuffer.length > MAX_BUFFER_LINES) {
      session.outputBuffer = session.outputBuffer.slice(-MAX_BUFFER_LINES / 2);
    }
    for (const ws of session.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(filtered);
    }
    for (const listener of session.outputListeners) {
      try { listener(filtered); } catch {}
    }
  };

  shell.stdout?.on("data", handleOutput);
  shell.stderr?.on("data", handleOutput);

  shell.on("close", (code) => {
    session.alive = false;
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

    shellSession.clients.add(ws);

    const history = shellSession.outputBuffer.join("");
    if (history) ws.send(history);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastCols = 0;
    let lastRows = 0;

    ws.on("message", (msg: Buffer | string) => {
      const data = msg.toString();
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "resize" && parsed.cols && parsed.rows) {
          const cols = Math.max(10, Math.min(500, parsed.cols));
          const rows = Math.max(5, Math.min(200, parsed.rows));
          if (cols === lastCols && rows === lastRows) return;
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (shellSession.alive && shellSession.process.stdin) {
              lastCols = cols;
              lastRows = rows;
              shellSession.process.stdin.write(`stty cols ${cols} rows ${rows} 2>/dev/null\r`);
            }
          }, 500);
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
      if (resizeTimer) clearTimeout(resizeTimer);
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
