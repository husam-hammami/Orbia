# Orbya - Your Daily Orbit

## Overview

Orbia is a personal AI companion and holistic wellness/productivity app. It features habit tracking, routines, todos, journaling, Orbia AI chat (with voice input), finance tracking, medical tracking, grounding exercises, and more. The app is generic and not tied to any specific user's personal data.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Be proactive: anticipate edge cases, empty states, and UX problems BEFORE the user has to point them out.
- Every feature must be tested from a fresh user's perspective, not just the happy path.
- Fix problems holistically — when fixing a bug in one place, check if the same pattern exists elsewhere and fix all instances.
- Never deliver half-done work. If touching a feature, make sure all states (empty, loading, error, success) are polished.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS v4 with shadcn/ui components (New York style)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation
- **Component Structure**: Reusable UI components, feature-specific components, page components, custom hooks, and API utilities.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build Tool**: esbuild for server, Vite for client
- **API Style**: RESTful JSON API under `/api/*` routes
- **Functionality**: Serves static files, handles API requests, logging, and error handling.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Key Models**: `trackerEntries`, `habits`, `habitCompletions`, `routineBlocks`, `routineActivities`, `routineActivityLogs`, `dailySummaries`, `todos`, `conversations`, `messages`, `journalEntries`.
- **Authentication**: Password-only login with `express-session` and `connect-pg-simple`, `bcrypt` for hashing, and `userId` based data isolation. Admin routes are protected by an environment variable.

### Medical Module (Integrated from Mika-AI)
- **Data Isolation**: All medical tables include a `userId` column.
- **Key Tables**: `medicalProfiles`, `medDiagnoses`, `medPriorities`, `medPainMechanisms`, `medMedications`, `medTimelineEvents`, `medMedicalNetwork`, `medVaultDocuments`.
- **API Endpoints**: Comprehensive `/api/medical/*` endpoints for CRUD operations, AI medical chat, and AI-powered document upload with clinical data extraction. PDF text extraction via `pdf-parse` v2 (`PDFParse` class). Images analyzed via OpenAI Vision.
- **Frontend**: 3-column HUD layout — Left: "My Health" (profile, conditions, medications, tabs for History/Care Team), Center: AI Chat, Right: "Actions" (upload zone, action items, document vault). Pain Mechanisms and Health Overview sections removed. Priorities renamed to "Action Items." Mobile uses tab-based fallback.
- **AI Medical Chat Tone**: Clinical precision with human warmth, leading with insights, connecting patterns, and referencing specific patient data.

