# Orbya - Your Daily Orbit

## Overview

Orbya is a personal wellness and productivity tracker designed to help users manage habits, moods, routines, and daily rhythm. It offers features for mental health support, including system member management (for plural systems), internal communication tools, and grounding exercises. The project aims to provide a comprehensive solution for structured daily routines and mental well-being, combining traditional tracking with specialized support features.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Key Models**: `systemMembers`, `trackerEntries`, `systemMessages`, `headspaceRooms`, `systemSettings`, `habits`, `habitCompletions`, `routineBlocks`, `routineActivities`, `routineActivityLogs`, `dailySummaries`, `todos`, `conversations`, `messages`, `journalEntries`.
- **Authentication**: Password-only login with `express-session` and `connect-pg-simple`, `bcrypt` for hashing, and `userId` based data isolation. Admin routes are protected by an environment variable.

### Medical Module (Integrated from Mika-AI)
- **Data Isolation**: All medical tables include a `userId` column.
- **Key Tables**: `medicalProfiles`, `medDiagnoses`, `medPriorities`, `medPainMechanisms`, `medMedications`, `medTimelineEvents`, `medMedicalNetwork`, `medVaultDocuments`.
- **API Endpoints**: Comprehensive `/api/medical/*` endpoints for CRUD operations, AI medical chat, and AI-powered document upload with clinical data extraction. PDF text extraction via `pdf-parse` v2 (`PDFParse` class). Images analyzed via OpenAI Vision.
- **Frontend**: 3-column HUD layout — Left: "My Health" (profile, conditions, medications, tabs for History/Care Team), Center: AI Chat, Right: "Actions" (upload zone, action items, document vault). Pain Mechanisms and Health Overview sections removed. Priorities renamed to "Action Items." Mobile uses tab-based fallback.
- **AI Medical Chat Tone**: Clinical precision with human warmth, leading with insights, connecting patterns, and referencing specific patient data.

### Command Center (Work Module)
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

### AI Integration
- **Provider**: Anthropic Claude via Replit AI Integrations (claude-sonnet-4-6 primary, claude-haiku-4-5 fast) — no API key required, billed to Replit credits. OpenAI kept for image generation only. All AI routed through `server/lib/ai-client.ts` (`aiComplete`, `aiStream`, `createRawStream`, `createRawCompletion`). Anti-hallucination patterns baked into system prompts (see `buildUnifiedSystemPrompt` in `unified-context.ts`). Memory graph context injected into all chat modes via `buildUnifiedContextWithMemory`.
- **Unified Context Layer**: `server/lib/unified-context.ts` — single `buildUnifiedContext(userId)` function assembles ALL user data (wellness, habits, tasks, calendar, Teams, emails, medical, finance, system members) into XML-tagged context blocks. Used by all 3 AI chat endpoints.
- **Unified System Prompt**: `buildUnifiedSystemPrompt(mode)` generates mode-specific prompts ("orbit", "work", "medical") with shared cross-domain intelligence rules and privacy boundaries.
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

### Deep Mind (System Intelligence Dashboard)
- **Purpose**: Provides insights into system health and driving factors.
- **Tabs**: "Now" (snapshot + suggestion), "Your 3 Loops" (triggers, stabilizers, crash loops), "Visualizations" (Sleep vs Mood, Driver frequency), "State Timeline" (state distribution and associations).
- **Confidence System**: Insights are tagged with Low/Medium/High confidence based on sample size.

## External Dependencies

- **Database**: PostgreSQL (via `DATABASE_URL`), `connect-pg-simple` for session storage.
- **UI Libraries**: Radix UI, Lucide React, Embla Carousel, cmdk, Vaul, Sonner.
- **Development Tools**: Replit-specific plugins, custom Vite plugin for OpenGraph.
- **Fonts**: Inter, Space Grotesk, JetBrains Mono.