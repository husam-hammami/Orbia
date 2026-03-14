import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, GitBranch, Terminal, Send,
  Trash2, RefreshCw, Circle,
  Github, X, Check, Loader2, Zap,
  FolderGit2, ArrowLeft, MoreVertical, Cpu,
  Clock, CheckCircle2, XCircle, WifiOff,
  Square, MessageSquare, ChevronDown, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PixelAgent, EmptyDesk } from "@/components/agents/pixel-agent";
import { agentAnimations, glassPanel, glassPanelGlow } from "@/lib/agent-animations";

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

interface AgentTask {
  id: string;
  agentId: string;
  description: string;
  status: string | null;
  result: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-[#0a0a1a] to-indigo-950/40 pb-[92px]">
      <AmbientBackground />

      <div className="relative z-10 px-4 pt-6 pb-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5" data-testid="text-agents-title">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Cpu className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <span>Agents Office</span>
            </h1>
            <p className="text-sm text-indigo-300/40 mt-1 ml-[42px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {agents.length > 0 ? `${agents.length} agent${agents.length !== 1 ? "s" : ""} deployed` : "no agents deployed"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GithubConnectButton status={githubStatus} />
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowCreateWizard(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
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

const AMBIENT_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${5 + ((i * 47 + 13) % 90)}%`,
  top: `${5 + ((i * 31 + 7) % 90)}%`,
  yDrift: -30 - (i * 7) % 30,
  duration: 5 + (i * 3) % 5,
  delay: (i * 0.8) % 5,
}));

function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[100px]" />

      {AMBIENT_PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-[2px] h-[2px] rounded-full bg-indigo-400/20"
          style={{ left: p.left, top: p.top }}
          animate={{
            y: [0, p.yDrift, 0],
            opacity: [0, 0.5, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,rgba(0,0,0,0.4)_100%)]" />
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {agents.map((agent, i) => (
        <AgentDesk key={agent.id} agent={agent} index={i} onClick={() => onSelectAgent(agent.id)} />
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: agents.length * agentAnimations.cardStagger + 0.1 }}
      >
        <div className={cn(
          "rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer border border-dashed border-indigo-500/15 hover:border-indigo-500/30 bg-black/20 backdrop-blur-sm transition-colors min-h-[240px]",
        )}
        onClick={onCreateClick}
        data-testid="button-create-empty-desk"
        >
          <EmptyDesk size={100} onClick={onCreateClick} />
          <p className="text-xs text-indigo-400/50 mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            add agent
          </p>
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
        "group relative rounded-2xl p-4 cursor-pointer transition-all overflow-hidden min-h-[240px]",
        "bg-black/40 backdrop-blur-xl border",
        "hover:scale-[1.02] hover:border-opacity-40 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none"
      )}
      style={{
        borderColor: `${color}25`,
        boxShadow: `0 0 20px ${color}10`,
      }}
      whileHover={{
        boxShadow: `0 0 30px ${color}22, 0 0 60px ${color}08`,
      }}
      data-testid={`card-agent-${agent.id}`}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 50% 30%, ${color}08, transparent 70%)` }}
      />