### Workstation (Work Module)
- **Purpose**: Microsoft 365 integration for Outlook Calendar and Teams, with AI work assistant ("Nexus").
- **Microsoft Graph API**: Direct OAuth 2.0 connection to Microsoft Graph API — no middleware.
- **Env Secrets Required**: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI` (from Azure AD app registration).
- **Key Table**: `microsoftConnections` — stores OAuth tokens (access, refresh), token expiry, Microsoft user ID, display name, email, connection status.
- **Token Management**: Auto-refresh with 5-minute buffer; expired tokens trigger re-auth.
- **OAuth Scopes**: `Calendars.ReadWrite`, `Tasks.ReadWrite`, `Mail.Read`, `Mail.Send`, `Contacts.Read`, `OnlineMeetings.ReadWrite`, `Chat.ReadWrite`, `User.Read`.
- **API Endpoints**: `/api/work/microsoft/auth`, `/api/work/microsoft/callback`, `/api/work/microsoft/status`, `/api/work/microsoft/disconnect`, `/api/work/calendar`, `/api/work/calendar/events` (POST create), `/api/work/emails` (GET list), `/api/work/emails/:id` (GET single with full body), `/api/work/emails/:id/reply` (POST reply), `/api/work/emails/send` (POST), `/api/work/tasks` (POST create), `/api/work/contacts/search` (GET), `/api/work/meetings` (POST create), `/api/work/teams/chats`, `/api/work/teams/chats/:chatId/messages`, `/api/work/chat` (streaming AI assistant).
- **Frontend**: Compact horizontal meetings strip (up to 4 upcoming meetings) above the 3-column grid. Left: Email inbox (filtered to direct-only, not CC/group) + connection card. Center: Orbia Professional chat (streaming, quick chips). Right: Teams conversations with inline reply. Header shows meeting count + free hours badges. Mobile: tab-based fallback (Today | Professional | Comms).
- **Design Identity**: Indigo/violet accent palette (`indigo-500`, `violet-500`) on dark glass panels, distinguishing from Medical module's cyan theme.
- **Orbia Professional**: Work intelligence assistant using Silent Context Protocol. Accesses calendar, Teams, emails, and wellness data. Can execute actions via AI: send Teams messages (`[TEAMS_SEND]`), create calendar events (`[CREATE_EVENT]`), create To Do tasks (`[CREATE_TASK]`), send emails (`[SEND_EMAIL]`), schedule recurring Teams messages (`[SCHEDULE_MESSAGE]`). Output format: "The Situation" + "Moves" for strategic questions.
- **Scheduled Messages**: `scheduledMessages` table stores recurring message schedules. Server-side scheduler checks every 60s and sends messages at the right time. Supports daily and weekdays-only recurrence. API: `/api/work/scheduled-messages` (GET, POST, PATCH, DELETE).
- **Files**: `server/lib/microsoft-graph.ts` (Graph API client), `client/src/pages/work.tsx` (frontend).

### Zoho Projects Integration
- **Purpose**: Dedicated "Zoho" tab in Workstation for viewing, creating, and editing Zoho Projects tasks.
- **Env Secrets Required**: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` (secrets), `ZOHO_PORTAL_ID` (env var, default 905717188).
- **Token Management**: In-memory token cache with auto-refresh via Zoho OAuth2 refresh token flow. Token cached for ~1 hour, auto-retry on 401.
- **API Endpoints**: `GET /api/zoho/status`, `GET /api/zoho/projects`, `GET /api/zoho/projects/:pid/tasklists`, `GET /api/zoho/projects/:pid/tasks`, `POST /api/zoho/projects/:pid/tasks`, `PUT /api/zoho/projects/:pid/tasks/:tid`, `GET /api/zoho/projects/:pid/members`, `POST /api/zoho/chat` (SSE streaming AI assistant).
- **Zoho AI Assistant**: Dedicated chat in Zoho panel. Receives full task/member/tasklist context. Can create tasks (`[ZOHO_CREATE]`), update tasks (`[ZOHO_UPDATE]`), and complete tasks (`[ZOHO_COMPLETE]`) via action tags in AI responses. Uses MODEL_FAST.
- **Frontend**: Two-column layout: left = task list with pulse cards + sections, right = Zoho AI chat. Default project persisted to localStorage. Project selector auto-saves. Mobile: tab-based (Tasks | Assistant). Pulse cards (Open/Active/Overdue/Done), grouped sections (Needs Attention → In Progress → Up Next → Completed), inline expand/edit, create task panel.
- **Design**: Uses Workstation's command-center aesthetic (cmdPanel, cmdPanelGlow, mono tokens, indigo accents). Overdue tasks highlighted in sections.
- **Files**: `server/lib/zoho-client.ts` (Zoho API client), `client/src/components/zoho-panel.tsx` (frontend), `client/src/pages/work.tsx` (tab wiring).

