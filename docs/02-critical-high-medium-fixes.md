# Critical, High & Medium Bug Fixes

> Audit date: 2026-03-14 | Branch: `claude/test-app-functionality-rgidS`
>
> Total issues: **21** (6 Critical, 7 High, 8 Medium)

---

## CRITICAL (6 issues)

### C1. JSON.parse without try-catch — Dashboard Insights
- **File:** `server/routes.ts:1503`
- **Problem:** `JSON.parse(responseText || "{}")` is called without error handling. If the AI returns malformed JSON, the server crashes with an unhandled exception.
- **Impact:** Server crash (DoS) on the `/api/insights/dashboard` endpoint.
- **Fix:**
  ```ts
  let insights = {};
  try { insights = JSON.parse(responseText || "{}"); } catch { insights = {}; }
  ```

### C2. JSON.parse without try-catch — Finance Statement Import
- **File:** `server/routes.ts:3108`
- **Problem:** `JSON.parse(cleanFinance)` has no error handling. Malformed AI response crashes the `/api/finance/import-statement` endpoint.
- **Impact:** Server crash (DoS).
- **Fix:** Same pattern as C1 — wrap in try-catch with fallback.

### C3. Missing Schema Field: `dissociation`
- **File:** `server/routes.ts:3762, 3768`
- **Problem:** Code references `e.dissociation` and `mostRecent.dissociation` on TrackerEntry objects, but the `dissociation` field **does not exist** in the TrackerEntry schema (`shared/schema.ts`). Schema only has: `mood`, `stress`, `energy`, `sleepHours`, `sleepQuality`, `capacity`, `pain`.
- **Impact:** Runtime error — `undefined` value used in arithmetic, producing `NaN` that propagates through stability calculations.
- **Fix:** Either add `dissociation: integer("dissociation").default(0)` to the `trackerEntries` table in `schema.ts`, or remove the dissociation references and use an existing field (e.g., `stress`).

### C4. Admin Password in Query String
- **File:** `server/routes.ts:3965`
- **Problem:** `/api/admin/users` accepts `adminPassword` via `req.query.adminPassword`. Query strings are logged in server access logs, browser history, proxy logs, and URL bars.
- **Impact:** Admin password exposed in plaintext logs.
- **Fix:** Accept password in request body (POST) or Authorization header only:
  ```ts
  const { adminPassword } = req.body; // instead of req.query
  ```

### C5. O(n) bcrypt Comparison in Login
- **File:** `server/auth.ts:72-90`
- **Problem:** Login iterates ALL users in the database and calls `bcrypt.compare()` for each one. This is O(n) per login attempt, creating a timing side-channel (login time reveals user count) and enabling authentication DoS.
- **Impact:** Slow logins at scale; timing attacks; CPU exhaustion with concurrent login attempts.
- **Fix:** Look up user by username/email first, then compare one hash:
  ```ts
  const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user.length) return res.status(401)...;
  const match = await bcrypt.compare(password, user[0].password);
  ```

### C6. Weak Input Validation on Admin User Creation
- **File:** `server/routes.ts:3943-3944`
- **Problem:** Admin user creation only checks `password.length >= 4`. No validation on `displayName`. No sanitization.
- **Impact:** Extremely weak passwords allowed; potential XSS via displayName.
- **Fix:** Require minimum 8-12 character passwords, sanitize displayName, use Zod schema validation.

---

## HIGH (7 issues)

### H1. Unbounded AI Cache — Memory Leak
- **File:** `server/routes.ts:36-50`
- **Problem:** Global `aiCache` Map grows without limit. 24-hour TTL entries are never proactively cleaned up. No max size, no LRU eviction.
- **Impact:** Memory exhaustion over days/weeks of operation.
- **Fix:** Add periodic cleanup interval:
  ```ts
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of aiCache) {
      if (now - v.timestamp > CACHE_TTL_MS) aiCache.delete(k);
    }
  }, 60_000);
  ```

### H2. Microsoft OAuth Tokens Stored as Plaintext
- **File:** `shared/schema.ts:652-653`
- **Problem:** `accessToken` and `refreshToken` stored as plain `text()` columns. No encryption at rest.
- **Impact:** Database breach exposes all users' Microsoft Graph API access (email, calendar, files, Teams).
- **Fix:** Encrypt tokens before storage using AES-256-GCM with a server-side key. Decrypt on read.

### H3. Medical Vault — No File Size Limit
- **File:** `shared/schema.ts:639` and `server/routes.ts:4078`
- **Problem:** `fileData: text("file_data")` has no size constraint. Express accepts up to 20MB per upload with no per-user quota.
- **Impact:** Storage exhaustion; single user can fill database.
- **Fix:** Validate file size before storage:
  ```ts
  if (Buffer.byteLength(fileData, 'base64') > 5 * 1024 * 1024)
    return res.status(413).json({ error: "File exceeds 5MB limit" });
  ```

### H4. CORS Allows All Origins
- **File:** `server/index.ts:21`
- **Problem:** CORS configured with `origin: true` which reflects any origin. Combined with `credentials: true`, this enables cross-site request forgery from any website.
- **Impact:** Any malicious website can make authenticated requests on behalf of logged-in users.
- **Fix:** Whitelist specific origins:
  ```ts
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
  ```

