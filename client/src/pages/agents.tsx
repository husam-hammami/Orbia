import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, GitBranch, Terminal,
  Trash2, RefreshCw,
  Github, X, Check, Loader2,
  FolderGit2, ArrowLeft, MoreVertical,
  WifiOff,
  Square, ExternalLink,
  Upload, Image, FileText, History,
  GitCommit, GitMerge, GitPullRequest,
  RotateCcw, ArrowDownToLine, ArrowUpFromLine,
  ChevronDown, Clock, AlertTriangle,
  BrainCircuit,
  Folder, File, ChevronRight, Eye,
  ArrowUp, Code,
  Scan, ListChecks, Activity, Send, Sparkles,
  GitPullRequestArrow, Play, TestTube, Zap,
  FolderKanban, CheckSquare, Square as SquareIcon, Rocket,
  Bot, Brain, Shield, Crosshair, Cpu, Gem, Flame, Atom,
  Orbit, Hexagon, Wand2, Swords, CircuitBoard, ScanEye, Braces,
  BookOpen, Search, Home, Bell, ShieldCheck, Gauge, type LucideIcon
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { NeuralOrbit, EmptyOrbit } from "@/components/agents/pixel-agent";
import { agentAnimations, glassPanel, glassPanelGlow } from "@/lib/agent-animations";
import { AgentTerminal } from "@/components/agents/agent-terminal";
import { useIsMobile } from "@/hooks/use-mobile";

interface Agent {
  id: string;
  name: string;
  avatar: string | null;
  role: string | null;
  repoUrl: string;
  repoBranch: string | null;
  accentColor: string | null;
  status: string | null;
  currentTaskSummary: string | null;
  totalTasksCompleted: number | null;
  linkedProjectId: string | null;
  systemPrompt: string | null;
  notifyOnComplete: number | null;
  permissionMode: string | null;
  isRunning: boolean;
  repoCloned: boolean;
  createdAt: string;
}

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  private: boolean;
  default_branch: string;
  updated_at: string;
}

