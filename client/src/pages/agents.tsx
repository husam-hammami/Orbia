import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  Bot, Plus, Play, Square, GitBranch, Terminal, Send, 
  Trash2, Settings, RefreshCw, ChevronRight, Circle,
  Github, ExternalLink, X, Check, Loader2, Zap,
  Code2, FolderGit2, ArrowLeft, MoreVertical, Cpu,
  MessageSquare, FileCode, Clock, CheckCircle2, XCircle, AlertCircle, WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      toast.success("Agent deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const agent = agents.find(a => a.id === selectedAgent);

  if (selectedAgent && agent) {
    return <AgentInteractionPanel agent={agent} onBack={() => setSelectedAgent(null)} onDelete={() => deleteMutation.mutate(agent.id)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 pb-[92px]">
      <div className="relative overflow-hidden">
        <FloatingParticles />
        <div className="relative z-10 px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2" data-testid="text-agents-title">
                <Cpu className="w-6 h-6 text-indigo-400" />
                Agents Office
              </h1>
              <p className="text-sm text-gray-400 mt-1">Your AI engineering team</p>
            </div>
            <div className="flex items-center gap-2">
              <GithubConnectButton status={githubStatus} />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateWizard(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                data-testid="button-create-agent"
              >
                <Plus className="w-4 h-4" /> New Agent
              </motion.button>
            </div>
          </div>

          {isError ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <WifiOff className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 mb-3">Could not load agents</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["agents"] })}
                className="text-sm text-indigo-400 hover:text-indigo-300"
                data-testid="button-retry-agents"
              >Try again</button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <EmptyState onCreateClick={() => setShowCreateWizard(true)} githubStatus={githubStatus} />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {agents.map((agent, i) => (
                <AgentCard key={agent.id} agent={agent} index={i} onClick={() => setSelectedAgent(agent.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreateWizard && (
          <CreateAgentWizard
            onClose={() => setShowCreateWizard(false)}
            githubStatus={githubStatus}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-indigo-500/30"
          initial={{ x: Math.random() * 400, y: Math.random() * 300, opacity: 0 }}
          animate={{
            y: [Math.random() * 300, Math.random() * 100, Math.random() * 300],
            opacity: [0, 0.6, 0],
          }}
          transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}
    </div>
  );
}

function EmptyState({ onCreateClick, githubStatus }: { onCreateClick: () => void; githubStatus?: any }) {
  const notConfigured = githubStatus && !githubStatus.configured;
  const notConnected = githubStatus && githubStatus.configured && !githubStatus.connected;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 flex items-center justify-center mb-4">
        <Bot className="w-10 h-10 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No agents yet</h3>
      <p className="text-sm text-gray-400 text-center mb-6 max-w-xs">
        {notConfigured
          ? "GitHub OAuth needs to be configured by admin before agents can connect to repos."
          : notConnected
          ? "Connect your GitHub account first, then create AI agents to work on your repos."
          : "Create your first AI agent to start automating development tasks across your repos."}
      </p>
      {!notConfigured && (
        <button
          onClick={onCreateClick}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          data-testid="button-create-first-agent"
        >
          {notConnected ? "Get Started" : "Create First Agent"}
        </button>
      )}
    </motion.div>
  );
}

function AgentCard({ agent, index, onClick }: { agent: Agent; index: number; onClick: () => void }) {
  const statusColor = agent.status === "working" ? "bg-green-500" : agent.status === "error" ? "bg-red-500" : "bg-gray-500";
  const statusPulse = agent.status === "working";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={onClick}
      className="group relative bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-indigo-500/50 transition-all hover:bg-gray-900"
      style={{ borderLeftColor: agent.accentColor || "#6366f1", borderLeftWidth: "3px" }}
      data-testid={`card-agent-${agent.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">{agent.avatar || "🤖"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-white font-semibold truncate" data-testid={`text-agent-name-${agent.id}`}>{agent.name}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className={cn("w-2 h-2 rounded-full", statusColor, statusPulse && "animate-pulse")} />
              <span className="text-xs text-gray-400 capitalize">{agent.status || "idle"}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 truncate mb-1.5">{agent.role || "General purpose"}</p>
          {agent.currentTaskSummary && agent.status === "working" && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
              <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
              <span className="truncate">{agent.currentTaskSummary}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 overflow-hidden">
            <span className="flex items-center gap-1 min-w-0 truncate">
              <FolderGit2 className="w-3 h-3 flex-shrink-0" />
              {agent.repoUrl.replace("https://github.com/", "").split("/").pop()}
            </span>
            <span className="flex items-center gap-1 flex-shrink-0">
              <GitBranch className="w-3 h-3" />
              {agent.repoBranch || "main"}
            </span>
            {(agent.totalTasksCompleted ?? 0) > 0 && (
              <span className="flex items-center gap-1 flex-shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                {agent.totalTasksCompleted}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors mt-1 flex-shrink-0" />
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
        className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl text-sm transition-colors"
        data-testid="button-github-disconnect"
      >
        <Github className="w-4 h-4" />
        <span className="hidden sm:inline">{status.username}</span>
        <Check className="w-3 h-3 text-green-400" />
      </button>
    );
  }

  if (status && !status.configured) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 bg-gray-800/50 text-gray-500 px-3 py-2 rounded-xl text-sm cursor-not-allowed"
        title="GitHub OAuth not configured"
        data-testid="button-github-not-configured"
      >
        <Github className="w-4 h-4" />
        <span className="hidden sm:inline">Not configured</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl text-sm transition-colors"
      data-testid="button-github-connect"
    >
      <Github className="w-4 h-4" />
      <span className="hidden sm:inline">Connect</span>
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
      toast.success(`Agent "${name}" created`);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create agent");
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Create Agent</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
          </div>

          {step === 0 && !githubConnected && (
            <div className="text-center py-6">
              <Github className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-2">
                {githubConfigured ? "Connect GitHub First" : "GitHub Not Configured"}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {githubConfigured
                  ? "Link your GitHub account to give agents access to your repos."
                  : "GitHub OAuth needs to be set up by admin. You can still create agents with manual repo URLs."}
              </p>
              {githubConfigured ? (
                <GithubConnectButton status={githubStatus} />
              ) : (
                <button
                  onClick={() => setStep(1)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium"
                >Continue without GitHub</button>
              )}
            </div>
          )}

          {(step === 1 || (step === 0 && githubConnected)) && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Avatar</label>
                <div className="flex gap-2 flex-wrap">
                  {AGENT_AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={cn("text-2xl p-1.5 rounded-lg transition-colors", avatar === a ? "bg-indigo-600/30 ring-1 ring-indigo-500" : "hover:bg-gray-800")}
                      data-testid={`button-avatar-${a}`}
                    >{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Frontend Bot"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  data-testid="input-agent-name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Role</label>
                <input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Frontend Developer"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  data-testid="input-agent-role"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Accent Color</label>
                <div className="flex gap-2">
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setAccentColor(c)}
                      className={cn("w-7 h-7 rounded-full transition-transform", accentColor === c && "scale-125 ring-2 ring-white/30")}
                      style={{ backgroundColor: c }}
                      data-testid={`button-color-${c}`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!name}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                data-testid="button-wizard-next"
              >
                Next: Select Repository
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-300 flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Repository *</label>
                {repos.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {repos.map(repo => (
                      <button
                        key={repo.id}
                        onClick={() => { setRepoUrl(repo.html_url); setRepoBranch(repo.default_branch); }}
                        className={cn(
                          "w-full text-left p-2.5 rounded-xl text-sm transition-colors",
                          repoUrl === repo.html_url ? "bg-indigo-600/20 border border-indigo-500/50" : "bg-gray-800 hover:bg-gray-750 border border-transparent"
                        )}
                        data-testid={`button-repo-${repo.name}`}
                      >
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-white font-medium truncate">{repo.full_name}</span>
                          {repo.private && <span className="text-xs bg-yellow-600/20 text-yellow-400 px-1.5 py-0.5 rounded flex-shrink-0">Private</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate ml-6">{repo.description || "No description"}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                    data-testid="input-repo-url"
                  />
                )}
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Branch</label>
                <input
                  value={repoBranch}
                  onChange={e => setRepoBranch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  data-testid="input-branch"
                />
              </div>
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg" data-testid="text-create-error">
                  {error}
                </div>
              )}
              <button
                onClick={handleCreate}
                disabled={!repoUrl || creating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                data-testid="button-create-confirm"
              >
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Zap className="w-4 h-4" /> Create Agent</>}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AgentInteractionPanel({ agent, onBack, onDelete }: { agent: Agent; onBack: () => void; onDelete: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [tab, setTab] = useState<"terminal" | "tasks" | "git">("terminal");
  const [showMenu, setShowMenu] = useState(false);
  const [streamEvents, setStreamEvents] = useState<any[]>([]);
  const [sseError, setSseError] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
      toast.success("Task sent to agent");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stopMutation = useMutation({
    mutationFn: () => apiFetch(`${API_BASE_URL}/api/agents/${agent.id}/stop`, { method: "POST" }),
    onSuccess: () => toast.success("Agent stopped"),
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
    setSseError(false);
    const es = new EventSource(`${API_BASE_URL}/api/agents/${agent.id}/stream`);
    es.addEventListener("output", (e) => {
      try {
        const data = JSON.parse(e.data);
        setStreamEvents(prev => [...prev.slice(-200), data]);
      } catch {}
    });
    es.addEventListener("completed", () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-tasks", agent.id] });
      queryClient.invalidateQueries({ queryKey: ["agent-git-status", agent.id] });
    });
    es.addEventListener("error", () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    });
    es.onerror = () => {
      setSseError(true);
    };
    return () => es.close();
  }, [agent.id]);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [streamEvents]);

  const handleSend = () => {
    if (!prompt.trim()) return;
    sendMutation.mutate(prompt);
    setPrompt("");
    setTab("terminal");
  };

  const statusColor = agent.status === "working" ? "text-green-400" : agent.status === "error" ? "text-red-400" : "text-gray-400";

  return (
    <div className="h-[100dvh] bg-gray-950 flex flex-col pb-[92px]">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-2xl flex-shrink-0">{agent.avatar || "🤖"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-semibold truncate" data-testid="text-agent-detail-name">{agent.name}</h2>
              <span className={cn("text-xs capitalize flex-shrink-0", statusColor)}>{agent.status || "idle"}</span>
            </div>
            <p className="text-xs text-gray-500 truncate">{agent.repoUrl.replace("https://github.com/", "")}</p>
          </div>
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-white p-1" data-testid="button-agent-menu">
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-xl py-1 min-w-[160px] z-20 shadow-xl">
                  {!agent.repoCloned && (
                    <button onClick={() => { cloneMutation.mutate(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2" data-testid="button-clone-repo">
                      <FolderGit2 className="w-4 h-4" /> Clone Repo
                    </button>
                  )}
                  {agent.repoCloned && (
                    <button onClick={() => { pullMutation.mutate(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2" data-testid="button-pull-repo">
                      <RefreshCw className="w-4 h-4" /> Pull Latest
                    </button>
                  )}
                  <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2" data-testid="button-delete-agent">
                    <Trash2 className="w-4 h-4" /> Delete Agent
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {agent.status === "working" && agent.currentTaskSummary && (
          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg">
            <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
            <span className="truncate">{agent.currentTaskSummary}</span>
            <button onClick={() => stopMutation.mutate()} className="ml-auto text-red-400 hover:text-red-300 flex-shrink-0" data-testid="button-stop-agent">
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
        {(["terminal", "tasks", "git"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
              tab === t ? "text-indigo-400 border-b-2 border-indigo-400" : "text-gray-500 hover:text-gray-300"
            )}
            data-testid={`tab-${t}`}
          >
            {t === "terminal" && <Terminal className="w-3.5 h-3.5" />}
            {t === "tasks" && <Clock className="w-3.5 h-3.5" />}
            {t === "git" && <GitBranch className="w-3.5 h-3.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {tab === "terminal" && (
          <div ref={terminalRef} className="h-full overflow-y-auto p-3 font-mono text-xs space-y-1" data-testid="terminal-output">
            {streamEvents.length === 0 && !sseError && (
              <div className="text-gray-600 py-8 text-center">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Send a prompt to start the agent</p>
              </div>
            )}
            {sseError && streamEvents.length === 0 && (
              <div className="text-gray-600 py-8 text-center">
                <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Stream connection lost. Send a new task to reconnect.</p>
              </div>
            )}
            {streamEvents.map((ev, i) => (
              <div key={i} className={cn(
                "py-0.5 break-all",
                ev.type === "text" && "text-green-400",
                ev.type === "tool_call" && "text-cyan-400",
                ev.type === "stderr" && "text-yellow-500",
                ev.type === "error" && "text-red-400",
                ev.type === "result" && "text-indigo-400 font-semibold",
                ev.type === "raw" && "text-gray-400",
                ev.type === "stream" && "text-gray-500",
              )}>
                {ev.type === "tool_call" && <span className="text-cyan-600">{"→ "}</span>}
                {ev.content}
              </div>
            ))}
          </div>
        )}

        {tab === "tasks" && (
          <div className="h-full overflow-y-auto p-3 space-y-2">
            {tasks.length === 0 ? (
              <div className="text-gray-600 py-8 text-center text-sm">No tasks yet</div>
            ) : tasks.map(task => (
              <div key={task.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-3" data-testid={`task-${task.id}`}>
                <div className="flex items-start gap-2">
                  {task.status === "completed" && <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />}
                  {task.status === "running" && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin mt-0.5 flex-shrink-0" />}
                  {task.status === "failed" && <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                  {task.status === "queued" && <Circle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm text-white break-words">{task.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {task.status} {task.completedAt && `· ${new Date(task.completedAt).toLocaleTimeString()}`}
                    </p>
                    {task.errorMessage && <p className="text-xs text-red-400 mt-1 break-words">{task.errorMessage}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "git" && (
          <div className="h-full overflow-y-auto p-3 space-y-3">
            {!agent.repoCloned ? (
              <div className="text-center py-8">
                <FolderGit2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">Repo not cloned yet</p>
                <button
                  onClick={() => cloneMutation.mutate()}
                  disabled={cloneMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 mx-auto"
                  data-testid="button-clone-git"
                >
                  {cloneMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Cloning...</> : "Clone Repository"}
                </button>
              </div>
            ) : (
              <>
                {gitStatus && (
                  <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3">
                    <h4 className="text-sm text-white font-medium mb-2">Working Tree</h4>
                    {[...gitStatus.modified || [], ...gitStatus.created || [], ...gitStatus.deleted || []].length === 0 ? (
                      <p className="text-xs text-gray-500">Clean working tree</p>
                    ) : (
                      <div className="space-y-1">
                        {(gitStatus.modified || []).map((f: string) => <p key={f} className="text-xs text-yellow-400 break-all">M {f}</p>)}
                        {(gitStatus.created || []).map((f: string) => <p key={f} className="text-xs text-green-400 break-all">A {f}</p>)}
                        {(gitStatus.deleted || []).map((f: string) => <p key={f} className="text-xs text-red-400 break-all">D {f}</p>)}
                      </div>
                    )}
                  </div>
                )}
                <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3">
                  <h4 className="text-sm text-white font-medium mb-2">Recent Commits</h4>
                  <div className="space-y-1.5">
                    {(gitLog as any[]).slice(0, 10).map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-indigo-400 font-mono flex-shrink-0">{c.hash}</span>
                        <span className="text-gray-300 break-words min-w-0">{c.message}</span>
                      </div>
                    ))}
                    {(gitLog as any[]).length === 0 && <p className="text-xs text-gray-500">No commits</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 bg-gray-900/80 backdrop-blur px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Send a task to this agent..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 min-w-0"
            disabled={sendMutation.isPending}
            data-testid="input-agent-prompt"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!prompt.trim() || sendMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors flex-shrink-0"
            data-testid="button-send-prompt"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