### H5. No CSRF Protection
- **File:** `server/index.ts`
- **Problem:** No CSRF token validation on any state-changing endpoint. Combined with H4, this is exploitable.
- **Impact:** Attackers can forge POST/PATCH/DELETE requests from other sites.
- **Fix:** Add CSRF middleware or validate `Origin`/`Referer` headers for mutations.

### H6. Query Key Mismatch — Optimistic Updates Broken
- **File:** `client/src/lib/api-hooks.ts:147-173`
- **Problem:** `useAddHabitCompletion()` optimistically updates query key `"allCompletions"` (line 147), but the actual query registers as `["allHabitCompletions"]` (line 131). The predicate `q.queryKey[0] === "allCompletions"` never matches.
- **Impact:** Optimistic updates silently fail. UI shows stale data until next refetch.
- **Fix:** Change predicate to `q.queryKey[0] === "allHabitCompletions"`.

### H7. Empty catch Blocks Swallowing Errors
- **File:** `server/routes.ts:2391` and multiple other locations
- **Problem:** Several `catch (e) {}` blocks silently swallow errors without logging.
- **Impact:** Invisible failures make debugging impossible. Errors in integrations, data parsing, or storage go unnoticed.
- **Fix:** At minimum log the error:
  ```ts
  catch (e) { console.error("Context error:", e); }
  ```

---

## MEDIUM (8 issues)

### M1. Division by Zero — Wellness Metrics
- **File:** `server/routes.ts:3759-3762`
- **Problem:** `recentFive.reduce(...) / recentFive.length` causes division by zero when `recentEntries` is empty, producing `NaN`.
- **Impact:** Health stability score becomes `NaN`; breaks frontend display.
- **Fix:** Guard against empty array:
  ```ts
  if (recentFive.length === 0) { stability = 50; /* default */ }
  ```

### M2. Financial Amounts as Integers — Precision Loss
- **File:** `shared/schema.ts:294, 339, 383-384`
- **Problem:** All financial amounts (`amount`, `monthlyBudget`, `debtTotal`, `interestRate`) use `integer()`. Can't represent $19.99 or 3.75% interest.
- **Impact:** Financial calculations lose decimal precision.
- **Fix:** Use `decimal("amount", { precision: 10, scale: 2 })` for currency fields.

### M3. Type Mismatch: `completed` as Integer vs Boolean
- **File:** `shared/schema.ts:224, 274`
- **Problem:** `completed` defined as `integer()` (0/1) but code sometimes passes `false`/`true` (boolean). PostgreSQL silently coerces but it's semantically wrong.
- **Impact:** Type safety issues; potential bugs in comparisons.
- **Fix:** Change to `boolean("completed").notNull().default(false)` and update all references.

### M4. No Rate Limiting on Login
- **File:** `server/auth.ts`
- **Problem:** `/api/auth/login` has no rate limiting. Unlimited password guesses allowed.
- **Impact:** Brute-force attacks are unimpeded.
- **Fix:**
  ```ts
  import rateLimit from 'express-rate-limit';
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }));
  ```

### M5. localStorage Unbounded Growth
- **File:** `client/src/App.tsx:100-107`
- **Problem:** Components write to localStorage without limits. No cleanup mechanism besides `localStorage.clear()` on logout.
- **Impact:** Can fill browser storage quota over time.
- **Fix:** Add storage quota monitoring or implement key expiration.

### M6. Medical Upload — Silent Partial Failures
- **File:** `server/routes.ts:4214-4240`
- **Problem:** Medical upload creates document, then loops to create diagnoses/medications/timeline with empty catch blocks. Partial failures go unreported.
- **Impact:** Medical records may be incomplete without user knowing.
- **Fix:** Collect errors and return in response; wrap in database transaction.

### M7. No Input Validation on Medical Routes
- **File:** `server/routes.ts:4028-4029`
- **Problem:** Medical routes accept any request body without schema validation. Only `userId` and `id` are sanitized.
- **Impact:** Malformed or injected data can enter medical records.
- **Fix:** Add Zod schema validation for each medical resource type.

### M8. No Transaction on Multi-Table Medical Operations
- **File:** `server/routes.ts` (medical upload section)
- **Problem:** Medical upload creates document, then creates related records (diagnoses, medications, etc.) as separate queries. If one fails mid-way, orphaned records remain.
- **Impact:** Data consistency issues.
- **Fix:** Wrap in database transaction:
  ```ts
  await db.transaction(async (trx) => { /* all operations */ });
  ```

---

## Priority Execution Order

| Phase | Issues | Effort | Risk if Skipped |
|-------|--------|--------|-----------------|
| **Phase 1 — Crash Prevention** | C1, C2, C3, M1 | Low | Server crashes in production |
| **Phase 2 — Security** | C4, C5, C6, H4, H5, M4 | Medium | Authentication bypass, CSRF, password exposure |
| **Phase 3 — Data Integrity** | H6, M2, M3, M6, M7, M8 | Medium | Corrupted data, stale UI, precision loss |
| **Phase 4 — Stability** | H1, H7, M5 | Low | Memory leaks, invisible errors |
| **Phase 5 — Encryption** | H2, H3 | High | Token exposure, storage abuse |