### AI Agents Office
- **Purpose**: Visual command center for managing Claude Code AI agents across GitHub repos at `/agents`.
- **Key Tables**: `githubConnections`, `agentProfiles`, `agentSessions`, `agentTasks`, `agentActivityLog` (all UUID PKs).
- **Repo Manager**: `server/lib/repo-manager.ts` — Uses `simple-git` for clone (shallow `--depth 1`), pull, push, diff, commit, checkout, delete. Repos stored in `os.tmpdir()/orbia-agent-repos/<agentId>` (ephemeral, re-cloned after restart).
- **Agent Process Manager**: `server/lib/agent-process-manager.ts` — Spawns `claude` CLI with `--output-format stream-json`, parses stream events, manages max 3 concurrent agents, emits events via EventEmitter. Validates Claude CLI availability before spawning (ENOENT guard).
- **SSE Streaming**: Real-time agent output streamed to frontend via Server-Sent Events at `/api/agents/:id/stream`.
- **API Routes**: `server/routes/agent-routes.ts` — All routes use `requireAuth` middleware + ownership checks. Includes agent CRUD, task management, git operations, SSE stream, quick-send prompt. On startup, recovers stale "working" agent states and "running" tasks from prior server crashes.
- **GitHub OAuth**: `server/lib/github-oauth.ts` — Runtime env var validation via `isConfigured()` (requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`). Auth URL, token exchange, user/repo listing.
- **Frontend**: `client/src/pages/agents.tsx` — Office floor view with agent cards, creation wizard (avatar/name/role/repo picker), interaction panel (terminal stream, task list, git status/log), prompt input. Error toasts on all mutations, retry affordances, SSE disconnection handling, GitHub not-configured state.
- **Auth**: Uses `express-session` (`req.session.userId`) consistent with rest of app. No `x-user-id` headers.
- **Claude Credential Persistence**: Claude Code credentials (`~/.claude/` files) are saved to DB (`users.claude_credentials` column) after successful login and restored before shell launch. Credentials are isolated per-user in `/tmp/claude-config/<userId>/` via `CLAUDE_CONFIG_DIR` env var. Protected by filename validation, per-user mutex locks, and atomic overwrite on restore.
- **Agent Orchestrator**: `server/lib/agent-orchestrator.ts` — Allows Orbit AI to orchestrate CLI agents via actions: `agent_review` (code review of local changes), `agent_git_diff`, `agent_git_push`, `agent_git_push_branch`, `agent_run_tests`, `agent_send_command`, `agent_on_done` (queue follow-up actions for when agent finishes: review → test → push → notify). Follow-ups triggered automatically by task completion monitor in agent-routes.ts.
- **Orbit AI Actions**: Review / Test / Push & Merge / Notify Me. Orbit reads full terminal buffer (500 chars session start + 10,000 chars recent). System prompt positions Orbit as active orchestrator.
- **Orbit Shell + Prompt Queue Architecture**: Each agent has TWO shells: (1) the main PTY where Claude Code CLI runs in interactive mode, (2) Orbit's own private bash shell (`orbitShells` map in `agent-terminal.ts`) for prep work (reading files, git status, etc.). Communication between Orbit and Claude Code uses a PROMPT QUEUE (`promptQueues` map). Orbit queues prompts via `queuePromptForClaude()`. A watcher polls every 2s checking `isClaudeCodeIdle()` — when idle detected, next prompt is dequeued and written to Claude Code's stdin. Tags: `[CLAUDE_PROMPT]...[/CLAUDE_PROMPT]` for Claude Code prompts, `[SHELL_CMD]...[/SHELL_CMD]` for Orbit's own shell commands. Key exports: `execInOrbitShell()`, `queuePromptForClaude()`, `isClaudeCodeIdle()`, `getQueueStatus()`, `clearPromptQueue()`.
- **Git Auth**: `GITHUB_PAT` env secret used as fallback for git push when no OAuth token. Injected via `git remote set-url` on shell spawn. Helpers: `getGitToken()`, `embedTokenInUrl()`, `ensureRemoteAuth()` in `repo-manager.ts`.
- **Web Push Notifications**: VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` env secrets), `push_subscriptions` DB table, service worker at `client/public/sw.js`, subscription endpoints at `/api/push/vapid-key`, `/api/push/subscribe`, `/api/push/unsubscribe`. Push sent on agent completion via `server/lib/push-notify.ts`. Triggered when agent has `notifyOnComplete` set.
- **Orbit Follow-Up Chains**: `setupFollowUpChain()` watches for Claude Code idle state after prompt completion, then executes next step. Chain steps: `review`, `push_if_approved`, `push`, `test`, `notify`. Auto-chains built from `autoReview`/`autoPush` toggles when no explicit `[FOLLOW_UP]` tag in AI response.
- **`[AUTO_SETTINGS]` Tag**: Orbit AI can auto-enable toggles from user intent (e.g., "implement and push" → enables autoPush). Parsed as `[AUTO_SETTINGS]{"autoReview":true,"autoPush":true}[/AUTO_SETTINGS]`. Only boolean values accepted. Settings broadcast via SSE `settings_updated` event for real-time UI sync.
- **Orbit Event Log**: `orbit_events` table (agentId, type, title, detail, metadata, createdAt). `logOrbitEvent()` helper inserts to DB and broadcasts `orbit_event` SSE. API: `GET /api/agents/:id/events?limit=50`. Frontend: "Activity Log" collapsible panel replaces old "Task History". Types: `prompt_sent`, `review_started`, `review_approved`, `review_rejected`, `push_started`, `test_started`, `chain_started`, `chain_complete`, `chain_stopped`, `settings_changed`.

