# Orbia Desktop App — Electron Implementation Plan

## Context

Orbia is a full-stack personal wellness/productivity app (React 19 + Express + PostgreSQL) deployed at `myorbia.com`. It already has a Capacitor Android wrapper that loads the remote URL. The user wants a **professional, immersive Windows desktop app** with: frameless window, custom title bar, system tray, splash screen, full-screen mode, and auto-start.

**Approach:** Electron app loading `https://myorbia.com` remotely (same pattern as Capacitor). No local server — the database, AI keys, OAuth, and Zoho are all server-side. The desktop app is a premium native shell. **Zero modifications to existing web app code.**

**Why Electron over Tauri:** Voice features use `webkitSpeechRecognition` (Chromium-only). Electron guarantees Chromium. Battle-tested by Discord, Spotify, VS Code.

---

## Files to Create

All new files live in `desktop/` at the repo root (peer to `android/`).

```
desktop/
├── package.json              # Electron deps & scripts
├── tsconfig.json             # TS config (CommonJS output for Electron)
├── forge.config.ts           # Electron Forge build/packaging config
├── src/
│   ├── main.ts               # Main process: window, splash, CSS injection, lifecycle
│   ├── preload.ts            # Context bridge, title bar button injection, IPC
│   ├── splash.html           # Self-contained splash screen with animated orb
│   ├── splash-preload.ts     # Minimal preload for splash window
│   ├── tray.ts               # System tray: icon, context menu, click handlers
│   ├── ipc-handlers.ts       # IPC handlers for window controls
│   └── updater.ts            # Auto-update placeholder (future)
├── assets/
│   ├── icon.ico              # Windows multi-res icon (generated from sphere)
│   ├── icon.png              # 1024x1024 source icon
│   ├── tray-icon.png         # 32x32 tray icon
│   └── orbia_sphere.png      # Splash orb (copy from attached_assets/)
```

**Only existing file touched:** `.gitignore` — add `desktop/node_modules`, `desktop/dist`, `desktop/out`

---

## Implementation Steps

### Step 1: Scaffold `desktop/` directory

Create `package.json` with:
- `electron` ^33 (latest Chromium for SpeechRecognition)
- `@electron-forge/cli` + `@electron-forge/maker-squirrel` (Windows .exe installer)
- `electron-squirrel-startup` (handles install/update lifecycle)
- Scripts: `dev` → `electron-forge start`, `build` → `tsc && electron-forge make`

Create `tsconfig.json`: target ES2022, CommonJS module, outDir `dist/`, rootDir `src/`.

Create `forge.config.ts`: Squirrel.Windows maker, ASAR packaging, app name "Orbia", icon path.

### Step 2: Generate icon assets

Source: `attached_assets/orbia_sphere_transparent.png`
- `icon.ico` — multi-res (256/128/64/48/32/16) via ImageMagick
- `icon.png` — 1024x1024 copy
- `tray-icon.png` — 32x32 resize
- `orbia_sphere.png` — copy for splash screen

### Step 3: Create `splash.html`

Self-contained HTML with inline CSS/JS:
- Transparent window background (`BrowserWindow` has `transparent: true`)
- Animated pulsing glow rings (CSS `@keyframes`) behind Orbia sphere image
- "ORBIA" brand text with letter spacing + glow
- Sliding loading bar animation
- Status text: "Connecting to your orbit..."
- Entire body is `-webkit-app-region: drag` (draggable)

### Step 4: Create `tray.ts`

System tray with:
- Orbia icon (32x32)
- Left-click: toggle show/hide main window
- Right-click context menu: Show Orbia, Toggle Full Screen, Start with Windows (checkbox), separator, Quit Orbia
- "Quit Orbia" sets `isQuitting = true` then `app.quit()`

### Step 5: Create `ipc-handlers.ts`

