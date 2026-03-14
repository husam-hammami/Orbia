# Dead Code Removal Plan

> Audit date: 2026-03-14 | Branch: `claude/test-app-functionality-rgidS`
>
> Total dead code identified: **~2,800+ lines** across 9 component files, 10 unused hooks, and 1 unused utility.

---

## 1. Unused Component Files (9 files, ~2,792 lines)

These `.tsx` files exist in `client/src/components/` but are **never imported** by any active component or page.

| # | File | Lines | Description |
|---|------|-------|-------------|
| 1 | `client/src/components/orbit-fab.tsx` | 681 | Floating Action Button — fully implemented but never rendered anywhere in the app |
| 2 | `client/src/components/grounding-anchor.tsx` | 230 | 5-4-3-2-1 grounding technique component — defined but never imported in any page |
| 3 | `client/src/components/habit-card.tsx` | 243 | Individual habit card component — superseded by `habit-grid.tsx` and `habit-list-compact.tsx` |
| 4 | `client/src/components/habit-edit-form.tsx` | 232 | Habit edit form — replaced by inline editing or `habit-form.tsx` |
| 5 | `client/src/components/system-journal.tsx` | 246 | System journal component — never imported |
| 6 | `client/src/components/top-bar-controls.tsx` | 480 | Top bar controls — replaced by layout.tsx header |
| 7 | `client/src/components/work-timer.tsx` | 485 | Work/Pomodoro timer — never imported in work.tsx or any other page |
| 8 | `client/src/components/mobile-bottom-nav.tsx` | 61 | Mobile bottom navigation — replaced by nav built into layout.tsx |
| 9 | `client/src/components/mobile-header.tsx` | 134 | Mobile header — replaced by header built into layout.tsx |

### Action
Delete all 9 files. No imports reference them — zero risk of breakage.

---

## 2. Unused Custom Hooks (10 hooks in `api-hooks.ts`)

These hooks are exported from `client/src/lib/api-hooks.ts` but never called in any component.

| # | Hook Name | Purpose |
|---|-----------|---------|
| 1 | `useHabitCompletions` | Single habit completions — `useAllHabitCompletions` is used instead |
| 2 | `useDefaultRoutineTemplate` | Get default routine template |
| 3 | `useAddRoutineLog` | Add routine activity log |
| 4 | `useRemoveRoutineLog` | Remove routine activity log |
| 5 | `useDailySummaries` | Get daily summaries |
| 6 | `useUpdateIncomeStream` | Update income stream |
| 7 | `useTransactions` | Get all transactions |
| 8 | `useUpdateTransaction` | Update transaction |
| 9 | `useUpdateLoan` | Update loan |
| 10 | `useLoanPayments` | Get loan payments |

### Action
Remove the hook definitions and their associated API functions from `api-hooks.ts`. Search for each hook name across the codebase before removal to confirm zero usage.

---

## 3. Unused Utility File

| # | File | Description |
|---|------|-------------|
| 1 | `client/src/lib/parse-notes.ts` | Note parsing utility — never imported in any client-side code |

### Action
Delete the file.

---

## 4. Stale Import in App.tsx

| # | Issue | File |
|---|-------|------|
| 1 | `WelcomePage` is imported but not used in any `<Route>` | `client/src/App.tsx` |

### Action
Remove the unused import statement.

---

## 5. Deleted Pages — Stale References Check

The following pages were recently deleted from main:
- `client/src/pages/analytics.tsx`
- `client/src/pages/deep-mind.tsx`
- `client/src/pages/admin-seed.tsx`

**Status:** No lingering references found in client/ or server/ code. Routes and imports were cleaned up properly.

---

## Execution Order

1. Delete the 9 unused component files
2. Remove 10 unused hooks from `api-hooks.ts`
3. Delete `client/src/lib/parse-notes.ts`
4. Remove stale `WelcomePage` import from `App.tsx`
5. Run `npx tsc --noEmit` to verify no TypeScript errors
6. Run the app and smoke-test all pages

---

## Risk Assessment

**Risk: NONE** — All items listed above are confirmed to have zero imports/references in active code. Removing them will not affect any functionality.
