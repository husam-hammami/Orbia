# AI Agents Office — Build Specification

## Overview

Build a new module: AI Agents Office (`/agents`). This is a visual command center for managing multiple Claude Code AI agents across different GitHub repos — built directly into Orbia.

**IMPORTANT:** Before you write ANY code, read these files completely to understand existing patterns:

- `CLAUDE.md` (full architecture)
- `UI_AUDIT.md` (current design issues — don't repeat them)
- `client/src/pages/work.tsx` (3-column layout reference)
- `client/src/pages/medical.tsx` (HUD panel reference)
- `client/src/pages/orbit.tsx` (streaming chat reference)
- `client/src/components/layout.tsx` (nav and routing)
- `server/routes.ts` (API pattern)
- `server/storage.ts` (database access pattern)
- `shared/schema.ts` (table definitions)
- `server/lib/ai-client.ts` (streaming pattern)
- `server/lib/microsoft-graph.ts` (OAuth pattern — reuse for GitHub)

---

## Architecture Overview

This module spawns real Claude Code CLI processes using the existing `claude login` session (already authenticated on this server). No Anthropic API key costs — uses the existing Claude subscription.

Each agent = a cloned GitHub repo + a persistent Claude Code conversation that can be tasked, paused, resumed, and monitored in real-time.

---

## Phase 1: Database Schema

Add these tables to `shared/schema.ts` following the exact Drizzle patterns already used (UUID PKs, userId FK, timestamps):

### GitHub OAuth Connection

Same pattern as `microsoftConnections`:

```typescript
export const githubConnections = pgTable("github_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  githubUserId: text("github_user_id"),
  username: text("username"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Agent Profiles

```typescript
export const agentProfiles = pgTable("agent_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  avatar: text("avatar"),
  role: text("role"),
  repoUrl: text("repo_url").notNull(),
  repoBranch: text("repo_branch").default("main"),
  workdir: text("workdir"),
  accentColor: text("accent_color").default("#6366f1"),
  status: text("status").default("idle"),
  currentTaskSummary: text("current_task_summary"),
  lastActiveAt: timestamp("last_active_at"),
  totalTasksCompleted: integer("total_tasks_completed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Agent Sessions

```typescript
export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agentProfiles.id, { onDelete: "cascade" }),
  claudeConversationId: text("claude_conversation_id"),
  status: text("status").default("active"),
  startedAt: timestamp("started_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
});
```

### Agent Tasks

```typescript
export const agentTasks = pgTable("agent_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agentProfiles.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => agentSessions.id),
  description: text("description").notNull(),
  status: text("status").default("queued"),
  priority: integer("priority").default(0),
  result: text("result"),
  filesChanged: jsonb("files_changed"),
  diffSummary: text("diff_summary"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Agent Activity Log

```typescript
export const agentActivityLog = pgTable("agent_activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => agentTasks.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  content: text("content"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});
```

Add Zod insert/select schemas for all tables following the existing pattern. Add all CRUD methods to `server/storage.ts` DatabaseStorage class following the IStorage interface pattern.

---

## Phase 2: GitHub OAuth

Create `server/lib/github-oauth.ts` following the exact pattern of `server/lib/microsoft-graph.ts`.

### Functions

- `getGithubAuthUrl(state)` — redirects to `github.com/login/oauth/authorize`
- Scopes: `repo,read:user,user:email`
- `exchangeCodeForTokens(code)` — POST to `github.com/login/oauth/access_token`
- `getGithubUser(token)` — GET `api.github.com/user`
- `listRepos(token, query?)` — GET `api.github.com/user/repos` — for repo picker

Store tokens in `githubConnections` table.

### Routes

Add to `server/routes.ts`:

```
GET    /api/github/auth-url       → returns OAuth URL
GET    /api/github/callback       → exchanges code, stores connection
GET    /api/github/status         → returns { connected, username, avatarUrl }
GET    /api/github/repos          → list user's repos (for agent creation picker)
DELETE /api/github/disconnect
```

### Environment Variables

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI`

---

## Phase 3: Agent Process Manager

Create `server/lib/agent-process-manager.ts` — this is the core engine.

```typescript
interface AgentProcess {
  agentId: string;
  taskId: string;
  process: ChildProcess;
  status: "running" | "waiting" | "completed" | "error";
  outputBuffer: string[];
  startedAt: Date;
}

class AgentProcessManager {
  private processes: Map<string, AgentProcess> = new Map();
  private maxConcurrent: number = 3;

  async executeTask(agentId: string, taskId: string, description: string, workdir: string): Promise<void>;
  async resumeSession(agentId: string, taskId: string, conversationId: string, description: string, workdir: string): Promise<void>;
  async cancelTask(agentId: string): Promise<void>;
  getStatus(agentId: string): AgentProcess | undefined;
  async shutdownAll(): Promise<void>;
}
```

### Critical Implementation Details

- Use `spawn("claude", [...args], { cwd: workdir, env: process.env })` — inherits the server's claude login
- For new tasks: `claude -p "description" --output-format stream-json`
- For resume: `claude -p "description" --resume --conversation-id <id> --output-format stream-json`
- Parse `--output-format stream-json` output — each line is a JSON object with type, content, tool info
- Stream parsed events to frontend via WebSocket (or SSE like orbit.tsx does)
- Save every event to `agentActivityLog` for replay
- Handle process crashes gracefully — update status to "error", save stderr as errorMessage
- Respect max concurrent limit — queue tasks if all slots busy

---

## Phase 4: Repo Manager

Create `server/lib/repo-manager.ts`:

```typescript
// npm install simple-git
import simpleGit from "simple-git";

class RepoManager {
  private baseDir = "/tmp/orbia-agents";

  async cloneRepo(agentId: string, repoUrl: string, branch: string, githubToken: string): Promise<string>;
  async pullLatest(workdir: string): Promise<void>;
  async getChangedFiles(workdir: string): Promise<FileChange[]>;
  async getDiff(workdir: string): Promise<string>;
  async commit(workdir: string, message: string): Promise<string>;
  async push(workdir: string): Promise<void>;
  async checkout(workdir: string, branch: string): Promise<void>;
  exists(agentId: string): boolean;
  async deleteRepo(agentId: string): Promise<void>;
}
```

- Inject GitHub token into clone URL: `https://<token>@github.com/user/repo.git`
- Clone to `/tmp/orbia-agents/<agentId>/`
- Check out specified branch
- Return workdir path

---

## Phase 5: API Routes

Add to `server/routes.ts` following existing patterns (auth middleware, try/catch, proper status codes):

### Agent CRUD

```
POST   /api/agents                           — Create new agent (triggers clone)
GET    /api/agents                           — List all user's agents with current status
GET    /api/agents/:id                       — Get agent details
PUT    /api/agents/:id                       — Update agent config
DELETE /api/agents/:id                       — Delete agent + repo + all data
```

### Task Management

```
POST   /api/agents/:id/tasks                 — Queue a new task
GET    /api/agents/:id/tasks                 — List tasks (with status filter)
PUT    /api/agents/:id/tasks/:taskId         — Update task (reorder priority, cancel)
POST   /api/agents/:id/tasks/:taskId/retry   — Retry failed task
```

### Session Management

```
POST   /api/agents/:id/resume                — Resume last session with new task
POST   /api/agents/:id/pause                 — Pause current work (kill process gracefully)
```

### Real-Time

```
GET    /api/agents/:id/stream                — SSE stream of current task activity
GET    /api/agents/:id/activity/:taskId      — Get stored activity log for a task
```

### Git Operations

```
POST   /api/agents/:id/git/pull              — Pull latest
POST   /api/agents/:id/git/push              — Push changes
POST   /api/agents/:id/git/commit            — Commit with message
GET    /api/agents/:id/git/diff              — Get current diff
GET    /api/agents/:id/git/status            — Get git status
```

---

## Phase 6: WebSocket Setup

Add WebSocket support to `server/index.ts`:

```typescript
// npm install ws
// Upgrade HTTP server to support WebSocket
// Channel per agent: ws://host/ws/agents/<agentId>
```

### Event Types Sent to Client

```json
{ "type": "status", "status": "working | idle | error | waiting" }
{ "type": "activity", "eventType": "tool_use", "content": "Reading src/app.tsx", "metadata": {} }
{ "type": "activity", "eventType": "text", "content": "I'll fix the login bug by..." }
{ "type": "activity", "eventType": "tool_result", "content": "File contents...", "metadata": {} }
{ "type": "task_complete", "taskId": "...", "filesChanged": [], "summary": "..." }
{ "type": "task_error", "taskId": "...", "error": "..." }
```

---

## Phase 7: Frontend

### Files to Create

```
client/src/pages/agents.tsx                          — Main page
client/src/components/agents/
  agent-office-floor.tsx                             — Visual workspace with animated agents
  agent-card.tsx                                     — Individual agent character + desk
  agent-interaction-panel.tsx                        — Expanded 3-column view when agent selected
  agent-terminal-stream.tsx                          — Live terminal output display
  agent-chat.tsx                                     — Chat/task input for an agent
  agent-project-context.tsx                          — Repo info sidebar
  agent-task-queue.tsx                               — Task list with status
  agent-creation-wizard.tsx                          — Onboarding flow for new agent
  agent-diff-viewer.tsx                              — Visual diff display
  github-connect-card.tsx                            — GitHub OAuth connection UI
```

### Navigation

Add "Agents" to sidebar nav in `layout.tsx` and mobile bottom nav "More" menu. Use `Bot` icon from lucide-react. Add route in `App.tsx`: `/agents` → `AgentsPage`.

### Design Language

Follow existing Orbia design patterns BUT push them further. This is the most "Jarvis" module in the app:

- Use the `cmdPanel` / `hudPanel` glass styles from work.tsx and medical.tsx
- Dark, ambient feel — this is a command center
- Each agent has their own accent color (stored in DB) used for their glow, borders, and particles
- Use Framer Motion for ALL animations (already in the project)
- Follow the theme system — use CSS variables, not hardcoded colors

---

### agent-office-floor.tsx — The Main Visual

This is the hero view. When user opens `/agents`, they see their agents as animated characters at desks:

```
┌──────────────────────────────────────────────────────┐
│  AI Agents Office                    [+ New Agent]   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  ╭━━━╮   │  │  ╭━━━╮   │  │          │          │
│  │  ┃ 🤖 ┃  │  │  ┃ 🧑‍💻 ┃  │  │    +     │          │
│  │  ╰━━━╯   │  │  ╰━━━╯   │  │  New     │          │
│  │  typing..│  │  idle     │  │  Agent   │          │
│  │ ━━━━━━━  │  │ ━━━━━━━  │  │          │          │
│  │ "Orbia"  │  │ "ClientX" │  │          │          │
│  │ Fixing   │  │ Ready     │  │          │          │
│  │ nav bug  │  │           │  │          │          │
│  │ 4m 23s   │  │           │  │          │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Agent Card Visual Requirements

- Each card is a glassmorphic container with the agent's accent color as subtle border glow
- Avatar area: animated character (use a simple SVG/CSS character, NOT an image — think pixel art style)
  - **Idle:** gentle floating up/down (translateY 2px, 3s ease-in-out infinite)
  - **Working:** typing animation (hands moving), small code particles rising from the "desk"
  - **Error:** red pulse ring around avatar
  - **Waiting:** yellow breathing glow, "?" bubble
- Below avatar: agent name (font-display semibold), project name (text-muted smaller)
- Status bar: thin progress bar with agent's accent color, animated gradient when working
- Current task: truncated to 2 lines, text-sm
- Time elapsed: live counter when working
- Click anywhere → opens interaction panel
- Hover: slight scale(1.02), border glow intensifies

#### Particle Effects (Working State)

- Small dots in agent's accent color float upward from the card
- Occasional file-name labels float up and fade ("app.tsx", "routes.ts") — pulled from actual activity stream
- Subtle pulse wave emanating from the card every few seconds
- Use Framer Motion `AnimatePresence` for particles entering/exiting

#### Empty Desk (+ New Agent)

- Dashed border, muted colors
- "+" icon with subtle pulse
- Click → opens creation wizard
- Text: "Add an AI agent"

---

### agent-interaction-panel.tsx — Expanded View

When an agent is clicked, the floor view slides up and a 3-column panel slides in (like medical.tsx HUD):

```
┌─────────────────┬───────────────────────┬─────────────────┐
│   TERMINAL       │    COMMUNICATION     │   PROJECT       │
│                  │                       │                 │
│ > Reading        │ ┌─────────────────┐  │ repo: orbia     │
│   src/auth.ts    │ │ Fix the login   │  │ branch: main    │
│                  │ │ validation bug  │  │ ──────────────  │
│ > Editing        │ │ in auth.ts —    │  │ Changed Files:  │
│   src/auth.ts    │ │ the email regex │  │  src/auth.ts    │
│   L45: added     │ │ is wrong        │  │  +12 -3         │
│   validation     │ └─────────────────┘  │                 │
│                  │                       │ Recent Commits: │
│ > Running        │ Agent: I found the   │  abc123 fix..   │
│   npm test       │ issue. The regex...  │  def456 add..   │
│   ✓ 23 passed    │                       │                 │
│   ✗ 1 failed     │ [Type a task...]      │ CLAUDE.md: ✓    │
│                  │                       │                 │
│ ──────────────── │                       │ [Pull] [Push]   │
│ [Pause] [Cancel] │                       │ [Diff] [Branch] │
└─────────────────┴───────────────────────┘─────────────────┘
```

#### LEFT — Terminal Stream

- Auto-scrolling terminal-style display
- Syntax highlighted (use JetBrains Mono font — already in the project)
- Color coded by event type:
  - Tool use (file read): cyan text
  - Tool use (edit): green text
  - Tool use (command): yellow text
  - AI thinking/text: white/foreground text
  - Errors: red text
  - Success: green with checkmark
- Each entry has timestamp (HH:MM:SS)
- Scrollable with "Jump to bottom" button when scrolled up
- "Pause stream" toggle to stop auto-scroll

#### CENTER — Communication

- Chat-style interface for giving the agent tasks
- Shows the current/recent task at top as a "pinned" card
- Agent's responses displayed as chat messages
- Input at bottom: textarea + send button
- Quick action pills above input: "Continue", "Explain what you did", "Run tests", "Revert last change"
- Task history below current task (collapsible)

#### RIGHT — Project Context

- Repo name, branch, last pulled time
- CLAUDE.md status (exists/missing, last updated)
- Changed files list with +/- line counts (green/red)
- Recent git commits (last 5)
- Git action buttons: Pull, Push, Commit, Diff, Switch Branch
- Each button opens a small confirmation modal
- Diff viewer: when clicked, shows side-by-side diff using the diff display pattern

---

### agent-creation-wizard.tsx — Onboarding

Step-by-step wizard (use shadcn Dialog or Sheet):

**Step 1: Connect GitHub** (if not connected)
- Show GitHub OAuth button
- "Connect your GitHub account to give agents access to your repos"
- Skip if already connected (show connected username with green checkmark)

**Step 2: Choose Repo**
- Search/filter through user's GitHub repos
- Show repo name, description, language, last updated
- Or paste a repo URL manually
- Branch selector (default: main)

**Step 3: Name & Personalize**
- Agent name (text input, placeholder: "e.g., Frontend Specialist")
- Role description (textarea, placeholder: "e.g., Works on React UI components and styling")
- Accent color picker (use the swatch pattern from habit-form.tsx but with more colors)
- Avatar: grid of emoji options or simple pixel art characters

**Step 4: Initialize**
- Show progress: "Cloning repository..." → "Scanning codebase..." → "Generating CLAUDE.md..." → "Agent ready!"
- Each step has animated checkmark on completion
- On complete: agent appears on office floor with entrance animation

---

### agent-task-queue.tsx — Task Management

Visible as a collapsible section in the interaction panel or as a tab:

- Drag-to-reorder tasks (use existing Framer Motion drag patterns)
- Each task shows: description (truncated), status badge, duration (if completed), file count changed
- Status badges:
  - Queued (gray)
  - Active (blue pulse)
  - Done (green)
  - Failed (red)
  - Cancelled (dim)
- Completed tasks: click to expand → shows summary + files changed + "View Diff" button
- Failed tasks: shows error + "Retry" and "Skip" buttons
- "Clear completed" button at bottom

---

### agent-diff-viewer.tsx

When viewing diffs:

- Side-by-side or unified view toggle
- Syntax highlighted
- Line numbers
- Green for additions, red for deletions
- File tabs if multiple files changed
- "Approve" and "Revert" buttons per file

---

### Mobile Layout

On mobile (`<768px`):

- Office floor: horizontal scrollable cards (like meetings strip in work.tsx)
- Tap agent → full-screen interaction panel
- Interaction panel: tabbed layout (Terminal | Chat | Project) instead of 3-column
- Bottom action bar: Pause, Cancel, New Task
- Swipe between agents

---

### Animations Spec

Use these consistently (define as constants in a shared animation config):

```typescript
// client/src/lib/agent-animations.ts
export const agentAnimations = {
  // Card entrance (staggered)
  cardEnter: {
    opacity: [0, 1],
    y: [20, 0],
    transition: { duration: 0.4 },
  },
  cardStagger: 0.1,

  // Agent idle float
  idleFloat: {
    y: [-2, 2],
    transition: { duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
  },

  // Working pulse
  workingPulse: {
    scale: [1, 1.02, 1],
    transition: { duration: 2, repeat: Infinity },
  },

  // Particle rise (for working state)
  particleRise: {
    y: [0, -40],
    opacity: [1, 0],
    transition: { duration: 2, ease: "easeOut" },
  },

  // Status change
  statusChange: {
    scale: [0.95, 1.05, 1],
    transition: { duration: 0.3, type: "spring" },
  },

  // Panel slide in
  panelEnter: {
    x: [300, 0],
    opacity: [0, 1],
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Task complete celebration
  taskComplete: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.5 },
  },

  // Error shake
  errorShake: {
    x: [-4, 4, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};
```

---

## React Query Hooks

Create hooks in `client/src/lib/api-hooks.ts` following existing patterns:

```typescript
// Agents
useAgents()                          // GET /api/agents
useAgent(id)                         // GET /api/agents/:id
useCreateAgent()                     // POST /api/agents
useUpdateAgent()                     // PUT /api/agents/:id
useDeleteAgent()                     // DELETE /api/agents/:id

// Tasks
useAgentTasks(agentId)               // GET /api/agents/:id/tasks
useCreateAgentTask(agentId)          // POST /api/agents/:id/tasks
useRetryAgentTask(agentId, taskId)   // POST /api/agents/:id/tasks/:taskId/retry

// Sessions
useResumeAgent(agentId)              // POST /api/agents/:id/resume
usePauseAgent(agentId)               // POST /api/agents/:id/pause

// Git
useAgentGitStatus(agentId)           // GET /api/agents/:id/git/status
useAgentGitDiff(agentId)             // GET /api/agents/:id/git/diff
useAgentGitPull(agentId)             // POST /api/agents/:id/git/pull
useAgentGitPush(agentId)             // POST /api/agents/:id/git/push
useAgentGitCommit(agentId)           // POST /api/agents/:id/git/commit

// GitHub
useGithubStatus()                    // GET /api/github/status
useGithubRepos()                     // GET /api/github/repos
useGithubDisconnect()                // DELETE /api/github/disconnect

// Activity stream — use EventSource for SSE
useAgentStream(agentId)              // GET /api/agents/:id/stream (SSE)
useAgentActivityLog(taskId)          // GET /api/agents/:id/activity/:taskId
```

---

## Integration with Orbit AI

Add agent management to Orbit's action catalog in the unified system prompt. Orbit should be able to:

- "Tell the Orbia agent to fix the login bug" → creates task for that agent
- "What are my agents working on?" → returns status summary
- "Pause all agents" → pauses all running processes

Add to JSON action types in `orbit.tsx`:

```json
{ "type": "agent_task", "agentName": "Orbia", "task": "Fix the login validation bug" }
{ "type": "agent_pause", "agentName": "Orbia" }
{ "type": "agent_status" }
```

---

## Dashboard Widget

Add an "Agents" summary card to `dashboard.tsx`:

- Shows: X agents total, Y currently working, Z tasks completed today
- Mini status dots for each agent (colored by their accent, pulsing if working)
- Click → navigates to `/agents`

---

## Implementation Order

Build in this exact order, testing each phase before moving on:

1. Schema + storage methods + `npx drizzle-kit push`
2. GitHub OAuth (test: can connect and list repos)
3. Repo manager (test: can clone, pull, push a repo)
4. Agent CRUD API routes (test: can create agent, clone repo)
5. Agent process manager (test: can spawn `claude -p` and capture output)
6. WebSocket setup (test: can stream agent output to a test client)
7. Frontend: office floor with agent cards (test: displays agents from API)
8. Frontend: creation wizard (test: full flow from GitHub → cloned agent)
9. Frontend: interaction panel with terminal stream (test: real-time output)
10. Frontend: chat/task input (test: send task, see it execute)
11. Frontend: task queue and diff viewer
12. Frontend: all animations and particle effects
13. Mobile responsive layout
14. Orbit AI integration
15. Dashboard widget

**For each phase, make sure it actually works before moving to the next. Run the app and test. Don't build everything and hope it works at the end.**

---

## Design Rules (MANDATORY)

- This module should feel like the most premium, Jarvis-like part of Orbia
- Dark mode is the primary experience — design for dark first
- Use glassmorphism (`bg-card/40 backdrop-blur-xl`) for all panels
- Every state change must have a smooth animation — no snapping
- Terminal output must use JetBrains Mono
- Agent accent colors should create subtle ambient glow effects (box-shadow with agent's color at low opacity)
- Loading states: skeleton loaders, never spinners
- Empty states: compelling CTAs, not sad empty messages
- Every interactive element must have hover AND active states
- Touch targets minimum 44px on mobile
- Use the existing toast pattern for all success/error notifications
- Respect `prefers-reduced-motion` for all animations
- No hardcoded colors — use CSS variables and theme system
- Follow existing code conventions from CLAUDE.md
