# Orbya - Your Daily Orbit

## Overview

Orbya is a holistic personal wellness and productivity tracker. It provides tools for tracking habits, moods, routines, and daily rhythm with optional features for system member management (for those with DID or plural systems), internal communication, and grounding exercises. The application combines traditional habit tracking with specialized features for mental health support and structured daily routines.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS v4 with shadcn/ui components (New York style)
- **Animations**: Framer Motion for UI animations
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

The frontend follows a component-based architecture with:
- Reusable UI components in `client/src/components/ui/`
- Feature components in `client/src/components/`
- Page components in `client/src/pages/`
- Custom hooks in `client/src/hooks/`
- API hooks and utilities in `client/src/lib/`

### Backend Architecture

- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build Tool**: esbuild for server bundling, Vite for client
- **API Style**: RESTful JSON API under `/api/*` routes

The server handles:
- Static file serving in production
- Vite dev server middleware in development
- RESTful API endpoints for all data operations
- Request logging and error handling

### Data Storage

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)

Key data models:
- `systemMembers`: Alter/part profiles with roles, traits, and colors
- `trackerEntries`: Daily mood, dissociation, stress, and energy tracking
  - New fields: `capacity` (0-5 scale), `triggerTag` (work/loneliness/pain/noise/sleep/body/unknown), `timeOfDay` (auto-set: morning/afternoon/evening/night)
  - Work context: `workLoad` (0-10 hostility/draining scale), `workTag` (deadlines/conflict/firefighting/unclear/blame/chaos)
  - Health fields: `sleepHours` (0-24), `pain` (0-10 scale)
- `systemMessages`: Internal sticky notes for system communication
- `headspaceRooms`: Virtual rooms representing internal spaces
- `systemSettings`: User preferences and configuration
- `habits`: Habit definitions with categories, targets, and AI-generated icons
- `habitCompletions`: Completion records for habit tracking
- `routineBlocks`: Time-based routine blocks (morning, work, evening)
- `routineActivities`: Individual activities within routine blocks (linked to habits)
- `routineActivityLogs`: Daily completion records for routine activities
- `dailySummaries`: End-of-day reflection (lighter/average/heavier than usual)
- `todos`: Simple to-do list items with priority levels, due dates, and overdue tracking
- `conversations`: AI chat conversation threads
- `messages`: Individual messages within AI conversations
- `journalEntries`: Rich journal entries with mood/energy tracking, alter attribution, custom entry dates, markdown content support, and driver-based categorization (primaryDriver/secondaryDriver) as the sole classification method (entry types and tags deprecated)

### AI Integration

- **Provider**: OpenAI via Replit AI Integrations (GPT-5.1 model)
- **No API key required**: Uses Replit's built-in AI service, billed to credits
- **Endpoints**:
  - `GET /api/insights`: Returns structured JSON insights analyzing linked mood, habit, and routine data
  - `POST /api/insights/analyze`: Streaming endpoint for custom pattern analysis questions
  - `POST /api/conversations/:id/messages`: Streaming chat with conversation history
  - `POST /api/generate-icon`: AI-powered icon generation from habit title and category (returns Lucide icon name)
  - `POST /api/orbit/chat`: Streaming chat endpoint for Orbit co-pilot

### Orbit Co-Pilot

Orbit is a calm, operational co-pilot chat interface that helps users operate the app without navigating complex menus.

**Features**:
- Today Snapshot strip showing habits completed, routine progress, current fronter, load/stability metrics
- Streaming chat with conversation persistence (localStorage)
- Quick chips for common queries ("Today summary", "What's left?", "Low-capacity mode")
- Action execution system for read/write operations

**Supported Actions (with confirmation for destructive operations)**:

Habits:
- `mark_habit`: Toggle habit completion for a date
- `create_habit`: Create a new habit with title, category, description, target, unit
- `update_habit`: Modify an existing habit's properties
- `delete_habit`: Remove a habit (requires confirmation)

Tasks:
- `add_task`: Create a new todo with priority
- `mark_task`: Toggle task completion status
- `update_task`: Modify task title or priority
- `delete_task`: Remove a task (requires confirmation)

Routine Activities:
- `mark_routine_activity`: Toggle routine activity completion with linked habit
- `create_routine_activity`: Add activity to a routine block
- `update_routine_activity`: Modify activity name, time, or description
- `delete_routine_activity`: Remove activity (requires confirmation)

Low-Capacity Mode:
- `set_low_capacity_mode` / `unset_low_capacity_mode`: Toggle low-capacity overlay

**Low-Capacity Mode**:
When activated, shows 3 core actions (grounding, stretching, leaving house/walking) and marks other routine items as optional.

**Data Context**:
Orbit has access to habits, routine blocks/activities/logs, todos, tracker entries, and system members to provide grounded responses.

**AI Analysis Guidelines** (Critical - enforced in both Deep Mind and Orbit):