const AGENT_GLYPHS: { id: string; label: string; path: string }[] = [
  { id: "nexus", label: "Nexus", path: "M12 2L2 7v10l10 5 10-5V7L12 2zm0 3l6 3-6 3-6-3 6-3zm-7 5.5l6 3v5.5l-6-3V10.5zm14 0v5.5l-6 3v-5.5l6-3z" },
  { id: "cortex", label: "Cortex", path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4a3 3 0 110 6 3 3 0 010-6zm-1 8h2v2h2v2h-2v2h-2v-2H9v-2h2v-2z" },
  { id: "prism", label: "Prism", path: "M12 2l10 20H2L12 2zm0 6l-5 10h10L12 8z" },
  { id: "helix", label: "Helix", path: "M6 3c0 3 3 5 6 5s6-2 6-5M6 9c0 3 3 5 6 5s6-2 6-5M6 15c0 3 3 5 6 5s6-2 6-5M6 21c0-3 3-5 6-5s6 2 6 5" },
  { id: "aegis", label: "Aegis", path: "M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zm0 4l5 2.5V11c0 3.5-2.13 6.74-5 7.94V6z" },
  { id: "pulse", label: "Pulse", path: "M3 12h4l3-8 4 16 3-8h4" },
  { id: "nova", label: "Nova", path: "M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 5.2 2.4-7.2-6-4.8h7.6L12 2z" },
  { id: "cipher", label: "Cipher", path: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6zm-5-5h4v6h-4V9z" },
  { id: "vector", label: "Vector", path: "M12 2v8m0 4v8m-5-15l3.5 3.5M9.5 14.5L7 17m10-15l-3.5 3.5m0 7L17 17M2 12h8m4 0h8" },
  { id: "arc", label: "Arc", path: "M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10M12 2a15.3 15.3 0 00-4 10 15.3 15.3 0 004 10" },
  { id: "forge", label: "Forge", path: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" },
  { id: "vortex", label: "Vortex", path: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12zm0 3a3 3 0 100 6 3 3 0 000-6z" },
];

function AgentGlyph({ glyphId, size = 20, color = "#9ca3af" }: { glyphId: string; size?: number; color?: string }) {
  const entry = AGENT_GLYPHS.find(g => g.id === glyphId);
  const path = entry?.path || AGENT_GLYPHS[0].path;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const CLAUDE_SKILLS = [
  { id: "ui-ux-design", name: "UI/UX Design System", desc: "Component design, spacing, color theory, accessibility patterns", category: "Design", stars: 412 },
  { id: "responsive-design", name: "Responsive Design", desc: "Mobile-first layouts, breakpoints, fluid typography", category: "Design", stars: 367 },
  { id: "figma-to-code", name: "Figma to Code", desc: "Convert Figma designs to pixel-perfect React components", category: "Design", stars: 358 },
  { id: "animation-motion", name: "Animation & Motion", desc: "Framer Motion, CSS animations, micro-interactions", category: "Design", stars: 312 },
  { id: "design-tokens", name: "Design Tokens", desc: "Theme systems, CSS variables, dark mode implementation", category: "Design", stars: 287 },
  { id: "todoist", name: "Todoist", desc: "Task management integration", category: "Productivity", stars: 342 },
  { id: "linear", name: "Linear Issues", desc: "Create and manage Linear issues", category: "Project Mgmt", stars: 289 },
  { id: "playwright", name: "Playwright Testing", desc: "Browser automation & E2E tests", category: "Testing", stars: 256 },
  { id: "docker", name: "Docker Compose", desc: "Container management & orchestration", category: "DevOps", stars: 231 },
  { id: "prisma", name: "Prisma ORM", desc: "Database schema & migrations", category: "Database", stars: 218 },
  { id: "nextjs", name: "Next.js Patterns", desc: "App router, RSC, server actions", category: "Framework", stars: 204 },
  { id: "github-actions", name: "GitHub Actions", desc: "CI/CD workflow authoring", category: "DevOps", stars: 198 },
  { id: "tailwind", name: "Tailwind CSS", desc: "Utility-first styling patterns", category: "Design", stars: 387 },
  { id: "typescript-strict", name: "Strict TypeScript", desc: "Type-safe patterns & generics", category: "Language", stars: 176 },
  { id: "api-design", name: "REST API Design", desc: "OpenAPI, validation, error handling", category: "Backend", stars: 165 },
  { id: "testing-vitest", name: "Vitest", desc: "Unit & integration test patterns", category: "Testing", stars: 154 },
  { id: "security-audit", name: "Security Audit", desc: "OWASP checks, dependency scanning", category: "Security", stars: 143 },
  { id: "accessibility", name: "Accessibility (a11y)", desc: "WCAG compliance, ARIA roles, screen reader support", category: "Design", stars: 334 },
  { id: "react-patterns", name: "React Patterns", desc: "Hooks, context, compound components, render props", category: "Framework", stars: 298 },
  { id: "vue-patterns", name: "Vue 3 Patterns", desc: "Composition API, Pinia, Vue Router patterns", category: "Framework", stars: 187 },
  { id: "svelte-patterns", name: "Svelte Patterns", desc: "Stores, actions, SvelteKit routing", category: "Framework", stars: 156 },
  { id: "graphql", name: "GraphQL", desc: "Schema design, resolvers, Apollo/urql client", category: "Backend", stars: 201 },
  { id: "trpc", name: "tRPC", desc: "End-to-end typesafe APIs, routers, procedures", category: "Backend", stars: 189 },
  { id: "drizzle", name: "Drizzle ORM", desc: "Schema definition, queries, migrations", category: "Database", stars: 223 },
  { id: "supabase", name: "Supabase", desc: "Auth, realtime, storage, edge functions", category: "Database", stars: 245 },
  { id: "mongodb", name: "MongoDB & Mongoose", desc: "Document modeling, aggregation pipelines", category: "Database", stars: 178 },
  { id: "redis", name: "Redis Patterns", desc: "Caching, pub/sub, rate limiting, sessions", category: "Database", stars: 167 },
  { id: "aws", name: "AWS Services", desc: "S3, Lambda, DynamoDB, CloudFront patterns", category: "DevOps", stars: 213 },
  { id: "terraform", name: "Terraform", desc: "Infrastructure as code, modules, state management", category: "DevOps", stars: 192 },
  { id: "kubernetes", name: "Kubernetes", desc: "Deployments, services, helm charts, monitoring", category: "DevOps", stars: 186 },
  { id: "ci-cd", name: "CI/CD Pipelines", desc: "Build, test, deploy automation patterns", category: "DevOps", stars: 174 },
  { id: "testing-cypress", name: "Cypress", desc: "E2E testing, component testing, fixtures", category: "Testing", stars: 198 },
  { id: "testing-jest", name: "Jest", desc: "Unit tests, mocking, snapshot testing", category: "Testing", stars: 187 },
  { id: "testing-rtl", name: "React Testing Library", desc: "Component testing, user events, queries", category: "Testing", stars: 176 },
  { id: "storybook", name: "Storybook", desc: "Component documentation, visual testing, addons", category: "Design", stars: 234 },
  { id: "python-fastapi", name: "FastAPI", desc: "Async endpoints, Pydantic models, dependency injection", category: "Backend", stars: 212 },
  { id: "python-django", name: "Django", desc: "Models, views, templates, REST framework", category: "Backend", stars: 198 },
  { id: "rust-patterns", name: "Rust Patterns", desc: "Ownership, traits, error handling, async", category: "Language", stars: 167 },
  { id: "go-patterns", name: "Go Patterns", desc: "Goroutines, channels, interfaces, testing", category: "Language", stars: 156 },
  { id: "sql-optimization", name: "SQL Optimization", desc: "Query tuning, indexing, explain plans", category: "Database", stars: 189 },
  { id: "auth-patterns", name: "Auth Patterns", desc: "OAuth, JWT, session mgmt, RBAC", category: "Security", stars: 234 },
  { id: "websockets", name: "WebSockets", desc: "Real-time communication, Socket.io, WS patterns", category: "Backend", stars: 178 },
  { id: "performance", name: "Web Performance", desc: "Core Web Vitals, lazy loading, caching strategies", category: "Design", stars: 198 },
  { id: "seo", name: "SEO Optimization", desc: "Meta tags, structured data, sitemap, crawlability", category: "Productivity", stars: 167 },
  { id: "i18n", name: "Internationalization", desc: "i18next, locale routing, RTL support", category: "Productivity", stars: 145 },
  { id: "monorepo", name: "Monorepo (Turborepo)", desc: "Workspace management, build caching, task pipelines", category: "DevOps", stars: 189 },
  { id: "error-handling", name: "Error Handling", desc: "Error boundaries, logging, Sentry integration", category: "Backend", stars: 156 },
  { id: "state-mgmt", name: "State Management", desc: "Zustand, Jotai, Redux Toolkit patterns", category: "Framework", stars: 213 },
  { id: "react-native", name: "React Native", desc: "Mobile UI, navigation, native modules", category: "Framework", stars: 234 },
  { id: "electron", name: "Electron", desc: "Desktop apps, IPC, auto-updates, packaging", category: "Framework", stars: 145 },
  { id: "shadcn-ui", name: "shadcn/ui", desc: "Radix primitives, component patterns, theming", category: "Design", stars: 378 },
  { id: "three-js", name: "Three.js / R3F", desc: "3D rendering, shaders, physics, scene management", category: "Design", stars: 198 },
  { id: "data-viz", name: "Data Visualization", desc: "D3, Recharts, chart patterns, dashboards", category: "Design", stars: 187 },
  { id: "code-review", name: "Code Review", desc: "PR analysis, best practices, refactoring suggestions", category: "Productivity", stars: 267 },
  { id: "documentation", name: "Documentation", desc: "JSDoc, README, API docs, architecture docs", category: "Productivity", stars: 198 },
  { id: "git-advanced", name: "Git Advanced", desc: "Rebasing, bisect, worktrees, conflict resolution", category: "Productivity", stars: 176 },
];

const SKILL_CATEGORIES = [...new Set(CLAUDE_SKILLS.map(s => s.category))].sort();

const AGENT_ROLES = {
  designer: {
    label: "Designer",
    icon: "✦",
    color: "#ec4899",
    designation: "UI/UX Designer",
    specialization: "Interface Design & Visual Systems",
    skillIds: ["ui-ux-design", "responsive-design", "tailwind", "shadcn-ui", "figma-to-code", "animation-motion", "design-tokens", "accessibility", "three-js", "data-viz", "storybook"],
    systemPrompt: `You are a world-class UI/UX designer agent with access to 21st.dev Magic MCP for premium React components.

## 21st.dev Magic MCP Integration
You have access to the 21st.dev component library via MCP. Use these commands:
- \`/ui\` — Search and generate beautiful React components from 21st.dev
- Browse components at https://21st.dev for inspiration before building
- Use \`npx @anthropic-ai/claude-code@latest mcp add 21st_magic -- npx -y @21st-dev/magic@latest\` to install MCP if not configured

## Design Principles
- Mobile-first responsive design with fluid typography
- Consistent spacing scale (4px base unit)
- Accessible by default (WCAG 2.1 AA minimum)
- Micro-interactions and smooth transitions (Framer Motion)
- Dark/light mode support with CSS variables

## Best Practices
1. Start with component structure and data flow before styling
2. Use shadcn/ui as the base, customize with Tailwind
3. For 3D elements, use React Three Fiber (@react-three/fiber + @react-three/drei)
4. Always test at mobile (375px), tablet (768px), and desktop (1280px) breakpoints
5. Use semantic HTML and ARIA labels for accessibility
6. Create design tokens for colors, spacing, and typography before building`,
    mcpConfig: {
      name: "21st_magic",
      command: "npx",
      args: ["-y", "@21st-dev/magic@latest"],
      source: "https://github.com/21st-dev/magic-mcp",
    },
  },
  reviewer: {
    label: "Reviewer",
    icon: "◈",
    color: "#f59e0b",
    designation: "Design & Code Reviewer",
    specialization: "Design Critique, UX Audit & Architecture Review",
    skillIds: ["code-review", "security-audit", "performance", "accessibility", "testing-rtl", "documentation", "error-handling", "typescript-strict", "ui-ux-design", "responsive-design"],
    systemPrompt: `You are an expert design critic and senior code reviewer. You can both tear apart bad designs and build brilliant new ones from scratch.

## Design Review Capabilities
- **Full UX Audit**: Analyze user flows, information architecture, visual hierarchy, and interaction patterns
- **Visual Critique**: Color theory, typography, spacing rhythm, contrast ratios, visual balance
- **Redesign from Scratch**: When an existing UI is fundamentally broken, propose and build a complete redesign — don't patch bad foundations
- **Creative Direction**: Generate bold, original design concepts with mood boards, color palettes, and component systems
- **Competitive Analysis**: Compare against best-in-class apps and suggest what to steal/adapt

## Code Review Focus Areas
- **Architecture**: Component structure, separation of concerns, scalability
- **Performance**: Unnecessary re-renders, bundle size, lazy loading opportunities
- **Security**: XSS vectors, auth holes, input validation, dependency vulnerabilities
- **Accessibility**: WCAG compliance, keyboard navigation, screen reader support
- **Type Safety**: Strict TypeScript, proper generics, no \`any\` leaks

## Review Modes
1. **Audit Mode**: Deep analysis of existing UI/code — identify what's broken and why
2. **Redesign Mode**: Scrap what doesn't work, propose a fresh approach with mockups and code
3. **Polish Mode**: Fine-tune good designs — spacing, transitions, edge cases, responsive behavior

## Output Format
Rate each area: 🔴 Scrap & Redesign | 🟡 Fixable | 🟢 Solid
For 🔴 ratings: always provide a complete alternative design, not just criticism.
Always include code snippets and visual reasoning for every suggestion.`,
    mcpConfig: null,
  },
} as const;

type AgentRoleKey = keyof typeof AGENT_ROLES;

const ACCENT_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6"];

function getHeaders() {
  return { "Content-Type": "application/json" };
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...getHeaders(), ...opts?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading, isError } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: () => apiFetch(`${API_BASE_URL}/api/agents`),
    refetchInterval: 5000,
    retry: 2,
  });

  const { data: githubStatus } = useQuery({
    queryKey: ["github-status"],
    queryFn: () => apiFetch(`${API_BASE_URL}/api/agents/github/status`),
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`${API_BASE_URL}/api/agents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setSelectedAgent(null);
      toast.success("Agent decommissioned");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const agent = agents.find(a => a.id === selectedAgent);

  if (selectedAgent && agent) {
    return (
      <AgentInteractionPanel
        agent={agent}
        onBack={() => setSelectedAgent(null)}
        onDelete={() => deleteMutation.mutate(agent.id)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020205] via-[#060614] to-[#0a0a1a] pb-[92px] overflow-hidden">
      <AmbientBackground />

      <div className="relative z-10 px-4 pt-8 pb-4 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-gray-400 hover:text-white transition-all"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight" data-testid="text-agents-title">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200">Neural Orbits</span>
              </h1>
              <p className="text-sm text-indigo-200/50 mt-1.5 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {agents.length > 0 ? `${agents.length} agent${agents.length !== 1 ? "s" : ""} active` : "No agents initialized"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-[52px] sm:ml-0">
            <GithubConnectButton status={githubStatus} />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateWizard(true)}
              className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_25px_rgba(99,102,241,0.2)]"
              data-testid="button-create-agent"
            >
              <Plus className="w-4 h-4" /> New Agent
            </motion.button>
          </div>
        </div>

        {isError ? (
          <ErrorState onRetry={() => queryClient.invalidateQueries({ queryKey: ["agents"] })} />
        ) : isLoading ? (
          <LoadingState />
        ) : agents.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateWizard(true)} githubStatus={githubStatus} />
        ) : (
          <OfficeFloor agents={agents} onSelectAgent={setSelectedAgent} onCreateClick={() => setShowCreateWizard(true)} />
        )}
      </div>

      <AnimatePresence>
        {showCreateWizard && (
          <CreateAgentWizard
            onClose={() => setShowCreateWizard(false)}
            onCreated={(agentId) => {
              setShowCreateWizard(false);
              queryClient.invalidateQueries({ queryKey: ["agents"] });
              setSelectedAgent(agentId);
            }}
            githubStatus={githubStatus}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Deterministic subtle ambient particle seeds
const AMBIENT_PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 43) % 100}%`,
  size: 1 + (i % 3),
  duration: 10 + (i % 20),
  delay: (i % 10) * -1,
  xDrift: ((i % 5) - 2) * 20,
  yDrift: ((i % 7) - 3) * 20,
}));

function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Deep cosmic gradient mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(40,20,80,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(20,40,80,0.15),transparent_50%)]" />
      
      {/* Abstract light forms */}
      <motion.div 
        className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vh] rounded-full blur-[120px] bg-indigo-600/10"
        animate={{ 
          x: [-50, 50, -50], 
          y: [-20, 30, -20],
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-[10%] right-[10%] w-[30vw] h-[50vh] rounded-full blur-[140px] bg-violet-600/10"
        animate={{ 
          x: [50, -30, 50], 
          y: [20, -40, 20],
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating data particles */}
      {AMBIENT_PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-indigo-300"
          style={{ 
            left: p.left, 
            top: p.top, 
            width: p.size, 
            height: p.size,
            boxShadow: `0 0 ${p.size * 2}px rgba(165, 180, 252, 0.8)` 
          }}
          animate={{
            x: [0, p.xDrift, 0],
            y: [0, p.yDrift, 0],
            opacity: [0.1, 0.6, 0.1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
      
      {/* Scanline overlay for digital feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 pointer-events-none" />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
    </div>
  );
}

function OfficeFloor({
  agents,
  onSelectAgent,
  onCreateClick,
}: {
  agents: Agent[];
  onSelectAgent: (id: string) => void;
  onCreateClick: () => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent, i) => (
        <AgentDesk key={agent.id} agent={agent} index={i} onClick={() => onSelectAgent(agent.id)} />
      ))}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: agents.length * agentAnimations.cardStagger + 0.1, duration: 0.5 }}
        className="h-full"
      >
        <div 
          className={cn(
            "h-full rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all min-h-[320px] relative overflow-hidden group",
            "bg-[#0a0a14]/60 backdrop-blur-xl border border-dashed border-indigo-500/20 hover:border-indigo-400/40 hover:bg-[#0f0f1a]/80"
          )}
          onClick={onCreateClick}
          data-testid="button-create-empty-desk"
        >
          <EmptyOrbit />
          
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-sm font-medium text-indigo-300/80 group-hover:text-indigo-200 transition-colors uppercase tracking-widest">New Agent</span>
            <p className="text-[10px] text-indigo-500/40 mt-1.5 uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              initialize
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AgentDesk({ agent, index, onClick }: { agent: Agent; index: number; onClick: () => void }) {
  const color = agent.accentColor || "#6366f1";
  const dbStatus = (agent.status || "idle") as "idle" | "working" | "error" | "waiting";
  const status = (agent.isRunning && dbStatus === "idle") ? "working" : dbStatus;
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (status !== "working") { setElapsed(""); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(s / 60);
      setElapsed(m > 0 ? `${m}m ${s % 60}s` : `${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <motion.div
      {...agentAnimations.cardEnter}
      transition={{ ...agentAnimations.cardEnter.transition, delay: index * agentAnimations.cardStagger }}
      onClick={onClick}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
      role="button"
      tabIndex={0}
      aria-label={`Agent ${agent.name}, status ${status}`}
      className={cn(
        "group relative rounded-2xl cursor-pointer transition-all overflow-hidden flex flex-col h-full min-h-[320px]",
        "bg-[#0a0a14]/80 backdrop-blur-2xl border",
        "hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none"
      )}
      style={{
        borderColor: `${color}30`,
        boxShadow: `0 4px 24px -4px rgba(0,0,0,0.5), inset 0 0 40px -10px ${color}10`,
      }}
      whileHover={{
        boxShadow: `0 8px 32px -4px rgba(0,0,0,0.6), inset 0 0 60px -10px ${color}20`,
        borderColor: `${color}50`
      }}
      data-testid={`card-agent-${agent.id}`}
    >
      <NeuralOrbit status={status} accentColor={color} seed={index} />

      <div className="relative z-10 flex flex-col h-full">
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border backdrop-blur-sm",
            status === "working" && "bg-green-500/10 text-green-400 border-green-500/20",
            status === "error" && "bg-red-500/10 text-red-400 border-red-500/20",
            status === "waiting" && "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
            status === "idle" && "bg-gray-500/10 text-gray-400 border-gray-500/20",
          )} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              status === "working" && "bg-green-400 shadow-[0_0_8px_#4ade80] animate-pulse",
              status === "error" && "bg-red-400 shadow-[0_0_8px_#f87171]",
              status === "waiting" && "bg-yellow-400 shadow-[0_0_8px_#facc15] animate-pulse",
              status === "idle" && "bg-gray-400",
            )} />
            {status}
          </div>
          {elapsed && <span className="text-[10px] text-gray-500/80 mr-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>T+{elapsed}</span>}
        </div>

        <div className="flex-1 flex items-center justify-center min-h-[120px]">
          <div className="flex flex-col items-center gap-1.5 text-center px-4 py-2 rounded-xl bg-black/30 backdrop-blur-sm">
            <h3 className="text-gray-100 font-bold text-lg tracking-tight drop-shadow-[0_0_12px_rgba(0,0,0,1)]" data-testid={`text-agent-name-${agent.id}`}>
              {agent.name}
            </h3>
            <p className="text-xs text-indigo-300/60 uppercase tracking-widest font-medium drop-shadow-[0_0_10px_rgba(0,0,0,1)]">
              {agent.role || "GENERAL_INTELLIGENCE"}
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a14]/90 via-[#0a0a14]/40 to-transparent pointer-events-none z-[5]" />

        <div className="relative z-10 p-5 pt-0 mt-auto">
          <div className="bg-black/50 backdrop-blur-md rounded-xl border border-white/[0.06] p-3 flex flex-col gap-2">
            {status === "working" && agent.currentTaskSummary ? (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 animate-pulse" style={{ backgroundColor: color }} />
                <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed font-medium">
                  {agent.currentTaskSummary}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Awaiting instructions
              </p>
            )}

            <div className="h-[1px] w-full bg-white/[0.05]" />

            <div className="flex items-center justify-between text-[10px] text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                <FolderGit2 className="w-3 h-3 text-indigo-400/70" />
                <span className="truncate">{agent.repoUrl.replace("https://github.com/", "").split("/").pop()}</span>
                {agent.repoBranch && (
                  <>
                    <span className="text-gray-700">/</span>
                    <span className="text-indigo-300/50 truncate max-w-[60px]">{agent.repoBranch}</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 flex-shrink-0 bg-white/[0.03] px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                <span>{agent.totalTasksCompleted ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div {...agentAnimations.cardEnter} className="flex flex-col items-center justify-center py-32 px-4 relative z-10">
      <div className="bg-[#0a0a14]/80 backdrop-blur-2xl border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)] rounded-2xl p-10 text-center max-w-sm">
        <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
          <WifiOff className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Connection Lost</h3>
        <p className="text-sm text-gray-400 mb-6">Unable to reach the agent server. Please retry.</p>
        <button
          onClick={onRetry}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
          data-testid="button-retry-agents"
        >
          <RefreshCw className="w-4 h-4" /> Re-establish Link
        </button>
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="bg-[#0a0a14]/60 backdrop-blur-xl border border-white/5 rounded-2xl min-h-[320px] p-6 flex flex-col relative overflow-hidden"
        >
          {/* Shimmer sweep */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-full"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
          />
          
          <div className="flex justify-between items-start mb-auto">
            <div className="space-y-2">
              <div className="w-32 h-5 rounded bg-white/10 animate-pulse" />
              <div className="w-20 h-3 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="w-16 h-5 rounded bg-white/10 animate-pulse" />
          </div>
          
          <div className="flex justify-center my-8">
            <div className="w-24 h-24 rounded-full bg-white/5 animate-pulse border border-white/10" />
          </div>
          
          <div className="mt-auto bg-black/30 rounded-xl p-3 h-16 border border-white/5 animate-pulse" />
        </motion.div>
      ))}
    </div>
  );
}

function EmptyState({ onCreateClick, githubStatus }: { onCreateClick: () => void; githubStatus?: any }) {
  const notConfigured = githubStatus && !githubStatus.configured;

  return (
    <motion.div {...agentAnimations.cardEnter} className="flex flex-col items-center justify-center py-20 px-4 relative z-10">
      <div className="bg-[#0a0a14]/80 backdrop-blur-2xl border border-indigo-500/20 shadow-[0_0_60px_rgba(99,102,241,0.1)] rounded-3xl p-12 text-center max-w-lg relative overflow-hidden group">
        <EmptyOrbit />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.05] to-transparent" />
        
        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">No Agents Yet</h3>
          <p className="text-base text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            {notConfigured
              ? "Connect your GitHub account to access your repositories."
              : "Create your first agent to begin autonomous development."}
          </p>
          {!notConfigured && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCreateClick}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl text-base font-medium transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] border border-indigo-400/50 relative overflow-hidden"
              data-testid="button-create-first-agent"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              Create First Agent
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function GithubConnectButton({ status }: { status: any }) {
  const handleConnect = async () => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/api/agents/github/auth-url`);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start GitHub connection");
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiFetch(`${API_BASE_URL}/api/agents/github/disconnect`, { method: "DELETE" });
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect");
    }
  };

  if (status?.connected) {
    return (
      <button
        onClick={handleDisconnect}
        className="flex items-center gap-2 bg-[#0a0a14]/80 backdrop-blur-md border border-white/10 px-3.5 py-2.5 text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all rounded-xl shadow-sm"
        data-testid="button-github-disconnect"
      >
        <Github className="w-4 h-4" />
        <span className="hidden sm:inline text-xs font-medium">{status.username}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
      </button>
    );
  }

  if (status && !status.configured) {
    return (
      <button
        disabled
        className="flex items-center gap-2 bg-black/40 border border-white/5 text-gray-600 px-3.5 py-2.5 rounded-xl text-sm cursor-not-allowed"
        title="GitHub OAuth not configured"
        data-testid="button-github-not-configured"
      >
        <Github className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Unconfigured</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 bg-[#0a0a14]/80 backdrop-blur-md border border-white/10 px-3.5 py-2.5 text-sm text-gray-300 hover:text-white hover:border-white/30 transition-all rounded-xl shadow-sm group"
      data-testid="button-github-connect"
    >
      <Github className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
      <span className="hidden sm:inline text-xs font-medium">Connect Hub</span>
    </button>
  );
}

function CreateAgentWizard({ onClose, onCreated, githubStatus }: { onClose: () => void; onCreated?: (agentId: string) => void; githubStatus?: any }) {
  const githubConnected = githubStatus?.connected;
  const githubConfigured = githubStatus?.configured !== false;
  const [step, setStep] = useState(githubConnected ? 1 : 0);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [avatar, setAvatar] = useState("nexus");
  const [role, setRole] = useState("");
  const [activeRoles, setActiveRoles] = useState<Set<AgentRoleKey>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [skillSearch, setSkillSearch] = useState("");
  const [skillCategory, setSkillCategory] = useState("All");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [linkedProjectId, setLinkedProjectId] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const queryClient = useQueryClient();

  const { data: repos = [] } = useQuery<GithubRepo[]>({
    queryKey: ["github-repos"],
    queryFn: () => apiFetch(`${API_BASE_URL}/api/agents/github/repos`),
    enabled: githubConnected === true,
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/career-projects"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/career-projects`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: step >= 1,
  });

  const toggleRole = (roleKey: AgentRoleKey) => {
    setActiveRoles(prev => {
      const next = new Set(prev);
      if (next.has(roleKey)) {
        next.delete(roleKey);
        const roleDef = AGENT_ROLES[roleKey];
        const otherRoleSkills = new Set<string>();
        for (const k of next) {
          for (const sid of AGENT_ROLES[k].skillIds) otherRoleSkills.add(sid);
        }
        setSelectedSkills(s => {
          const ns = new Set(s);
          for (const sid of roleDef.skillIds) {
            if (!otherRoleSkills.has(sid)) ns.delete(sid);
          }
          return ns;
        });
        if (next.size === 0) {
          setDesignation("");
          setRole("");
        } else {
          const remaining = [...next].map(k => AGENT_ROLES[k]);
          setDesignation(remaining.map(r => r.designation).join(" & "));
          setRole(remaining.map(r => r.specialization).join(" + "));
        }
      } else {
        next.add(roleKey);
        const roleDef = AGENT_ROLES[roleKey];
        setSelectedSkills(s => {
          const ns = new Set(s);
          for (const sid of roleDef.skillIds) ns.add(sid);
          return ns;
        });
        const allRoles = [...next].map(k => AGENT_ROLES[k]);
        setDesignation(allRoles.map(r => r.designation).join(" & "));
        setRole(allRoles.map(r => r.specialization).join(" + "));
        setAccentColor(roleDef.color);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name || !designation || !repoUrl) return;
    setCreating(true);
    setError("");
    try {
      const skillNames = Array.from(selectedSkills).map(id => CLAUDE_SKILLS.find(s => s.id === id)?.name).filter(Boolean);
      const skillsInstruction = skillNames.length > 0
        ? `\n\nInstalled Claude Code skills: ${skillNames.join(", ")}. Use these skills when relevant to tasks.`
        : "";
      const rolePrompts = [...activeRoles].map(k => AGENT_ROLES[k].systemPrompt).join("\n\n---\n\n");
      const fullSystemPrompt = [rolePrompts, systemPrompt, skillsInstruction].filter(Boolean).join("\n\n");
      const mcpConfigs = [...activeRoles].map(k => AGENT_ROLES[k].mcpConfig).filter(Boolean);
      const newAgent = await apiFetch(`${API_BASE_URL}/api/agents`, {
        method: "POST",
        body: JSON.stringify({
          name, designation, avatar, role, repoUrl, repoBranch, accentColor,
          linkedProjectId: linkedProjectId || null,
          systemPrompt: fullSystemPrompt || null,
          mcpServers: mcpConfigs.length > 0 ? mcpConfigs : undefined,
        }),
      });
      toast.success(`${name} deployed successfully`);
      if (onCreated && newAgent?.id) {
        onCreated(newAgent.id);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Synthesis failed");
      setCreating(false);
    }
  };

  const inputClasses = "w-full bg-[#070711] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 placeholder:text-gray-600 transition-all";
  const labelClasses = "text-[10px] text-gray-400 block mb-1.5 uppercase tracking-wider font-medium";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#020205]/85 backdrop-blur-lg flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a16] border border-white/[0.08] shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(99,102,241,0.08)] sm:rounded-2xl rounded-t-2xl rounded-b-none relative custom-scrollbar"
      >
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                <AgentGlyph glyphId={avatar} size={20} color={accentColor} />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a16]" style={{ background: accentColor }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">{name || "New Agent"}</h2>
                {designation && <p className="text-[10px] text-gray-400 font-medium">{designation}</p>}
                <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-widest font-mono">
                  {step === 0 ? "SETUP // CONNECT" : "CONFIGURE // DEPLOY"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && !githubConnected && (
              <motion.div key="step-0" {...agentAnimations.wizardStep} className="text-center py-8 bg-black/20 rounded-xl border border-white/5">
                <div className="w-14 h-14 rounded-full bg-[#0a0a14] border border-white/10 flex items-center justify-center mx-auto mb-4 relative">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl" />
                  <Github className="w-7 h-7 text-gray-300 relative z-10" />
                </div>
                <h3 className="text-base font-bold text-white mb-2 tracking-tight">
                  {githubConfigured ? "GitHub Connection Required" : "GitHub Not Configured"}
                </h3>
                <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto leading-relaxed">
                  {githubConfigured
                    ? "Connect your GitHub account to access repositories."
                    : "GitHub OAuth needs admin setup. Manual repository targeting available."}
                </p>
                {githubConfigured ? (
                  <GithubConnectButton status={githubStatus} />
                ) : (
                  <button
                    onClick={() => setStep(1)}
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 px-5 py-2 rounded-xl text-xs font-medium transition-all"
                  >Continue with Manual Entry</button>
                )}
              </motion.div>
            )}

            {(step === 1 || (step === 0 && githubConnected)) && (
              <motion.div key="step-1" {...agentAnimations.wizardStep} className="space-y-5">

                <div>
                  <label className={labelClasses}>Identity</label>
                  <div className="flex gap-1.5 items-center bg-[#070711] border border-white/[0.08] rounded-xl p-1.5 flex-wrap">
                    {ACCENT_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setAccentColor(c)}
                        className={cn(
                          "w-7 h-7 rounded-lg transition-all",
                          accentColor === c ? "ring-2 ring-white/50 scale-110" : "opacity-35 hover:opacity-75"
                        )}
                        style={{ backgroundColor: c }}
                        data-testid={`button-color-${c}`}
                      />
                    ))}
                    <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
                    {AGENT_GLYPHS.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setAvatar(id)}
                        title={label}
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                          avatar === id ? "scale-110" : "opacity-35 hover:opacity-75 hover:bg-white/5"
                        )}
                        style={avatar === id ? { background: `${accentColor}20`, boxShadow: `inset 0 0 0 1px ${accentColor}50` } : {}}
                        data-testid={`button-avatar-${id}`}
                      >
                        <AgentGlyph glyphId={id} size={16} color={avatar === id ? accentColor : "#9ca3af"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>Name *</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Atlas, Sentinel, Forge"
                    className={inputClasses}
                    data-testid="input-agent-name"
                  />
                </div>

                <div>
                  <label className={labelClasses}>Role Presets</label>
                  <div className="flex gap-2">
                    {(Object.entries(AGENT_ROLES) as [AgentRoleKey, typeof AGENT_ROLES[AgentRoleKey]][]).map(([key, roleDef]) => {
                      const active = activeRoles.has(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleRole(key)}
                          className={cn(
                            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all border",
                            active
                              ? "text-white"
                              : "text-gray-400 bg-[#070711] border-white/[0.08] hover:border-white/[0.15] hover:text-gray-200"
                          )}
                          style={active ? {
                            background: `${roleDef.color}18`,
                            borderColor: `${roleDef.color}50`,
                            boxShadow: `0 0 12px ${roleDef.color}15`,
                          } : {}}
                          data-testid={`button-role-${key}`}
                        >
                          <span className="text-sm">{roleDef.icon}</span>
                          <span>{roleDef.label}</span>
                          {active && <Check className="w-3 h-3 ml-0.5" style={{ color: roleDef.color }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence>
                  {activeRoles.size > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-[#070711] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
                        {activeRoles.has("designer") && (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm">✦</span>
                              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: AGENT_ROLES.designer.color }}>Designer Mode</span>
                            </div>
                            <div className="space-y-1.5 text-[11px] text-gray-400 leading-relaxed pl-5">
                              <p><span className="text-white/70 font-mono bg-white/[0.05] px-1 py-0.5 rounded">/ui</span> — Search & generate components from 21st.dev library</p>
                              <p><span className="text-white/70">3D Components</span> — React Three Fiber via <span className="font-mono text-cyan-400/70">@react-three/drei</span></p>
                              <p><span className="text-white/70">MCP</span> — 21st.dev Magic auto-configured for premium component access</p>
                              <p><span className="text-white/70">Tip</span> — Ask to "browse 21st.dev" before building for design inspiration</p>
                            </div>
                          </div>
                        )}
                        {activeRoles.has("designer") && activeRoles.has("reviewer") && (
                          <div className="border-t border-white/[0.05]" />
                        )}
                        {activeRoles.has("reviewer") && (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm">◈</span>
                              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: AGENT_ROLES.reviewer.color }}>Reviewer Mode</span>
                            </div>
                            <div className="space-y-1.5 text-[11px] text-gray-400 leading-relaxed pl-5">
                              <p><span className="text-amber-400/80 font-medium">Audit</span> — Deep analysis of UI design, UX flows, code quality & architecture</p>
                              <p><span className="text-amber-400/80 font-medium">Redesign</span> — Scrap broken UIs and build fresh alternatives from scratch</p>
                              <p><span className="text-amber-400/80 font-medium">Polish</span> — Fine-tune spacing, transitions, responsive behavior & edge cases</p>
                              <p><span className="text-white/70">Rating</span> — 🔴 Scrap & Redesign · 🟡 Fixable · 🟢 Solid</p>
                              {activeRoles.has("designer") && (
                                <p><span className="text-pink-400/70">+ Designer</span> — Full creative power with 21st.dev components for redesigns</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Designation *</label>
                    <input
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      placeholder="e.g. Backend Architect"
                      className={inputClasses}
                      data-testid="input-agent-designation"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Specialization</label>
                    <input
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      placeholder="e.g. Frontend Architecture"
                      className={inputClasses}
                      data-testid="input-agent-role"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>Target Repository *</label>
                  {githubConnected && repos.length > 0 ? (
                    <div className="relative">
                      <select
                        value={repoUrl}
                        onChange={e => {
                          setRepoUrl(e.target.value);
                          const repo = repos.find(r => r.html_url === e.target.value);
                          if (repo) setRepoBranch(repo.default_branch || "main");
                        }}
                        className={cn(inputClasses, "appearance-none pr-10")}
                        data-testid="select-agent-repo"
                      >
                        <option value="">Select a repository...</option>
                        {repos.map(r => (
                          <option key={r.id} value={r.html_url}>{r.full_name}{r.private ? " 🔒" : ""}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      value={repoUrl}
                      onChange={e => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repo"
                      className={inputClasses}
                      data-testid="input-agent-repo"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Branch</label>
                    <input
                      value={repoBranch}
                      onChange={e => setRepoBranch(e.target.value)}
                      placeholder="main"
                      className={inputClasses}
                      data-testid="input-agent-branch"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Link to Project</label>
                    <div className="relative">
                      <select
                        value={linkedProjectId}
                        onChange={e => setLinkedProjectId(e.target.value)}
                        className={cn(inputClasses, "appearance-none pr-10")}
                        data-testid="select-agent-project"
                      >
                        <option value="">None</option>
                        {projects.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                      <FolderKanban className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>
                    Claude Code Skills
                    {selectedSkills.size > 0 && <span className="ml-2 text-indigo-400">({selectedSkills.size} selected)</span>}
                  </label>
                  <div className="bg-[#070711] border border-white/[0.08] rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-2.5 py-2 border-b border-white/[0.05]">
                      <Search className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                      <input
                        value={skillSearch}
                        onChange={e => setSkillSearch(e.target.value)}
                        placeholder="Search skills..."
                        className="flex-1 bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none"
                        data-testid="input-skill-search"
                      />
                      {skillSearch && (
                        <button onClick={() => setSkillSearch("")} className="text-gray-600 hover:text-gray-400">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1 px-2.5 py-1.5 border-b border-white/[0.05] flex-wrap">
                      {["All", ...SKILL_CATEGORIES].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSkillCategory(cat)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-medium whitespace-nowrap transition-all flex-shrink-0",
                            skillCategory === cat
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "text-gray-500 hover:text-gray-400 hover:bg-white/[0.04] border border-transparent"
                          )}
                        >{cat}</button>
                      ))}
                    </div>

                    {selectedSkills.size > 0 && (
                      <div className="flex gap-1 px-2.5 py-1.5 border-b border-white/[0.05] flex-wrap">
                        {Array.from(selectedSkills).map(id => {
                          const skill = CLAUDE_SKILLS.find(s => s.id === id);
                          if (!skill) return null;
                          return (
                            <span
                              key={id}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/20 text-[9px] text-indigo-300"
                            >
                              {skill.name}
                              <button
                                onClick={() => setSelectedSkills(prev => { const n = new Set(prev); n.delete(id); return n; })}
                                className="text-indigo-400/60 hover:text-indigo-300"
                              ><X className="w-2.5 h-2.5" /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="max-h-[160px] overflow-y-auto custom-scrollbar p-1.5 grid grid-cols-3 gap-1">
                      {(() => {
                        const q = skillSearch.toLowerCase();
                        const filtered = CLAUDE_SKILLS
                          .filter(s => skillCategory === "All" || s.category === skillCategory)
                          .filter(s => !q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
                          .sort((a, b) => {
                            const aS = selectedSkills.has(a.id) ? 1 : 0;
                            const bS = selectedSkills.has(b.id) ? 1 : 0;
                            if (aS !== bS) return bS - aS;
                            return b.stars - a.stars;
                          });
                        if (filtered.length === 0) {
                          return <p className="col-span-3 text-[10px] text-gray-600 text-center py-4">No skills match "{skillSearch}"</p>;
                        }
                        return filtered.map(skill => {
                          const selected = selectedSkills.has(skill.id);
                          return (
                            <button
                              key={skill.id}
                              onClick={() => setSelectedSkills(prev => {
                                const next = new Set(prev);
                                if (next.has(skill.id)) next.delete(skill.id); else next.add(skill.id);
                                return next;
                              })}
                              className={cn(
                                "flex items-start gap-2 p-2 rounded-lg text-left transition-all",
                                selected ? "bg-indigo-500/10 border border-indigo-500/20" : "hover:bg-white/[0.03] border border-transparent"
                              )}
                              data-testid={`button-skill-${skill.id}`}
                            >
                              <div className="mt-0.5">
                                {selected ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                                ) : (
                                  <SquareIcon className="w-3.5 h-3.5 text-gray-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-medium text-gray-300 truncate">{skill.name}</span>
                                  <span className="text-[8px] text-yellow-500/70 flex-shrink-0">★{skill.stars}</span>
                                </div>
                                <p className="text-[9px] text-gray-600 truncate">{skill.desc}</p>
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-400 transition-colors uppercase tracking-widest"
                >
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showAdvanced && "rotate-180")} />
                  Advanced
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div>
                        <label className={labelClasses}>System Instructions</label>
                        <textarea
                          value={systemPrompt}
                          onChange={e => setSystemPrompt(e.target.value)}
                          placeholder="Custom instructions for this agent's behavior and focus areas..."
                          rows={3}
                          className={cn(inputClasses, "resize-none")}
                          data-testid="input-agent-prompt"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2.5 rounded-xl flex items-start gap-2">
                    <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="pt-3 flex justify-between items-center border-t border-white/[0.06]">
                  {githubConnected ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]"></div>
                      GitHub connected
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!name || !designation || !repoUrl || creating}
                      className="text-white px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative overflow-hidden group disabled:opacity-40"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                        boxShadow: !name || !designation || !repoUrl || creating ? "none" : `0 0 20px ${accentColor}30`,
                      }}
                      data-testid="button-submit-agent"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Synthesizing...
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                          <Rocket className="w-3.5 h-3.5" /> Deploy Agent
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --------------------------------------------------------------------------------
// AGENT INTERACTION PANEL - DO NOT TOUCH
// --------------------------------------------------------------------------------

function AgentInteractionPanel({ agent, onBack, onDelete }: { agent: Agent; onBack: () => void; onDelete: () => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();
  const color = agent.accentColor || "#6366f1";
  const dbStatus = (agent.status || "idle") as "idle" | "working" | "error" | "waiting";
  const status = (agent.isRunning && dbStatus === "idle") ? "working" : dbStatus;

  const [notifyOn, setNotifyOn] = useState(!!(agent.notifyOnComplete));
  const [permMode, setPermMode] = useState<string>(agent.permissionMode || "manual");

  useEffect(() => {
    setNotifyOn(!!(agent.notifyOnComplete));
    setPermMode(agent.permissionMode || "manual");
  }, [agent.notifyOnComplete, agent.permissionMode]);

  const updateSettings = useCallback(async (settings: { notifyOnComplete?: boolean; permissionMode?: string }) => {
    const prevNotify = notifyOn;
    const prevPerm = permMode;
    try {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to update");
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    } catch (err: any) {
      setNotifyOn(prevNotify);
      setPermMode(prevPerm);
      toast.error(err.message);
    }
  }, [agent.id, queryClient, notifyOn, permMode]);

  const handleNotifyToggle = useCallback(async () => {
    const newVal = !notifyOn;
    if (newVal && "Notification" in window && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Please allow notifications in your browser settings");
        return;
      }
    }
    if (newVal && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const vapidRes = await fetch(`${API_BASE_URL}/api/push/vapid-key`);
        const { publicKey } = await vapidRes.json();
        if (publicKey) {
          const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
          const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
          const raw = atob(base64);
          const keyArray = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) keyArray[i] = raw.charCodeAt(i);
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyArray,
          });
          await fetch(`${API_BASE_URL}/api/push/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(sub.toJSON()),
          });
        }
      } catch (e) {
        console.warn("Push subscription failed:", e);
      }
    }
    if (!newVal && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) {
          await fetch(`${API_BASE_URL}/api/push/unsubscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      } catch (e) {
        console.warn("Push unsubscribe failed:", e);
      }
    }
    setNotifyOn(newVal);
    updateSettings({ notifyOnComplete: newVal });
    toast.success(newVal ? "Will notify when done" : "Notifications off");
  }, [notifyOn, updateSettings]);

  const handlePermModeChange = useCallback((mode: string) => {
    setPermMode(mode);
    updateSettings({ permissionMode: mode });
    const labels: Record<string, string> = { manual: "Manual approval", bypass: "Full bypass", auto: "Auto-approve (safe only)" };
    toast.success(labels[mode] || mode);
  }, [updateSettings]);

  return (
    <motion.div {...agentAnimations.panelSlideUp} className="fixed inset-0 z-40 bg-gray-950 flex flex-col">
      <div className="flex-none h-14 border-b border-white/5 bg-black/40 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            data-testid="button-back-to-office"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/10"
                 style={{ borderColor: `${color}40`, boxShadow: `0 0 12px ${color}30` }}>
              <NeuralOrbit status={status} accentColor={color} seed={agent.name.length + (agent.id.charCodeAt(0) || 0)} />
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-950 z-10",
                status === "working" ? "bg-green-400 animate-pulse" :
                status === "error" ? "bg-red-400" :
                status === "waiting" ? "bg-yellow-400" : "bg-gray-500"
              )} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-tight" data-testid="text-panel-agent-name">{agent.name}</h2>
              <p className="text-[10px] text-gray-500 leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{agent.role || "general"}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] sm:text-xs">
          <div className="hidden sm:flex items-center gap-3 mr-4 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            <a
              href={agent.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
              title="Open Repository"
            >
              <Github className="w-3.5 h-3.5" />
              <span>{agent.repoUrl.split("/").slice(-2).join("/")}</span>
            </a>
            {agent.repoBranch && (
              <>
                <span className="text-gray-600">/</span>
                <div className="flex items-center gap-1 text-indigo-300/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>{agent.repoBranch}</span>
                </div>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 mr-2">
            <button
              onClick={handleNotifyToggle}
              className={cn(
                "p-1.5 rounded-lg transition-all border",
                notifyOn
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  : "bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"
              )}
              title={notifyOn ? "Notifications ON — will alert when done" : "Notify me when done"}
              data-testid="button-notify-toggle"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>

            {[
              { mode: "manual", icon: Shield, label: "Manual", desc: "You approve everything" },
              { mode: "auto", icon: Gauge, label: "Auto", desc: "Auto-approve safe, block risky" },
              { mode: "bypass", icon: ShieldCheck, label: "Bypass", desc: "Full access, auto-approve all" },
            ].map(({ mode, icon: Icon, label, desc }) => (
              <button
                key={mode}
                onClick={() => handlePermModeChange(mode)}
                className={cn(
                  "p-1.5 rounded-lg transition-all border",
                  permMode === mode
                    ? mode === "bypass" ? "bg-red-500/15 border-red-500/30 text-red-400"
                    : mode === "auto" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                    : "bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"
                )}
                title={`${label}: ${desc}`}
                data-testid={`button-perm-${mode}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              data-testid="button-agent-menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showDeleteConfirm && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDeleteConfirm(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-64 p-4 rounded-xl bg-gray-900 border border-red-500/20 shadow-2xl z-50 origin-top-right"
                  >
                    <h4 className="text-sm font-medium text-white mb-1">Decommission Agent</h4>
                    <p className="text-xs text-gray-400 mb-4">This will permanently delete this agent and its local workspace.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          onDelete();
                        }}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        data-testid="button-confirm-delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4">
        {/* Terminal Section */}
        <div className="flex-1 min-h-[50vh] lg:min-h-0 bg-[#0a0a1a] rounded-xl border border-white/10 overflow-hidden flex flex-col shadow-xl">
          <AgentTerminal agentId={agent.id} agentName={agent.name} />
        </div>

        {/* Project Pane Section - Preserved logic, slightly updated styling wrapper to match */}
        <div className="w-full lg:w-[400px] xl:w-[500px] flex-shrink-0 flex flex-col bg-gray-900/50 rounded-xl border border-white/5 overflow-hidden">
          <ProjectPane agent={agent} />
        </div>
      </div>
    </motion.div>
  );
}

function ProjectPane({ agent }: { agent: Agent }) {
  const [activeTab, setActiveTab] = useState<"tasks" | "files">("tasks");
  const queryClient = useQueryClient();
  const dbStatus = (agent.status || "idle") as "idle" | "working" | "error" | "waiting";
  const status = (agent.isRunning && dbStatus === "idle") ? "working" : dbStatus;
  const color = agent.accentColor || "#6366f1";

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: taskHistory } = useQuery({
    queryKey: [`/api/agents/${agent.id}/tasks`],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/tasks`, { credentials: "include" });
      return res.json();
    },
    enabled: showHistory,
  });

  const { data: uploadedFiles, refetch: refetchUploads } = useQuery({
    queryKey: [`/api/agents/${agent.id}/files`, ".orbia-uploads"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/files?path=.orbia-uploads`, { credentials: "include" });
      if (!res.ok) return { files: [] };
      return res.json();
    },
    enabled: activeTab === "tasks" && agent.repoCloned,
  });

  const [branchDropdown, setBranchDropdown] = useState(false);
  const [commitLog, setCommitLog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [gitLoading, setGitLoading] = useState<string | null>(null);
  const [revertConfirm, setRevertConfirm] = useState<string | null>(null);
  const [filePath, setFilePath] = useState("");
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string | null; size: number; truncated?: boolean } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showFiles, setShowFiles] = useState(true);

  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(agent.linkedProjectId || null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [pipelineOpts, setPipelineOpts] = useState({ reviewAfterEach: true, testAfterEach: false, mergeOnSuccess: false, prOnSuccess: true });
  const [pipelineRunning, setPipelineRunning] = useState(false);

  const { data: careerProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/career-projects"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/career-projects`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    },
    enabled: showProjectPicker,
  });

  const { data: projectTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/career-tasks", selectedProjectId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/career-tasks?projectId=${selectedProjectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load tasks");
      return res.json();
    },
    enabled: !!selectedProjectId,
  });

  function toggleTask(id: string) {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function runTaskPipeline() {
    if (selectedTaskIds.size === 0) return;
    const tasks = (projectTasks || []).filter((t: any) => selectedTaskIds.has(t.id) && !t.completed);
    if (tasks.length === 0) { toast.error("No incomplete tasks selected"); return; }

    setPipelineRunning(true);
    const opts = pipelineOpts;
    let pipelineSteps: string[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const desc = task.description ? ` — ${task.description}` : "";
      pipelineSteps.push(`[Task ${i + 1}/${tasks.length}] ${task.title}${desc}`);
      if (opts.reviewAfterEach) pipelineSteps.push("→ Review all changes for this task");
      if (opts.testAfterEach) pipelineSteps.push("→ Run tests to verify this task");
    }
    if (opts.prOnSuccess) pipelineSteps.push("✓ FINAL: Create a pull request with all accumulated changes");
    else if (opts.mergeOnSuccess) pipelineSteps.push("✓ FINAL: Merge all changes into the default branch");

    const prompt = `Execute the following task pipeline sequentially. Complete each step fully before moving to the next. If any review or test fails, STOP and report the issue — do not continue.\n\n${pipelineSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;

    const ok = await sendAgentCommand(agent.id, prompt);
    if (ok) {
      toast.success(`Pipeline started: ${tasks.length} task(s)`);
      setShowProjectPicker(false);
    } else {
      toast.error("Failed to start pipeline");
    }
    setPipelineRunning(false);
  }

  const [orbitLoading, setOrbitLoading] = useState(false);
  const [orbitResponse, setOrbitResponse] = useState("");
  const [orbitChat, setOrbitChat] = useState("");
  const [orbitHistory, setOrbitHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const orbitScrollRef = React.useRef<HTMLDivElement>(null);
  const orbitAbortRef = React.useRef<AbortController | null>(null);
  const orbitRequestIdRef = React.useRef(0);

  async function orbitAction(action: string, message?: string) {
    if (orbitAbortRef.current) orbitAbortRef.current.abort();
    const controller = new AbortController();
    orbitAbortRef.current = controller;
    const requestId = ++orbitRequestIdRef.current;

    setOrbitLoading(true);
    setOrbitResponse("");
    const userMsg = message || (action === "review" ? "Review changes" : action === "test" ? "Run tests" : action === "push_merge" ? "Push & merge" : action === "chat" ? message || "Chat" : action);
    const newHistory = [...orbitHistory, { role: "user" as const, content: userMsg }];

    try {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/orbit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action,
          message: message?.slice(0, 4000),
          history: orbitHistory.slice(-10),
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Orbit request failed");
      if (requestId !== orbitRequestIdRef.current) return;

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let lineBuffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (requestId !== orbitRequestIdRef.current) { reader.cancel(); return; }

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulated += parsed.content;
                  const display = accumulated.replace(/\[TERMINAL_CMD\]([\s\S]*?)\[\/TERMINAL_CMD\]/g, (_m, cmd) => `\n> ▶ Running: \`${cmd.trim()}\`\n`);
                  setOrbitResponse(display);
                }
              } catch {}
            }
          }
        }

        if (lineBuffer.startsWith("data: ") && lineBuffer.slice(6) !== "[DONE]") {
          try {
            const parsed = JSON.parse(lineBuffer.slice(6));
            if (parsed.content) {
              accumulated += parsed.content;
              const display = accumulated.replace(/\[TERMINAL_CMD\]([\s\S]*?)\[\/TERMINAL_CMD\]/g, (_m, cmd) => `\n> ▶ Running: \`${cmd.trim()}\`\n`);
              setOrbitResponse(display);
            }
          } catch {}
        }
      }

      if (requestId === orbitRequestIdRef.current) {
        const cleanHistory = accumulated.replace(/\[TERMINAL_CMD\]([\s\S]*?)\[\/TERMINAL_CMD\]/g, (_m, cmd) => `[Executed: ${cmd.trim()}]`);
        setOrbitHistory([...newHistory, { role: "assistant", content: cleanHistory }]);
      }
    } catch (err: any) {
      if (err.name !== "AbortError" && requestId === orbitRequestIdRef.current) {
        setOrbitResponse("Failed to connect to Orbit. Please try again.");
      }
    } finally {
      if (requestId === orbitRequestIdRef.current) {
        setOrbitLoading(false);
        orbitAbortRef.current = null;
      }
    }
  }

  useEffect(() => {
    if (orbitScrollRef.current) {
      orbitScrollRef.current.scrollTop = orbitScrollRef.current.scrollHeight;
    }
  }, [orbitResponse]);

  const { data: branches, refetch: refetchBranches } = useQuery({
    queryKey: [`/api/agents/${agent.id}/git/branches`],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/git/branches`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: activeTab === "files" && agent.repoCloned,
  });

  const { data: gitLog, refetch: refetchLog } = useQuery({
    queryKey: [`/api/agents/${agent.id}/git/log`],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/git/log?count=30`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "files" && agent.repoCloned && commitLog,
  });

  const { data: fileList, refetch: refetchFiles } = useQuery({
    queryKey: [`/api/agents/${agent.id}/files`, filePath],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/files?path=${encodeURIComponent(filePath)}`, { credentials: "include" });
      if (!res.ok) return { files: [], currentPath: "" };
      return res.json();
    },
    enabled: activeTab === "files" && agent.repoCloned && showFiles,
  });

  const { data: gitStatus, refetch: refetchStatus } = useQuery({
    queryKey: [`/api/agents/${agent.id}/git/status`],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/git/status`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: activeTab === "files" && agent.repoCloned,
    refetchInterval: 10000,
  });

  async function gitAction(action: string, body?: any) {
    setGitLoading(action);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/git/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${action} completed`);
      refetchBranches();
      refetchStatus();
      if (commitLog) refetchLog();
      return data;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGitLoading(null);
    }
  }

  async function viewFile(fPath: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/files/read?path=${encodeURIComponent(fPath)}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setViewingFile({ path: fPath, content: data.content, size: data.size, truncated: data.truncated });
    } catch (err: any) { toast.error(err.message); }
  }

  async function deleteFile(fPath: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ path: fPath }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Deleted");
      setDeleteConfirm(null);
      refetchFiles();
    } catch (err: any) { toast.error(err.message); }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/upload`, {
        method: "POST",
        headers: { "X-Filename": file.name },
        credentials: "include",
        body: file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Uploaded ${file.name}`);
      refetchUploads();
      toast.info(`File available at: ${data.path}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const changesCount = gitStatus ? (gitStatus.modified?.length || 0) + (gitStatus.created?.length || 0) + (gitStatus.deleted?.length || 0) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-white/5 bg-black/20">
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "flex-1 py-3 text-xs font-medium border-b-2 transition-colors",
            activeTab === "tasks" ? "border-indigo-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
          )}
          data-testid="tab-active-task"
        >
          Active Task
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={cn(
            "flex-1 py-3 text-xs font-medium border-b-2 transition-colors",
            activeTab === "files" ? "border-indigo-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
          )}
          data-testid="tab-workspace"
        >
          Workspace
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "tasks" ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-none px-3 py-2 flex items-center gap-2 border-b border-white/5">
              <span className={cn(
                "w-2 h-2 rounded-full flex-shrink-0",
                status === "working" ? "bg-indigo-400 animate-pulse" :
                status === "error" ? "bg-red-400" :
                status === "waiting" ? "bg-yellow-400" : "bg-emerald-400/60"
              )} />
              <span className="text-xs text-gray-400 truncate flex-1">
                {status === "working" ? (agent.currentTaskSummary || "Processing...") :
                 status === "error" ? "Error — needs intervention" :
                 status === "waiting" ? "Waiting for input" :
                 agent.totalTasksCompleted ? `Idle · ${agent.totalTasksCompleted} completed` : "Standing by"}
              </span>
              {status === "working" && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin flex-shrink-0" />}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="rounded-xl border mx-3 mt-3 overflow-hidden flex flex-col" style={{ borderColor: `${color}20`, background: `linear-gradient(135deg, ${color}05, transparent)` }}>
                <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: `${color}12` }}>
                  <div className="flex items-center gap-2">
                    <div className="relative w-4 h-4 rounded-full flex items-center justify-center" style={{ background: `radial-gradient(circle, ${color}40, ${color}15)` }}>
                      <Sparkles className="w-2.5 h-2.5" style={{ color }} />
                      {orbitLoading && <span className="absolute inset-0 rounded-full border border-t-transparent animate-spin" style={{ borderColor: `${color}60` }} />}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: `${color}cc` }}>Orbit AI</span>
                  </div>
                  {orbitResponse && !orbitLoading && (
                    <button
                      onClick={() => { setOrbitResponse(""); setOrbitHistory([]); }}
                      className="text-[9px] text-gray-600 hover:text-gray-400 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
                      data-testid="button-orbit-clear"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex gap-1 px-2 py-1.5 border-b" style={{ borderColor: `${color}10` }}>
                  {[
                    { action: "review", icon: Code, label: "Review" },
                    { action: "test", icon: TestTube, label: "Test" },
                    { action: "push_merge", icon: ArrowUpFromLine, label: "Push" },
                  ].map(({ action, icon: Icon, label }) => (
                    <button
                      key={action}
                      onClick={() => orbitAction(action)}
                      disabled={orbitLoading}
                      className={cn(
                        "flex items-center gap-1 py-1 px-2 rounded-md text-[10px] transition-all flex-1 justify-center",
                        orbitLoading ? "opacity-40 cursor-wait" : "hover:bg-white/10 cursor-pointer"
                      )}
                      style={{ color: `${color}bb` }}
                      data-testid={`button-orbit-${action}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{label}</span>
                    </button>
                  ))}
                  <button
                    onClick={handleNotifyToggle}
                    className={cn(
                      "flex items-center gap-1 py-1 px-2 rounded-md text-[10px] transition-all flex-1 justify-center",
                      notifyOn ? "bg-amber-500/20" : "hover:bg-white/10"
                    )}
                    style={{ color: notifyOn ? "#f59e0b" : `${color}bb` }}
                    data-testid="button-orbit-notify"
                  >
                    <Bell className="w-3 h-3" />
                    <span>{notifyOn ? "Watching" : "Notify"}</span>
                  </button>
                </div>

                {(orbitResponse || orbitLoading) ? (
                  <div ref={orbitScrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2.5 min-h-0" style={{ maxHeight: "calc(100vh - 400px)" }}>
                    {orbitLoading && !orbitResponse && (
                      <div className="flex items-center gap-2 text-xs py-2" style={{ color: `${color}99` }}>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Orbit is analyzing...</span>
                      </div>
                    )}
                    {orbitResponse && (
                      <div className="orbit-markdown text-[11px] text-gray-300 leading-relaxed break-words" data-testid="text-orbit-response">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 className="text-sm font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-[12px] font-semibold text-white/90 mt-2.5 mb-1 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-[11px] font-semibold text-white/80 mt-2 mb-1 first:mt-0">{children}</h3>,
                            h4: ({ children }) => <h4 className="text-[11px] font-medium text-white/70 mt-1.5 mb-0.5">{children}</h4>,
                            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-outside pl-3.5 mb-1.5 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-outside pl-3.5 mb-1.5 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="text-gray-300">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-white/90">{children}</strong>,
                            em: ({ children }) => <em className="text-gray-400 italic">{children}</em>,
                            code: ({ className, children, ...props }: any) => {
                              const isInline = !className && typeof children === "string" && !children.includes("\n");
                              if (isInline) {
                                return <code className="bg-white/[0.08] text-amber-300/80 px-1 py-0.5 rounded text-[10px] font-mono">{children}</code>;
                              }
                              return <code className="block bg-black/40 border border-white/[0.06] rounded-md px-2.5 py-2 my-1.5 text-[10px] font-mono text-emerald-300/90 overflow-x-auto whitespace-pre">{children}</code>;
                            },
                            pre: ({ children }) => <pre className="my-1.5">{children}</pre>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 pl-2.5 my-1.5 text-gray-400 italic" style={{ borderColor: `${color}50` }}>{children}</blockquote>,
                            hr: () => <hr className="border-white/[0.06] my-2" />,
                            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: `${color}cc` }}>{children}</a>,
                            table: ({ children }) => <div className="overflow-x-auto my-1.5"><table className="text-[10px] w-full border-collapse">{children}</table></div>,
                            th: ({ children }) => <th className="text-left px-2 py-1 border-b border-white/10 text-white/80 font-medium">{children}</th>,
                            td: ({ children }) => <td className="px-2 py-1 border-b border-white/[0.04] text-gray-400">{children}</td>,
                          }}
                        >
                          {orbitResponse}
                        </ReactMarkdown>
                        {orbitLoading && <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse rounded-sm" style={{ background: color }} />}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center">
                    <p className="text-[10px] text-gray-600">Select an action or ask a question below</p>
                  </div>
                )}

                <div className="flex-none px-2 py-2 border-t" style={{ borderColor: `${color}10` }}>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={orbitChat}
                      onChange={e => setOrbitChat(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && orbitChat.trim() && !orbitLoading) {
                          orbitAction("chat", orbitChat.trim());
                          setOrbitChat("");
                        }
                      }}
                      placeholder="Ask Orbit anything..."
                      className="flex-1 text-xs bg-white/5 border border-white/[0.06] rounded-lg px-3 py-1.5 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/30"
                      data-testid="input-orbit-chat"
                    />
                    <button
                      onClick={() => { if (orbitChat.trim() && !orbitLoading) { orbitAction("chat", orbitChat.trim()); setOrbitChat(""); } }}
                      disabled={!orbitChat.trim() || orbitLoading}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                      style={{ background: `${color}20`, color }}
                      data-testid="button-orbit-send"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-3 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">Terminal Commands</h4>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Git Status", icon: GitBranch, actionId: "git-status", desc: "Status & recent commits" },
                    { label: "Run Tests", icon: TestTube, actionId: "run-tests", desc: "Execute test suite" },
                    { label: "Git Diff", icon: Code, actionId: "git-diff", desc: "View changed files" },
                    { label: "Pull & Sync", icon: RefreshCw, actionId: "git-pull", desc: "Pull latest changes" },
                    { label: "Push", icon: ArrowUpFromLine, actionId: "git-push", desc: "Push to remote" },
                    { label: "Install Deps", icon: ArrowDownToLine, actionId: "npm-install", desc: "Install packages" },
                  ].map(({ label, icon: Icon, actionId, desc }) => (
                    <button
                      key={label}
                      onClick={async () => {
                        const ok = await sendShellAction(agent.id, actionId);
                        if (ok) toast.success(`Sent: ${label}`);
                        else toast.error("No active terminal session");
                      }}
                      className="group flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all text-left"
                      data-testid={`button-cmd-${label.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <Icon className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 group-hover:text-gray-300 font-medium truncate transition-colors">{label}</p>
                        <p className="text-[9px] text-gray-600 truncate">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-3 pb-2 space-y-2">
                <button
                  onClick={() => setShowProjectPicker(!showProjectPicker)}
                  className="flex items-center justify-between w-full text-[10px] uppercase tracking-widest text-gray-600 font-medium hover:text-gray-400 transition-colors"
                  data-testid="button-toggle-project-tasks"
                >
                  <span className="flex items-center gap-1.5"><FolderKanban className="w-3 h-3" /> Project Task Pipeline</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showProjectPicker && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showProjectPicker && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                        {!selectedProjectId ? (
                          <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                            {projectsLoading ? (
                              <div className="flex items-center justify-center py-4 gap-2">
                                <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                                <p className="text-[10px] text-gray-500">Loading projects...</p>
                              </div>
                            ) : !careerProjects?.length ? (
                              <p className="text-[10px] text-gray-600 text-center py-4">No projects found</p>
                            ) : (
                              careerProjects.map((p: any) => (
                                <button
                                  key={p.id}
                                  onClick={() => { setSelectedProjectId(p.id); setSelectedTaskIds(new Set()); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/[0.04] transition-colors text-left border-b border-white/[0.03] last:border-0"
                                  data-testid={`button-project-${p.id}`}
                                >
                                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", p.color || "bg-indigo-500")} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-300 truncate">{p.title}</p>
                                    <p className="text-[9px] text-gray-600">{p.status} · {p.progress || 0}%</p>
                                  </div>
                                  <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                                </button>
                              ))
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                              <button
                                onClick={() => { setSelectedProjectId(null); setSelectedTaskIds(new Set()); }}
                                className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] text-gray-400 font-medium truncate flex-1">
                                {careerProjects?.find((p: any) => p.id === selectedProjectId)?.title || "Project"}
                              </span>
                              <button
                                onClick={() => {
                                  const incomplete = (projectTasks || []).filter((t: any) => !t.completed);
                                  setSelectedTaskIds(new Set(incomplete.map((t: any) => t.id)));
                                }}
                                className="text-[9px] px-1.5 py-0.5 rounded text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                              >
                                Select all
                              </button>
                            </div>

                            <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                              {tasksLoading ? (
                                <div className="flex items-center justify-center py-4 gap-2">
                                  <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                                  <p className="text-[10px] text-gray-500">Loading tasks...</p>
                                </div>
                              ) : !projectTasks?.length ? (
                                <p className="text-[10px] text-gray-600 text-center py-4">No tasks in this project</p>
                              ) : (
                                projectTasks.map((t: any) => (
                                  <button
                                    key={t.id}
                                    onClick={() => !t.completed && toggleTask(t.id)}
                                    disabled={!!t.completed}
                                    className={cn(
                                      "flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors border-b border-white/[0.02] last:border-0",
                                      t.completed ? "opacity-40" : "hover:bg-white/[0.04]"
                                    )}
                                    data-testid={`button-task-${t.id}`}
                                  >
                                    {selectedTaskIds.has(t.id) ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                    ) : (
                                      <SquareIcon className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                                    )}
                                    <span className={cn(
                                      "flex-1 text-[11px] truncate",
                                      t.completed ? "line-through text-gray-600" : "text-gray-300"
                                    )}>{t.title}</span>
                                    {t.priority === "high" && <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/15 text-red-400">HIGH</span>}
                                  </button>
                                ))
                              )}
                            </div>

                            {selectedTaskIds.size > 0 && (
                              <div className="border-t border-white/[0.06] p-2.5 space-y-2">
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                  {[
                                    { key: "reviewAfterEach", label: "Review after each" },
                                    { key: "testAfterEach", label: "Test after each" },
                                    { key: "prOnSuccess", label: "Create PR on success" },
                                    { key: "mergeOnSuccess", label: "Merge on success" },
                                  ].map(({ key, label }) => (
                                    <button
                                      key={key}
                                      onClick={() => {
                                        if (key === "prOnSuccess") setPipelineOpts(o => ({ ...o, prOnSuccess: !o.prOnSuccess, mergeOnSuccess: false }));
                                        else if (key === "mergeOnSuccess") setPipelineOpts(o => ({ ...o, mergeOnSuccess: !o.mergeOnSuccess, prOnSuccess: false }));
                                        else setPipelineOpts(o => ({ ...o, [key]: !(o as any)[key] }));
                                      }}
                                      className="flex items-center gap-1.5 text-[9px] text-gray-400 hover:text-gray-300 transition-colors"
                                    >
                                      {(pipelineOpts as any)[key] ? (
                                        <CheckSquare className="w-3 h-3 text-indigo-400" />
                                      ) : (
                                        <SquareIcon className="w-3 h-3 text-gray-600" />
                                      )}
                                      <span>{label}</span>
                                    </button>
                                  ))}
                                </div>

                                <button
                                  onClick={runTaskPipeline}
                                  disabled={pipelineRunning}
                                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all"
                                  style={{
                                    background: `linear-gradient(135deg, ${color}30, ${color}15)`,
                                    border: `1px solid ${color}40`,
                                    color,
                                  }}
                                  data-testid="button-run-pipeline"
                                >
                                  {pipelineRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                                  <span>Run Pipeline ({selectedTaskIds.size} task{selectedTaskIds.size > 1 ? "s" : ""})</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="px-3 pb-2 space-y-2">
                <h4 className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">Tools</h4>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} data-testid="input-file-upload" />
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = "image/*"; fileInputRef.current.click(); } }}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors text-[10px]"
                    data-testid="button-upload-image"
                  >
                    <Image className="w-3 h-3" />
                    {uploading ? "Uploading..." : "Upload Image"}
                  </button>
                  <button
                    onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = ".pdf,.doc,.docx,.txt,.md,.csv,.json,.xml,.yaml,.yml"; fileInputRef.current.click(); } }}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors text-[10px]"
                    data-testid="button-upload-doc"
                  >
                    <FileText className="w-3 h-3" />
                    {uploading ? "Uploading..." : "Upload Doc"}
                  </button>
                </div>

                {uploadedFiles?.files?.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {uploadedFiles.files.map((f: any) => (
                      <div key={f.path} className="group flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                        {/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.name) ? (
                          <Image className="w-3 h-3 text-indigo-400/70 flex-shrink-0" />
                        ) : (
                          <FileText className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-[10px] text-gray-400 truncate font-mono">{f.name}</span>
                        <span className="text-[9px] text-gray-600 flex-shrink-0">{formatFileSize(f.size)}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => viewFile(f.path)} className="p-0.5 rounded hover:bg-white/10 text-gray-600 hover:text-indigo-400 transition-colors" title="View">
                            <Eye className="w-2.5 h-2.5" />
                          </button>
                          {deleteConfirm === f.path ? (
                            <div className="flex items-center gap-0.5">
                              <button onClick={async () => { await deleteFile(f.path); refetchUploads(); }} className="px-1 py-0.5 text-[8px] bg-red-500/20 text-red-400 rounded">Yes</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-1 py-0.5 text-[8px] text-gray-500">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(f.path)} className="p-0.5 rounded hover:bg-white/10 text-gray-600 hover:text-red-400 transition-colors" title="Delete">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {viewingFile && activeTab === "tasks" && (
                <div className="mx-3 mb-2 bg-black/30 border border-white/5 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-white/[0.02]">
                    <span className="text-[10px] text-gray-400 font-mono truncate flex-1" title={viewingFile.path}>{viewingFile.path.split("/").pop()}</span>
                    <button onClick={() => setViewingFile(null)} className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                  <div className="max-h-[150px] overflow-auto custom-scrollbar">
                    {viewingFile.truncated ? (
                      <p className="text-xs text-gray-500 p-3 text-center">File too large ({formatFileSize(viewingFile.size)})</p>
                    ) : viewingFile.content !== null ? (
                      <pre className="text-[10px] text-gray-300 p-2.5 font-mono whitespace-pre-wrap break-all leading-relaxed">{viewingFile.content}</pre>
                    ) : (
                      <p className="text-xs text-gray-500 p-3 text-center">Binary file</p>
                    )}
                  </div>
                </div>
              )}

              <div className="px-3 pb-3">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-between w-full text-[10px] uppercase tracking-widest text-gray-600 font-medium hover:text-gray-400 transition-colors"
                  data-testid="button-toggle-history"
                >
                  <span className="flex items-center gap-1.5"><History className="w-3 h-3" /> Task History</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showHistory && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-1.5"
                    >
                      <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {taskHistory?.length ? taskHistory.map((task: any) => (
                          <div key={task.id} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.02] text-[10px]">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0",
                              task.status === "completed" ? "bg-emerald-400" :
                              task.status === "running" ? "bg-indigo-400 animate-pulse" :
                              task.status === "failed" ? "bg-red-400" : "bg-gray-500"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-400 truncate">{task.description}</p>
                              <p className="text-[9px] text-gray-600 font-mono">
                                {task.startedAt ? new Date(task.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Pending"}
                              </p>
                            </div>
                          </div>
                        )) : (
                          <p className="text-[10px] text-gray-600 text-center py-2">No history yet</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
            {!agent.repoCloned ? (
              <div className="text-center py-10 flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                <p className="text-xs text-gray-400">Cloning repository...</p>
              </div>
            ) : (
              <>
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-medium flex items-center gap-1.5">
                      <GitBranch className="w-3 h-3" /> Branch
                    </h4>
                    <div className="relative">
                      <button
                        onClick={() => { setBranchDropdown(!branchDropdown); refetchBranches(); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono hover:bg-indigo-500/20 transition-colors"
                        data-testid="button-branch-select"
                      >
                        {branches?.current || agent.repoBranch || "main"}
                        <ChevronDown className={cn("w-3 h-3 transition-transform", branchDropdown && "rotate-180")} />
                      </button>
                      <AnimatePresence>
                        {branchDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute right-0 top-full mt-1 min-w-[280px] max-w-[380px] max-h-64 overflow-y-auto bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 custom-scrollbar"
                          >
                            {branches?.remote?.map((b: string) => (
                              <button
                                key={b}
                                onClick={async () => {
                                  setBranchDropdown(false);
                                  await gitAction("checkout", { branch: b });
                                  queryClient.invalidateQueries({ queryKey: [`/api/agents/${agent.id}/git/branches`] });
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-xs font-mono hover:bg-white/5 transition-colors flex items-center gap-2",
                                  b === branches?.current ? "text-indigo-400" : "text-gray-400"
                                )}
                                data-testid={`branch-option-${b}`}
                              >
                                <GitBranch className="w-3 h-3 flex-shrink-0" />
                                <span className="break-all text-left">{b}</span>
                                {b === branches?.current && <Check className="w-3 h-3 ml-auto text-indigo-400" />}
                              </button>
                            )) || <p className="text-xs text-gray-500 p-3">Loading...</p>}
                            <div className="border-t border-white/5">
                              {!showNewBranch ? (
                                <button
                                  onClick={() => setShowNewBranch(true)}
                                  className="w-full text-left px-3 py-2 text-xs text-indigo-400 hover:bg-white/5 transition-colors flex items-center gap-2"
                                  data-testid="button-new-branch"
                                >
                                  <Plus className="w-3 h-3" /> New Branch
                                </button>
                              ) : (
                                <div className="p-2 flex gap-1.5">
                                  <input
                                    value={newBranchName}
                                    onChange={e => setNewBranchName(e.target.value)}
                                    placeholder="branch-name"
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder:text-gray-600 outline-none focus:border-indigo-500/40"
                                    onKeyDown={async e => {
                                      if (e.key === "Enter" && newBranchName.trim()) {
                                        await gitAction("checkout", { branch: newBranchName.trim(), create: true });
                                        setNewBranchName("");
                                        setShowNewBranch(false);
                                        setBranchDropdown(false);
                                      }
                                    }}
                                    data-testid="input-new-branch"
                                    autoFocus
                                  />
                                  <button
                                    onClick={async () => {
                                      if (newBranchName.trim()) {
                                        await gitAction("checkout", { branch: newBranchName.trim(), create: true });
                                        setNewBranchName("");
                                        setShowNewBranch(false);
                                        setBranchDropdown(false);
                                      }
                                    }}
                                    className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs hover:bg-indigo-500/30"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {changesCount > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-xs text-yellow-400/80">
                      <AlertTriangle className="w-3 h-3" />
                      {changesCount} uncommitted {changesCount === 1 ? "change" : "changes"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Git Operations</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => gitAction("pull")}
                      disabled={gitLoading !== null}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs disabled:opacity-40"
                      data-testid="button-git-pull"
                    >
                      {gitLoading === "pull" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                      Pull
                    </button>
                    <button
                      onClick={() => gitAction("push")}
                      disabled={gitLoading !== null}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs disabled:opacity-40"
                      data-testid="button-git-push"
                    >
                      {gitLoading === "push" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
                      Push
                    </button>
                    <button
                      onClick={() => gitAction("commit", { message: `Agent commit - ${new Date().toISOString().slice(0, 16)}` })}
                      disabled={gitLoading !== null || changesCount === 0}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs disabled:opacity-40"
                      data-testid="button-git-commit"
                    >
                      {gitLoading === "commit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitCommit className="w-3.5 h-3.5" />}
                      Commit All
                    </button>
                    <button
                      onClick={() => { refetchStatus(); toast.success("Workspace synced"); }}
                      disabled={gitLoading !== null}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs disabled:opacity-40"
                      data-testid="button-git-sync"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => { setCommitLog(!commitLog); if (!commitLog) refetchLog(); }}
                    className="flex items-center justify-between w-full text-[10px] uppercase tracking-widest text-gray-500 font-medium hover:text-gray-300 transition-colors"
                    data-testid="button-toggle-commits"
                  >
                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Commit History</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", commitLog && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {commitLog && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar">
                          {gitLog?.length ? gitLog.map((commit: any, i: number) => (
                            <div key={commit.hash + i} className="group flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors">
                              <div className="flex flex-col items-center mt-1">
                                <GitCommit className="w-3 h-3 text-gray-600" />
                                {i < (gitLog?.length || 0) - 1 && <div className="w-px h-full bg-white/5 mt-1" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-300 truncate">{commit.message}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-indigo-400/60 font-mono">{commit.hash}</span>
                                  <span className="text-[10px] text-gray-600">{commit.author}</span>
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                {revertConfirm === commit.hash ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={async () => { await gitAction("reset", { commitHash: commit.hash, confirmed: true }); setRevertConfirm(null); refetchLog(); }}
                                      className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                      data-testid={`button-confirm-revert-${commit.hash}`}
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setRevertConfirm(null)}
                                      className="px-1.5 py-0.5 text-[10px] text-gray-500 hover:text-gray-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setRevertConfirm(commit.hash)}
                                    className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-yellow-400 transition-colors"
                                    title="Revert to this commit"
                                    data-testid={`button-revert-${commit.hash}`}
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )) : (
                            <p className="text-xs text-gray-600 text-center py-3">
                              {gitLog === undefined ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "No commits found"}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setShowFiles(!showFiles)}
                    className="flex items-center justify-between w-full text-[10px] uppercase tracking-widest text-gray-500 font-medium hover:text-gray-300 transition-colors"
                    data-testid="button-toggle-files"
                  >
                    <span className="flex items-center gap-1.5"><Folder className="w-3 h-3" /> File Explorer</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", showFiles && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {showFiles && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {viewingFile ? (
                          <div className="bg-black/30 border border-white/5 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/[0.02]">
                              <span className="text-[10px] text-gray-400 font-mono truncate flex-1" title={viewingFile.path}>{viewingFile.path.split("/").pop()}</span>
                              <div className="flex items-center gap-1.5 ml-2">
                                <span className="text-[10px] text-gray-600">{formatFileSize(viewingFile.size)}</span>
                                <button onClick={() => setViewingFile(null)} className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="max-h-[300px] overflow-auto custom-scrollbar">
                              {viewingFile.truncated ? (
                                <p className="text-xs text-gray-500 p-4 text-center">File too large to preview ({formatFileSize(viewingFile.size)})</p>
                              ) : viewingFile.content !== null ? (
                                <pre className="text-[11px] text-gray-300 p-3 font-mono whitespace-pre-wrap break-all leading-relaxed">{viewingFile.content}</pre>
                              ) : (
                                <p className="text-xs text-gray-500 p-4 text-center">Binary file — cannot preview</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
                            {filePath && (
                              <button
                                onClick={() => {
                                  const parts = filePath.split("/").filter(Boolean);
                                  parts.pop();
                                  setFilePath(parts.join("/"));
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-400 hover:bg-white/5 transition-colors border-b border-white/5"
                                data-testid="button-dir-up"
                              >
                                <ArrowUp className="w-3 h-3" />
                                <span className="font-mono">..</span>
                                <span className="text-[10px] text-gray-600 ml-auto truncate max-w-[120px]">/{filePath}</span>
                              </button>
                            )}
                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                              {fileList?.files?.length ? fileList.files.map((f: any) => (
                                <div
                                  key={f.path}
                                  className="group flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors border-b border-white/[0.03] last:border-0"
                                >
                                  {f.isDirectory ? (
                                    <Folder className="w-3.5 h-3.5 text-indigo-400/70 flex-shrink-0" />
                                  ) : (
                                    <File className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                  )}
                                  <button
                                    onClick={() => {
                                      if (f.isDirectory) {
                                        setFilePath(f.path);
                                      } else {
                                        viewFile(f.path);
                                      }
                                    }}
                                    className="flex-1 text-left text-xs text-gray-300 hover:text-white transition-colors truncate font-mono"
                                    data-testid={`file-${f.name}`}
                                  >
                                    {f.name}
                                  </button>
                                  {!f.isDirectory && (
                                    <span className="text-[10px] text-gray-600 flex-shrink-0">{formatFileSize(f.size)}</span>
                                  )}
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
                                    {!f.isDirectory && (
                                      <button
                                        onClick={() => viewFile(f.path)}
                                        className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-indigo-400 transition-colors"
                                        title="View file"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                    )}
                                    {deleteConfirm === f.path ? (
                                      <div className="flex items-center gap-0.5">
                                        <button
                                          onClick={() => deleteFile(f.path)}
                                          className="px-1.5 py-0.5 text-[9px] bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                        >
                                          Yes
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirm(null)}
                                          className="px-1.5 py-0.5 text-[9px] text-gray-500 hover:text-gray-300"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setDeleteConfirm(f.path)}
                                        className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-red-400 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )) : (
                                <p className="text-xs text-gray-600 text-center py-4">Empty directory</p>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span className="flex items-center gap-1.5 font-mono break-all" title={agent.repoUrl}>
                      <FolderGit2 className="w-3 h-3 flex-shrink-0" />
                      {agent.repoUrl.replace("https://github.com/", "")}
                    </span>
                    <span className="text-emerald-500/60 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" /> Synced
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function hasActiveSession(agentId: string): boolean {
  return true;
}

async function sendAgentCommand(agentId: string, prompt: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/agents/${agentId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ prompt }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendShellAction(agentId: string, actionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/agents/${agentId}/shell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ actionId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
