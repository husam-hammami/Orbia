# Orbia — App Functionalities & Capabilities Analysis

## What Is Orbia?

Orbia is a **personal wellness, productivity, and life management app** designed to help users manage every aspect of their daily life — from mood and habits to career goals, finances, medical records, and work integrations. It also includes specialized support for **plural systems** (DID/OSDD), with features for managing system members, internal communication, and per-member analytics.

Available as a **web app** and **Android app** (via Capacitor).

---

## Core App Modules

### 1. Daily Tracker (Home)

The central hub for day-to-day tracking, organized into swipeable tabs:

- **Habits** — Create and track habits with categories, frequency, targets, units, color coding, and streak tracking. Three view modes: grid (weekly), list, and zen garden visualization.
- **Mood/State** — Rate mood (1-10), energy, stress, dissociation, sleep hours/quality, pain levels, and capacity. Tag triggers and note which system member is fronting.
- **Routines** — Define routine templates (weekday/weekend/holiday) with time blocks and activities. Log daily completions.
- **Food** — Log meals (breakfast, lunch, dinner) and track eating patterns and food-mood correlations.
- **Tasks** — To-do items with priority levels (high/medium/low), due dates, and subtask support.
- **Journal** — Write entries with mood/energy context, psychological drivers, tags, privacy settings, and time-of-day context. Supports per-member authorship.

---

### 2. Dashboard (Analytics & Insights)

A unified analytics view aggregating data from all tracking modules:

- **Wellness Score** — Combined metric from mood, habits, and routines
- **Mood Trends** — 7-day trajectory for mood, energy, and stress
- **Habit Insights** — 7-day and 30-day completion rates with streak tracking
- **Routine Completion** — Daily adherence percentage
- **Productivity Pulse** — Task completion rates and overdue tracking
- **Task Priority Distribution** — Visual breakdown (high/medium/low)
- **Journal & Wellness** — Entry frequency, meal consistency, feeling distribution
- **Personalized AI Recommendations** — Actionable suggestions based on patterns

---

### 3. Deep Mind (System Intelligence)

An advanced insights dashboard focused on pattern recognition and system health:

- **Now** — Real-time snapshot of current state, primary drivers, and confidence-rated suggestions
- **Your 3 Loops** — Identifies triggers, stabilizers, and crash loops
- **Visualizations** — Sleep vs. mood charts, driver frequency analysis
- **State Timeline** — State distribution and associations over time
- **Per-member analytics** — Individual mood trends, switch frequency, and member-specific insights
- **System stability index** — Variance-based calculation across 30+ days

---

### 4. Goals & Vision (Career Module)

Long-term goal and career project management:

- **Career Projects** — Create projects with status tracking (planning, in-progress, completed), progress percentage, deadlines, tags, and color coding
- **Career Tasks** — Hierarchical tasks linked to projects with priorities and due dates
- **Vision Items** — Long-term goals with timeframes and color coding
- **AI Career Coach** — Personalized recommendations, progress analysis, and strategy suggestions with saveable snapshots
- **AI Roadmap Generator** — Generates phased roadmaps with milestones, focus areas, priority-ranked actions, estimated effort, and strategic insights

---

### 5. Command Center (Work Integration)

Full **Microsoft 365 integration** for workplace productivity:

- **Calendar** — View and create Outlook calendar events
- **Email** — Read inbox, view details, reply, and compose new emails (filtered to direct messages)
- **Teams** — Access chats, read message history, send messages, and schedule recurring auto-send messages
- **Tasks** — Create Microsoft To Do tasks
- **Contacts** — Search organizational directory
- **Meetings** — Schedule online meetings
- **Scheduled Messages** — Set up recurring Teams messages (daily or weekdays-only) that auto-send at specified times
- **Orbia Professional (AI Work Assistant)** — Context-aware AI that can:
  - Send Teams messages
  - Create calendar events
  - Create tasks
  - Send emails
  - Schedule recurring messages
  - Provide strategic analysis using calendar, email, Teams, and wellness data

---

### 6. Orbital News (Content Curation)

Personalized news feed and learning hub:

- **Topic Management** — Add/remove from 10+ categories (Teaching, Cybersecurity, Technology, Career, Wellness, Skincare, French, Finance, Productivity, AI)
- **Custom Topics** — Add your own topics
- **Smart Suggestions** — AI suggests topics based on career visions, projects, and habits
- **AI Daily Briefing** — AI-generated summary of the day's news
- **Article Interactions** — Save articles, read later, category filtering, reading time estimates

---

### 7. Finance

Comprehensive personal finance tracking:

