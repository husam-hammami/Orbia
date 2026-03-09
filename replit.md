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
- **API Endpoints**: Comprehensive `/api/medical/*` endpoints for CRUD operations, AI medical chat, and AI-powered document upload with clinical data extraction.
- **Frontend**: 3-column HUD layout — Left: "My Health" (profile, conditions, medications, tabs for History/Care Team), Center: AI Chat, Right: "Actions" (upload zone, action items, document vault). Pain Mechanisms and Health Overview sections removed. Priorities renamed to "Action Items." Mobile uses tab-based fallback.
- **AI Medical Chat Tone**: Clinical precision with human warmth, leading with insights, connecting patterns, and referencing specific patient data.

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