# UI/UX Design Issues & Consistency Fixes

> Audit date: 2026-03-14 | Branch: `claude/test-app-functionality-rgidS`
>
> Total issues: **35** across layout, responsiveness, typography, dark theme, and component consistency.

---

## 1. Dialog & Modal Overflow (CRITICAL)

### U1. Dialog content cut off on mobile
- **File:** `client/src/components/ui/dialog.tsx:39`
- **Problem:** DialogContent uses `w-full max-w-lg` centered at `top-[50%]`. On small screens (320px), `max-w-lg` (32rem = 512px) exceeds screen width. Tall dialogs get cut off at the bottom with no scroll.
- **Fix:** Change to:
  ```tsx
  className="w-[calc(100%-32px)] max-w-lg max-h-[85vh] overflow-y-auto"
  ```

### U2. Habit form dialog overflow
- **File:** `client/src/components/habit-form.tsx`
- **Problem:** Form dialogs with many fields overflow on small screens — no max-height or scroll.
- **Fix:** Wrap form content in `<ScrollArea className="max-h-[70vh]">`.

### U3. Dialog doesn't fit landscape mobile
- **File:** `client/src/components/ui/dialog.tsx:39`
- **Problem:** `top-[50%]` positioning on landscape viewports (e.g., 568x320) means dialog can exceed available height.
- **Fix:** Add `max-h-[85vh]` and ensure content scrolls.

---

## 2. Overflow & Cropping (HIGH)

### U4. Select dropdowns cropped on mobile
- **File:** `client/src/pages/career.tsx` and other pages using Select
- **Problem:** SelectContent near viewport edges can extend beyond screen bounds. Dropdown options get cropped.
- **Fix:** Add `side="bottom" sideOffset={8}` to SelectContent and constrain width to viewport.

### U5. Theme popover too wide on small screens
- **File:** `client/src/components/layout.tsx:580`
- **Problem:** PopoverContent uses `w-72` (288px). On screens <384px, this exceeds available space.
- **Fix:** Change to `w-[calc(100vw-32px)] md:w-72`.

### U6. News topic sheet — nested scrolling
- **File:** `client/src/pages/news.tsx:588`
- **Problem:** SheetContent uses `h-[80vh]` fixed height. Inside, TopicManager grid uses `max-h-[60vh] overflow-y-auto`. Two independent scroll areas confuse users.
- **Fix:** Remove fixed `h-[80vh]`, use `max-h-[90vh]` at sheet level. Remove nested `overflow-y-auto` from grid.

---

## 3. Mobile Responsiveness (HIGH)

### U7. Habit grid overflows on 320px screens
- **File:** `client/src/components/habit-grid.tsx:64-90`
- **Problem:** Grid uses `grid-cols-[1.5fr_repeat(5,1fr)_auto]` — 7+ columns at minimum width. On 320px screens, this causes horizontal overflow.
- **Fix:** Show fewer days on mobile:
  ```tsx
  className="grid-cols-[1fr_repeat(3,minmax(0,1fr))_auto] md:grid-cols-[1.5fr_repeat(5,1fr)_auto]"
  ```

### U8. Tracker tabs truncate on narrow mobile
- **File:** `client/src/pages/tracker.tsx:212-261`
- **Problem:** TabsList uses `grid grid-cols-6` — 6 columns with icon+text. On very small screens, text wraps awkwardly or gets cut off.
- **Fix:** Add `whitespace-nowrap` to TabsTrigger spans. Reduce icon sizes on mobile: `w-3 h-3 md:w-4 md:h-4`.

### U9. Career page tabs don't wrap on mobile
- **File:** `client/src/pages/career.tsx`
- **Problem:** TabsList with multiple triggers doesn't wrap on small screens — overflows or gets squished.
- **Fix:** Use `grid grid-cols-2 md:flex` or `flex flex-wrap` for tabs.

### U10. News article text too small on mobile
- **File:** `client/src/pages/news.tsx:409-415`
- **Problem:** Uses `text-sm` for titles and `text-xs` for descriptions. Combined with `line-clamp-2`, text becomes very cramped on mobile.
- **Fix:** Use `text-base md:text-sm` for titles, `text-sm md:text-xs` for descriptions.

---

## 4. Sticky Header & Scroll Issues (HIGH)