- **Transaction Tracking** — Log income and expenses with categories (salary, food, transport, utilities, entertainment, healthcare, shopping, debt, savings, investments, freelance, benefits)
- **Income Streams** — Manage multiple income sources with frequency settings
- **Loan Tracking** — Track loans with principal, balance, interest rate, payments, and status
- **Budget Monitoring** — Track spending against configured monthly budget
- **Financial Charts** — Visual spending patterns by week, month, or year
- **Bulk Import** — CSV import for transactions
- **Savings Goals** — Set and track savings targets

---

### 8. Medical (Health Management)

A full medical records and health monitoring system:

- **Medical Profile** — Demographics, blood type, allergies
- **Diagnoses** — Record conditions with severity levels
- **Medications** — Track prescriptions with dosage and purpose
- **Pain Mechanisms** — Document pain patterns and descriptions
- **Timeline Events** — Major medical milestones (surgeries, diagnoses, appointments)
- **Care Team** — Healthcare providers with roles, facilities, and status
- **Document Vault** — Upload and store medical documents (PDFs, images)
- **AI Document Analysis** — Automatically extracts diagnoses, medications, timeline events, and priority actions from uploaded documents
- **AI Medical Chat** — Context-aware AI assistant with access to full medical history, providing clinical guidance with patient-specific references
- **Action Items** — AI-identified priority medical actions

---

### 9. Orbit Co-Pilot (Unified AI Brain)

The primary AI interface with **cross-domain awareness**:

- Has access to ALL user data — wellness, habits, tasks, calendar, Teams, emails, medical, finance, journal, and system members
- **Can execute actions** across the entire app:
  - Toggle habits, complete tasks, log meals, add journal entries
  - Send Teams messages, create calendar events, send emails
  - Manage finance entries, career tasks, routines
- **Cross-domain intelligence** — Connects wellness data to calendar events, medical context to routine adherence, sleep patterns to meeting readiness
- **Privacy rules** — Medical and financial data only surfaced when contextually relevant
- **Low-capacity mode** — Simplifies to 3 core actions when user's capacity is low
- **Today Snapshot** — Quick overview of the day's status across all domains

---

### 10. System/Plural Support

Specialized features for **plural systems** (DID/OSDD):

- **System Members (Alters)** — Create and manage members with name, role, traits, color, avatar, description, and location
- **Fronting Tracker** — Track which member is currently active
- **System Messages (Sticky Notes)** — Leave notes between members
- **Headspace Rooms** — Organize internal mental/emotional spaces with icons and colors
- **Per-member analytics** — Individual mood trends, switch frequency, and member-specific insights
- **Customizable Terminology** — Configure how alters, fronting, and headspace are referred to
- **System Stability Index** — Overall system health metric

---

### 11. Settings & Personalization

- **Profile** — Display name customization
- **Themes** — Dark/light mode + multiple color theme options
- **Discreet/Privacy Mode** — Neutral labels, hide sensitive information
- **Data Export** — Export all data as JSON backup
- **Customizable Terminology** — For system-related features

---

## AI Capabilities Summary

Orbia uses **OpenAI GPT-5.1** across three specialized AI modes, all sharing a unified context system:

| AI Mode | Focus | Special Capabilities |
|---------|-------|---------------------|
| **Orbit Co-Pilot** | Full life management | Cross-domain awareness, executes app + work actions |
| **Orbia Professional** | Workplace productivity | Calendar/email/Teams context, strategic analysis |
| **Medical AI** | Health guidance | Clinical tone, vault document analysis, full medical history |

Additional AI features:
- **Habit icon generation** — AI-generated icons for habits
- **Career coaching** — AI roadmaps and strategy
- **News topic suggestions** — Based on user goals and habits
- **Medical document analysis** — Auto-extract clinical data from uploads
- **Image generation** — Custom images via prompts
- **Pattern detection** — Behavioral loops and trend analysis

---

## Platform Support

- **Web** — Full-featured responsive web app
- **Android** — Native app via Capacitor with haptics, notifications, splash screen, and status bar customization
- **Mobile-responsive** — Tab-based fallback layouts for all complex modules

---

## Summary

Orbia is a deeply integrated personal management platform that combines:

1. **Wellness tracking** — mood, habits, routines, food, journal
2. **Productivity** — tasks, career projects, goals, vision planning
3. **Work integration** — Microsoft 365 (calendar, email, Teams, tasks)
4. **Financial management** — transactions, budgets, loans, income streams
5. **Medical records** — full health management with AI document analysis
6. **News & learning** — personalized content curation
7. **Plural system support** — member management, fronting, internal communication
8. **AI intelligence** — three specialized AI modes with cross-domain awareness and action execution

All modules feed into a unified AI brain that can reason across domains and take actions on the user's behalf.
