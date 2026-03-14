import { spawn, ChildProcess } from "child_process";
import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { getRepoDir } from "./repo-manager";
import * as repoManager from "./repo-manager";
import { storage } from "../storage";
import type { IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import { db } from "../db";
import { sql } from "drizzle-orm";

interface TerminalSession {
  ws: WebSocket;
  process: ChildProcess;
  agentId: string;
}

const sessions = new Map<string, TerminalSession>();

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
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(sid)
    .digest("base64")
    .replace(/=+$/, "");
  if (crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
    return sid;
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

    if (sessions.has(agentId)) {
      const old = sessions.get(agentId)!;
      try { old.process.kill(); } catch {}
      try { old.ws.close(); } catch {}
      sessions.delete(agentId);
    }

    let repoDir: string;
    let repoCloned = false;
    if (repoManager.isRepoCloned(agentId)) {
      repoDir = repoManager.getRepoDir(agentId);
      repoCloned = true;
    } else {
      repoDir = "/tmp";
    }

    // Map Replit AI Integration env vars to what Claude CLI expects
    const shellEnv: Record<string, string> = {
      ...process.env as Record<string, string>,
      TERM: "xterm-256color",
      COLUMNS: "120",
      LINES: "30",
      PS1: `\\[\\033[1;36m\\]${agent.name}\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]$ `,
    };
    if (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
      shellEnv.ANTHROPIC_API_KEY = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    }
    if (process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
      shellEnv.ANTHROPIC_BASE_URL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    }

    const shell = spawn("bash", ["--login"], {
      cwd: repoDir,
      env: shellEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const termSession: TerminalSession = { ws, process: shell, agentId };
    sessions.set(agentId, termSession);

    if (repoCloned) {
      ws.send(`\x1b[1;36m=== ${agent.name} ===\x1b[0m\r\n`);
      ws.send(`\x1b[90mRepo: ${agent.repoUrl}\x1b[0m\r\n`);
      ws.send(`\x1b[90mLaunching Claude CLI...\x1b[0m\r\n\r\n`);
      shell.stdin?.write(`cd "${repoDir}" && claude --dangerously-skip-permissions\n`);
    } else {
      ws.send(`\x1b[1;36m=== ${agent.name} ===\x1b[0m\r\n`);
      ws.send(`\x1b[33mRepo not cloned yet. Clone the repo first, then reopen the terminal.\x1b[0m\r\n\r\n`);
    }

    shell.stdout?.on("data", (data: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data.toString());
      }
    });

    shell.stderr?.on("data", (data: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data.toString());
      }
    });

    shell.on("close", (code) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`\r\n\x1b[33m[Shell exited with code ${code}]\x1b[0m\r\n`);
        ws.close();
      }
      sessions.delete(agentId);
    });

    ws.on("message", (msg: Buffer | string) => {
      const data = msg.toString();
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "resize" && parsed.cols && parsed.rows) {
          return;
        }
        if (parsed.type === "input") {
          shell.stdin?.write(parsed.data);
          return;
        }
      } catch {}
      shell.stdin?.write(data);
    });

    ws.on("close", () => {
      try { shell.kill(); } catch {}
      sessions.delete(agentId);
    });
  });

  console.log("[agent-terminal] WebSocket terminal handler registered");
}
