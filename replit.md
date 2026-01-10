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

Redesigned system health and intelligence page answering: "What's driving me, what loop am I in, what do I do next?"

**Four Tabs**:
1. **Now**: Current snapshot + smart suggestion
2. **Your 3 Loops**: Top triggers, stabilizers, and crash loops (bullet lists, no charts)
3. **Visualizations**: Two focused charts (Sleep vs Mood, Driver frequency)
4. **State Timeline**: State distribution with state→driver associations

**Now Tab**:
- NOW card showing: Driver (main factor like Sleep/Work/Loneliness/Pain), State + intensity (Low/Medium/High), Load % (external pressure), Stability % (internal balance), optional Risk flag
- Smart Suggestion: Do (tiny stabilizer ≤10 min) + Avoid (one thing for next 12-24h)
- Sample size (N) and confidence badge (Low/Medium/High)

**Your 3 Loops Tab**:
- Top 3 Triggers: Bullet list with trigger name, count (×), recency (days ago)
- Top 3 Stabilizers: Bullet list with stabilizer name, count, effect (Strong/Moderate/Mild)
- Top 3 Crash Loops: Bullet list with pattern description, count, recency, recommended interrupt action
- Confidence badge based on sample size

**Visualizations Tab**:
- Chart A: Sleep Hours vs Mood/Dissociation/Urges (toggle between metrics) - shows sleep as highest-leverage variable
- Chart B: Driver Frequency Over Time - stacked bar chart showing weekly driver counts (Sleep/Work/Loneliness/Pain/Urges/Anxiety)
- Both charts show N (sample size) and confidence badge

**State Timeline Tab** (uses "state" terminology):
- State distribution visualization (horizontal timeline, weekly views, monthly calendar)
- State → Driver associations (which drivers tend to precede which states)
- Most Common State, Avg State Shifts/Day, Days Tracked, Total Entries
- Confidence badge for state → driver analysis

**API Endpoints**:
- `GET /api/deep-mind/now`: Current snapshot (driver, state, load, stability, risk, suggestion)
- `GET /api/deep-mind/loops?days=90`: Pattern analysis (triggers, stabilizers, crash loops)
- `GET /api/deep-mind/visualizations?days=30`: Sleep impact and driver frequency data
- `GET /api/deep-mind/overview?days=30`: System metrics, member stats, current state
- `POST /api/deep-mind/insights`: Streaming AI analysis

**Confidence System**:
- N < 5: Low ("early signal")
- N 5-14: Medium ("building")
- N ≥ 15: High ("validated")

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