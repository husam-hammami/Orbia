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
  userId?: string;
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

interface OrbitShell {
  process: ChildProcess;
  agentId: string;
  repoDir: string;
  alive: boolean;
  outputBuffer: string;
  pendingResolve: ((output: string) => void) | null;
  pendingTimeout: ReturnType<typeof setTimeout> | null;
}

interface QueuedPrompt {
  prompt: string;
  source: string;
  queuedAt: number;
}

const MAX_BUFFER_LINES = 2000;
const shells = new Map<string, ShellSession>();
const bootstrapStates = new Map<string, BootstrapState>();
const orbitShells = new Map<string, OrbitShell>();
const promptQueues = new Map<string, QueuedPrompt[]>();
const ANSI_STRIP = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?(?:\x07|\x1b\\)|\x1b[()][AB012]|\x1b[=>NOM78H]|\x1b\[[\?]?[0-9;]*[hljmsu]|\x07|\x08/g;

function getClaudeConfigDir(userId?: string): string {
  if (userId) {
    return path.join(os.tmpdir(), "claude-config", userId);
  }
  return path.join(os.homedir(), ".claude");
}

const SAFE_FILENAME_RE = /^[a-zA-Z0-9._-]+$/;

function isValidCredentialFilename(filename: string): boolean {
  return SAFE_FILENAME_RE.test(filename) && !filename.includes("..") && filename.length < 256;
}

const credentialMutex = new Map<string, Promise<void>>();
async function withCredentialLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = credentialMutex.get(userId) || Promise.resolve();
  let resolve: () => void;
  const next = new Promise<void>((r) => { resolve = r; });
  credentialMutex.set(userId, next);
  await prev;
  try {
    return await fn();
  } finally {
    resolve!();
    if (credentialMutex.get(userId) === next) credentialMutex.delete(userId);
  }
}

async function saveClaudeCredentials(userId: string): Promise<boolean> {
  return withCredentialLock(userId, async () => {
    const perUserDir = getClaudeConfigDir(userId);
    const defaultDir = path.join(os.homedir(), ".claude");

    const credentialData: Record<string, string> = {};
    for (const configDir of [perUserDir, defaultDir]) {
      if (!fs.existsSync(configDir)) continue;
      try {
        const files = fs.readdirSync(configDir);
        for (const file of files) {
          if (!isValidCredentialFilename(file)) continue;
          if (credentialData[file]) continue;
          const filePath = path.join(configDir, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile() && stat.size < 50000) {
            credentialData[file] = fs.readFileSync(filePath, "utf-8");
          }
        }
      } catch (err) {
        console.error(`[claude-creds] Failed to read from ${configDir}:`, err);
      }
    }

    if (Object.keys(credentialData).length === 0) return false;

    try {
      const serialized = JSON.stringify(credentialData);
      await db.execute(
        sql`UPDATE users SET claude_credentials = ${serialized} WHERE id = ${userId}`
      );
      console.log(`[claude-creds] Saved ${Object.keys(credentialData).length} credential files for user ${userId}`);
      return true;
    } catch (err) {
      console.error("[claude-creds] Failed to save to DB:", err);
      return false;
    }
  });
}

