# UI_AUDIT.md

Comprehensive UI/UX audit of the Orbia application. Each section documents current state, issues, and actionable fixes.

---

## Table of Contents
1. [Global Design System Issues](#1-global-design-system-issues)
2. [Layout & Navigation](#2-layout--navigation)
3. [Page-by-Page Audit](#3-page-by-page-audit)
4. [Component-Level Issues](#4-component-level-issues)
5. [Accessibility](#5-accessibility)
6. [Animation & Motion](#6-animation--motion)
7. [Mobile & Responsive](#7-mobile--responsive)
8. [Dark Mode / Light Mode](#8-dark-mode--light-mode)
9. [Priority Summary](#9-priority-summary)

---

## 1. Global Design System Issues

### Color System Fragmentation
The app has no unified color language. Different components use different color systems:

| Component Area | Color Approach | Examples |
|----------------|---------------|----------|
| Core app | CSS variables via `hsl(var(--primary))` | Most shadcn/ui components |
| Work/Workstation | Hardcoded indigo/violet (`indigo-500`, `violet-500`) | `work.tsx`, `projects-tab.tsx` |
| Medical | Hardcoded severity colors (`red-500`, `orange-500`, `cyan`) | `medical.tsx` |
| Habit Garden | Hex colors (`#3b82f6`) | `habit-garden.tsx` |
| Habit Grid | HSL strings (`hsl(217 91% 60%)`) | `habit-grid.tsx` |
| Voice Input | Hardcoded violet/purple (`text-violet-200/90`) | `voice-input-button.tsx` |
| Grounding | Hardcoded slate (`bg-slate-900`) | `grounding-anchor.tsx` |
| Finance Charts | Hardcoded HSL in CATEGORY_HEX_COLORS constant | `finance.tsx` |

**Fix:** Create a shared color token system in `index.css` or `themePresets.ts`. Define semantic tokens for severity (critical/high/medium/low), module identity (work/medical/core), and chart colors. All components should reference CSS variables, never raw Tailwind colors.

### Typography Hierarchy Undefined
No consistent type scale enforced across pages:

- Tab labels range from `text-[10px]` (work, medical) to `text-sm` (tracker) — 10px is below WCAG minimum
- Headings use different weight/family combos: `font-display font-semibold` (habit-grid) vs `font-medium` (habit-garden) vs `font-bold` (tracker)
- Some components use inline `style={{ fontFamily: "'Exo 2', sans-serif" }}` (welcome.tsx) or `font-serif` (sidebar quote) instead of Tailwind utilities
- Work/Medical modules use `const mono = { fontFamily: "'JetBrains Mono', monospace" }` inline style objects

**Fix:** Define a type scale in `index.css` with utility classes: `.text-heading-lg`, `.text-heading-sm`, `.text-label`, `.text-body`, `.text-caption`. Minimum font size should be 12px. Replace all inline font-family styles with Tailwind utilities.

### Card Styling Variance
Cards use different opacity, blur, border, and radius values:

- Dashboard: `bg-card/80 backdrop-blur-xl border border-border/60`
- Medical: `bg-card/40 backdrop-blur-xl border border-primary/15`
- Projects: `bg-black/40` with indigo accents (completely different theme)
- Standard: `bg-card rounded-2xl border border-border shadow-sm`
- Some use `rounded-xl`, others `rounded-2xl` — inconsistent rounding

**Fix:** Standardize 2-3 card variants: `.card-default` (standard), `.card-glass` (glassmorphism), `.card-cmd` (command panel). Define border-radius scale that maps to the `--radius` CSS variable.

### Shadow System Inconsistent
- Mobile nav: `shadow-xl shadow-black/5`
- Orbit FAB: `shadow-lg shadow-primary/25` (colored)
- Lock screen: `shadow-2xl shadow-primary/10`
- Garden top buttons: `shadow-lg hover:shadow-xl`

**Fix:** Define 3 shadow tokens: `--shadow-sm`, `--shadow-md`, `--shadow-lg` in theme presets. Use colored shadows only for the primary CTA (Orbit FAB).

### Button Size Inconsistency
- Some: `min-w-[44px] min-h-[44px]` (accessibility minimum)
- Others: `h-8 w-8` (32px), `h-10 w-10` (40px), `h-11 w-11` (44px), `h-12 w-12` (48px)
- Theme swatches: `w-8 h-8` (32px) — too small for reliable touch targets

**Fix:** Standardize icon button sizes: small (32px, desktop only), medium (40px, default), large (48px, primary actions). All touch targets must be 44px minimum on mobile.

### Background Opacity Language
No standard for background opacity:
- Mobile nav: `bg-background/90`
- Garden top bar: `bg-background/50`
- Voice overlay: `bg-white/[0.03]`
- Lock screen: `bg-white/80`

**Fix:** Define opacity tokens: transparent (`/5`), subtle (`/10`), light (`/20`), medium (`/50`), heavy (`/80`), solid (`/95`).

---

## 2. Layout & Navigation

### Sidebar (Desktop)
**Current:** 256px fixed width (`w-64`). Contains: 176px sphere logo (with negative margins `-mx-3 -mt-2` to extend beyond padding), 9 nav items, daily affirmation, philosopher quote, clock.

**Issues:**
1. Logo is 176px in a 256px container (69% of width) — disproportionate. Negative margins are fragile positioning.
2. Fixed 256px doesn't adapt for smaller desktop screens (1024-1280px). No collapsible state for tablets.
3. Quote of the day section may overlap nav items if list is long. No scroll behavior if quote exceeds container.
4. Affirmation/quote section uses `font-serif` inline instead of utility class.
5. Nav icon stroke-width changes from 1.5 to 2 on active state — creates visual jump.
6. Hover state (`bg-muted/80`) has insufficient contrast.

**Fixes:**
- Reduce logo to 80-100px. Remove negative margins.
- Add collapsible sidebar at `lg:` breakpoint (icon-only mode at 1024px).
- Constrain quote to 2 lines with `line-clamp-2`.
- Add `font-serif` to Tailwind config as a utility.
- Use consistent icon stroke-width (1.5 always, change fill or color on active).

### Mobile Bottom Nav
**Critical:** Two different implementations exist — `mobile-bottom-nav.tsx` (simple 5-item) and the inline `MobileBottomNav` in `layout.tsx` (complex with FAB + "More" modal). The simple one appears unused.

**Current:** Complex version has Orbit FAB button elevated with `relative -mt-6`. Text labels at `text-[10px]`. "More" modal opens with 3-column grid. Bottom padding calculated as `pb-[92px]` or `pb-24` — inconsistent.

**Issues:**
1. FAB button positioned with negative margin — fragile, may overlap content.
2. `text-[10px]` labels may be illegible on smaller phones.
3. "More" modal `max-h-[60vh]` doesn't account for keyboard.
4. Content padding (`pb-[92px]`) doesn't match actual nav height (`h-16` = 64px).
5. Nav bar itself has `mb-3` not included in padding calc.
6. Active state indicator barely visible in light mode (`bg-primary/10`).

**Fixes:**
- Delete unused `mobile-bottom-nav.tsx`.
- Replace negative margin FAB with proper absolute positioning or CSS grid.
- Increase label text to `text-xs` (12px).
- Calculate bottom padding dynamically or use a consistent `pb-20` (80px).
- Use `bg-primary/20` minimum for active indicator visibility.

### Content Area Padding
**Current:** `px-3 md:px-6 lg:px-8 xl:px-10` — creates jumpy layout shifts at breakpoints.

**Fix:** Use `px-4 md:px-6 lg:px-8` (fewer jumps, smoother progression).

---

## 3. Page-by-Page Audit

### Tracker (`/`) — `tracker.tsx`

**Layout:** Sticky 6-tab navigation with swipe support. AnimatePresence for tab transitions. Progress bar showing habit completion.

**Issues:**
1. Tab text `text-[10px] md:text-sm` — 10px is too small on mobile. Inconsistent jump to 14px on desktop.
2. Spacing inconsistency: some content uses `mt-4`, others `space-y-4`.
3. Progress bar good but uses `duration-500` transition — could be snappier at `duration-300`.
4. Empty state for habits (lines 340-344) is basic — just icon + text, no call-to-action button.
5. View mode toggle buttons (Grid/List/Garden) have custom conditional styling — not following a standard toggle pattern.

**Fixes:**
- Tab labels minimum `text-xs` (12px).
- Standardize spacing to `space-y-4` throughout.
- Add "Create your first habit" button in empty state.
- Use ToggleGroup from shadcn/ui for view mode switch.

### Dashboard (`/dashboard`) — `dashboard.tsx`

**Layout:** Greeting header, wellness score, 4-column stat cards, 2-column chart grid.

**Issues:**
1. 4-column stat cards (`grid-cols-2 md:grid-cols-4`) stack awkwardly on tablets.
2. Dashboard has no empty state — first-time user sees broken charts with no data.
3. Badge colors use `bg-[hsl(var(--success)/0.15)]` — custom syntax not used elsewhere.
4. After wellness score section, excessive vertical whitespace before stats.
5. Charts may not be readable on small mobile screens.

**Fixes:**
- Use `grid-cols-2 lg:grid-cols-4` (push 4-col to larger screens).
- Add empty state: "Start tracking to see insights" with link to Tracker.
- Use standard badge variant classes.
- Add `ResponsiveContainer` min-height for charts.

### Orbit (`/orbit`) — `orbit.tsx`

**Layout:** Full-height chat interface with message list, input area, voice button.

**Issues:**
1. Message list uses individual animations for each message — can feel slow with long histories.
2. No explicit responsive breakpoint handling visible.
3. JSON action execution happens silently — user only sees confirmation text. No visual indicator of action in progress.
4. No typing indicator or "thinking" animation while waiting for AI response.

**Fixes:**
- Add message batching: animate only the last 5 messages, render others statically.
- Add pulsing dots "thinking" indicator while AI streams.
- Show brief toast or inline badge when an action executes successfully.

### Career (`/career`) — `career.tsx`

**Layout:** Tabs (Projects/Tasks/Coach/Vision). Projects as expandable cards with circular progress. Vision items in grid.

**Issues:**
1. Deep nesting (projects → tasks → subtasks) causes layout issues on mobile.
2. No empty state for new users — empty project list looks broken.
3. Career Coach AI generates roadmaps but response can be very long — no truncation or "show more".
4. Dialog-based editing forces full context switch.
5. Motion buttons use `whileTap={{ scale: 0.9 }}` but no hover effect.

**Fixes:**
- Add empty state with "Create your first project" CTA.
- Limit AI coach response display to first 500 chars with "Show full roadmap" button.
- Add `whileHover={{ scale: 1.02 }}` to interactive cards.

### Finance (`/finance`) — `finance.tsx`

**Layout:** Tabs (Dashboard/Income/Expenses/Loans). DateScopeControl for navigation. Charts + transaction list.

**Issues:**
1. Charts take significant vertical space — smaller devices require extensive scrolling.
2. Category colors are hardcoded HSL values in `CATEGORY_HEX_COLORS` constant — not theme-aware.
3. No loading skeleton for charts (just spinner).
4. Import transactions dialog relies on AI parsing with no progress indicator.
5. Transaction list has no pagination — could be very long.

**Fixes:**
- Make charts collapsible or add summary cards above them.
- Move chart colors to theme system.
- Add loading skeleton matching chart dimensions.
- Add progress bar for import processing.
- Paginate transaction list (20 per page) or virtualize.

### Medical (`/medical`) — `medical.tsx`

**Layout:** 3-column HUD layout (My Health | AI Chat | Actions). Mobile: tab fallback.

**Issues:**
1. Uses completely different color system: raw `red-500`, `orange-500`, `yellow-500`, `green-500` for severity — not theme-aware.
2. HUD labels at `text-[10px] uppercase tracking-[0.15em]` — below minimum readable size.
3. `grid-cols-3 gap-2` for stat cards — 2px gap is too tight, text wraps on mobile.
4. AccordionSection shows "NO DATA" in uppercase for empty sections — feels cold/robotic.
5. Document vault AI analysis has no loading state during processing.

**Fixes:**
- Map severity to theme CSS variables: `--severity-critical`, `--severity-high`, `--severity-medium`, `--severity-low`.
- Increase HUD labels to `text-xs` (12px).
- Use `gap-3` minimum for stat grid.
- Change empty text to "No entries yet" with subtle icon.
- Add upload progress bar with processing animation.

### Workstation (`/work`) — `work.tsx`

**Layout:** Meetings strip + 3-column grid (Email | Professional AI | Teams). Mobile: 3 tabs.

**Issues:**
1. Uses hardcoded indigo color scheme everywhere (`indigo-400`, `indigo-500`, `emerald-400`) — doesn't follow theme.
2. Emoji picker grid `grid-cols-10` with `gap-0.5` — columns too narrow and gaps too tight on mobile. Touch targets are 28px (7x7) — far below 44px minimum.
3. `text-indigo-400/60` labels may have low contrast on light backgrounds.
4. Connection card has fixed width — no responsive adaptation.
5. Scrollable message container uses `max-height` but doesn't account for mobile keyboard.

**Fixes:**
- Use CSS variables for work accent colors, falling back to theme primary.
- Reduce emoji grid to `grid-cols-6` on mobile with `gap-1.5`. Increase touch targets to 40px.
- Ensure all labels meet WCAG AA contrast (4.5:1 minimum).
- Make connection card full-width on mobile.

### News (`/news`) — `news.tsx`

**Layout:** Category filter pills + article grid (1/2/3 columns responsive). Two tabs: Feed/Saved.

**Issues:**
1. `pb-24` (96px) bottom padding — excessive, wastes space.
2. Category filter pills horizontal scroll with no scroll indicator — users don't know more categories exist.
3. Article cards have good responsive grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`).
4. Empty saved articles state is good — centered with icon and message.
5. Loading skeleton with `animate-pulse` is well done — one of the better loading states in the app.

**Fixes:**
- Reduce bottom padding to `pb-20`.
- Add fade gradient on scroll edges to hint at more categories.
- Consider this page's loading skeleton pattern as the standard for other pages.

### Settings (`/settings`) — `settings.tsx`

**Layout:** `max-w-3xl mx-auto` container. Card-based sections with consistent `space-y-8`.

**Issues:**
1. Theme grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — good responsive design.
2. "Version 1.0 • Built with care" hardcoded — should reflect actual version.
3. Data export downloads JSON — no progress indicator for large datasets.
4. Profile auto-save has no "saved" feedback besides toast.

**Fixes:**
- Pull version from `package.json`.
- Add inline "Saved" text that fades after 2 seconds near profile fields.

### Welcome (Login) — `welcome.tsx`

**Layout:** Full-screen centered. Animated sphere logo, rotating motivational messages, password input.

**Issues:**
1. Uses inline `style={{ fontFamily: "'Exo 2', sans-serif" }}` — not in Tailwind config.
2. Animated background elements (Stars, Sparkles, Hearts) with `pointer-events-none` run continuously.
3. Floating decorative elements use large blur filters — expensive on mobile.
4. Password input labeled "commitment phrase" — non-standard, may confuse users.
5. Error state uses shake animation — good feedback.

**Fixes:**
- Add 'Exo 2' to Tailwind font config.
- Reduce or disable background animations on mobile via `prefers-reduced-motion` or viewport check.
- Add "Password" label below or instead of "commitment phrase" placeholder.

### Not Found — `not-found.tsx`

**Layout:** Centered card with alert icon.

**Issues:**
1. Developer-facing message: "Did you forget to add the page to the router?" — should be user-facing.
2. No link back to home.

**Fixes:**
- Change to "This page doesn't exist" with "Go Home" button.

---

## 4. Component-Level Issues

### Habit Garden (`habit-garden.tsx`)
- Grid `grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7` expands too aggressively — causes layout shift on medium devices.
- Plant titles at `text-[10px]` are nearly illegible on mobile.
- No empty state when habits array is empty.
- Delete button positioned absolutely, hidden until hover — unpredictable click targets on mobile (hover doesn't exist on touch).

**Fixes:** Cap grid at `grid-cols-5` max. Min text `text-xs`. Add empty state. Show delete button always on mobile (use `md:opacity-0 md:group-hover:opacity-100`).

### Habit Grid vs Habit List vs Habit Garden
Three views for the same data use different color systems, typography weights, and empty state designs.

**Fix:** Extract shared habit card primitives (icon, title, streak badge, completion toggle) into a base component. Each view composes from these primitives with different layouts.

### Habit Form / Edit Form (`habit-form.tsx`, `habit-edit-form.tsx`)
~95% duplicate code between create and edit forms.

**Fix:** Merge into single `HabitFormDialog` with `mode: "create" | "edit"` prop.

### Routine Timeline (`routine-timeline.tsx`)
- SVG progress circles animate but no `prefers-reduced-motion` support.
- Activities panel takes full width below timeline — wasted horizontal space on desktop.
- Vertical timeline with `min-h-[24px]` gaps creates excessive whitespace.
- No loading skeleton during data fetch.

**Fixes:** Add `@media (prefers-reduced-motion: reduce)` to disable circle animation. Use side-by-side layout on `lg:` screens. Reduce gaps. Add skeleton loader.

### Routine Editor (`routine-editor.tsx`)
854 lines — too large. Uses native `<input type="color">` which looks different from rest of UI. Sheet has no max-height constraint with scroll.

**Fixes:** Split into sub-components (TemplateForm, BlockEditor, ActivityEditor). Replace native color picker with custom swatches matching habit-form pattern. Add `max-h-[85vh] overflow-y-auto` to sheet content.

### Mood Tracker (`mood-tracker.tsx`)
- EmojiSelector scales to `scale-105` on select — subtle, good.
- Sleep selector only shows on first check-in of the day — unclear if user can edit later.
- Notes collapse/expand has no padding inside — cramped when expanded.
- Today's check-in history is horizontal scroll with no scroll indicator.

**Fixes:** Always show sleep selector. Add `p-3` inside notes expand area. Add scroll fade indicators.

### Todo List (`todo-list.tsx`)
- Left border accent (`border-l-4`) is good visual hierarchy but inconsistent with other components.
- Subtask indentation uses hardcoded `ml-8` — doesn't scale responsively.
- Overdue tasks use `animate-pulse` — jarring when many items are overdue.

**Fixes:** Use `ml-4 md:ml-8` for responsive indentation. Replace pulse with static red/orange left border for overdue.

### Journal Tab (`journal-tab.tsx`)
648 lines — handles list view, write view, and edit mode. Too much responsibility.

- Markdown toolbar buttons have tooltips on hover only — inaccessible on mobile.
- Writing prompts are horizontal scroll pills — should wrap on mobile.
- Expanding entries pushes others down — causes layout shift.

**Fixes:** Split into JournalList, JournalEditor, JournalPreview sub-components. Make prompts wrap with `flex-wrap`. Use fixed-height entry previews with "Read more".

### Food Tracker (`food-tracker.tsx`)
- Meal option buttons show checkmark when selected but use circular borders — inconsistent with rectangular cards elsewhere.
- Progress indicator (`completedMeals/3`) only in header — user must scroll up.

**Fixes:** Use rounded rectangles for options. Add sticky progress indicator or put it at bottom too.

### Zoho Panel (`zoho-panel.tsx`)
- Uses `bg-black/40` dark background — completely different from light theme components.
- Status colors use hardcoded string matching — brittle.

**Fix:** Use theme-aware backgrounds. Extract status colors to a config object.

### Projects Tab (`projects-tab.tsx`)
- Uses dark theme (`bg-black/40`, indigo accents) that's completely different from the rest of the app outside workstation.
- Clicking project card switches entire view with no breadcrumb back.

**Fix:** Ensure dark theme only applies inside workstation context. Add breadcrumb or back button.

### Voice Input (`voice-input-button.tsx`)
- Full-screen overlay with completely hardcoded colors (`text-violet-200/90`, `radial-gradient(ellipse at center, rgba(30, 10, 60, 1) ...)`)
- Only works in dark mode aesthetically — light mode would show dark overlay.
- Ring animations have different durations per phase (3s, 1.5s, 2s, 3s) — feels erratic.
- No `prefers-reduced-motion` support.
- No escape route on some mobile browsers.

**Fixes:** Replace hardcoded colors with theme variables. Add close/cancel button. Unify ring animation durations to 2s. Add reduced motion fallback. Add light mode compatible gradient.

### Lock Screen (`lock-screen.tsx`)
- Uses `bg-white/80` — barely visible in dark mode.
- Password stored in localStorage — acceptable for app lock but noted.
- No `role="dialog"` attribute.

**Fixes:** Use `bg-background/80` instead. Add `role="dialog"` and `aria-modal="true"`.

### Unload Sheet (`unload-sheet.tsx`)
- Brain dump → actions. Good concept but action results have no visual grouping by module.

**Fix:** Group parsed actions by module with section headers and module-colored left borders.

### Orbit FAB (`orbit-fab.tsx`)
- Chat window `w-80` (320px) is too wide for iPhone SE (375px viewport).
- `h-96` (384px) chat window is tall on small phones.
- Quick prompts wrap awkwardly below input.

**Fixes:** Use `w-[calc(100vw-2rem)]` max on mobile. Reduce height to `h-80`. Move quick prompts above input as horizontal pills.

---

## 5. Accessibility

### Critical Issues

1. **Missing ARIA Labels**
   - Mobile nav buttons have no `aria-label` (only `data-testid`)
   - FAB button lacks `aria-label`
   - Lock screen missing `role="dialog"`
   - Voice input overlay has no `aria-live` regions
   - Emoji buttons across mood tracker, journal lack `aria-label`
   - Icon-only buttons in toolbar (journal markdown formatting) lack accessible names

2. **Keyboard Navigation**
   - No skip-to-main-content link
   - Voice input overlay portal doesn't trap focus
   - Lock screen doesn't trap focus
   - Custom sliders may not be keyboard accessible
   - ESC key behavior undefined for custom overlays

3. **Color Contrast Failures**
   - `text-muted-foreground` on lighter backgrounds may fail WCAG AA (4.5:1)
   - `text-indigo-400/60` in work page — reduced opacity further drops contrast
   - Light mode accent colors (`260 35% 85%`) have poor contrast on light backgrounds
   - Semi-transparent text on semi-transparent backgrounds (layered opacity)

4. **Color-Only Information**
   - Priority levels conveyed only by color (todo-list, career tasks)
   - Severity in medical page uses color dots with no text label alternative
   - Chart data relies on color differentiation only

5. **Touch Target Sizes Below 44px**
   - Theme swatches: 32x32px
   - Emoji picker in work page: ~28x28px
   - Mobile nav text labels: 10px height
   - Habit garden delete button: hidden until hover (no hover on touch)
   - Color swatches in habit form: 12x12px (3x3 CSS, appears ~12px rendered)

### Fixes
- Add `aria-label` to every icon-only button
- Add `<a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>` in layout
- Implement focus trap in all modal/sheet/overlay components
- Add text labels alongside color indicators (e.g., "High" next to red dot)
- Ensure all interactive elements are minimum 44x44px on mobile
- Test all color combinations with WCAG contrast checker
- Add `prefers-reduced-motion` media query to disable animations globally

---

## 6. Animation & Motion

### Performance Concerns
1. **Continuous background animation** in layout.tsx: 4-5 motion.div elements with large blur filters (`blur-60px` to `blur-80px`) running at 60fps continuously, even when not visible. No `will-change` hint.
2. **Lock screen particles:** 6 animated elements running continuously.
3. **Welcome page decorative elements:** Stars, Sparkles, Hearts animating infinitely.

**Fixes:** Use `will-change: transform` on animated elements. Pause animations when not visible (Intersection Observer). Reduce blur values on mobile. Respect `prefers-reduced-motion`.

### Inconsistent Timing
- Most transitions: `duration-200` (Tailwind default)
- Tab transitions: `duration-500`
- Card stagger: `i * 0.08`
- Voice input rings: 1.5s, 2s, 3s (multiple durations)
- Logo pulse: 3s everywhere

**Fix:** Define motion tokens: `--duration-fast: 150ms`, `--duration-normal: 250ms`, `--duration-slow: 400ms`. Use consistently.

### Missing Transitions
- Work page: No animations on card interactions
- Finance page: No chart entry animations
- Medical page: AccordionSection has motion but relatively simple compared to other pages
- Career page: No hover effect on project cards (only `whileTap`)

**Fix:** Add subtle scale (`1.01`) on hover for all interactive cards. Add chart entry fade-in.

### Jarring Transitions
- Mobile nav indicator uses spring animation with no pre-calculated initial position — can jump on first render
- Habit garden delete button appears/disappears on hover — no opacity transition
- Journal entry expand pushes siblings down abruptly

**Fix:** Add `initial={false}` on nav indicator. Use opacity transition for delete buttons. Use `layout` prop on journal entries for smooth reflow.

---

## 7. Mobile & Responsive

### Breakpoint Strategy Gaps
- **No tablet layout (768-1024px):** iPad gets desktop layout with cramped sidebar. iPad mini gets mobile layout.
- Sidebar is fixed 256px — no intermediate collapsed state.
- Medical page `grid-cols-3` stat cards: too tight on tablets.
- Routine editor sheet `w-full sm:w-[540px]` — no tablet optimization.

**Fix:** Add `lg:` as desktop threshold (1024px+). Use `md:` for tablet (768-1024px) with collapsed sidebar. Test all pages at 768px and 1024px.

### Content Overflow
- Emoji picker in work page: 10-column grid with no responsive breakpoints
- Routine timeline ribbon: `overflow-x-auto` with no scroll indicator
- Calendar in DateScopeControl: `numberOfMonths={2}` too wide for mobile

**Fixes:** Emoji grid → `grid-cols-6` on mobile. Add scroll fade indicators. Single month on mobile calendar.

### Bottom Padding Inconsistency
Pages add bottom padding for mobile nav but values differ:
- Tracker: implicit via layout
- News: `pb-24` (96px)
- Others: via layout `pb-[92px]`

**Fix:** Handle bottom padding once in layout.tsx, not per-page. Use CSS variable `--nav-height`.

### Touch Interactions
- Swipe gestures on tracker tabs — good
- No swipe between pages (e.g., tracker → dashboard)
- Habit garden hover-to-reveal delete — impossible on touch
- Long-press not used anywhere — missed opportunity for context menus

**Fix:** Show action buttons always on mobile. Consider bottom sheet for item actions on long-press.

---

## 8. Dark Mode / Light Mode

### Dark-Only Components
These components only look correct in dark mode:
- **Voice input overlay:** hardcoded `radial-gradient(ellipse at center, rgba(30, 10, 60, 1) ...)`
- **Grounding anchor:** `bg-slate-900 text-slate-50`
- **Projects tab / Zoho panel:** `bg-black/40` backgrounds
- **Lock screen:** `bg-white/80` text container (barely visible in dark mode, but the dark background means it works — would be wrong if theme is light)

**Fix:** Replace all hardcoded colors with theme-aware values: `bg-background`, `text-foreground`, `bg-card`, etc.

### Light Mode Weaknesses
- Light mode accent colors (HSL `260 35% 85%`) are barely visible against light backgrounds
- Active nav indicator `bg-primary/10` is barely visible in light mode
- Animated background uses opacity 0.12 in light mode vs 0.35 in dark — too subtle
- Glassmorphism effects are designed for dark mode — `bg-white/5` borders are invisible in light mode

**Fix:** Define separate glass styles for light mode: `bg-black/5 border-black/10`. Increase accent saturation in light mode themes. Test every component in both modes.

### Theme Transition
No transition when switching themes — all colors snap instantly.

**Fix:** Add `transition-colors duration-300` to `:root` element for smooth theme switching.

---

## 9. Priority Summary

### Critical (fix first)
| Issue | Location | Impact |
|-------|----------|--------|
| `text-[10px]` labels below readable size | work.tsx, medical.tsx, mobile nav | Readability |
| Missing ARIA labels on interactive elements | Throughout | Accessibility/legal |
| No focus management in modals/overlays | voice-input, lock-screen, orbit-fab | Accessibility |
| Emoji picker 28px touch targets | work.tsx | Unusable on mobile |
| Voice input hardcoded dark colors | voice-input-button.tsx | Broken in light mode |
| No skip-to-content link | layout.tsx | Accessibility |
| Color-only severity/priority indicators | medical.tsx, todo-list.tsx | Accessibility |

### High (fix soon)
| Issue | Location | Impact |
|-------|----------|--------|
| Duplicate mobile nav implementations | mobile-bottom-nav.tsx vs layout.tsx | Maintenance |
| 95% duplicate habit form code | habit-form.tsx, habit-edit-form.tsx | Maintenance |
| No empty states on Dashboard, Career, Finance | Multiple pages | First-time UX |
| No loading skeletons (most pages use spinner) | Most pages except news.tsx | Perceived performance |
| Continuous background animations (no pause) | layout.tsx, welcome.tsx, lock-screen.tsx | Performance/battery |
| Card/shadow/opacity styling fragmented | Throughout | Visual inconsistency |
| No prefers-reduced-motion support | All animated components | Accessibility |
| 404 page shows developer message | not-found.tsx | User confusion |

### Medium (improve iteratively)
| Issue | Location | Impact |
|-------|----------|--------|
| Color system fragmentation across modules | Habit, work, medical, finance | Visual inconsistency |
| Typography hierarchy undefined | Throughout | Visual inconsistency |
| Sidebar logo too large (176px in 256px) | layout.tsx | Wasted space |
| No tablet layout (768-1024px) | Throughout | Tablet UX |
| Content padding jumps at breakpoints | layout.tsx | Layout shift |
| Tab indicator barely visible in light mode | layout.tsx mobile nav | Visibility |
| Habit garden grid expands too aggressively | habit-garden.tsx | Layout shift |
| Journal tab 648 lines, too much responsibility | journal-tab.tsx | Maintenance |
| Routine editor 854 lines | routine-editor.tsx | Maintenance |
| No pagination for long lists | finance.tsx transactions | Performance |
| Overdue todo pulse animation jarring | todo-list.tsx | Distraction |
| Theme switch has no color transition | useTheme.ts | Polish |

### Low (nice to have)
| Issue | Location | Impact |
|-------|----------|--------|
| Inline font-family styles | welcome.tsx, layout.tsx | Code quality |
| Hardcoded version string | settings.tsx | Accuracy |
| Lock screen password in localStorage | lock-screen.tsx | Security (minor) |
| Animated background blur expensive on mobile | layout.tsx | Performance |
| Single month vs dual calendar on mobile | date-scope-control.tsx | Space |
| Quote may overflow sidebar | layout.tsx | Edge case |