### AI Integration
- **Provider**: Anthropic Claude via Replit AI Integrations (claude-sonnet-4-6 primary, claude-haiku-4-5 fast) — no API key required, billed to Replit credits. OpenAI kept for image generation only. All AI routed through `server/lib/ai-client.ts` (`aiComplete`, `aiStream`, `createRawStream`, `createRawCompletion`). Anti-hallucination patterns baked into system prompts (see `buildUnifiedSystemPrompt` in `unified-context.ts`). Memory graph context injected into all chat modes via `buildUnifiedContextWithMemory`.
- **Unified Context Layer**: `server/lib/unified-context.ts` — single `buildUnifiedContext(userId)` function assembles ALL user data (wellness, habits, tasks, calendar, Teams, emails, medical, finance, Zoho Projects, system members) into XML-tagged context blocks. Used by all 3 AI chat endpoints.
- **Unified System Prompt**: `buildUnifiedSystemPrompt(mode)` generates mode-specific prompts ("orbit", "work", "medical") with shared cross-domain intelligence rules and privacy boundaries. Orbit mode has full CRUD action catalog for ALL modules.
- **Orbit Universal Actions**: Orbit can CRUD everything — habits, todos, routines, career projects/tasks, vision, tracker, journal, meals/food, expenses/transactions, loans, income streams, medical (diagnoses, medications, priorities, timeline, network), news topics/articles, scheduled messages, and Zoho Projects tasks. Actions split between frontend JSON actions (app data) and server-side action tags (Microsoft Teams/Calendar/Email, Zoho, career projects).
- **Endpoints**:
  - `GET /api/insights`: Structured JSON insights.
  - `POST /api/insights/analyze`: Streaming custom pattern analysis.
  - `POST /api/conversations/:id/messages`: Streaming chat with history.
  - `POST /api/generate-icon`: AI-powered habit icon generation.
  - `POST /api/orbit/chat`: Unified Orbia brain (SSE streaming) — full cross-domain awareness + all app actions + work actions.
  - `POST /api/work/chat`: Work-focused AI (SSE streaming) — uses unified context with work tone.
  - `POST /api/medical/chat`: Medical AI (SSE streaming) — uses unified context with clinical tone + extra medical data (pain mechanisms, timeline, vault docs).

### Orbit Co-Pilot (Unified Orbia Brain)
- **Functionality**: Primary AI interface with full cross-domain awareness. SSE streaming format. Includes "Today Snapshot", cross-domain quick chips, and streaming chat.
- **Action Execution**: Supports ALL app actions (habits, tasks, routines, career, finance, journal, meals, tracker) via JSON actions + ALL work actions ([TEAMS_SEND], [CREATE_EVENT], [CREATE_TASK], [SEND_EMAIL], [SCHEDULE_MESSAGE]) via action tags.
- **Cross-Domain Intelligence**: Connects wellness data to calendar events, medical context to routine adherence, sleep patterns to meeting readiness.
- **Privacy Rules**: Medical data only surfaced when directly relevant. Financial data only referenced when user brings it up.
- **Low-Capacity Mode**: Simplifies UI to 3 core actions when activated.
- **Frontend SSE Parsing**: Both `orbit.tsx` and `orbit-fab.tsx` parse SSE events for content streaming + work action confirmations.

## Development Quality Standards — ALWAYS FOLLOW

### First-Time User Experience (FTUX) — MANDATORY
Every feature MUST handle the "empty state" or "not configured" state gracefully. Before building ANY feature, answer these questions:
1. **What does a brand-new user see?** No data, no configuration — the UI must show a welcoming onboarding state, NOT an error.
2. **What if a service isn't connected?** (e.g., Zoho, Microsoft) — Show a calm "not connected" message with guidance, NOT red error icons or "Failed to connect."
3. **What if required data is missing?** (e.g., no vision set for Career Coach) — Guide the user to set it up with a clear CTA button, don't let them hit a failing action.
4. **What if AI returns bad data?** — Strip markdown fences from JSON, handle malformed responses, show user-friendly retry states.

### Error Handling — NO RAW ERRORS TO USERS
- Never show raw error messages, stack traces, or technical error codes to users.
- API errors → friendly "Something went wrong, try again" with retry button.
- Missing configuration → onboarding/setup guidance, not "Check credentials."
- AI parse failures → strip markdown fences (```json...```), retry gracefully.
- Distinguish between "not configured" (onboarding) vs "configured but failing" (temporary error).

### AI JSON Parsing Pattern
All AI-generated JSON responses MUST be cleaned before parsing:
```typescript
let clean = content.trim();
const fence = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
if (fence) clean = fence[1].trim();
const parsed = JSON.parse(clean);
```

### Testing Checklist — BEFORE MARKING DONE
1. Does the feature work for a user with existing data?
2. Does the feature work for a brand-new user with NO data?
3. Does every unconfigured/disconnected state show a welcoming message?
4. Are all error states user-friendly (no raw errors)?
5. Do all API endpoints validate input and return sanitized error responses?

### Zoho API Rules
- Zoho Projects v3 API rejects trailing slashes — NEVER use trailing slashes in API paths.
- OAuth credentials go in POST body, never URL query params.
- Portal ID: env var `ZOHO_PORTAL_ID` (default 905717188).

### Design Principles
- Dark mode is the primary design mode; light mode must also look polished.
- Use glassmorphic cards with the established `glassCard` / `cmdPanel` patterns.
- Toast notifications on all user-triggered mutations (create, update, delete).
- Mobile-first responsive design with tab-based fallback.

