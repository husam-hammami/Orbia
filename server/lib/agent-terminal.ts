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

interface ShellSession {
  process: ChildProcess;
  agentId: string;
  agentName: string;
  repoUrl: string;
  outputBuffer: string[];
  clients: Set<WebSocket>;
  alive: boolean;
}

const MAX_BUFFER_LINES = 2000;
const shells = new Map<string, ShellSession>();

function getClaudePath(): string {
  const npmGlobalBin = path.join(process.cwd(), ".config/npm/node_global/bin");
  return npmGlobalBin;
}

function ensureShell(agentId: string, agentName: string, repoUrl: string): ShellSession {
  const existing = shells.get(agentId);
  if (existing && existing.alive) return existing;

  if (existing) {
    try { existing.process.kill(); } catch {}
    shells.delete(agentId);
  }

  let repoDir: string;
  if (repoManager.isRepoCloned(agentId)) {
    repoDir = repoManager.getRepoDir(agentId);
  } else {
    repoDir = "/tmp";
  }

  const claudeBinDir = getClaudePath();
  const currentPath = process.env.PATH || "";
  const enhancedPath = `${claudeBinDir}:${currentPath}`;

  const shell = spawn("bash", ["--login"], {
    cwd: repoDir,
    env: {
      ...process.env,
      TERM: "xterm-256color",
      COLUMNS: "120",
      LINES: "30",
      PATH: enhancedPath,
      PS1: `\\[\\033[1;36m\\]${agentName}\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]$ `,
    },
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
  };

  const welcome = `\x1b[1;36m=== ${agentName} ===\x1b[0m\r\n` +
    `\x1b[90mRepo: ${repoUrl}\x1b[0m\r\n` +
    `\x1b[90mDir: ${repoDir}\x1b[0m\r\n` +
    `\x1b[90mType claude commands directly, or send tasks from the chat panel\x1b[0m\r\n\r\n`;
  session.outputBuffer.push(welcome);

  shell.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    session.outputBuffer.push(text);
    if (session.outputBuffer.length > MAX_BUFFER_LINES) {
      session.outputBuffer = session.outputBuffer.slice(-MAX_BUFFER_LINES / 2);
    }
    for (const ws of session.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(text);
    }
  });

  shell.stderr?.on("data", (data: Buffer) => {
    const text = data.toString();
    session.outputBuffer.push(text);
    if (session.outputBuffer.length > MAX_BUFFER_LINES) {
      session.outputBuffer = session.outputBuffer.slice(-MAX_BUFFER_LINES / 2);
    }
    for (const ws of session.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(text);
    }
  });

  shell.on("close", (code) => {
    session.alive = false;
    const msg = `\r\n\x1b[33m[Shell exited with code ${code}]\x1b[0m\r\n`;
    session.outputBuffer.push(msg);
    for (const ws of session.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
    shells.delete(agentId);
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

  shells.set(agentId, session);
  console.log(`[agent-terminal] Shell started for "${agentName}" (${agentId}) in ${repoDir}`);
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

    const session = await getSessionFromCookie(request.headers.cookie);
    if (!session?.userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const agent = await storage.getAgentProfile(session.userId, agentId);
    if (!agent) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, agent);
    });
  });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, agent: any) => {
    const agentId = agent.id;
    const shellSession = ensureShell(agentId, agent.name, agent.repoUrl);

    shellSession.clients.add(ws);

    const history = shellSession.outputBuffer.join("");
    if (history) ws.send(history);

    ws.on("message", (msg: Buffer | string) => {
      const data = msg.toString();
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "resize" && parsed.cols && parsed.rows) {
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
    });
  });

  console.log("[agent-terminal] WebSocket terminal handler registered");
}

export function injectCommand(agentId: string, command: string): boolean {
  const session = shells.get(agentId);
  if (!session || !session.alive || !session.process.stdin) return false;
  session.process.stdin.write(command + "\n");
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
