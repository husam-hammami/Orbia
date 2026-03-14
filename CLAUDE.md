# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev            # Start Express dev server (port 5000, serves both API + Vite client)
npm run dev:client     # Start Vite client dev server only
npm run build          # Production build: Vite → dist/public, esbuild → dist/index.cjs
npm run start          # Run production server
npm run check          # TypeScript type checking
npx drizzle-kit push   # Push schema changes to PostgreSQL
npm run db:push        # Alias for drizzle push
```

## Architecture

**Orbia** (formerly NeuroZen) is a full-stack personal wellness/productivity app with AI integration, deployed on Replit at `https://myorbia.com`.

### Stack
- **Frontend:** React 19 + TypeScript, Vite 7, Wouter (routing), TanStack React Query (server state), Tailwind CSS v4 + shadcn/ui (New York style), Framer Motion, Recharts
- **Backend:** Express.js + TypeScript (ESM), PostgreSQL + Drizzle ORM, Zod validation
- **AI:** Anthropic Claude via Replit AI Integrations (`server/lib/ai-client.ts`). Models: `claude-opus-4-6` (primary/complex), `claude-sonnet-4-6` (fast), `claude-haiku-4-5` (micro). OpenAI `gpt-image-1` for image generation only.
- **Mobile:** Capacitor 8 WebView wrapper loading `myorbia.com` (Android `com.orbia.app` + Wear OS `com.orbia.wear`)

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets/*` → `./attached_assets/*`

### Key Directories
```
client/src/pages/       # Page components (tracker, orbit, work, medical, finance, etc.)
client/src/components/  # Reusable + feature-specific components
client/src/hooks/       # Custom React hooks (useTheme, useIsMobile, useDateScope, useWorkTimer, useAndroidBack)
client/src/lib/         # API hooks (~95 hooks), query client, theme presets, types
server/routes.ts        # All API route handlers (~5900 lines — the largest file)
server/storage.ts       # DatabaseStorage class (data access layer, IStorage interface)
server/auth.ts          # Session + password auth (bcrypt, express-session, connect-pg-simple)
server/index.ts         # Server startup, middleware stack, message scheduler
server/db.ts            # Drizzle ORM + pg pool setup
server/lib/             # AI client, unified context, Microsoft Graph, Zoho, analytics, memory graph
server/replit_integrations/  # Replit chat + image integration scaffolding
shared/schema.ts        # Drizzle table definitions + Zod schemas (40+ tables)
shared/models/chat.ts   # Chat conversation + message schemas (serial IDs, not UUIDs)
android/app/            # Capacitor Android app
android/wear/           # Wear OS companion app
script/build.ts         # esbuild production bundler
scripts/post-merge.sh   # Git post-merge hook (npm install + db:push)
attached_assets/        # ~340 files: screenshots, logos, feature specs, design docs
```

### Data Flow
1. Frontend uses React Query hooks (`client/src/lib/api-hooks.ts`) to call REST API endpoints under `/api/*`
2. `server/routes.ts` handles all endpoints, delegates to `server/storage.ts` (DatabaseStorage) for CRUD
3. All tables include `userId` for per-user data isolation
4. Auth: password-only login, `express-session` with `connect-pg-simple`, 30-day sessions
5. QueryClient config: `staleTime: Infinity`, `refetchOnWindowFocus: false`, `retry: false`
6. Capacitor/native apps use `https://myorbia.com` as API base; web uses relative URLs

---

## Modules In Detail

### Tracker (Home Page — `/`)
The default landing page with 6 tabs (swipeable on mobile):
- **Habits** — Three view modes: Grid, List, Garden (zen garden with plant growth stages based on streaks: seed→sprout→bloom→thrive→master). AI-generated icons. Categories: health, movement, mental, work, mindfulness, creativity.
- **Mood** — Multi-dimension tracking: mood (1-10), energy (1-10), stress (0-100), sleep hours, capacity (0-5), pain (0-10). Emoji selectors.
- **Routine** — Template-based daily schedules. Blocks (morning/work/evening) contain activities. Activities can link to habits for synced completion. `toggleRoutineActivityWithHabit()` is an atomic transaction.
- **Food** — Meal logging (breakfast/lunch/dinner) with feeling (lighter/average/heavier). Meal options saved per user.
- **Tasks** — Todos with parent/child hierarchy, priority levels (low/medium/high), due dates, completion tracking.
- **Journal** — Entries with types (reflection/vent/gratitude/grounding/memory/note), mood/energy context, primary/secondary drivers, privacy flag.

**Components:** `tracker.tsx`, `habit-garden.tsx`, `habit-grid.tsx`, `habit-list-compact.tsx`, `habit-form.tsx`, `habit-edit-form.tsx`, `routine-timeline.tsx`, `routine-editor.tsx`, `mood-tracker.tsx`, `daily-summary.tsx`, `todo-list.tsx`, `journal-tab.tsx`, `food-tracker.tsx`

### Dashboard (`/dashboard`)
Analytics computed by `server/lib/dashboard-analytics.ts`:
- 7-day and 30-day mood/energy/stress trends with direction + change %
- Habit completion rates, streaks, mood correlation (completed vs not)
- Routine completion %, skipped activities, block effectiveness
- Todo completion %, overdue count, priority distribution
- Journal frequency, top drivers
- Finance: monthly income/expense, top categories, debt
- Career: active projects, open/completed tasks
- Correlation confidence levels: high (7+ data points), moderate (4-6), low (2-3), insufficient (<2)
- AI-generated recommendations based on thresholds (e.g., mood declining → suggest self-care)

### Orbit AI (`/orbit`)
The unified AI companion with full cross-domain awareness. SSE streaming.
- Executes actions across ALL modules via two mechanisms:
  - **JSON actions** (frontend-handled): habits, todos, routines, career, finance, journal, meals, tracker, medical, news, loans, income streams
  - **Action tags** (server-handled): `[TEAMS_SEND]`, `[CREATE_EVENT]`, `[CREATE_TASK]`, `[SEND_EMAIL]`, `[SCHEDULE_MESSAGE]`, `[CREATE_PROJECT]`, `[ADD_TASK]`, `[UPDATE_PROJECT_STATUS]`, `[COMPLETE_TASK]`, `[ZOHO_CREATE]`, `[ZOHO_UPDATE]`, `[ZOHO_COMPLETE]`
- Voice input via Web Speech API with full-screen overlay (listening → transcribing → thinking → speaking states)
- Therapy mode ("Go Deeper") with clinical formulation from memory graph narratives
- Low-capacity mode simplifies UI to 3 core actions
- **Components:** `orbit.tsx`, `orbit-fab.tsx` (floating action button), `voice-input-button.tsx`

### Career (`/career`)
- Vision board with timeframes (6 months / 1 year / 3 years / 5 years) and colors
- Projects with status (planning/in_progress/ongoing/completed), progress %, deadlines
- Tasks per project with subtask support, priorities, completion tracking
- AI Career Coach (`POST /api/career/coach`) — generates roadmaps with phases/milestones, auto-creates career tasks. Banned phrases in prompt: "Research", "Decide", "Consider", "Explore". Requires free courses first with specific URLs.

### Finance (`/finance`)
- Tabs: Dashboard, Income, Expenses, Loans
- Date scope control (monthly/weekly/custom) via `useDateScope()` hook
- Transactions: income/expense records with categories. Import from bank statements via AI parsing (`POST /api/transactions/import` — AI categorizes with UAE-specific rules, e.g., distinguishes Noon groceries vs electronics by amount)
- Income streams: recurring/one-time with frequency
- Loans: principal, balance, interest rate, payments tracked separately
- Settings: monthly budget (default 15,000), currency (default AED), savings goal, debt tracking
- Charts: ComposedChart (income vs expenses), PieChart (category breakdown)
- **Components:** `finance.tsx`, `date-scope-control.tsx`

### Medical (`/medical`)
Three-column HUD layout (left: My Health, center: AI Chat, right: Actions). Mobile: tab-based.
- Medical profile (patient name, DOB, sex, blood type, allergies)
- Diagnoses with severity (mild/moderate/severe) and sort order
- Medications with name, purpose, dosage
- Action Items (formerly "Priorities") with severity levels
- Pain mechanisms documentation
- Timeline events (diagnosis/procedure/test/medication/symptom/appointment)
- Care team / Medical network (treating/specialist/pharmacy/lab/emergency)
- Document vault: upload PDFs/images → AI analysis extracts clinical data (`pdf-parse` for PDFs, OpenAI Vision for images)
- Medical AI Chat: clinical precision with human warmth, SSE streaming
- **Components:** `medical.tsx`. Design: cyan accent theme, `hudPanel` class.

### Workstation (`/work`)
Three-column layout (left: Email + connection, center: AI Professional, right: Teams). Mobile: tab-based (Today | Professional | Comms).
- Microsoft 365 OAuth connection
- Calendar events (today + tomorrow, top 50)
- Email inbox (top 10, direct-only filtered, full body on expand)
- Teams conversations (top 5 chats, top 30 messages each)
- Orbia Professional AI: work intelligence with "Silent Context Protocol"
- Zoho Projects tab (see Zoho section below)
- Compact horizontal meetings strip (up to 4 upcoming)
- Scheduled recurring Teams messages (checked every 60s by server scheduler)
- **Components:** `work.tsx`, `zoho-panel.tsx`. Design: indigo/violet palette, `cmdPanel`/`cmdPanelGlow` classes.

### News (`/news`)
- Personalized RSS feed across 15+ sources fetched in parallel
- Topics: teaching, cybersecurity, technology, career, wellness, etc. Custom topics supported.
- AI relevance filter (Sonnet model, temperature 0 for deterministic filtering)
- Auto-detects user topics from career vision/projects
- Reading time estimates, images, save for later
- AI Daily Briefing summarization
- **Components:** `news.tsx`

### Settings (`/settings`)
- Profile (display name, bio)
- 8 theme presets: Starry Midnight, Obsidian, Steel Forge, Deep Ocean, Ember, Slate Dusk, Arctic, Mint Breeze — each with light/dark variants
- Dark mode toggle (system preference fallback)
- JSON data export
- Password lock screen (`orbia_lock_password` in localStorage)

### Other Components
- **UnloadSheet** (`unload-sheet.tsx`) — Brain dump → structured actions. Uses `server/lib/unload.ts` to parse raw text into actions across all modules via AI (Opus, temp 0.3).
- **GroundingAnchor** (`grounding-anchor.tsx`) — Mindfulness/grounding exercises
- **WatchCompanion** (`watch-companion.tsx`) — Smartwatch integration display
- **LockScreen** (`lock-screen.tsx`) — App-level password protection with particle effects
- **WorkTimer** (`use-work-timer.ts` hook) — Pomodoro timer with auto-detection of work blocks (9am-1pm, 2pm-6pm), Web Audio notifications, browser notifications

---

## Microsoft 365 Integration

**File:** `server/lib/microsoft-graph.ts`

### OAuth Flow
1. `getAuthUrl(state)` → redirects to `login.microsoftonline.com/common/oauth2/v2.0/authorize`
2. Callback receives code → `exchangeCodeForTokens(code)` → stores in `microsoftConnections` table
3. `getValidToken(userId)` — auto-refreshes with 5-minute buffer before expiry; marks connection as "expired" if refresh fails

### Scopes
`openid, profile, email, offline_access, Calendars.Read, Calendars.ReadWrite, Chat.Read, Chat.ReadWrite, User.Read, Tasks.ReadWrite, Mail.Read, Mail.Send, Contacts.Read, OnlineMeetings.ReadWrite`

### Graph API Endpoints Used
| Function | Graph Endpoint | Notes |
|----------|---------------|-------|
| `getProfile` | `/me` | |
| `getUserTimezone` | `/me/mailboxSettings` | Fallback to UTC |
| `getCalendarEvents` | `/me/calendarView` | Top 50, uses `Prefer: outlook.timezone` header |
| `getRecentChats` | `/me/chats?$top=5&$expand=lastMessagePreview,members` | |
| `getChatMessages` | `/me/chats/{id}/messages?$top=30` | Desc order |
| `sendChatMessage` | POST `/me/chats/{id}/messages` | |
| `createCalendarEvent` | POST `/me/events` | Supports online meetings, attendees, location |
| `createTask` | POST `/me/todo/lists/{id}/tasks` | Uses first To Do list — **throws if no lists exist** |
| `getRecentEmails` | `/me/messages?$top=10` | Preview only |
| `getEmailById` | `/me/messages/{id}` | Full body |
| `replyToEmail` | POST `/me/messages/{id}/reply` | |
| `sendEmail` | POST `/me/sendMail` | |
| `searchContacts` | `/me/people?$search=` | Top 5 |
| `createOnlineMeeting` | POST `/me/onlineMeetings` | |

### Timezone Handling
Maps Windows timezone names to IANA (e.g., "Arabian Standard Time" → "Asia/Dubai"). ~20 mappings defined in `unified-context.ts`. Calendar events include `[HAPPENING NOW]`, `[IN X MIN]`, `[IMMINENT]` time tags for AI awareness.

### Env Vars
`MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`

---

## Zoho Projects Integration

**File:** `server/lib/zoho-client.ts`

### Auth
- OAuth2 refresh token flow against `accounts.zoho.com/oauth/v2/token`
- In-memory token cache with 60-second safety buffer before expiry
- On 401: clears cache, retries once with fresh token
- Credentials go in POST body (not URL params — Zoho requirement)

### API Base
`https://projectsapi.zoho.com/api/v3/portal/{portalId}/...`

**CRITICAL:** v3 API rejects trailing slashes — never add them.

### Functions
| Function | Endpoint | Notes |
|----------|----------|-------|
| `getZohoStatus` | (local check) | Returns `{ configured: boolean }` |
| `getProjects` | GET `/projects?status=active` | |
| `getTasklists` | GET `/projects/{id}/tasklists` | |
| `getTasks` | GET `/projects/{id}/tasks` | Paginated (100/page), max 10 pages (1000 tasks cap). "overdue" status internally uses "open". |
| `createTask` | POST `/projects/{id}/tasks` | Supports tasklist, priority, dates, assignee |
| `updateTask` | PUT `/projects/{id}/tasks/{id}` | Status uses `{ id: string }` object |
| `getProjectMembers` | GET `/projects/{id}/users` | |

### Zoho AI Assistant
Dedicated chat in the Zoho panel (SSE streaming via `POST /api/zoho/chat`). Receives full task/member/tasklist context. Can execute: `[ZOHO_CREATE]`, `[ZOHO_UPDATE]`, `[ZOHO_COMPLETE]`. Uses `MODEL_FAST`.

### Zoho Context in Unified AI
When configured, `buildUnifiedContext()` fetches up to 3 active projects with their open tasks (15 per project), members (with ZPUIDs), and tasklists — injected as `<ZOHO_PROJECTS>` XML block.

### Env Vars
`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_PORTAL_ID` (default: `"905717188"` — hardcoded fallback)

---

## AI System & Prompts

### AI Client (`server/lib/ai-client.ts`)
| Function | Purpose | Default maxTokens |
|----------|---------|-------------------|
| `aiComplete()` | Non-streaming completion | 8192 |
| `aiStream()` | SSE streaming to Express response | 8192 |
| `createRawStream()` | Raw Anthropic stream (for action tag parsing) | 8192 |
| `createRawCompletion()` | Non-streaming with separate system prompt | 8192 |
| `prepareMessages()` | Converts OpenAI format → Anthropic format | — |

**Quirks:** Merges consecutive same-role messages with `\n\n`. Inserts `"(continuing conversation)"` if messages don't start with user role.

### AI Models by Use Case
| Use Case | Model | maxTokens | Temperature |
|----------|-------|-----------|-------------|
| Orbit chat | Opus | 4000 | default |
| Work chat | Sonnet | 4000 | default |
| Medical chat | Opus | 4000 | default |
| Insights generation | Opus | 2500 | default |
| Career coach/roadmap | Opus | 8192 | default |
| Pattern analysis | Opus | 1500 | default |
| News summary | Sonnet | 400 | default |
| News filter | Sonnet | 200 | 0 (deterministic) |
| Bank statement import | Opus | 4000 | default |
| Brain dump (Unload) | Opus | 4096 | 0.3 |
| Icon generation | Rule-based (no AI) | — | — |
| Image generation | OpenAI `gpt-image-1` | — | — |

### Unified Context (`server/lib/unified-context.ts`)
`buildUnifiedContext(userId)` fetches 21+ data sources in parallel via `Promise.allSettled` (graceful degradation). Outputs XML-tagged sections:
- `<WELLNESS>` — 7-day averages, today's values, 3-day trajectory
- `<JOURNAL_RECENT>` — Last 5 entries from past 3 days
- `<HABITS>` — All habits with today's completion status and streaks
- `<TASKS>` — Top 10 active todos
- `<CALENDAR>` — Today + tomorrow events with time tags (`[HAPPENING NOW]`, `[IN X MIN]`, etc.)
- `<TEAMS_RECENT>` — 5 recent chats with chatIds
- `<EMAIL_RECENT>` — 5 recent emails with unread count
- `<MEDICAL>` — Profile, diagnoses (with IDs), medications, priorities, timeline, network
- `<FINANCE>` — Monthly income/expenses/net, top spending categories, recent transactions, loans, income streams
- `<SCHEDULED_MESSAGES>` — Active recurring messages
- `<VISION>` — Career vision items
- `<ZOHO_PROJECTS>` — Up to 3 projects with tasks, members, tasklists
- `<PROJECTS>` — Career projects with task lists
- `<NEWS_TOPICS>` — Followed topics

### System Prompt Architecture (`buildUnifiedSystemPrompt(mode)`)
Composes from building blocks:
1. **Base identity** — "You are Orbia — a unified personal intelligence system"
2. **Silent Context Protocol** — Never regurgitate raw data; synthesize; calendar time awareness; memory graph protocol; personal profile usage rules
3. **Mode-specific tone** — Orbit (warm friend), Work (sharp chief of staff), Medical (trusted physician)
4. **Cross-domain intelligence rules** — Connect sleep→meetings, pain→habits, stress→mood
5. **Privacy rules** — Medical/financial data only when directly relevant
6. **Action catalogs** — JSON actions (Orbit mode) + action tags (all modes with Microsoft)

### Anti-Patterns (enforced in all prompts)
- Never open with "I notice..." or "Based on your data..."
- Never use "journey", "holistic", "self-care"
- Never use bullet points unless explicitly asked
- Never use markdown formatting (headers, bold, italic)
- Never give 5 suggestions when 1 is better
- Keep most responses under 120 words

### Therapeutic Mode (`buildTherapeuticPrompt()`)
Activated via "Go Deeper" in Orbit. Multi-modality: CBT, IFS, ACT, somatic awareness, narrative therapy. Key rules: listen first (2-3 exchanges before reframing), validate before intervening, one intervention per response max, never minimize. Uses memory graph clinical narratives as formulation context.

### Brain Dump Parser (`server/lib/unload.ts`)
`parseUnload(userId, rawText)` — Routes raw text to actions across ALL modules. System prompt has detailed mapping rules (e.g., "terrible" → mood 1-2, "exhausted" → energy 1-2). Cross-module linking only when causality is stated or evidence exists. Always saves as journal entry. Falls back to journal-only on parse failure.

### Memory Graph (`server/lib/memory-graph.ts`)
Three-phase knowledge system:
1. **EXTRACT** — Rule-based (from tracker: mood/energy/sleep/pain extremes) + AI-powered (from journal entries via Opus)
2. **CONSOLIDATE** — Periodic synthesis into domain-specific narratives (wellness, work, medical, career, identity, cross_domain)
3. **RETRIEVE** — Context-aware injection into AI prompts. Memory goes FIRST in context (provides the lens for interpreting raw data)

Entity types: state, trigger, emotionalPattern, stressor, coping_strategy, relationship, goal, health_condition, interest, behavior, insight
Connection types: causes, correlates_with, triggers, alleviates, belongs_to, influences, precedes, contradicts, worsens, improves

### In-Memory AI Cache
24-hour TTL cache in `routes.ts` for repeated AI queries (cost optimization). In-memory only — lost on restart.

---

## Database Schema

**40+ tables** in PostgreSQL via Drizzle ORM. All domain tables use UUID primary keys except chat (serial integers).

### Core Tables
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id (UUID), passwordHash, displayName, bio | Seeded: moussa, sam, Demo |
| `trackerEntries` | mood, stress, energy, sleepHours, capacity, pain, triggerTag, timeOfDay | 1-10 scales, stress 0-100 |
| `dailySummaries` | date (text), feeling, breakfast, lunch, dinner | Meal feelings |
| `foodOptions` | name, mealType, description | Per-user meal library |
| `habits` | title, category, frequency, streak, color, target, unit, icon | |
| `habitCompletions` | habitId (FK), completedDate (text) | |
| `routineTemplates` | name, dayType, activeDays (int[]), isDefault, icon | |
| `routineBlocks` | templateId (FK), startTime, endTime, emoji, purpose, order | |
| `routineActivities` | blockId (FK), habitId (FK, optional), name, time, order | |
| `routineActivityLogs` | activityId (FK), completedDate, notes | |
| `todos` | parentId (self-ref), title, completed (0/1), priority, dueDate | |
| `journalEntries` | content, entryType, mood, energy, tags (JSONB), isPrivate, primaryDriver | |
| `conversations` | userId, title | Serial ID PK |
| `messages` | conversationId (FK, cascade), role, content | Serial ID PK |

### Career Tables
| Table | Key Columns |
|-------|-------------|
| `careerProjects` | title, status, progress (0-100), deadline, nextAction, color, tags (JSONB) |
| `careerTasks` | projectId (FK), parentId (self-ref), title, completed, priority, due, tags (JSONB) |
| `careerVision` | title, timeframe, color, order |

### Finance Tables
| Table | Key Columns |
|-------|-------------|
| `transactions` | type (income/expense), name, amount, category, date, month, isRecurring, importSource |
| `incomeStreams` | name, amount, frequency, dayOfMonth, isActive, category |
| `financeSettings` | monthlyBudget (default 15000), currency (default "AED"), debtTotal, savingsGoal |
| `loans` | name, lender, principal, currentBalance, interestRate, minimumPayment, dueDay, status |
| `loanPayments` | loanId (FK), amount, principalPaid, interestPaid, transactionId (FK) |
| `expenses` | (legacy table) name, amount, budget, category, status, date, month |

### Medical Tables
| Table | Key Columns |
|-------|-------------|
| `medicalProfiles` | patientName, dateOfBirth, sex, bloodType, allergies |
| `medDiagnoses` | label, description, severity (default "medium"), sortOrder |
| `medMedications` | name, purpose, dosage |
| `medPriorities` | label, description, severity, sortOrder |
| `medPainMechanisms` | label, description, sortOrder |
| `medTimelineEvents` | date, title, description, eventType, sortOrder |
| `medMedicalNetwork` | name, role, facility, status, category (default "treating") |
| `medVaultDocuments` | name, docType, date, fileData (text), mimeType, aiAnalysis, aiProcessed (0/1) |

### Integration Tables
| Table | Key Columns |
|-------|-------------|
| `microsoftConnections` | accessToken, refreshToken, tokenExpiry, microsoftUserId, email, status |
| `scheduledMessages` | chatId, recipientName, message, timeOfDay, recurrence, active, lastSentAt |

### Memory Graph Tables
| Table | Key Columns |
|-------|-------------|
| `memoryEntities` | entityType, category, name, content (JSONB), summary, importance, confidence (0-1) |
| `memoryConnections` | sourceId/targetId (FK, cascade), relationType, strength (0-1), evidence (JSONB), occurrences |
| `memoryNarratives` | domain, narrativeKey, narrative (text), supportingEntityIds (JSONB), confidence |
| `memoryProcessingLog` | sourceType, sourceId, processedAt |

---

## UI/UX Structure

### Layout
- **Desktop:** Sidebar (left) + content area. Sidebar has: Orbia sphere logo (animated pulse), nav links with active indicators, daily affirmation (deterministic by day-of-year), philosopher quote, live clock, theme switcher, dark mode toggle, lock controls.
- **Mobile (<768px):** Hidden sidebar, bottom nav (5 items: Home, Dashboard, Orbit, Career, Settings). Swipe gestures for tab navigation.
- **Components:** `layout.tsx`, `mobile-bottom-nav.tsx`

### Routing (Wouter)
`/` → Tracker, `/dashboard` → Dashboard, `/orbit` → AI Chat, `/career` → Career, `/finance` → Finance, `/medical` → Medical, `/work` → Workstation, `/news` → News, `/settings` → Settings, `/journal` → redirects to `/?tab=journal`

### Theme System
8 presets with light/dark variants. Applied via CSS custom properties on `:root` (HSL-based). Persisted in localStorage (`orbia-theme`, `orbia-dark-mode`). Hook: `useTheme()`.

### Design Patterns
- **Glassmorphism:** `.glass` (rgba white + 12px backdrop blur), `.glass-subtle` (lighter)
- **CMD/HUD panels:** `.cmdPanel` (dark with indigo borders — Work), `.hudPanel` (dark with primary borders — Medical)
- **Glow effects:** `.glow-sm/md/lg` (box shadows with primary color)
- **Gradient border:** `.gradient-border` (animated 6s infinite)
- **Scrollbar:** `.scrollbar-themed` (thin indigo/purple)
- **Safe areas:** `.safe-area-*` for notched devices
- **Fonts:** Inter (body), Space Grotesk (headings), JetBrains Mono (monospace)
- **Module color identities:** Work = indigo/violet, Medical = cyan, Core = fuchsia/purple

### State Persistence (localStorage)
`orbia-theme`, `orbia-dark-mode`, `finance_scope_mode`, `neurozen-work-timer`, `neurozen-intervals-today`, `neurozen-timer-muted`, `orbia_lock_password`, `orbia_is_locked`, Zoho default project

---

## Environment Variables

### Required
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session encryption |

### AI (via Replit Integrations — auto-configured)
| Variable | Purpose |
|----------|---------|
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Claude API key |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Claude API base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (images only) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI API base URL |

### Microsoft 365
| Variable | Purpose |
|----------|---------|
| `MICROSOFT_CLIENT_ID` | Azure AD app registration |
| `MICROSOFT_CLIENT_SECRET` | Azure AD client secret |
| `MICROSOFT_REDIRECT_URI` | OAuth callback URL |

### Zoho
| Variable | Purpose |
|----------|---------|
| `ZOHO_CLIENT_ID` | Zoho OAuth client ID |
| `ZOHO_CLIENT_SECRET` | Zoho OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | Long-lived refresh token |
| `ZOHO_PORTAL_ID` | Portal ID (default: "905717188") |

### Other
| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | production (secure cookies) / development |
| `PORT` | Server port (default: 5000) |
| `ADMIN_SEED_KEY` | Seed key for user creation |
| `ADMIN_PASSWORD` | Admin password hash |

---

## Build & Deployment

### Production Build (`script/build.ts`)
Two-stage process:
1. **Client:** Vite builds to `dist/public/`
2. **Server:** esbuild bundles to `dist/index.cjs` (CommonJS). Uses **selective dependency bundling** — only 33 packages are bundled (listed in allowlist) to reduce `openat(2)` syscalls for faster cold starts. Everything else stays external.

### Replit Deployment
- Target: autoscale
- Build: `npm run build`
- Run: `npm run start`
- Modules: nodejs-20, web, postgresql-16
- Nix packages: zip, jdk17, unzip, jdk21, imagemagick
- Post-merge hook: `scripts/post-merge.sh` (npm install + db:push, 120s timeout)

### Server Startup (`server/index.ts`)
1. Middleware: CORS (origin=true, credentials=true) → body parser (20MB limit) → URL encoded → session (30-day PostgreSQL store) → routes
2. `ensureDefaultUsers()` — seeds 3 users (moussa, sam, Demo) if not exist, adds `bio` column if missing
3. `startMessageScheduler()` — checks every 60 seconds for scheduled Teams messages, sends if hour:minute match (1-minute window), respects recurrence (daily/weekdays)

### APK Distribution
Routes serve static APK files: `/orbia-latest.apk`, `/orbia-final.apk`, `/orbia-wear.apk`

---

## Not Present in This Codebase
The following were asked about but do not exist in this project:
- **No MCP server configs** — no `.mcp/`, `mcp.json`, or MCP setup files
- **No `.agents/` folder** — no agent configurations
- **No SQL Server / SimaticBatch DB** — only PostgreSQL
- **No SSRS reports** — no reporting services

---

## Code Conventions

- **AI JSON parsing:** Always strip markdown fences before parsing AI-generated JSON:
  ```typescript
  let clean = content.trim();
  const fence = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fence) clean = fence[1].trim();
  const parsed = JSON.parse(clean);
  ```
- **Empty states:** Every feature must handle "no data" and "not configured" states gracefully — show onboarding guidance, not errors
- **Error handling:** Never expose raw errors to users; use friendly messages with retry options. Medical data redacted in server logs (`fileData`/`aiAnalysis` → `[REDACTED]`).
- **Design:** Dark mode primary, glassmorphic cards, toast notifications on all mutations, mobile-first with tab-based fallback
- **Optimistic updates:** Habit completions use `onMutate`/`onError` rollback pattern for instant UI feedback
- **Custom fetch interceptor:** `main.tsx` patches global `fetch` to always include `credentials: "include"`

See [UI_AUDIT.md](./UI_AUDIT.md) for current UI/UX issues and improvement plan.

## Known Quirks & Edge Cases
- `server/auth.ts` has raw SQL fallback if Drizzle ORM returns 0 users (defensive for ORM initialization issues)
- `createTask` in Microsoft Graph throws if user has no To Do lists (no auto-creation of default list)
- Zoho pagination stops at 10 pages max (1000 task ceiling, silent truncation)
- Zoho `status="overdue"` internally queries `status="open"` then filters client-side
- Message scheduler uses 1-minute matching window — can miss near-boundary times
- Theme variables applied via direct DOM manipulation (`root.style.setProperty()`) rather than React state
- Calendar events created with UTC timezone regardless of user's timezone
- `expenses` table is legacy — `transactions` is the current unified table
- Habit completions fetch ALL completions in bulk (could be slow with many habits over time)
- Memory graph consolidation has no scheduled trigger — relies on manual/event-driven calls
