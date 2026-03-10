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
- **API Endpoints**: `/api/work/microsoft/auth`, `/api/work/microsoft/callback`, `/api/work/microsoft/status`, `/api/work/microsoft/disconnect`, `/api/work/calendar`, `/api/work/calendar/events` (POST create), `/api/work/emails` (GET), `/api/work/emails/send` (POST), `/api/work/tasks` (POST create), `/api/work/contacts/search` (GET), `/api/work/meetings` (POST create), `/api/work/teams/chats`, `/api/work/teams/chats/:chatId/messages`, `/api/work/chat` (streaming AI assistant).
- **Frontend**: 3-column layout — Left: Microsoft connection card + today's calendar timeline + quick stats + email inbox widget, Center: Orbia Professional chat (streaming, quick chips), Right: Teams conversations with inline reply. Mobile: tab-based fallback (Today | Professional | Comms).
- **Design Identity**: Indigo/violet accent palette (`indigo-500`, `violet-500`) on dark glass panels, distinguishing from Medical module's cyan theme.
- **Orbia Professional**: Work intelligence assistant using Silent Context Protocol. Accesses calendar, Teams, emails, and wellness data. Can execute actions via AI: send Teams messages (`[TEAMS_SEND]`), create calendar events (`[CREATE_EVENT]`), create To Do tasks (`[CREATE_TASK]`), send emails (`[SEND_EMAIL]`). Output format: "The Situation" + "Moves" for strategic questions.
- **Files**: `server/lib/microsoft-graph.ts` (Graph API client), `client/src/pages/work.tsx` (frontend).

### AI Integration
- **Provider**: OpenAI via Replit AI Integrations (GPT-5.1) - no API key required.
- **Endpoints**:
  - `GET /api/insights`: Structured JSON insights.
  - `POST /api/insights/analyze`: Streaming custom pattern analysis.
  - `POST /api/conversations/:id/messages`: Streaming chat with history.
  - `POST /api/generate-icon`: AI-powered habit icon generation.
  - `POST /api/orbit/chat`: Streaming chat for Orbit co-pilot.

### Orbit Co-Pilot
- **Functionality**: Calm, operational chat interface for app navigation and actions. Includes a "Today Snapshot" and streaming chat with quick chips.
- **Action Execution**: Supports actions for habits, tasks, routine activities, and "Low-Capacity Mode" toggling. Destructive operations require confirmation.
- **Low-Capacity Mode**: Simplifies UI to 3 core actions when activated.
- **Data Context**: Access to relevant user data (habits, routines, todos, tracker entries, system members) for grounded responses.
- **AI Analysis Guidelines**: Mandates an "Evidence-Based 4-Section Format" (Facts, Main Driver, Pattern, Action) for all analytical responses, prioritizes journal and state entries, and requires evidence for all claims. Focuses on multi-factor correlation for insights.

### Deep Mind (System Intelligence Dashboard)
- **Purpose**: Provides insights into system health and driving factors.
- **Tabs**: "Now" (snapshot + suggestion), "Your 3 Loops" (triggers, stabilizers, crash loops), "Visualizations" (Sleep vs Mood, Driver frequency), "State Timeline" (state distribution and associations).
- **Confidence System**: Insights are tagged with Low/Medium/High confidence based on sample size.

## External Dependencies

- **Database**: PostgreSQL (via `DATABASE_URL`), `connect-pg-simple` for session storage.
- **UI Libraries**: Radix UI, Lucide React, Embla Carousel, cmdk, Vaul, Sonner.
- **Development Tools**: Replit-specific plugins, custom Vite plugin for OpenGraph.
- **Fonts**: Inter, Space Grotesk, JetBrains Mono.