### Mobile App (Android / Capacitor)
- **Architecture**: Capacitor WebView wrapper loading the deployed Orbia web app at `myorbia.com`. Not a native rebuild — the web app IS the app.
- **Package**: `com.orbia.app`, Capacitor 8, targets SDK 35, min SDK 23.
- **Plugins**: SplashScreen (dark theme, immersive), StatusBar (dark), LocalNotifications, Haptics, App.
- **Watch Communication**: `OrbitMessageService` (WearableListenerService) receives `/open-orbit` messages from the watch and deep-links into the Orbit page. Capability declared as `open_orbit` in `res/values/wear.xml`.
- **Deep Links**: Handles `https://myorbia.com/orbit` intent filter to open directly to Orbit chat.
- **Files**: `android/app/`, `capacitor.config.ts`.

### Wear OS Watch App
- **Purpose**: Single-screen companion app — Orbia orb logo button that activates Orbit on the phone.
- **Package**: `com.orbia.wear`, min SDK 30 (Wear OS 3+), standalone=false (requires phone app).
- **UI**: Centered orb vector graphic with animated pulse rings (3 concentric rings, staggered fade/scale). "O R B I T" label below. Status text shows connection state.
- **Interaction**: Tap orb → haptic feedback → activation burst animation → sends Wearable MessageClient message to phone → phone opens Orbit. Fallback: if phone not connected, opens `myorbia.com/orbit` in watch browser.
- **Colors**: Matches Orbia DNA — `#0f0f1a` background, `#e879f9` glow, `#818cf8` indigo, `#a78bfa` violet.
- **Files**: `android/wear/`.

## Deployment

### Railway (Primary — Production)
- **Auto-deploy**: Connected to GitHub `main` branch — every push triggers build and deploy
- **GitHub Repo**: `husam-hammami/Orbia` (private)
- **Domain**: `myorbia.com` (CNAME → `ctcd7npt.up.railway.app`), DNS managed at Spaceship
- **Build**: Railway Nixpacks auto-detects Node.js → `npm ci` → `npm run build`
- **Database**: Neon PostgreSQL (`ep-frosty-wave-ahxls62k`) via `DATABASE_URL`
- **Auto Schema Push**: Set `AUTO_DB_PUSH=true` env var → on startup runs `drizzle-kit push --force`. Remove after deploy to prevent accidental column/table drops.
- **Manual Schema Push**: Railway shell tab → `npm run db:push`, or locally: `DATABASE_URL="<neon-url>" npx drizzle-kit push`
- **Claude CLI**: `@anthropic-ai/claude-code` npm dependency enables Neural Agents. Path auto-detected via `getClaudePath()`.
- **Required env vars**: `DATABASE_URL`, `SESSION_SECRET`, `ANTHROPIC_API_KEY` (starts with `sk-ant-api03-`), `ANTHROPIC_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `GITHUB_PAT`, `MICROSOFT_REDIRECT_URI` (`https://myorbia.com/api/work/microsoft/callback`), `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `PORT=5000`, `NODE_ENV=production`
- **Logs**: Railway dashboard → Deployments → click deploy → view logs
- **Shell**: Railway dashboard → service → Shell tab

### Local Development (Without Replit)
- Clone repo, `npm install`, create `.env` with required vars, `npm run dev`
- Schema push: `npx drizzle-kit push`
- Production build: `npm run build && npm run start`
- Requires Node.js 20+

### Replit (Development)
- Uses `DATABASE_FALLBACK_URL` to connect to same Neon DB (takes priority over `DATABASE_URL` in `server/db.ts`)
- AI keys via Replit AI Integrations (`AI_INTEGRATIONS_ANTHROPIC_API_KEY` fallback to `ANTHROPIC_API_KEY`)
- Push to GitHub: `git remote set-url origin "https://x-access-token:${GITHUB_PAT}@github.com/husam-hammami/Orbia.git" && git push && git remote set-url origin "https://github.com/husam-hammami/Orbia.git"`
- Manual schema push: `DATABASE_URL="$DATABASE_FALLBACK_URL" npm run db:push`

## External Dependencies

- **Database**: PostgreSQL (Neon, via `DATABASE_URL` / `DATABASE_FALLBACK_URL`), `connect-pg-simple` for session storage.
- **UI Libraries**: Radix UI, Lucide React, Embla Carousel, cmdk, Vaul, Sonner.
- **Development Tools**: Replit-specific plugins, custom Vite plugin for OpenGraph.
- **Fonts**: Inter, Space Grotesk, JetBrains Mono.