### U11. Sticky tracker tabs overlap mobile header
- **File:** `client/src/pages/tracker.tsx:211`
- **Problem:** TabsList uses `sticky top-0 z-30` but doesn't account for MobileHeader height (~64px). When scrolling on mobile, sticky tabs slide under the header.
- **Fix:** Change to `sticky top-[4rem] md:top-0` to offset for mobile header.

### U12. News topics — nested scroll areas
- **File:** `client/src/pages/news.tsx:250`
- **Problem:** Grid inside SheetContent has independent `overflow-y-auto`. Combined with sheet's own scroll, creates confusing double-scroll behavior.
- **Fix:** Use single scroll container at sheet level.

---

## 5. Inconsistent Spacing (MEDIUM)

### U13. Card padding inconsistency
- **Files:** Multiple components
- **Problem:**
  - `habit-card.tsx:99` uses `p-5`
  - `habit-grid.tsx:100` uses `p-4`
  - `habit-list-compact.tsx:73` uses `p-4`
- **Fix:** Standardize on `p-4` across all card components.

### U14. Flex gap inconsistency in layout
- **File:** `client/src/components/layout.tsx`
- **Problem:** Mixed use of negative margins (`-mx-3 -mt-2`), `space-y-1`, `space-y-4`, and explicit `gap-*` values throughout layout.
- **Fix:** Standardize on `gap-*` utilities. Remove negative margins and use proper flex/grid gaps.

### U15. Header button group spacing varies
- **File:** `client/src/components/layout.tsx:428 vs 556`
- **Problem:** Watch/lock buttons use `gap-1.5`, theme buttons use `gap-0.5`. Inconsistent spacing between similar button groups.
- **Fix:** Standardize all button groups to `gap-2`.

### U16. Tracker header uses odd flex/gap combo
- **File:** `client/src/pages/tracker.tsx:200`
- **Problem:** Uses `gap-0 md:gap-2 mb-1 md:mb-2` with `flex-col` — `gap-0` is redundant (default) and confusing.
- **Fix:** Simplify to `flex flex-col items-center gap-2 mb-2`.

---

## 6. Inconsistent Button & Card Styling (MEDIUM)

### U17. Action button sizes vary across views
- **Files:** Multiple
- **Problem:**
  - `habit-grid.tsx:189` — action buttons: `h-8 w-8`
  - `habit-list-compact.tsx:160` — action buttons: `h-10 w-10`
  - `layout.tsx:443` — tooltip buttons: `w-10 h-10`
- **Fix:** Standardize secondary action buttons to `h-9 w-9` everywhere.

### U18. Hover shadow inconsistency
- **Files:** Multiple card components
- **Problem:**
  - `habit-card.tsx:88` uses `shadow-sm hover:shadow-md`
  - News cards have no hover shadow
  - Other cards have varying hover states
- **Fix:** Apply `transition-all duration-300 hover:shadow-md` consistently to all interactive cards.

### U19. Primary action button variants vary
- **Files:** Multiple
- **Problem:** Some actions use `variant="outline"`, others use `variant="default"`. No consistent pattern for primary vs secondary actions.
- **Fix:** Establish convention: primary actions = `variant="default"`, secondary = `variant="outline"`, tertiary = `variant="ghost"`.

---

## 7. Dark Theme Issues (MEDIUM)

### U20. News category badges — low contrast
- **File:** `client/src/pages/news.tsx:107-118`
- **Problem:** Category colors use `bg-primary/10` — very faint in dark mode.
- **Fix:** Use `bg-primary/20` or `bg-primary/15` for better visibility.

### U21. Muted text on muted background
- **File:** `client/src/components/mood-tracker.tsx` and others
- **Problem:** `text-muted-foreground` on `bg-muted/30` backgrounds has insufficient contrast in dark mode.
- **Fix:** Use `text-foreground/60` or boost muted-foreground opacity.

### U22. Habit card expanded section nearly invisible
- **File:** `client/src/components/habit-card.tsx:209`
- **Problem:** Uses `bg-muted/20` for expanded details section — barely visible in dark mode.
- **Fix:** Use `bg-muted/40` for better separation.

### U23. Borders invisible in dark mode
- **File:** `client/src/components/habit-list-compact.tsx:73`
- **Problem:** Uses `border-border/40` — border is already dark, 40% opacity makes it invisible.
- **Fix:** Use `border-border/60` for dark mode visibility.

