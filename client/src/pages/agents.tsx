import React, { useState, useEffect } from "react";
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
  FolderKanban, CheckSquare, Square as SquareIcon, Rocket
} from "lucide-react";
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

const AGENT_AVATARS = ["🤖", "🧠", "⚡", "🔮", "🛡️", "🎯", "🚀", "💎", "🌟", "🔥"];
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
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight" data-testid="text-agents-title">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200">Neural Orbits</span>
            </h1>
            <p className="text-sm text-indigo-200/50 mt-1.5 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {agents.length > 0 ? `${agents.length} agent${agents.length !== 1 ? "s" : ""} active` : "No agents initialized"}
            </p>
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
          <CreateAgentWizard onClose={() => setShowCreateWizard(false)} githubStatus={githubStatus} />
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
  const status = (agent.status || "idle") as "idle" | "working" | "error" | "waiting";
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

function CreateAgentWizard({ onClose, githubStatus }: { onClose: () => void; githubStatus?: any }) {
  const githubConnected = githubStatus?.connected;
  const githubConfigured = githubStatus?.configured !== false;
  const [step, setStep] = useState(githubConnected ? 1 : 0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🤖");
  const [role, setRole] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const { data: repos = [] } = useQuery<GithubRepo[]>({
    queryKey: ["github-repos"],
    queryFn: () => apiFetch(`${API_BASE_URL}/api/agents/github/repos`),
    enabled: githubConnected === true,
  });

  const handleCreate = async () => {
    if (!name || !repoUrl) return;
    setCreating(true);
    setError("");
    try {
      await apiFetch(`${API_BASE_URL}/api/agents`, {
        method: "POST",
        body: JSON.stringify({ name, avatar, role, repoUrl, repoBranch, accentColor }),
      });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${name} initialized in the nexus`);
      onClose();
    } catch (err: any) {
      setError(err.message || "Synthesis failed");
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#020205]/80 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto bg-[#0a0a14] border border-indigo-500/20 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(99,102,241,0.1)] sm:rounded-3xl rounded-t-3xl rounded-b-none relative"
      >
        {/* Decorative header line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">New Agent</h2>
              <p className="text-xs text-indigo-400/60 mt-1 uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                PHASE {Math.max(step, 1)}/2 // CONFIGURATION
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors bg-white/5 border border-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && !githubConnected && (
              <motion.div key="step-0" {...agentAnimations.wizardStep} className="text-center py-10 bg-black/20 rounded-2xl border border-white/5">
                <div className="w-20 h-20 rounded-full bg-[#0a0a14] border border-white/10 flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl" />
                  <Github className="w-10 h-10 text-gray-300 relative z-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  {githubConfigured ? "GitHub Connection Required" : "GitHub Not Configured"}
                </h3>
                <p className="text-sm text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
                  {githubConfigured
                    ? "Connect your GitHub account to access repositories."
                    : "GitHub OAuth needs admin setup. Manual repository targeting available as fallback."}
                </p>
                {githubConfigured ? (
                  <div className="flex justify-center scale-110">
                    <GithubConnectButton status={githubStatus} />
                  </div>
                ) : (
                  <button
                    onClick={() => setStep(1)}
                    className="bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-indigo-200 px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                  >Proceed with Manual Entry</button>
                )}
              </motion.div>
            )}

            {(step === 1 || (step === 0 && githubConnected)) && (
              <motion.div key="step-1" {...agentAnimations.wizardStep} className="space-y-6">
                
                {/* Visual Identity Section */}
                <div className="bg-black/30 p-5 rounded-2xl border border-white/5 space-y-5 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent blur-2xl pointer-events-none" />
                  
                  <div>
                    <label className="text-xs text-indigo-300 block mb-3 uppercase tracking-wider font-semibold">Visual Essence</label>
                    <div className="flex gap-2 flex-wrap">
                      {ACCENT_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setAccentColor(c)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-all border-2",
                            accentColor === c ? "scale-110 border-white shadow-[0_0_15px_currentColor]" : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                          )}
                          style={{ backgroundColor: c, color: c }}
                          data-testid={`button-color-${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-indigo-300 block mb-3 uppercase tracking-wider font-semibold">Symbol</label>
                    <div className="flex gap-2 flex-wrap bg-black/40 p-2 rounded-xl border border-white/5">
                      {AGENT_AVATARS.map(a => (
                        <button
                          key={a}
                          onClick={() => setAvatar(a)}
                          className={cn(
                            "text-2xl w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                            avatar === a ? "bg-indigo-500/20 ring-1 ring-indigo-400 scale-110 shadow-lg" : "hover:bg-white/10 opacity-70 hover:opacity-100"
                          )}
                          data-testid={`button-avatar-${a}`}
                        >{a}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Core Parameters Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-indigo-300 block mb-2 uppercase tracking-wider font-semibold">Designation *</label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Backend Architect"
                        className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 placeholder:text-gray-600 transition-all shadow-inner"
                        data-testid="input-agent-name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-indigo-300 block mb-2 uppercase tracking-wider font-semibold">Specialization</label>
                      <input
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        placeholder="e.g. Frontend Architecture"
                        className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 placeholder:text-gray-600 transition-all shadow-inner"
                        data-testid="input-agent-role"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-indigo-300 block mb-2 uppercase tracking-wider font-semibold">Target Repository *</label>
                    {githubConnected && repos.length > 0 ? (
                      <div className="relative">
                        <select
                          value={repoUrl}
                          onChange={e => setRepoUrl(e.target.value)}
                          className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 appearance-none shadow-inner"
                          data-testid="select-agent-repo"
                        >
                          <option value="">Select a connected repository...</option>
                          {repos.map(r => (
                            <option key={r.id} value={r.html_url}>{r.full_name}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                        </div>
                      </div>
                    ) : (
                      <input
                        value={repoUrl}
                        onChange={e => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/username/repo"
                        className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 placeholder:text-gray-600 transition-all shadow-inner"
                        data-testid="input-agent-repo"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-indigo-300 block mb-2 uppercase tracking-wider font-semibold">Target Branch</label>
                    <input
                      value={repoBranch}
                      onChange={e => setRepoBranch(e.target.value)}
                      placeholder="main"
                      className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 placeholder:text-gray-600 transition-all shadow-inner"
                      data-testid="input-agent-branch"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-start gap-3">
                    <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="pt-4 flex justify-between items-center border-t border-white/10 mt-6">
                  {githubConnected ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></div>
                      Hub Link Active
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Abort
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!name || !repoUrl || creating}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:shadow-none flex items-center gap-2 relative overflow-hidden group"
                      data-testid="button-submit-agent"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Synthesizing...
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                          Create Agent
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
  const color = agent.accentColor || "#6366f1";
  const status = (agent.status || "idle") as "idle" | "working" | "error" | "waiting";

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
  const status = (agent.status || "idle") as "idle" | "working" | "error" | "waiting";
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
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
    const userMsg = message || (action === "analyze" ? "Analyze repository" : action === "review" ? "Review changes" : action === "plan" ? "Generate plan" : "Monitor terminal");
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
                  setOrbitResponse(accumulated);
                }
              } catch {}
            }
          }
        }

        if (lineBuffer.startsWith("data: ") && lineBuffer.slice(6) !== "[DONE]") {
          try {
            const parsed = JSON.parse(lineBuffer.slice(6));
            if (parsed.content) { accumulated += parsed.content; setOrbitResponse(accumulated); }
          } catch {}
        }
      }

      if (requestId === orbitRequestIdRef.current) {
        setOrbitHistory([...newHistory, { role: "assistant", content: accumulated }]);
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
                    { action: "analyze", icon: Scan, label: "Analyze" },
                    { action: "review", icon: Code, label: "Review" },
                    { action: "plan", icon: ListChecks, label: "Plan" },
                    { action: "monitor", icon: Activity, label: "Monitor" },
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
                      <div className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap break-words" style={{ fontFamily: "'JetBrains Mono', monospace" }} data-testid="text-orbit-response">
                        {orbitResponse}
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
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">Quick Actions</h4>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Test", icon: TestTube, cmd: "Run the test suite and report results" },
                    { label: "Review", icon: Code, cmd: "Review all uncommitted changes, provide feedback" },
                    { label: "Create PR", icon: GitPullRequestArrow, cmd: "Create a pull request for the current branch changes" },
                    { label: "Sync", icon: RefreshCw, cmd: "Pull latest from remote, rebase, then push" },
                    { label: "Merge", icon: GitMerge, cmd: "Merge the current branch into the default branch" },
                  ].map(({ label, icon: Icon, cmd }) => (
                    <button
                      key={label}
                      onClick={async () => {
                        const ok = await sendAgentCommand(agent.id, cmd);
                        if (ok) toast.success(`Queued: ${label}`);
                        else toast.error("Failed to queue action");
                      }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors text-[10px]"
                      data-testid={`button-queue-${label.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span>{label}</span>
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
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Quick Actions</h4>
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