async function restoreClaudeCredentials(userId: string): Promise<boolean> {
  return withCredentialLock(userId, async () => {
    try {
      const result = await db.execute(
        sql`SELECT claude_credentials FROM users WHERE id = ${userId}`
      );
      const row = (result as any).rows?.[0] || (result as any)[0];
      if (!row?.claude_credentials) return false;

      const credentialData: Record<string, string> = JSON.parse(row.claude_credentials);
      const perUserDir = getClaudeConfigDir(userId);
      const defaultDir = path.join(os.homedir(), ".claude");

      for (const dir of [perUserDir, defaultDir]) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      let restored = 0;
      for (const [filename, content] of Object.entries(credentialData)) {
        if (!isValidCredentialFilename(filename)) {
          console.warn(`[claude-creds] Skipping invalid filename: ${filename}`);
          continue;
        }
        let fileContent = content;
        if (filename === ".claude.json") {
          try {
            const parsed = JSON.parse(content);
            parsed.hasCompletedOnboarding = true;
            if (!parsed.uiPreferences) parsed.uiPreferences = {};
            parsed.uiPreferences.theme = "dark";
            fileContent = JSON.stringify(parsed, null, 2);
          } catch {}
        }
        if (filename === "settings.json") {
          try {
            const parsed = JSON.parse(content);
            if (!parsed.trustedDirectories) parsed.trustedDirectories = [];
            const trustPaths = ["/tmp/orbia-agent-repos", "/home/runner/workspace", "/tmp"];
            for (const tp of trustPaths) {
              if (!parsed.trustedDirectories.includes(tp)) parsed.trustedDirectories.push(tp);
            }
            parsed.skipDangerousModePermissionPrompt = true;
            fileContent = JSON.stringify(parsed, null, 2);
          } catch {}
        }
        fs.writeFileSync(path.join(perUserDir, filename), fileContent, "utf-8");
        fs.writeFileSync(path.join(defaultDir, filename), fileContent, "utf-8");
        if (filename === ".credentials.json") {
          fs.chmodSync(path.join(perUserDir, filename), 0o600);
          fs.chmodSync(path.join(defaultDir, filename), 0o600);
        }
        restored++;
      }

      const settingsFile = "settings.json";
      if (!credentialData[settingsFile]) {
        const settings = {
          skipDangerousModePermissionPrompt: true,
          trustedDirectories: ["/tmp/orbia-agent-repos", "/home/runner/workspace", "/tmp"],
        };
        const settingsContent = JSON.stringify(settings, null, 2);
        for (const dir of [perUserDir, defaultDir]) {
          fs.writeFileSync(path.join(dir, settingsFile), settingsContent, "utf-8");
        }
        restored++;
        console.log("[claude-creds] Injected settings.json with trustedDirectories");
      }

      if (restored > 0) {
        console.log(`[claude-creds] Restored ${restored} credential files to ${perUserDir} AND ${defaultDir}`);
      }
      return restored > 0;
    } catch (err) {
      console.error("[claude-creds] Failed to restore from DB:", err);
      return false;
    }
  });
}

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
  const LOGIN_SUCCESS_PATTERN = /Login successful|Logged in as|Authentication successful|successfully authenticated|Welcome back|signed in/i;

  const MAX_ENTERS = 8;
  const BOOTSTRAP_TIMEOUT = 120000;
  let credentialsSaved = false;

  let credFileWatcher: ReturnType<typeof setInterval> | null = null;
  if (session.userId) {
    const credPaths = [
      path.join(getClaudeConfigDir(session.userId), ".credentials.json"),
      path.join(os.homedir(), ".claude", ".credentials.json"),
    ];
    credFileWatcher = setInterval(async () => {
      if (credentialsSaved) {
        if (credFileWatcher) clearInterval(credFileWatcher);
        return;
      }
      try {
        const found = credPaths.find(p => fs.existsSync(p) && fs.statSync(p).size > 10);
        if (found) {
          credentialsSaved = true;
          if (credFileWatcher) clearInterval(credFileWatcher);
          console.log(`[bootstrap] "${session.agentName}" — .credentials.json detected at ${found}, saving to DB...`);
          await saveClaudeCredentials(session.userId!);
        }
      } catch {}
    }, 3000);
    setTimeout(() => {
      if (credFileWatcher) clearInterval(credFileWatcher);
    }, BOOTSTRAP_TIMEOUT);
  }

  const processOutput = (data: string) => {
    if (state.phase === "done") return;
    state.accumulated += data;
    if (state.accumulated.length > 20000) {
      state.accumulated = state.accumulated.slice(-10000);
    }
    state.lastActivity = Date.now();

    const clean = stripAnsi(state.accumulated);
    const recentClean = stripAnsi(data);

    if (state.phase === "launching" && (CLAUDE_RUNNING.test(clean) || clean.includes("Claude Code"))) {
      state.phase = "waiting_for_prompts";
      console.log(`[bootstrap] "${session.agentName}" — Claude Code detected, watching for prompts`);
    }

    if (/Select login method|login method:/i.test(recentClean) && state.phase !== "done" && !(state as any)._loginMethodSent) {
      (state as any)._loginMethodSent = true;
      setTimeout(() => {
        if (session.alive && session.process.stdin) {
          session.process.stdin.write("1\n");
          console.log(`[bootstrap] "${session.agentName}" — auto-selected login method 1 (Claude subscription)`);
        }
      }, 500);
    }

    if (/Choose the text style|let's get started|Dark mode|Light mode/i.test(recentClean) && !(state as any)._themeSent) {
      (state as any)._themeSent = true;
      setTimeout(() => {
        if (session.alive && session.process.stdin) {
          session.process.stdin.write("1\n");
          console.log(`[bootstrap] "${session.agentName}" — auto-selected theme (Dark mode)`);
        }
      }, 800);
    }

    if (/Yes, I trust this folder|trust this folder|Quick safety check|Enter to confirm/i.test(recentClean) && !(state as any)._trustSent) {
      (state as any)._trustSent = true;
      setTimeout(() => {
        if (session.alive && session.process.stdin) {
          session.process.stdin.write("1\n");
          console.log(`[bootstrap] "${session.agentName}" — auto-trusted folder`);
        }
      }, 500);
    }

    if (!((state as any)._trustSent) && /I trust this folder|safety check|Enter to confirm/i.test(clean)) {
      (state as any)._trustSent = true;
      setTimeout(() => {
        if (session.alive && session.process.stdin) {
          session.process.stdin.write("1\n");
          console.log(`[bootstrap] "${session.agentName}" — auto-trusted folder (accumulated)`);
        }
      }, 500);
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

    if (LOGIN_URL_PATTERN.test(recentClean) && state.phase !== "login_required" && state.phase !== "done") {
      state.phase = "login_required";
      console.log(`[bootstrap] "${session.agentName}" — login required (URL detected in terminal)`);
      broadcastBootstrapEvent(session, {
        type: "login_required",
        message: "Claude Code needs authentication. Use the URL shown in the terminal.",
      });
    }

    if (TOKEN_PROMPT_PATTERN.test(recentClean) && !(state as any)._tokenPromptSent) {
      (state as any)._tokenPromptSent = true;
      if (state.phase !== "login_required") state.phase = "login_required";
      console.log(`[bootstrap] "${session.agentName}" — waiting for token paste from user`);
      broadcastBootstrapEvent(session, {
        type: "token_needed",
        message: "Paste the auth code from your browser into the terminal.",
      });
    }

    if (LOGIN_SUCCESS_PATTERN.test(recentClean) && !credentialsSaved && session.userId) {
      credentialsSaved = true;
      console.log(`[bootstrap] "${session.agentName}" — login success detected, saving credentials...`);
      setTimeout(async () => {
        if (session.userId) {
          await saveClaudeCredentials(session.userId);
        }
      }, 2000);
    }

    if (CLAUDE_READY_PATTERN.test(clean.trim()) && state.phase !== "done") {
      const hasClaudeMarkers = CLAUDE_RUNNING.test(clean) || clean.includes("guest passes") || clean.includes("/passes") || clean.includes("context");

      if (hasClaudeMarkers) {
        state.phase = "ready";
        console.log(`[bootstrap] "${session.agentName}" — Claude Code is ready!`);
        session.bootstrapComplete = true;

        if (session.userId) {
          setTimeout(async () => {
            await saveClaudeCredentials(session.userId!);
            console.log(`[bootstrap] "${session.agentName}" — saved credentials on ready`);
          }, 2000);
        }

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

        if (!credentialsSaved && session.userId) {
          credentialsSaved = true;
          setTimeout(async () => {
            if (session.userId) {
              await saveClaudeCredentials(session.userId);
            }
          }, 3000);
        }

        cleanupBootstrap(agentId);
      }
    }
  };

  (state as any)._listener = processOutput;
  (state as any)._credFileWatcher = credFileWatcher;
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
  if ((state as any)._credFileWatcher) clearInterval((state as any)._credFileWatcher);
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
  /Do you want to make this edit/i,
  /Do you want to create/i,
  /Do you want to delete/i,
  /Do you want to execute/i,
  /Confirm\?/i,
];