Register IPC handlers for:
- `window:minimize` / `window:maximize` / `window:close` / `window:toggle-fullscreen`
- `window:is-maximized` / `window:is-fullscreen` (invoke handlers)
- `app:set-auto-start` / `app:get-auto-start`
- Forward `maximize` / `unmaximize` events to renderer for icon updates

### Step 6: Create `preload.ts`

Two responsibilities:

**A. Context Bridge** — expose `window.electronAPI`:
- `minimize()`, `maximize()`, `close()`, `toggleFullscreen()`
- `isMaximized()`, `isFullscreen()` (async)
- `setAutoStart(bool)`, `getAutoStart()`
- `isElectron: true`, `platform: process.platform`

**B. DOM Injection** — on `DOMContentLoaded`:
- Append a fixed `div#electron-title-bar-controls` to `document.body`
- Contains 3 SVG buttons: minimize (—), maximize (□), close (×)
- Close button has red hover state
- Listen for `window:maximized-changed` IPC to swap maximize/restore icon

### Step 7: Create `main.ts` — the core

**Window creation:**
- `frame: false` (frameless)
- `show: false` (hidden until loaded)
- `backgroundColor: '#0f0f17'` (matches Orbia dark theme)
- `minWidth: 900`, `minHeight: 600`
- `webPreferences.partition: 'persist:orbia'` (persistent cookies across restarts)

**CSS injection** via `win.webContents.insertCSS()` on `did-finish-load`:
- `body::before` — 32px fixed drag region at top (`-webkit-app-region: drag`, `pointer-events: none`)
- All buttons/links/inputs get `-webkit-app-region: no-drag`
- `aside > div:first-child` gets `padding-top: 32px` to push sidebar content below drag area
- `#electron-title-bar-controls` styles — fixed top-right, Windows 11 Fluent-style buttons

**Microphone permissions** — auto-grant `media`, `notifications` via `setPermissionRequestHandler`

**Splash → main transition:**
1. Splash window created first (transparent, alwaysOnTop, 400x500)
2. Main window loads `https://myorbia.com` in background
3. On `did-finish-load`: 800ms delay → close splash → show main
4. On `did-fail-load`: retry after 5 seconds

**Lifecycle:**
- Single instance lock (`app.requestSingleInstanceLock()`)
- Close button hides to tray (unless `isQuitting` flag set)
- External links open in default browser via `setWindowOpenHandler`

### Step 8: Update `.gitignore`

Add: `desktop/node_modules/`, `desktop/dist/`, `desktop/out/`

### Step 9: Build & test

```bash
cd desktop
npm install
npm run dev          # Test: splash → load → title bar → tray → controls
npm run build        # Produces out/make/squirrel.windows/x64/OrbiSetup.exe
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Remote URL, not local server | DB, AI, OAuth all live on Replit. Same pattern as Capacitor Android app. |
| CSS injection for title bar | Zero web app modifications. `insertCSS()` bypasses CSP. |
| DOM injection for window controls | Preload appends buttons to `document.body`. Web app is unaware. |
| `persist:orbia` session partition | Cookies survive app restarts. 30-day session works naturally. |
| Squirrel.Windows installer | No admin required. Installs to %LOCALAPPDATA%. Auto-update capable. |
| Electron Forge (not electron-builder) | Current recommended toolchain. Simpler config. |

## Verification

1. **Splash screen**: App launches → animated orb splash appears → fades to main app
2. **Auth**: Login once → close and reopen → still logged in (persistent cookies)
3. **Title bar**: Window is draggable from top 32px. Min/max/close buttons work. Sidebar not obscured.
4. **System tray**: Close (X) → app hides to tray. Tray click → app shows. Right-click → menu works.
5. **Full screen**: F11 or tray menu → immersive full screen. F11 again → exits.
6. **Voice**: Orbit page → tap mic → microphone works without permission prompt
7. **External links**: Microsoft OAuth → opens in default browser correctly
8. **Installer**: `OrbiSetup.exe` installs cleanly, creates shortcuts, app runs
