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
  Square, ExternalLink
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
            "h-full rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[320px] relative overflow-hidden group",
            "bg-[#0a0a14]/60 backdrop-blur-xl border border-dashed border-indigo-500/20 hover:border-indigo-400/40 hover:bg-[#0f0f1a]/80"
          )}
          onClick={onCreateClick}
          data-testid="button-create-empty-desk"
        >
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          <div className="relative z-10 flex flex-col items-center">
            <EmptyOrbit size={100} />
            <div className="mt-6 flex flex-col items-center">
              <span className="text-sm font-medium text-indigo-300/80 group-hover:text-indigo-200 transition-colors uppercase tracking-widest">New Agent</span>
              <p className="text-[10px] text-indigo-500/40 mt-1.5 uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                initialize
              </p>
            </div>
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
      {/* Structural visual lines inside card */}
      <div className="absolute top-0 left-6 w-[1px] h-full bg-gradient-to-b from-transparent via-white/[0.03] to-transparent pointer-events-none" />
      <div className="absolute top-6 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />

      {/* Top Header / Metadata */}
      <div className="flex items-start justify-between p-5 pb-0 relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-gray-100 font-bold text-lg tracking-tight" data-testid={`text-agent-name-${agent.id}`}>
              {agent.name}
            </h3>
          </div>
          <p className="text-xs text-indigo-300/60 uppercase tracking-widest font-medium">
            {agent.role || "GENERAL_INTELLIGENCE"}
          </p>
        </div>
        
        {/* Status Indicator */}
        <div className="flex flex-col items-end gap-1">
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border",
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
      </div>

      {/* Center AI Visualization */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10 min-h-[160px]">
        {/* Subtle target crosshair in background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-32 h-32 rounded-full border border-dashed border-white/20" />
          <div className="absolute w-[1px] h-40 bg-white/10" />
          <div className="absolute h-[1px] w-40 bg-white/10" />
        </div>
        
        <NeuralOrbit status={status} accentColor={color} size={110} seed={index} />
      </div>

      {/* Bottom Footer / Activity */}
      <div className="p-5 pt-0 mt-auto relative z-10">
        <div className="bg-black/40 rounded-xl border border-white/[0.05] p-3 flex flex-col gap-2 relative overflow-hidden group-hover:bg-black/50 transition-colors">
          {/* Subtle scanning line effect in footer */}
          <motion.div 
            className="absolute top-0 bottom-0 left-[-100%] w-[50%] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent skew-x-[-20deg]"
            animate={{ left: ["100%", "-100%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

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

          <div className="h-[1px] w-full bg-white/[0.05] my-1" />

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
      
      {/* Decorative corner brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/20 rounded-tl-xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/20 rounded-tr-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/20 rounded-bl-xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/20 rounded-br-xl pointer-events-none" />
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
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.05] to-transparent" />
        
        {/* Orbital rings behind */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-indigo-500/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-indigo-500/5 rounded-full" />
        
        <div className="relative z-10">
          <div className="mx-auto mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
              <EmptyOrbit size={140} />
            </div>
          </div>
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
            <div className="relative">
              <div className="text-xl bg-black/40 rounded-lg w-8 h-8 flex items-center justify-center border border-white/10"
                   style={{ borderColor: `${color}40`, boxShadow: `0 0 10px ${color}20` }}>
                {agent.avatar}
              </div>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-950",
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
              <span className="truncate max-w-[150px]">{agent.repoUrl.split("/").slice(-2).join("/")}</span>
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-white/5 bg-black/20">
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "flex-1 py-3 text-xs font-medium border-b-2 transition-colors",
            activeTab === "tasks" ? "border-indigo-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
          )}
        >
          Active Task
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={cn(
            "flex-1 py-3 text-xs font-medium border-b-2 transition-colors",
            activeTab === "files" ? "border-indigo-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
          )}
        >
          Workspace
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === "tasks" ? (
          <div className="space-y-4">
            {agent.status === "working" ? (
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <h3 className="text-sm font-medium">Current Objective</h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {agent.currentTaskSummary || "Analyzing workspace..."}
                </p>
                <div className="mt-4 pt-4 border-t border-indigo-500/10 flex items-center justify-between text-xs text-indigo-400/60 font-mono">
                  <span>Status: Executing</span>
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> processing
                  </span>
                </div>
              </div>
            ) : agent.status === "error" ? (
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-center">
                <WifiOff className="w-8 h-8 text-red-400/50 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-red-400 mb-1">Execution Halted</h3>
                <p className="text-xs text-gray-500">Agent encountered an error and requires intervention.</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/5 rounded-xl p-6 text-center">
                <div className="w-8 h-8 mx-auto mb-3 flex items-center justify-center"><span className="w-3 h-3 rounded-full bg-emerald-400/50" /></div>
                <h3 className="text-sm font-medium text-gray-300 mb-1">Standing By</h3>
                <p className="text-xs text-gray-500">Provide instructions in the terminal to begin work.</p>
                {agent.totalTasksCompleted ? (
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    <Check className="w-3.5 h-3.5" />
                    {agent.totalTasksCompleted} tasks completed
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-white/5">
              <span>Local Workspace</span>
              <span className="font-mono">{agent.repoCloned ? "Synced" : "Syncing..."}</span>
            </div>
            
            {agent.repoCloned ? (
               <div className="text-center py-10">
                 <FolderGit2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                 <p className="text-xs text-gray-400 mb-1">Repository is cloned</p>
                 <p className="text-[10px] text-gray-600 font-mono break-all px-4">{agent.repoUrl}</p>
                 <p className="text-[10px] text-gray-600 mt-4 italic">File explorer coming soon</p>
               </div>
            ) : (
              <div className="text-center py-10 flex flex-col items-center">
                 <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                 <p className="text-xs text-gray-400">Cloning repository...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
