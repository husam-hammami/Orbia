# Orbital News - Feature Sync Package for Cursor

This package contains all files needed to add the Orbital News feature to your local Android APK project.

## Package Contents

```
orbital-news-package/
├── client/
│   └── src/
│       ├── pages/
│       │   └── news.tsx                  # Main Orbital News page component
│       ├── components/
│       │   ├── layout.tsx                # Full layout with News navigation
│       │   └── mobile-bottom-nav.tsx     # Mobile bottom navigation (if separate)
│       └── App.tsx                       # Updated with /news route
├── shared/
│   └── schema-news-tables.ts             # Database table definitions (reference)
├── capacitor.config.ts                   # Capacitor configuration
└── README.md                             # This file
```

## Quick Sync Steps

### Step 1: Copy Frontend Files

**Option A - Replace entire files (Recommended):**
1. Copy `client/src/pages/news.tsx` → your `client/src/pages/`
2. Copy `client/src/components/layout.tsx` → your `client/src/components/`
3. Copy `client/src/components/mobile-bottom-nav.tsx` → your `client/src/components/` (if you have this file)
4. Copy `client/src/App.tsx` → your `client/src/`

**Option B - Manual merge (if you have local changes):**
1. Copy `news.tsx` to your pages folder
2. In your `App.tsx`, add:
   ```tsx
   import NewsPage from "@/pages/news";
   // In Router:
   <Route path="/news" component={NewsPage} />
   ```
3. In your `layout.tsx`, add to navigation arrays:
   ```tsx
   // Add to imports:
   import { Newspaper } from "lucide-react";
   
   // Add to sidebar links array:
   { href: "/news", label: "Orbital News", icon: Newspaper },
   
   // Add to mobile nav items array:
   { href: "/news", label: "News", icon: Newspaper },
   ```

### Step 2: Schema (Reference Only)

The database tables in `shared/schema-news-tables.ts` are for reference.
**You don't need these locally** - they run on the Replit server.

### Step 3: Configure API Base URL

The news.tsx makes API calls using relative paths (`/api/news`). For the APK:

**If your APK loads webview from Replit URL:**
- API calls work automatically (relative paths resolve to Replit server)

**If bundling frontend in APK (offline build):**
Create a config file for API base URL:

```tsx
// client/src/lib/config.ts
export const API_BASE_URL = "https://your-app.replit.app";

// Then in news.tsx, update fetch calls:
// Before: fetch("/api/news")
// After:  fetch(`${API_BASE_URL}/api/news`)
```

Or use environment variable:
```tsx
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
```

### Step 4: Build APK

```bash
# Install dependencies (if any new ones)
npm install

# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Build APK in Android Studio
# Or use: cd android && ./gradlew assembleDebug
```

## API Endpoints (Hosted on Replit)

The news.tsx calls these endpoints:
- `GET /api/news` - Fetch news feed
- `GET /api/news/topics` - Get user topics
- `POST /api/news/topics` - Add topic
- `DELETE /api/news/topics/:id` - Remove topic
- `GET /api/news/saved` - Get saved articles
- `POST /api/news/saved` - Save article
- `DELETE /api/news/saved/:id` - Unsave article
- `GET /api/news/suggested-topics` - AI-suggested topics

**These endpoints run on your Replit server** - no local backend needed.

## Important Notes

### Backend Stays on Replit
The following are NOT included (they run on Replit):
- `server/routes.ts` (news API endpoints)
- `server/storage.ts` (database methods)
- Database tables (Postgres on Replit)

Your APK's frontend calls the Replit backend.

### No New Dependencies
Orbital News uses existing packages:
- `@tanstack/react-query` ✓
- `framer-motion` ✓
- `lucide-react` ✓
- `sonner` (for toasts) ✓

### Capacitor Configuration
The included `capacitor.config.ts` allows navigation to `*.replit.app` domains.
Update the `allowNavigation` array if using a custom domain.

## Verify After Sync

1. News tab appears in bottom navigation
2. Tapping News opens Orbital News page
3. Articles load from server
4. Topic management works
5. Save/unsave articles works

## Troubleshooting

**News tab not showing?**
- Ensure `layout.tsx` has News in both `links` array (desktop) and `mobileNavItems` array (mobile)
- Check `mobile-bottom-nav.tsx` if you use a separate mobile nav component

**API calls failing?**
- Verify your Replit app is running and published
- For bundled APK: ensure API_BASE_URL is set correctly
- Check CORS allows your APK domain
- Verify capacitor.config.ts has correct allowNavigation

**Build errors?**
- Run `npm install` to ensure all dependencies
- Check for TypeScript errors: `npx tsc --noEmit`