### U24. Hover states not distinct enough
- **File:** `client/src/pages/news.tsx:669-690`
- **Problem:** News filter buttons use `hover:border-primary/30` — barely visible hover change in dark mode.
- **Fix:** Use `hover:border-primary hover:text-primary` for clear hover feedback.

---

## 8. Typography Inconsistencies (MEDIUM)

### U25. Page title sizes vary across pages
- **Files:** Multiple pages
- **Problem:**
  - Tracker: `text-lg md:text-4xl`
  - News: `text-xl`
  - Other pages use different sizes
- **Fix:** Standardize: `text-2xl md:text-3xl font-bold` for all page titles.

### U26. Subtitle text inconsistency
- **Files:** Multiple pages
- **Problem:** Secondary text uses varying combinations: `text-xs text-muted-foreground`, `text-sm text-muted-foreground`, `text-base text-muted-foreground`.
- **Fix:** Standardize: `text-sm text-muted-foreground` for all page subtitles.

### U27. Card title sizes vary
- **Files:** `habit-card.tsx` uses `text-lg`, `news.tsx` uses `text-sm`
- **Fix:** Use `text-base font-semibold` for all card titles.

### U28. Monospace font used inconsistently for numbers
- **File:** `client/src/components/habit-card.tsx:158, 215`
- **Problem:** Some stats use `font-mono`, others don't. Numbers look different across components.
- **Fix:** Apply `font-mono tabular-nums` to all numeric displays.

---

## 9. Missing Polish (LOW)

### U29. Empty states lack call-to-action
- **File:** `client/src/components/habit-grid.tsx:199-203`
- **Problem:** Empty state shows a faded Trophy icon and text but no actionable button.
- **Fix:** Add a CTA: `<Button variant="outline">Add Your First Habit</Button>`.

### U30. Loading states inconsistent
- **Files:** Multiple pages
- **Problem:** Some pages show text "Loading...", others show spinners, others show skeleton loaders.
- **Fix:** Standardize on skeleton loaders for content areas, spinner for actions.

### U31. Skeleton loaders don't match content height
- **File:** `client/src/pages/news.tsx:625-634`
- **Problem:** Skeleton blocks use arbitrary heights (`h-28`, `h-9`, `h-32`) that don't match rendered content.
- **Fix:** Match skeleton dimensions to actual card dimensions.

### U32. Transition durations vary
- **Files:** Multiple
- **Problem:** Animations use `duration-200`, `duration-300`, `duration-500` inconsistently for similar interactions.
- **Fix:** Standardize: `duration-200` for hover/focus, `duration-300` for enter/leave, `duration-500` for page transitions.

### U33. Z-index potential conflicts
- **File:** `client/src/components/layout.tsx:426, 295, 237`
- **Problem:** MobileHeader `z-40`, MobileBottomNav `z-50`, more-menu `z-50` — nav and overlay same z-index.
- **Fix:** Establish hierarchy: header `z-40`, nav `z-40`, overlays `z-50`, modals `z-50`.

### U34. Habit grid header misaligned with rows
- **File:** `client/src/components/habit-grid.tsx:66-90`
- **Problem:** Header row uses `.self-end` on "Habit" label, but content rows use `.items-center`. Visual misalignment.
- **Fix:** Change header to `items-center` to match rows.

### U35. News article cards have no hover shadow consistency
- **File:** `client/src/pages/news.tsx:388`
- **Problem:** Cards don't have hover elevation change like habit cards do.
- **Fix:** Add `transition-shadow duration-300 hover:shadow-md` to news article cards.

---

## Priority Execution Order

| Phase | Issues | Impact |
|-------|--------|--------|
| **Phase 1 — Broken on Mobile** | U1, U2, U3, U4, U7, U8, U11 | Users can't interact with dialogs/grids on mobile |
| **Phase 2 — Overflow/Cropping** | U5, U6, U9, U10, U12 | Content gets cut off or is unreadable |
| **Phase 3 — Spacing & Sizing** | U13-U19 | Inconsistent but functional — professional polish |
| **Phase 4 — Dark Theme** | U20-U24 | Low contrast and invisible elements |
| **Phase 5 — Typography** | U25-U28 | Visual hierarchy inconsistency |
| **Phase 6 — Polish** | U29-U35 | Nice-to-have improvements |