Evidence-Based 4-Section Format (mandatory for all analytical responses):
1. **Facts**: 7-day + today metrics (sleepHours avg, mood avg, energy avg, today's values, journal presence)
2. **Main Driver**: Pick exactly 1 of (Sleep/Work/Loneliness/Pain/Urges) + confidence (High/Med/Low) + evidence (journal quote OR metric)
3. **Pattern**: 1-2 lines max describing trigger → coping → outcome cycle
4. **Action**: Do (1 tiny action ≤10 min) | Avoid (1 suggestion for next 12-24h)

Weighting Priority:
- HIGHEST: Daily notes from State entries + Journal text (recency bias applies to both)
- HIGH: Sleep hours (always included in analysis as key metric)
- MEDIUM: Mood, energy, stress, pain, capacity
- LOW: Habits/routine/tasks completion (context only, never blamed)

Evidence Requirement:
- Every claim MUST include a journal quote snippet OR concrete metric value
- No unsupported statements allowed
- Never blame habits/routine/tasks - say "low completion likely due to low capacity"

Language:
- All UI uses "state/state shifts" instead of "member/fronting/alter/switching"
- Database fields unchanged for compatibility

High-Confidence Multi-Factor Correlation Engine:
- **routineMoodCorrelation**: Compares mood on high routine completion days (60%+) vs low completion days (30%-)
- **habitRoutineSynergy**: Analyzes mood when habits AND routines are completed together vs separately
- **highConfidenceHabits**: Only includes habits with statistically meaningful sample sizes (4+ days)
- **sleepHabitInteraction**: 2x2 analysis of sleep quality × habit completion impact on mood
- **bestWorstDaysAnalysis**: Pattern analysis comparing top 20% mood days vs bottom 20%
- **Confidence scoring**: Automated confidence levels (high/moderate/low) based on sample sizes
- **Effect size calculation**: Cohen's d approximation for correlation strength (strong/moderate/weak)

### Deep Mind (System Intelligence Dashboard)

A redesigned system health and intelligence page that transforms the static member directory into an actionable insights hub:

**System Pulse** (Top metrics):
- Stability Index: Calculated from mood variance and dissociation levels (0-100%)
- Average Mood, Energy: Aggregated from tracker entries over selectable time range
- Switches/Day: Average number of fronting transitions per day

**Current Fronter Banner**: Shows who's currently fronting with member color

**Three Tabs**:
1. **Intelligence**: Member insights grid + AI analysis
2. **Headspace Map**: Visual fronting timeline (see below)
3. **Directory**: Member CRUD management

**Member Intelligence Grid**:
- Per-member cards showing fronting %, mood, stress, energy averages
- Mood trend arrows (improving/stable/declining) comparing older vs newer data
- Last fronting timestamp
- Color-coded by member

**AI System Analysis**:
- Streaming insights powered by GPT-4o-mini
- Three focus modes: Overview, Patterns, Suggestions
- Grounded in actual tracker data to avoid hallucination

**API Endpoints**:
- `GET /api/deep-mind/overview?days=30`: Returns system metrics, member stats, current fronter
- `POST /api/deep-mind/insights`: Streaming AI analysis with focus parameter

### Headspace Map (Enhanced)

Multi-scale presence dashboard for understanding alter fronting patterns over time:

**Views**:
- **Weekly Balance**: Stacked bar chart showing daily fronting hours by member with week navigation
- **Monthly Calendar**: Heatmap colored by dominant alter per day with transition indicators (⚡)
- **30-Day Trends**: Area chart showing fronting time trends with per-member stat cards
- **24h View**: Original timeline with hourly presence flow and transition markers

**Summary Stats Panel**:
- Top Fronter (most active in last 30 days)
- Avg Switches/Day (transition frequency)
- Days Tracked (data coverage)
- Total Entries (log count)

**Per-Member Statistics**:
- Total hours, average hours per day, days active, percentage share

**Data Aggregation**:
- `computeDailyPresence()`: Aggregates fronting duration per alter per day
- Handles gaps, transitions, and dominant alter detection
- Fetches up to 2000 tracker entries for comprehensive historical analysis

### Build and Development

- Development: `npm run dev` runs Express with Vite middleware
- Production build: `npm run build` creates optimized bundles in `dist/`
- Database migrations: `npm run db:push` syncs schema to database

## External Dependencies

### Database
- PostgreSQL database (configured via `DATABASE_URL` environment variable)
- connect-pg-simple for session storage

### UI Libraries
- Radix UI primitives for accessible components
- Lucide React for icons
- Embla Carousel for carousel functionality
- cmdk for command palette
- Vaul for drawer component
- Sonner for toast notifications

### Development Tools
- Replit-specific plugins for development experience (cartographer, dev-banner, runtime-error-modal)
- Custom Vite plugin for OpenGraph meta image handling

### Fonts
- Inter (body text)
- Space Grotesk (display text)
- JetBrains Mono (monospace)