# Career Coach - Feature Sync Package for Cursor

This package contains all files needed to sync the Career Coach feature from Replit to your local Android APK project.

## Package Contents

```
career-coach-package/
├── client/
│   └── src/
│       └── pages/
│           └── career.tsx            # Full career page (1960 lines)
├── server/
│   ├── routes-career-coach.ts        # API routes (2438-2842)
│   └── storage-career-coach.ts       # Storage methods
├── shared/
│   └── schema-career-coach.ts        # Database schema + TypeScript types
└── README.md                         # This file
```

## Quick Sync Steps

### Step 1: Copy Frontend Files

1. Copy `client/src/pages/career.tsx` to your local `client/src/pages/` folder
   - This is the complete Career/Goals & Vision page
   - Includes: North Star Vision, Projects tab, Coach tab

### Step 2: Compare/Update Server Routes

Compare `server/routes-career-coach.ts` with your local `server/routes.ts`:

**Vision endpoints (REQUIRED - Coach depends on these):**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vision` | GET | Get all vision items |
| `/api/vision` | POST | Update vision items |

**Key endpoints:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/career/coach` | GET | Load cached coaching snapshot |
| `/api/career/coach` | POST | Generate new AI coaching |
| `/api/career/coach/roadmap` | PATCH | Update roadmap milestones |
| `/api/career/regenerate-phase` | POST | Regenerate a phase |
| `/api/career/regenerate-milestone` | POST | Regenerate single milestone |

**Key differences to check:**
1. System prompt (lines 59-131 in routes-career-coach.ts)
   - Banned phrases list
   - Free resource recommendations
   - JSON response structure
2. Model used: `gpt-5.1`
3. `max_completion_tokens: 8192`
4. `coachingNote` field in response

### Step 3: Compare Storage Methods

Compare `server/storage-career-coach.ts` with your local `server/storage.ts`:
- `getLatestCoachSnapshot()`
- `upsertCoachSnapshot()`
- `getVision()`

### Step 4: Schema (Reference)

The `shared/schema-career-coach.ts` shows the database table structure:
- `careerCoachSnapshots` table stores the cached AI responses
- Also includes TypeScript types for the coach payload

**Note:** This table runs on Replit - no local database needed for APK.

## Key Changes in This Version

### AI System Prompt Updates
The career coach now:
- Bans vague phrases: "Research...", "Decide...", "Consider..."
- Requires ready-to-execute milestones with specific URLs/names
- Prioritizes FREE courses (Coursera audit, edX, Khan Academy)
- Says "Add to your Orbia routine" instead of creating schedules
- Never suggests expensive bootcamps (>$100)

### Response Structure
```json
{
  "northStarAnalysis": { "summary", "gaps", "strengths" },
  "roadmap": [{ "phase", "timeframe", "goal", "milestones", "weeklyFocus" }],
  "immediateActions": [{ "title", "why", "timeEstimate", "priority" }],
  "learningPath": [{ "skill", "importance", "resources" }],
  "weeklyTheme": "string",
  "coachingNote": "2-3 sentences direct coaching"
}
```

### coachingNote Field
New field added for personalized coaching messages displayed in UI.

## API Configuration for APK

Frontend makes these API calls:
```
GET  /api/career/coach
POST /api/career/coach
PATCH /api/career/coach/roadmap
POST /api/career/regenerate-phase
POST /api/career/regenerate-milestone
```

**For APK connecting to Replit backend:**
- If loading webview from Replit URL: works automatically
- If bundled frontend: update fetch calls to use full URL:
  ```ts
  const API_BASE_URL = "https://your-app.replit.app";
  fetch(`${API_BASE_URL}/api/career/coach`)
  ```

## Frontend Components Overview

The career.tsx page includes:

1. **North Star Vision** - 3 vision cards with edit dialog
2. **Projects Tab** - Goal cards with progress, tasks, deadlines
3. **Coach Tab** - AI-generated roadmap with:
   - Active Sprint (current phase milestones)
   - Phase navigation
   - Milestone completion tracking
   - Regenerate phase/milestone buttons
   - Learning resources section
   - Coach's Note display

## Build APK

```bash
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Troubleshooting

**Coach tab not loading?**
- Check `/api/career/coach` endpoint is accessible
- Verify AI_INTEGRATIONS_OPENAI_API_KEY is set on Replit

**Milestones not saving?**
- Check `careerCoachSnapshots` table exists
- Verify storage methods match Replit version

**Old coaching data showing?**
- The frontend caches data via React Query
- Click Refresh button to regenerate
- Or clear React Query cache on app restart