const NUMBERED_MENU_PATTERN = />\s*1\.\s*Yes/;

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

    const recentClean = stripAnsi(state.accumulated).slice(-2000);
    const isNumberedMenu = NUMBERED_MENU_PATTERN.test(recentClean);
    const approveResponse = isNumberedMenu ? "1\n" : "y\n";

    if (state.mode === "bypass") {
      state.lastPromptHandled = now;
      setTimeout(() => {
        if (session.alive && session.process.stdin) {
          session.process.stdin.write(approveResponse);
          console.log(`[permission-watcher] "${session.agentName}" — bypass: auto-approved (${isNumberedMenu ? "numbered" : "y/n"})`);
        }
      }, 300);
      return;
    }

    if (state.mode === "auto") {
      const isRisky = RISKY_PATTERNS.some(p => p.test(recentClean));

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
          session.process.stdin.write(approveResponse);
          console.log(`[permission-watcher] "${session.agentName}" — auto: approved safe operation (${isNumberedMenu ? "numbered" : "y/n"})`);
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

const shellCreationLocks = new Map<string, Promise<ShellSession>>();

async function ensureShell(agentId: string, agentName: string, repoUrl: string, repoBranch?: string, userId?: string, permissionMode?: string): Promise<ShellSession> {
  const existing = shells.get(agentId);
  if (existing && existing.alive) return existing;

  const pendingLock = shellCreationLocks.get(agentId);
  if (pendingLock) {
    console.log(`[agent-terminal] Shell creation already in progress for "${agentName}", waiting...`);
    return pendingLock;
  }

  const createPromise = createShell(agentId, agentName, repoUrl, repoBranch, userId, permissionMode);
  shellCreationLocks.set(agentId, createPromise);
  try {
    const session = await createPromise;
    return session;
  } finally {
    shellCreationLocks.delete(agentId);
  }
}

async function createShell(agentId: string, agentName: string, repoUrl: string, repoBranch?: string, userId?: string, permissionMode?: string): Promise<ShellSession> {
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
        const agents = await db.execute(sql`SELECT user_id FROM agent_profiles WHERE id = ${agentId} LIMIT 1`);
        const row = (agents as any).rows?.[0] || (agents as any)[0];
        if (row?.user_id) {
          const conn = await storage.getGithubConnection(row.user_id);
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

  if (!fs.existsSync(repoDir)) {
    console.log(`[agent-terminal] Repo dir "${repoDir}" missing for "${agentName}", re-cloning...`);
    if (repoUrl) {
      try {
        let token: string | undefined;
        try {
          const agents = await db.execute(sql`SELECT user_id FROM agent_profiles WHERE id = ${agentId} LIMIT 1`);
          const row = (agents as any).rows?.[0] || (agents as any)[0];
          if (row?.user_id) {
            const conn = await storage.getGithubConnection(row.user_id);
            if (conn?.accessToken) token = conn.accessToken;
          }
        } catch {}
        repoDir = await repoManager.cloneRepo(agentId, repoUrl, repoBranch || "main", token);
        console.log(`[agent-terminal] Re-cloned repo for "${agentName}" into ${repoDir}`);
      } catch (err: any) {
        console.error(`[agent-terminal] Re-clone failed for "${agentName}":`, err.message);
        repoDir = os.tmpdir();
      }
    } else {
      repoDir = os.tmpdir();
    }
  }

  const resolvedUserId = userId || await (async () => {
    try {
      const agents = await db.execute(sql`SELECT user_id FROM agent_profiles WHERE id = ${agentId} LIMIT 1`);
      const row = (agents as any).rows?.[0] || (agents as any)[0];
      return row?.user_id as string | undefined;
    } catch { return undefined; }
  })();

  if (resolvedUserId) {
    await restoreClaudeCredentials(resolvedUserId);
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

  if (resolvedUserId) {
    const userConfigDir = getClaudeConfigDir(resolvedUserId);
    if (!fs.existsSync(userConfigDir)) {
      fs.mkdirSync(userConfigDir, { recursive: true });
    }
    envVars.CLAUDE_CONFIG_DIR = userConfigDir;
  }

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
    userId: resolvedUserId,
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
      session.outputBuffer = session.outputBuffer.slice(-MAX_BUFFER_LINES);
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
    const initParts = [
      `export PS1='\\[\\033[1;36m\\]${agentName}\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]$ '`,
      `export PATH="${enhancedPath}"`,
    ];
    if (resolvedUserId) {
      const userConfigDir = getClaudeConfigDir(resolvedUserId);
      initParts.push(`export CLAUDE_CONFIG_DIR="${userConfigDir}"`);
    }
    const gitToken = process.env.GITHUB_PAT;
    initParts.push(`cd "${repoDir}"`);
    if (gitToken) {
      initParts.push(`git remote get-url origin 2>/dev/null | grep -q "x-access-token" || git remote set-url origin "$(git remote get-url origin 2>/dev/null | sed 's|https://github.com/|https://x-access-token:${gitToken}@github.com/|')" 2>/dev/null`);
    }
    initParts.push(`clear`);
    shell.stdin.write(initParts.join(" && ") + "\n");
  }

  setTimeout(() => {
    if (session.alive && shell.stdin) {
      shell.stdin.write("clear\n");
      setTimeout(() => {
        if (session.alive && shell.stdin) {
          const claudeCmd = permissionMode === "bypass"
            ? "claude --dangerously-skip-permissions"
            : "claude";
          shell.stdin.write(claudeCmd + "\n");
          if (permissionMode === "bypass") {
            console.log(`[agent-terminal] "${agentName}" — launched with --dangerously-skip-permissions`);
          }
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
      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.close(4404, "Agent not found");
      });
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, agent);
    });
  });

  wss.on("connection", async (ws: WebSocket, _req: IncomingMessage, agent: any) => {
    const agentId = agent.id;
    console.log(`[agent-terminal] Client connected to "${agent.name}" (${agentId})`);
    const shellSession = await ensureShell(agentId, agent.name, agent.repoUrl, agent.repoBranch, agent.userId, agent.permissionMode);

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
  killOrbitShell(agentId);
  clearPromptQueue(agentId);
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

function ensureOrbitShell(agentId: string): OrbitShell | null {
  const existing = orbitShells.get(agentId);
  if (existing && existing.alive) return existing;

  const mainSession = shells.get(agentId);
  if (!mainSession) return null;

  const repoDir = repoManager.getRepoDir(agentId);
  if (!repoDir || !fs.existsSync(repoDir)) return null;

  const envVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) envVars[k] = v;
  }
  envVars.TERM = "dumb";
  envVars.PS1 = "ORBIT_READY$ ";

  const proc = spawn("bash", ["--norc", "--noprofile"], {
    cwd: repoDir,
    env: envVars,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const orbit: OrbitShell = {
    process: proc,
    agentId,
    repoDir,
    alive: true,
    outputBuffer: "",
    pendingResolve: null,
    pendingTimeout: null,
  };

  proc.stdout?.on("data", (data: Buffer) => {
    orbit.outputBuffer += data.toString();
    if (orbit.pendingResolve && orbit.outputBuffer.includes("ORBIT_READY$")) {
      const output = orbit.outputBuffer
        .replace(ANSI_STRIP, "")
        .replace(/ORBIT_READY\$/g, "")
        .trim();
      const resolve = orbit.pendingResolve;
      orbit.pendingResolve = null;
      if (orbit.pendingTimeout) {
        clearTimeout(orbit.pendingTimeout);
        orbit.pendingTimeout = null;
      }
      orbit.outputBuffer = "";
      resolve(output);
    }
  });

  proc.stderr?.on("data", (data: Buffer) => {
    orbit.outputBuffer += data.toString();
  });

  proc.on("close", () => {
    orbit.alive = false;
    orbitShells.delete(agentId);
    console.log(`[orbit-shell] Shell closed for agent ${agentId}`);
  });

  proc.stdin?.write(`export PS1="ORBIT_READY\\$ "\n`);

  orbitShells.set(agentId, orbit);
  console.log(`[orbit-shell] Created shell for agent ${agentId} in ${repoDir}`);
  return orbit;
}

export async function execInOrbitShell(agentId: string, command: string, timeoutMs = 10000): Promise<string> {
  const orbit = ensureOrbitShell(agentId);
  if (!orbit || !orbit.alive || !orbit.process.stdin) {
    return `[error] No orbit shell available for agent ${agentId}`;
  }

  return new Promise<string>((resolve) => {
    orbit.outputBuffer = "";
    orbit.pendingResolve = resolve;
    orbit.pendingTimeout = setTimeout(() => {
      orbit.pendingResolve = null;
      orbit.pendingTimeout = null;
      const partial = orbit.outputBuffer.replace(ANSI_STRIP, "").replace(/ORBIT_READY\$/g, "").trim();
      orbit.outputBuffer = "";
      resolve(partial || "[timeout]");
    }, timeoutMs);

    orbit.process.stdin!.write(command + "\n");
  });
}

export function isClaudeCodeIdle(agentId: string): boolean {
  const session = shells.get(agentId);
  if (!session || !session.alive) return false;

  const raw = session.outputBuffer.join("");
  const clean = raw.replace(ANSI_STRIP, "");
  const tail = clean.slice(-2000);

  const idle = /bypass permissions/i.test(tail)
    || /Try "edit/i.test(tail)
    || /\(shift\+tab to cycle\)/i.test(tail)
    || /Voice mode is now available/i.test(tail)
    || /Welcome back/i.test(tail)
    || /Claude Code v\d/i.test(tail)
    || /❯❯/.test(tail);

  return idle;
}

export function queuePromptForClaude(agentId: string, prompt: string, source: string = "orbit"): number {
  const session = shells.get(agentId);
  if (!session || !session.alive || !session.process.stdin) {
    console.log(`[prompt-queue] No active session for agent ${agentId}, cannot send prompt`);
    return 0;
  }

  console.log(`[prompt-queue] Writing prompt to Claude Code stdin for agent ${agentId}: ${prompt.slice(0, 200)}`);
  session.process.stdin.write(prompt + "\n");

  for (const ws of session.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`\r\n\x1b[1;35m[Orbit → Claude Code]\x1b[0m ${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}\r\n`);
    }
  }

  return 1;
}

export function getQueueStatus(agentId: string): { size: number; idle: boolean } {
  return { size: 0, idle: isClaudeCodeIdle(agentId) };
}

export function clearPromptQueue(agentId: string): number {
  return 0;
}

export function killOrbitShell(agentId: string) {
  const orbit = orbitShells.get(agentId);
  if (orbit) {
    try { orbit.process.kill("SIGTERM"); } catch {}
    orbit.alive = false;
    orbitShells.delete(agentId);
  }
}