      {status === "working" && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center">
        <PixelAgent status={status} accentColor={color} avatar={agent.avatar} size={100} />

        <h3 className="text-white font-semibold text-sm mt-1 text-center truncate w-full" data-testid={`text-agent-name-${agent.id}`}>
          {agent.name}
        </h3>
        <p className="text-[10px] text-gray-500 truncate w-full text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {agent.role || "general"}
        </p>

        <div className="flex items-center gap-1.5 mt-2">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            status === "working" && "bg-green-400 animate-pulse",
            status === "error" && "bg-red-400",
            status === "waiting" && "bg-yellow-400 animate-pulse",
            status === "idle" && "bg-gray-500",
          )} />
          <span className={cn(
            "text-[10px] capitalize",
            status === "working" && "text-green-400",
            status === "error" && "text-red-400",
            status === "waiting" && "text-yellow-400",
            status === "idle" && "text-gray-500",
          )} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {status}
          </span>
          {elapsed && <span className="text-[10px] text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{elapsed}</span>}
        </div>

        {agent.currentTaskSummary && status === "working" && (
          <div className="mt-2 text-[10px] text-center px-2 py-1 rounded-lg w-full truncate"
            style={{ color: color, backgroundColor: `${color}12` }}
          >
            {agent.currentTaskSummary}
          </div>
        )}

        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
          <span className="flex items-center gap-0.5 truncate">
            <FolderGit2 className="w-2.5 h-2.5 flex-shrink-0" />
            {agent.repoUrl.replace("https://github.com/", "").split("/").pop()}
          </span>
          {(agent.totalTasksCompleted ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 flex-shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {agent.totalTasksCompleted}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div {...agentAnimations.cardEnter} className="flex flex-col items-center justify-center py-20 px-4">
      <div className={cn(glassPanel, "p-8 text-center max-w-xs")}>
        <WifiOff className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
        <p className="text-sm text-gray-400 mb-4">Connection lost to the office</p>
        <button
          onClick={onRetry}
          className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 mx-auto"
          data-testid="button-retry-agents"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reconnect
        </button>
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className={cn(glassPanel, "min-h-[240px] p-4")}
        >
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-20 h-20 rounded-xl bg-indigo-500/10" />
            <div className="w-20 h-3 rounded bg-gray-800" />
            <div className="w-14 h-2 rounded bg-gray-800/60" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EmptyState({ onCreateClick, githubStatus }: { onCreateClick: () => void; githubStatus?: any }) {
  const notConfigured = githubStatus && !githubStatus.configured;

  return (
    <motion.div {...agentAnimations.cardEnter} className="flex flex-col items-center justify-center py-16 px-4">
      <div className={cn(glassPanelGlow, "p-10 text-center max-w-sm relative overflow-hidden")}>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.03] to-transparent" />
        <div className="relative z-10">
          <div className="mx-auto mb-5">
            <PixelAgent status="idle" accentColor="#6366f1" size={120} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">The office is empty</h3>
          <p className="text-sm text-gray-500 mb-6">
            {notConfigured
              ? "GitHub OAuth needs to be configured by an admin before agents can connect to repos."
              : "Deploy your first AI agent to start automating development tasks across your repos."}
          </p>
          {!notConfigured && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onCreateClick}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
              data-testid="button-create-first-agent"
            >
              Deploy First Agent
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
        className={cn(glassPanel, "flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors !rounded-xl")}
        data-testid="button-github-disconnect"
      >
        <Github className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">{status.username}</span>
        <Check className="w-3 h-3 text-emerald-400" />
      </button>
    );
  }

  if (status && !status.configured) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 bg-black/30 text-gray-600 px-3 py-2 rounded-xl text-sm cursor-not-allowed"
        title="GitHub OAuth not configured"
        data-testid="button-github-not-configured"
      >
        <Github className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className={cn(glassPanel, "flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors !rounded-xl")}
      data-testid="button-github-connect"
    >
      <Github className="w-4 h-4" />
      <span className="hidden sm:inline text-xs">Connect</span>
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
      toast.success(`${name} deployed to the office`);
      onClose();
    } catch (err: any) {
      setError(err.message || "Deployment failed");
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className={cn(glassPanelGlow, "w-full sm:max-w-md max-h-[85vh] overflow-y-auto !rounded-t-3xl sm:!rounded-2xl")}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Deploy Agent</h2>
              <p className="text-xs text-indigo-400/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                step {Math.max(step, 1)}/2
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && !githubConnected && (
              <motion.div key="step-0" {...agentAnimations.wizardStep} className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/80 flex items-center justify-center mx-auto mb-4">
                  <Github className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-white font-medium mb-2">
                  {githubConfigured ? "Connect GitHub First" : "GitHub Not Configured"}
                </h3>
                <p className="text-sm text-gray-500 mb-5">
                  {githubConfigured
                    ? "Link your GitHub account to give agents access to your repos."
                    : "GitHub OAuth needs admin setup. You can still use manual repo URLs."}
                </p>
                {githubConfigured ? (
                  <GithubConnectButton status={githubStatus} />
                ) : (
                  <button
                    onClick={() => setStep(1)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >Continue without GitHub</button>
                )}
              </motion.div>
            )}

            {(step === 1 || (step === 0 && githubConnected)) && (
              <motion.div key="step-1" {...agentAnimations.wizardStep} className="space-y-4">
                <div>
                  <label className="text-xs text-indigo-400/60 block mb-2 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Avatar</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {AGENT_AVATARS.map(a => (
                      <button
                        key={a}
                        onClick={() => setAvatar(a)}
                        className={cn(
                          "text-xl p-1.5 rounded-lg transition-all",
                          avatar === a ? "bg-indigo-600/20 ring-1 ring-indigo-500 scale-110" : "hover:bg-white/5"
                        )}
                        data-testid={`button-avatar-${a}`}
                      >{a}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-indigo-400/60 block mb-2 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Name *</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Frontend Bot"
                    className="w-full bg-black/40 border border-indigo-500/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/40 placeholder:text-gray-600 transition-colors"
                    data-testid="input-agent-name"
                  />
                </div>
                <div>
                  <label className="text-xs text-indigo-400/60 block mb-2 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Role</label>
                  <input
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="e.g. Frontend Developer"
                    className="w-full bg-black/40 border border-indigo-500/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/40 placeholder:text-gray-600 transition-colors"
                    data-testid="input-agent-role"
                  />
                </div>
                <div>
                  <label className="text-xs text-indigo-400/60 block mb-2 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Color</label>
                  <div className="flex gap-2">
                    {ACCENT_COLORS.map(c => (
                      <motion.button
                        key={c}
                        onClick={() => setAccentColor(c)}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className={cn("w-7 h-7 rounded-full transition-all", accentColor === c && "ring-2 ring-white/30 ring-offset-2 ring-offset-gray-900 scale-110")}
                        style={{ backgroundColor: c, boxShadow: accentColor === c ? `0 0 12px ${c}55` : "none" }}
                        data-testid={`button-color-${c}`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!name}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/10"
                  data-testid="button-wizard-next"
                >
                  Next: Select Repository
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step-2" {...agentAnimations.wizardStep} className="space-y-3">
                <button onClick={() => setStep(1)} className="text-xs text-indigo-400/60 hover:text-indigo-400 flex items-center gap-1 transition-colors">
                  <ArrowLeft className="w-3 h-3" /> back
                </button>
                <div>
                  <label className="text-xs text-indigo-400/60 block mb-2 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Repository *</label>
                  {repos.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {repos.map(repo => (
                        <button
                          key={repo.id}
                          onClick={() => { setRepoUrl(repo.html_url); setRepoBranch(repo.default_branch); }}
                          className={cn(
                            "w-full text-left p-2.5 rounded-xl text-sm transition-all",
                            repoUrl === repo.html_url
                              ? "bg-indigo-600/15 border border-indigo-500/30"
                              : "bg-black/30 hover:bg-black/50 border border-transparent hover:border-indigo-500/10"
                          )}
                          data-testid={`button-repo-${repo.name}`}
                        >
                          <div className="flex items-center gap-2">
                            <FolderGit2 className="w-3.5 h-3.5 text-indigo-400/60 flex-shrink-0" />
                            <span className="text-white font-medium truncate">{repo.full_name}</span>
                            {repo.private && <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded flex-shrink-0">PRV</span>}
                          </div>
                          {repo.description && <p className="text-[11px] text-gray-600 mt-0.5 truncate ml-[22px]">{repo.description}</p>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      value={repoUrl}
                      onChange={e => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/user/repo"
                      className="w-full bg-black/40 border border-indigo-500/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/40 placeholder:text-gray-600 transition-colors"
                      data-testid="input-repo-url"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-indigo-400/60 block mb-2 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Branch</label>
                  <input
                    value={repoBranch}
                    onChange={e => setRepoBranch(e.target.value)}
                    className="w-full bg-black/40 border border-indigo-500/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/40 placeholder:text-gray-600 transition-colors"
                    data-testid="input-branch"
                  />
                </div>
                {error && (
                  <motion.div {...agentAnimations.errorShake} className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl" data-testid="text-create-error">
                    {error}
                  </motion.div>
                )}
                <button
                  onClick={handleCreate}
                  disabled={!repoUrl || creating}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/10"
                  data-testid="button-create-confirm"
                >
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <><Zap className="w-4 h-4" /> Deploy Agent</>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AgentInteractionPanel({ agent, onBack, onDelete }: { agent: Agent; onBack: () => void; onDelete: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [mobileTab, setMobileTab] = useState<"terminal" | "chat" | "project">("terminal");
  const [showMenu, setShowMenu] = useState(false);
  const [streamEvents, setStreamEvents] = useState<any[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const color = agent.accentColor || "#6366f1";
  const status = (agent.status || "idle") as "idle" | "working" | "error" | "waiting";

  const { data: tasks = [] } = useQuery<AgentTask[]>({
    queryKey: ["agent-tasks", agent.id],
    queryFn: () => apiFetch(`${API_BASE_URL}/api/agents/${agent.id}/tasks`),
    refetchInterval: 5000,
    retry: 1,
  });

  const { data: gitStatus } = useQuery({
    queryKey: ["agent-git-status", agent.id],
    queryFn: () => apiFetch(`${API_BASE_URL}/api/agents/${agent.id}/git/status`),
    enabled: agent.repoCloned,
    refetchInterval: 10000,
    retry: 1,
  });

  const { data: gitLog = [] } = useQuery({
    queryKey: ["agent-git-log", agent.id],
    queryFn: () => apiFetch(`${API_BASE_URL}/api/agents/${agent.id}/git/log`),
    enabled: agent.repoCloned,
    retry: 1,
  });

  const sendMutation = useMutation({
    mutationFn: (p: string) => apiFetch(`${API_BASE_URL}/api/agents/${agent.id}/send`, {
      method: "POST",
      body: JSON.stringify({ prompt: p }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-tasks", agent.id] });
      toast.success("Task dispatched");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stopMutation = useMutation({
    mutationFn: () => apiFetch(`${API_BASE_URL}/api/agents/${agent.id}/stop`, { method: "POST" }),
    onSuccess: () => toast.success("Agent paused"),
    onError: (err: Error) => toast.error(err.message),
  });

  const cloneMutation = useMutation({
    mutationFn: () => apiFetch(`${API_BASE_URL}/api/agents/${agent.id}/git/clone`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Repository cloned");
    },
    onError: (err: Error) => toast.error(`Clone failed: ${err.message}`),
  });

  const pullMutation = useMutation({
    mutationFn: () => apiFetch(`${API_BASE_URL}/api/agents/${agent.id}/git/pull`, { method: "POST" }),
    onSuccess: (data) => toast.success(`Pulled: ${data.result}`),
    onError: (err: Error) => toast.error(`Pull failed: ${err.message}`),
  });

  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/api/agents/${agent.id}/stream`);
    es.onopen = () => {
      setSseConnected(true);
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-tasks", agent.id] });
    };
    es.addEventListener("output", (e) => {
      try {
        const data = JSON.parse(e.data);
        setStreamEvents(prev => [...prev.slice(-300), data]);
      } catch {}
    });
    es.addEventListener("completed", () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-tasks", agent.id] });
      queryClient.invalidateQueries({ queryKey: ["agent-git-status", agent.id] });
    });
    es.addEventListener("error", () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-tasks", agent.id] });
    });
    es.onerror = () => setSseConnected(false);
    return () => es.close();
  }, [agent.id]);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [streamEvents]);

  const handleSend = () => {
    if (!prompt.trim()) return;
    sendMutation.mutate(prompt);
    setPrompt("");
  };

  const QUICK_ACTIONS = ["Continue", "Run tests", "Explain changes", "Revert last"];

  const repoName = agent.repoUrl.replace("https://github.com/", "");
  const changedFiles = gitStatus ? [...(gitStatus.modified || []), ...(gitStatus.created || []), ...(gitStatus.deleted || [])] : [];

  return (
    <motion.div
      {...agentAnimations.panelSlideUp}
      className="h-[100dvh] bg-gradient-to-br from-gray-950 via-[#0a0a1a] to-indigo-950/40 flex flex-col pb-[92px]"
    >
      {/* HEADER */}
      <div className="bg-black/60 backdrop-blur-xl border-b border-indigo-500/10 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors p-1" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <PixelAgent status={status} accentColor={color} avatar={agent.avatar} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-semibold truncate" data-testid="text-agent-detail-name">{agent.name}</h2>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                status === "working" && "bg-green-400 animate-pulse",
                status === "error" && "bg-red-400",
                status === "idle" && "bg-gray-500",
              )} />
              <span className={cn(
                "text-[10px] capitalize flex-shrink-0",
                status === "working" && "text-green-400",
                status === "error" && "text-red-400",
                status === "idle" && "text-gray-500",
              )} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {status}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{repoName}</p>
          </div>

          {status === "working" && (
            <button
              onClick={() => stopMutation.mutate()}
              className="text-red-400/60 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0"
              data-testid="button-stop-agent"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          <div className="relative flex-shrink-0">
            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 hover:text-white p-1 transition-colors" data-testid="button-agent-menu">
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className={cn(glassPanelGlow, "absolute right-0 top-8 py-1 min-w-[180px] z-20")}>
                  {!agent.repoCloned && (
                    <button onClick={() => { cloneMutation.mutate(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors" data-testid="button-clone-repo">
                      <FolderGit2 className="w-4 h-4" /> Clone Repo
                    </button>
                  )}
                  {agent.repoCloned && (
                    <button onClick={() => { pullMutation.mutate(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors" data-testid="button-pull-repo">
                      <RefreshCw className="w-4 h-4" /> Pull Latest
                    </button>
                  )}
                  <a href={agent.repoUrl} target="_blank" rel="noopener noreferrer" className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors">
                    <ExternalLink className="w-4 h-4" /> Open on GitHub
                  </a>
                  <div className="my-1 border-t border-white/5" />
                  <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors" data-testid="button-delete-agent">
                    <Trash2 className="w-4 h-4" /> Decommission
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE TABS */}
      <div className="md:hidden flex border-b border-indigo-500/10 bg-black/40 flex-shrink-0">
        {(["terminal", "chat", "project"] as const).map(t => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
              mobileTab === t ? "text-indigo-400 border-b-2 border-indigo-400" : "text-gray-600 hover:text-gray-400"
            )}
            data-testid={`tab-${t}`}
          >
            {t === "terminal" && <Terminal className="w-3.5 h-3.5" />}
            {t === "chat" && <MessageSquare className="w-3.5 h-3.5" />}
            {t === "project" && <GitBranch className="w-3.5 h-3.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden min-h-0">
        {/* DESKTOP: 3-column */}
        <div className="hidden md:grid md:grid-cols-[1fr_1.2fr_280px] h-full max-w-6xl mx-auto gap-0">
          <TerminalPane
            ref={terminalRef}
            streamEvents={streamEvents}
            sseConnected={sseConnected}
            color={color}
            className="border-r border-indigo-500/10"
          />
          <ChatPane
            prompt={prompt}
            setPrompt={setPrompt}
            onSend={handleSend}
            sending={sendMutation.isPending}
            tasks={tasks}
            quickActions={QUICK_ACTIONS}
            color={color}
            className="border-r border-indigo-500/10"
          />
          <ProjectPane
            agent={agent}
            gitStatus={gitStatus}
            gitLog={gitLog}
            changedFiles={changedFiles}
            cloneMutation={cloneMutation}
            pullMutation={pullMutation}
            color={color}
          />
        </div>

        {/* MOBILE: single pane */}
        <div className="md:hidden h-full flex flex-col">
          {mobileTab === "terminal" && (
            <TerminalPane ref={terminalRef} streamEvents={streamEvents} sseConnected={sseConnected} color={color} className="flex-1" />
          )}
          {mobileTab === "chat" && (
            <ChatPane
              prompt={prompt}
              setPrompt={setPrompt}
              onSend={handleSend}
              sending={sendMutation.isPending}
              tasks={tasks}
              quickActions={QUICK_ACTIONS}
              color={color}
              className="flex-1"
            />
          )}
          {mobileTab === "project" && (
            <ProjectPane
              agent={agent}
              gitStatus={gitStatus}
              gitLog={gitLog}
              changedFiles={changedFiles}
              cloneMutation={cloneMutation}
              pullMutation={pullMutation}
              color={color}
              className="flex-1"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

const TerminalPane = React.forwardRef<HTMLDivElement, {
  streamEvents: any[];
  sseConnected: boolean;
  color: string;
  className?: string;
}>(({ streamEvents, sseConnected, color, className }, ref) => {
  return (
    <div className={cn("flex flex-col h-full bg-black/20", className)}>
      <div className="px-3 py-2 flex items-center gap-2 border-b border-indigo-500/8 flex-shrink-0">
        <Terminal className="w-3.5 h-3.5 text-indigo-400/50" />
        <span className="text-[10px] text-indigo-400/40 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Terminal
        </span>
        <div className="ml-auto flex items-center gap-1">
          <div className={cn("w-1.5 h-1.5 rounded-full", sseConnected ? "bg-emerald-400" : "bg-gray-600")} />
          <span className="text-[9px] text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {sseConnected ? "live" : "offline"}
          </span>
        </div>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto p-3 space-y-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }} data-testid="terminal-output">
        {streamEvents.length === 0 && (
          <div className="text-gray-700 py-12 text-center text-xs">
            <Terminal className="w-6 h-6 mx-auto mb-2 opacity-30" />
            <p>awaiting instructions</p>
            <p className="text-[10px] mt-1 text-gray-800">send a task to start the agent</p>
          </div>
        )}
        {streamEvents.map((ev, i) => {
          const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
          return (
            <div key={i} className="flex gap-2 text-[11px] leading-relaxed py-[1px] group hover:bg-white/[0.02] rounded px-1 -mx-1">
              <span className="text-gray-800 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity select-none">{ts}</span>
              <span className={cn(
                ev.type === "text" && "text-gray-300",
                ev.type === "tool_call" && "text-cyan-400/80",
                ev.type === "stderr" && "text-yellow-500/80",
                ev.type === "error" && "text-red-400",
                ev.type === "result" && "text-emerald-400",
                ev.type === "raw" && "text-gray-500",
                ev.type === "stream" && "text-gray-600",
              )}>
                {ev.type === "tool_call" && <span className="text-cyan-600 mr-1">{"→"}</span>}
                {ev.type === "result" && <span className="text-emerald-600 mr-1">{"✓"}</span>}
                {ev.type === "error" && <span className="text-red-600 mr-1">{"✗"}</span>}
                {ev.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

function ChatPane({
  prompt,
  setPrompt,
  onSend,
  sending,
  tasks,
  quickActions,
  color,
  className,
}: {
  prompt: string;
  setPrompt: (s: string) => void;
  onSend: () => void;
  sending: boolean;
  tasks: AgentTask[];
  quickActions: string[];
  color: string;
  className?: string;
}) {
  const currentTask = tasks.find(t => t.status === "running");
  const recentTasks = tasks.filter(t => t.status !== "running").slice(0, 5);

  return (
    <div className={cn("flex flex-col h-full bg-black/10", className)}>
      <div className="px-3 py-2 flex items-center gap-2 border-b border-indigo-500/8 flex-shrink-0">
        <MessageSquare className="w-3.5 h-3.5 text-indigo-400/50" />
        <span className="text-[10px] text-indigo-400/40 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Communication
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {currentTask && (
          <div className="rounded-xl p-3 border" style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>Active Task</span>
            </div>
            <p className="text-sm text-white">{currentTask.description}</p>
          </div>
        )}

        {recentTasks.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              History
            </span>
            {recentTasks.map(task => (
              <div key={task.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors" data-testid={`task-${task.id}`}>
                {task.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60 mt-0.5 flex-shrink-0" />}
                {task.status === "failed" && <XCircle className="w-3.5 h-3.5 text-red-400/60 mt-0.5 flex-shrink-0" />}
                {task.status === "queued" && <Circle className="w-3.5 h-3.5 text-gray-600 mt-0.5 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 break-words">{task.description}</p>
                  <p className="text-[10px] text-gray-700 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {task.status} {task.completedAt && `· ${new Date(task.completedAt).toLocaleTimeString()}`}
                  </p>
                  {task.errorMessage && <p className="text-[10px] text-red-400/70 mt-0.5 break-words">{task.errorMessage}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tasks.length === 0 && !currentTask && (
          <div className="text-center py-8">
            <MessageSquare className="w-6 h-6 text-gray-800 mx-auto mb-2" />
            <p className="text-xs text-gray-700">No tasks yet</p>
            <p className="text-[10px] text-gray-800 mt-0.5">Type a task below to get started</p>
          </div>
        )}
      </div>

      <div className="border-t border-indigo-500/8 p-3 flex-shrink-0 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {quickActions.map(action => (
            <button
              key={action}
              onClick={() => { setPrompt(action); }}
              className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] border border-indigo-500/10 text-gray-500 hover:text-indigo-400 hover:border-indigo-500/25 transition-colors"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {action}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Describe a task..."
            className="flex-1 bg-black/40 border border-indigo-500/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/30 placeholder:text-gray-700 min-w-0 transition-colors"
            disabled={sending}
            data-testid="input-agent-prompt"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onSend}
            disabled={!prompt.trim() || sending}
            className="p-2.5 rounded-xl transition-colors flex-shrink-0 disabled:opacity-30"
            style={{ backgroundColor: `${color}20`, color }}
            data-testid="button-send-prompt"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function ProjectPane({
  agent,
  gitStatus,
  gitLog,
  changedFiles,
  cloneMutation,
  pullMutation,
  color,
  className,
}: {
  agent: Agent;
  gitStatus: any;
  gitLog: any;
  changedFiles: string[];
  cloneMutation: any;
  pullMutation: any;
  color: string;
  className?: string;
}) {
  const repoName = agent.repoUrl.replace("https://github.com/", "");

  return (
    <div className={cn("flex flex-col h-full bg-black/20 overflow-y-auto", className)}>
      <div className="px-3 py-2 flex items-center gap-2 border-b border-indigo-500/8 flex-shrink-0">
        <GitBranch className="w-3.5 h-3.5 text-indigo-400/50" />
        <span className="text-[10px] text-indigo-400/40 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Project
        </span>
      </div>

      <div className="p-3 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FolderGit2 className="w-3.5 h-3.5" style={{ color: `${color}88` }} />
            <span className="text-xs text-gray-400 truncate">{repoName}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <GitBranch className="w-3 h-3" />
            {agent.repoBranch || "main"}
          </div>
        </div>

        {!agent.repoCloned ? (
          <div className="text-center py-4">
            <p className="text-[10px] text-gray-600 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>repo not cloned</p>
            <button
              onClick={() => cloneMutation.mutate()}
              disabled={cloneMutation.isPending}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}25` }}
              data-testid="button-clone-git"
            >
              {cloneMutation.isPending ? "Cloning..." : "Clone"}
            </button>
          </div>
        ) : (
          <>
            <div>
              <span className="text-[10px] text-gray-600 uppercase tracking-wider block mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Changed Files
              </span>
              {changedFiles.length === 0 ? (
                <p className="text-[10px] text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>clean tree</p>
              ) : (
                <div className="space-y-0.5">
                  {(gitStatus?.modified || []).map((f: string) => (
                    <p key={f} className="text-[10px] text-yellow-400/70 truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <span className="text-yellow-600 mr-1">M</span>{f}
                    </p>
                  ))}
                  {(gitStatus?.created || []).map((f: string) => (
                    <p key={f} className="text-[10px] text-emerald-400/70 truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <span className="text-emerald-600 mr-1">A</span>{f}
                    </p>
                  ))}
                  {(gitStatus?.deleted || []).map((f: string) => (
                    <p key={f} className="text-[10px] text-red-400/70 truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <span className="text-red-600 mr-1">D</span>{f}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] text-gray-600 uppercase tracking-wider block mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Commits
              </span>
              <div className="space-y-1">
                {(gitLog as any[]).slice(0, 6).map((c: any, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span className="flex-shrink-0" style={{ color: `${color}88` }}>{c.hash}</span>
                    <span className="text-gray-500 truncate min-w-0">{c.message}</span>
                  </div>
                ))}
                {(gitLog as any[]).length === 0 && <p className="text-[10px] text-gray-700">no commits</p>}
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => pullMutation.mutate()}
                disabled={pullMutation.isPending}
                className="flex-1 text-[10px] py-1.5 rounded-lg border transition-colors hover:bg-white/[0.03]"
                style={{ borderColor: `${color}20`, color: `${color}BB`, fontFamily: "'JetBrains Mono', monospace" }}
                data-testid="button-pull-repo"
              >
                {pullMutation.isPending ? "pulling..." : "pull"}
              </button>
              <a
                href={agent.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-[10px] py-1.5 rounded-lg border text-center transition-colors hover:bg-white/[0.03]"
                style={{ borderColor: `${color}20`, color: `${color}BB`, fontFamily: "'JetBrains Mono', monospace" }}
              >
                github
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
