# NeuroZen - Mindful Habit Tracking Application

## Overview

NeuroZen is a mindful habit tracking application designed specifically for individuals with dissociative identity disorder (DID) or complex trauma. It provides tools for tracking habits, moods, system member management, internal communication, and grounding exercises. The application combines traditional habit tracking with specialized features for plural system management and mental health support.

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
- `systemMessages`: Internal sticky notes for system communication
- `headspaceRooms`: Virtual rooms representing internal spaces
- `systemSettings`: User preferences and configuration
- `habits`: Habit definitions with categories and targets
- `habitCompletions`: Completion records for habit tracking
- `routineBlocks`: Time-based routine blocks (morning, work, evening)
- `routineActivities`: Individual activities within routine blocks (linked to habits)
- `routineActivityLogs`: Daily completion records for routine activities
- `conversations`: AI chat conversation threads
- `messages`: Individual messages within AI conversations

### AI Integration

- **Provider**: OpenAI via Replit AI Integrations (GPT-5.1 model)
- **No API key required**: Uses Replit's built-in AI service, billed to credits
- **Endpoints**:
  - `GET /api/insights`: Returns structured JSON insights analyzing linked mood, habit, and routine data
  - `POST /api/insights/analyze`: Streaming endpoint for custom pattern analysis questions
  - `POST /api/conversations/:id/messages`: Streaming chat with conversation history

The AI insights system:
- Parses tracker notes to extract normalized metrics (sleep, pain, comfort, communication, urges)
- Links habits with routine activities for cross-correlation
- Provides trauma-informed, DID-aware analysis
- Includes data quality summary for context awareness

High-Confidence Multi-Factor Correlation Engine:
- **routineMoodCorrelation**: Compares mood on high routine completion days (60%+) vs low completion days (30%-)
- **habitRoutineSynergy**: Analyzes mood when habits AND routines are completed together vs separately
- **highConfidenceHabits**: Only includes habits with statistically meaningful sample sizes (4+ days)
- **sleepHabitInteraction**: 2x2 analysis of sleep quality × habit completion impact on mood
- **bestWorstDaysAnalysis**: Pattern analysis comparing top 20% mood days vs bottom 20%
- **Confidence scoring**: Automated confidence levels (high/moderate/low) based on sample sizes
- **Effect size calculation**: Cohen's d approximation for correlation strength (strong/moderate/weak)

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