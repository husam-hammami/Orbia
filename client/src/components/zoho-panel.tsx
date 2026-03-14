import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Plus, ChevronDown, ChevronUp, AlertTriangle,
  Clock, CheckCircle2, Circle, X, Save, Play, Check,
  FolderOpen, Users, CalendarDays, Flag, AlertCircle, RefreshCw,
  ChevronRight, Pencil, Sparkles, Send, Pin, ListTodo, Bot
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";

async function zohoApi(url: string, opts?: RequestInit) {
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  const res = await fetch(fullUrl, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const cmdPanel = "bg-black/40 backdrop-blur-xl border border-indigo-500/15 shadow-[0_0_15px_rgba(100,80,255,0.04)] rounded-2xl";
const cmdPanelGlow = "bg-black/40 backdrop-blur-xl border border-indigo-500/20 shadow-[0_0_25px_rgba(100,80,255,0.08)] rounded-2xl";

interface ZohoTask {
  id: string;
  prefix?: string;
  name: string;
  description?: string;
  status?: { id: string; name: string; color?: string; is_closed_type?: boolean };
  priority?: string;
  start_date?: string;
  end_date?: string;
  owners_and_work?: { owners?: { zpuid: string; name: string; first_name?: string; email?: string }[] };
  tasklist?: { id: string; name: string };
  created_time?: string;
  is_completed?: boolean;
}

interface ZohoProject {
  id: string;
  name: string;
  status?: string;
}

interface ZohoMember {
  id: string;
  zpuid?: string;
  name: string;
  email?: string;
}

function getOwnerName(task: ZohoTask): string {
  const owners = task.owners_and_work?.owners || [];
  const real = owners.find(o => o.name !== "Unassigned User");
  return real?.first_name || real?.name || "—";
}

function getOwnerZpuid(task: ZohoTask): string {
  const owners = task.owners_and_work?.owners || [];
  const real = owners.find(o => o.name !== "Unassigned User");
  return real?.zpuid || "";
}

function isOverdue(task: ZohoTask): boolean {
  if (task.is_completed || task.status?.is_closed_type) return false;
  if (!task.end_date) return false;
  const due = new Date(task.end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getPriorityBg(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case "high": return "bg-red-500/15 text-red-400";
    case "medium": return "bg-amber-500/15 text-amber-400";
    case "low": return "bg-emerald-500/15 text-emerald-400";
    default: return "bg-zinc-500/10 text-muted-foreground/50";
  }
}

const DEFAULT_PROJECT_KEY = "orbia-zoho-default-project";

function TaskRow({ task, projectId, members, statusOptions, tasklists }: {
  task: ZohoTask;
  projectId: string;
  members: ZohoMember[];
  statusOptions: { id: string; name: string }[];
  tasklists: { id: string; name: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: task.name,
    description: task.description || "",
    priority: task.priority || "none",
    start_date: task.start_date ? task.start_date.split("T")[0] : "",
    end_date: task.end_date ? task.end_date.split("T")[0] : "",
    person_responsible: getOwnerZpuid(task),
  });
  const queryClient = useQueryClient();
  const overdue = isOverdue(task);
  const ownerName = getOwnerName(task);
  const isDone = task.is_completed || task.status?.is_closed_type;
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: (data: any) => zohoApi(`/api/zoho/projects/${projectId}/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zoho/projects", projectId, "tasks"] });
      setEditing(false);
      toast({ title: "Task updated" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const payload: any = {};
    if (editData.name !== task.name) payload.name = editData.name;
    if (editData.description !== (task.description || "")) payload.description = editData.description;
    if (editData.priority !== (task.priority || "none")) payload.priority = editData.priority;
    if (editData.start_date) payload.start_date = editData.start_date + "T00:00:00.000Z";
    if (editData.end_date) payload.end_date = editData.end_date + "T00:00:00.000Z";
    if (editData.person_responsible && editData.person_responsible !== getOwnerZpuid(task)) {
      payload.person_responsible = editData.person_responsible;
    }
    if (Object.keys(payload).length > 0) {
      updateMutation.mutate(payload);
    } else {
      setEditing(false);
    }
  };

  const handleMarkDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const closedStatus = statusOptions.find(s => s.name.toLowerCase().includes("close") || s.name.toLowerCase().includes("done") || s.name.toLowerCase().includes("complete"));
    if (closedStatus) {
      updateMutation.mutate({ status: { id: closedStatus.id } });
    } else {
      updateMutation.mutate({ percent_complete: 100 });
    }
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const inProgressStatus = statusOptions.find(s => s.name.toLowerCase().includes("progress") || s.name.toLowerCase().includes("active"));
    if (inProgressStatus) {
      updateMutation.mutate({ status: { id: inProgressStatus.id } });
    }
  };

  return (
    <div
      className={cn(
        "border-b border-indigo-500/8 last:border-b-0 transition-colors",
        expanded && "bg-indigo-500/[0.03]"
      )}
      data-testid={`card-task-${task.id}`}
    >
      <button
        onClick={() => { setExpanded(!expanded); setEditing(false); }}
        className={cn(
          "w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-indigo-500/[0.04] transition-colors group",
          isDone && "opacity-50"
        )}
        data-testid={`button-expand-task-${task.id}`}
      >
        <ChevronRight className={cn("w-3 h-3 text-muted-foreground/30 shrink-0 transition-transform mt-0.5", expanded && "rotate-90")} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 mb-0.5">
            {overdue && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />}
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded border shrink-0",
              getPriorityBg(task.priority)
            )} style={mono}>
              {(task.priority || "none").slice(0, 3)}
            </span>
            {task.prefix && (
              <span className="text-[9px] text-indigo-400/40 shrink-0" style={mono}>
                {task.prefix}
              </span>
            )}
            <span className={cn(
              "text-[12px] text-foreground/85 font-medium leading-snug line-clamp-2",
              isDone && "line-through"
            )}>
              {task.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/40" style={mono}>
            <span className="truncate max-w-[100px]">{ownerName}</span>
            {task.end_date && (
              <span className={cn(overdue ? "text-red-400" : "")}>
                {formatDate(task.end_date)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
          {!isDone && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {!task.status?.name?.toLowerCase().includes("progress") && (
                <span
                  onClick={handleStart}
                  className="p-1 rounded hover:bg-amber-500/15 text-amber-400/60 hover:text-amber-400"
                  data-testid={`button-start-task-${task.id}`}
                >
                  <Play className="w-3 h-3" />
                </span>
              )}
              <span
                onClick={handleMarkDone}
                className="p-1 rounded hover:bg-emerald-500/15 text-emerald-400/60 hover:text-emerald-400"
                data-testid={`button-done-task-${task.id}`}
              >
                <Check className="w-3 h-3" />
              </span>
            </div>
          )}
          {updateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && !editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 ml-5">
              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground/50 mb-2" style={mono}>
                {task.tasklist?.name && <span>{task.tasklist.name}</span>}
                {task.start_date && task.end_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {formatDate(task.start_date)} → {formatDate(task.end_date)}
                  </span>
                )}
                <span>{ownerName}</span>
              </div>
              {task.description && (
                <p className="text-[11px] text-foreground/50 leading-relaxed mb-2 line-clamp-3">{task.description}</p>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-6 px-2 text-indigo-400 hover:bg-indigo-500/10"
                onClick={() => setEditing(true)}
                data-testid={`button-edit-task-${task.id}`}
              >
                <Pencil className="w-2.5 h-2.5 mr-1" />
                Edit
              </Button>
            </div>
          </motion.div>
        )}

        {editing && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 ml-5 space-y-2">
              <Input
                value={editData.name}
                onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                className="text-xs bg-black/30 border-indigo-500/15 h-7"
                data-testid={`input-edit-name-${task.id}`}
              />
              <textarea
                value={editData.description}
                onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                className="w-full text-[11px] bg-black/30 border border-indigo-500/15 rounded-lg p-2 text-foreground/80 min-h-[50px] resize-none focus:outline-none focus:border-indigo-500/30"
                data-testid={`input-edit-desc-${task.id}`}
              />
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-1">
                  {["none", "low", "medium", "high"].map(p => (
                    <button
                      key={p}
                      onClick={() => setEditData(d => ({ ...d, priority: p }))}
                      className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded border transition-all capitalize",
                        editData.priority === p ? getPriorityBg(p) + " border-current/20" : "border-zinc-700/30 text-muted-foreground/40"
                      )}
                      style={mono}
                      data-testid={`button-priority-${p}-${task.id}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <select
                  value={editData.person_responsible}
                  onChange={e => setEditData(d => ({ ...d, person_responsible: e.target.value }))}
                  className="text-xs bg-black/30 border border-indigo-500/15 rounded px-1.5 py-0.5 text-foreground/80"
                  data-testid={`select-owner-${task.id}`}
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.zpuid || m.id} value={m.zpuid || m.id}>{m.name}</option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={editData.end_date}
                  onChange={e => setEditData(d => ({ ...d, end_date: e.target.value }))}
                  className="text-xs bg-black/30 border-indigo-500/15 h-6 w-[130px]"
                  data-testid={`input-end-date-${task.id}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="text-xs h-6 bg-indigo-600 hover:bg-indigo-500 px-3"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  data-testid={`button-save-task-${task.id}`}
                >
                  {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-2.5 h-2.5 mr-1" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-6 text-muted-foreground" onClick={() => setEditing(false)} data-testid={`button-cancel-edit-${task.id}`}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateTaskPanel({ projectId, tasklists, members, onClose }: {
  projectId: string;
  tasklists: { id: string; name: string }[];
  members: ZohoMember[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
    tasklist_id: tasklists[0]?.id || "",
    priority: "none",
    end_date: "",
    person_responsible: "",
  });

  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: any) => zohoApi(`/api/zoho/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zoho/projects", projectId, "tasks"] });
      onClose();
      toast({ title: "Task created" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    const payload: any = { name: form.name.trim() };
    if (form.description) payload.description = form.description;
    if (form.tasklist_id) payload.tasklist = { id: form.tasklist_id };
    if (form.priority !== "none") payload.priority = form.priority;
    if (form.end_date) payload.end_date = form.end_date + "T00:00:00.000Z";
    if (form.person_responsible) payload.person_responsible = form.person_responsible;
    createMutation.mutate(payload);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className={cn(cmdPanel, "p-3 mb-3")} data-testid="panel-create-task">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-[0.15em] text-indigo-400/60" style={mono}>New Task</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-create">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Task name..."
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="text-xs bg-black/30 border-indigo-500/15 h-8"
            autoFocus
            data-testid="input-create-name"
          />
          <div className="flex gap-2 flex-wrap">
            <select
              value={form.tasklist_id}
              onChange={e => setForm(f => ({ ...f, tasklist_id: e.target.value }))}
              className="text-xs bg-black/30 border border-indigo-500/15 rounded-lg px-2 py-1 text-foreground/80 flex-1 min-w-[100px]"
              data-testid="select-create-tasklist"
            >
              {tasklists.map(tl => (
                <option key={tl.id} value={tl.id}>{tl.name}</option>
              ))}
            </select>
            <select
              value={form.person_responsible}
              onChange={e => setForm(f => ({ ...f, person_responsible: e.target.value }))}
              className="text-xs bg-black/30 border border-indigo-500/15 rounded-lg px-2 py-1 text-foreground/80 flex-1 min-w-[100px]"
              data-testid="select-create-owner"
            >
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.zpuid || m.id} value={m.zpuid || m.id}>{m.name}</option>
              ))}
            </select>
            <div className="flex gap-1">
              {["none", "low", "medium", "high"].map(p => (
                <button
                  key={p}
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={cn(
                    "text-[8px] px-1.5 py-0.5 rounded border transition-all capitalize",
                    form.priority === p ? getPriorityBg(p) + " border-current/20" : "border-zinc-700/30 text-muted-foreground/40"
                  )}
                  style={mono}
                  data-testid={`button-create-priority-${p}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input
              type="date"
              value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              className="text-xs bg-black/30 border-indigo-500/15 h-6 w-[130px]"
              data-testid="input-create-end"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-xs h-7"
              onClick={handleCreate}
              disabled={!form.name.trim() || createMutation.isPending}
              data-testid="button-create-submit"
            >
              {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
              Create
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function ZohoChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickChips = [
    "Show overdue tasks",
    "What needs attention?",
    "Summarize progress",
  ];

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isStreaming) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const url = API_BASE_URL ? `${API_BASE_URL}/api/zoho/chat` : "/api/zoho/chat";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          projectId,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) {
              assistantText += parsed.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: cleanActionTags(assistantText) };
                return updated;
              });
            }
            if (parsed.action) {
              if (parsed.action.includes("created") || parsed.action.includes("updated") || parsed.action.includes("completed")) {
                queryClient.invalidateQueries({ queryKey: ["/api/zoho/projects", projectId, "tasks"] });
              }
              if (parsed.action === "zoho_action_failed") {
                toast({ title: "Action failed", description: parsed.error, variant: "destructive" });
              }
            }
          } catch {}
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: cleanActionTags(assistantText) };
        return updated;
      });
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="panel-zoho-chat">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/10 p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-foreground/80 mb-1">Zoho Assistant</p>
            <p className="text-[11px] text-muted-foreground/60 mb-4 max-w-[200px]">
              Create, update, and manage your Zoho tasks with AI
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {quickChips.map(chip => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-500/8 border border-indigo-500/15 text-indigo-300 hover:bg-indigo-500/15 transition-colors"
                  data-testid={`chip-${chip.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed",
              msg.role === "user"
                ? "bg-indigo-600/20 border border-indigo-500/25 text-foreground/90"
                : "bg-black/20 border border-indigo-500/10 text-foreground/80"
            )}>
              {msg.role === "assistant" && !msg.content && isStreaming ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                  <span className="text-muted-foreground/50 text-[11px]">Thinking...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 pt-2 border-t border-indigo-500/10 shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Create a task, ask about progress..."
            className="text-xs bg-black/30 border-indigo-500/15 h-8 flex-1"
            disabled={isStreaming}
            data-testid="input-zoho-chat"
          />
          <Button
            type="submit"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 h-8 w-8 p-0"
            disabled={!input.trim() || isStreaming}
            data-testid="button-send-zoho-chat"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function cleanActionTags(text: string): string {
  return text.replace(/\[ZOHO_(?:CREATE|UPDATE|COMPLETE)\s+[^\]]*\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export default function ZohoPanel() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return localStorage.getItem(DEFAULT_PROJECT_KEY) || "";
  });
  const [filterTasklist, setFilterTasklist] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [mobileView, setMobileView] = useState<"tasks" | "ai">("tasks");

  const { data: zohoStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ["/api/zoho/status"],
    queryFn: () => zohoApi("/api/zoho/status"),
    retry: false,
    staleTime: 60 * 1000,
  });

  const isConfigured = zohoStatus?.configured === true;

  const { data: projectsData, isLoading: loadingProjects, isError: projectsError, refetch: refetchProjects } = useQuery({
    queryKey: ["/api/zoho/projects"],
    queryFn: () => zohoApi("/api/zoho/projects"),
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
    enabled: isConfigured,
  });

  const projects: ZohoProject[] = useMemo(() => {
    if (!projectsData) return [];
    return projectsData.projects || projectsData || [];
  }, [projectsData]);

  const validSelectedId = projects.find(p => p.id === selectedProjectId)?.id || "";
  const activeProjectId = validSelectedId || projects[0]?.id || "";

  useEffect(() => {
    if (selectedProjectId && !validSelectedId && projects.length > 0) {
      const fallback = projects[0].id;
      setSelectedProjectId(fallback);
      localStorage.setItem(DEFAULT_PROJECT_KEY, fallback);
    }
  }, [selectedProjectId, validSelectedId, projects]);

  const setDefaultProject = useCallback((pid: string) => {
    setSelectedProjectId(pid);
    localStorage.setItem(DEFAULT_PROJECT_KEY, pid);
    setFilterTasklist("");
    setStatusFilter("");
  }, []);

  const { data: tasklistsData } = useQuery({
    queryKey: ["/api/zoho/projects", activeProjectId, "tasklists"],
    queryFn: () => zohoApi(`/api/zoho/projects/${activeProjectId}/tasklists`),
    enabled: !!activeProjectId,
    refetchInterval: 5 * 60 * 1000,
  });

  const tasklists = useMemo(() => {
    if (!tasklistsData) return [];
    return tasklistsData.tasklists || tasklistsData || [];
  }, [tasklistsData]);

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ["/api/zoho/projects", activeProjectId, "tasks"],
    queryFn: () => zohoApi(`/api/zoho/projects/${activeProjectId}/tasks`),
    enabled: !!activeProjectId,
    refetchInterval: 30 * 1000,
  });

  const { data: membersData } = useQuery({
    queryKey: ["/api/zoho/projects", activeProjectId, "members"],
    queryFn: () => zohoApi(`/api/zoho/projects/${activeProjectId}/members`),
    enabled: !!activeProjectId,
    refetchInterval: 5 * 60 * 1000,
  });

  const members: ZohoMember[] = useMemo(() => {
    if (!membersData) return [];
    return membersData.users || membersData || [];
  }, [membersData]);

  const statusOptions = useMemo(() => {
    const allTasks: ZohoTask[] = tasksData?.tasks || tasksData || [];
    const seen = new Map<string, string>();
    allTasks.forEach(t => {
      if (t.status?.id && t.status?.name) {
        seen.set(t.status.id, t.status.name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [tasksData]);

  const { overdueTasks, inProgressTasks, openTasks, doneTasks } = useMemo(() => {
    const allTasks: ZohoTask[] = tasksData?.tasks || tasksData || [];
    let filtered = allTasks;
    if (filterTasklist) {
      filtered = filtered.filter(t => t.tasklist?.id === filterTasklist);
    }

    const overdue: ZohoTask[] = [];
    const inProgress: ZohoTask[] = [];
    const open: ZohoTask[] = [];
    const done: ZohoTask[] = [];

    filtered.forEach(task => {
      if (task.is_completed || task.status?.is_closed_type) {
        done.push(task);
      } else if (isOverdue(task)) {
        overdue.push(task);
      } else if (task.status?.name?.toLowerCase().includes("progress") || task.status?.name?.toLowerCase().includes("active")) {
        inProgress.push(task);
      } else {
        open.push(task);
      }
    });

    overdue.sort((a, b) => {
      const da = a.end_date ? new Date(a.end_date).getTime() : 0;
      const db = b.end_date ? new Date(b.end_date).getTime() : 0;
      return da - db;
    });

    open.sort((a, b) => {
      const da = a.end_date ? new Date(a.end_date).getTime() : Infinity;
      const db = b.end_date ? new Date(b.end_date).getTime() : Infinity;
      return da - db;
    });

    return { overdueTasks: overdue, inProgressTasks: inProgress, openTasks: open, doneTasks: done };
  }, [tasksData, filterTasklist]);

  const filteredByStatus = useMemo(() => {
    if (!statusFilter) return null;
    switch (statusFilter) {
      case "open": return openTasks;
      case "active": return inProgressTasks;
      case "overdue": return overdueTasks;
      case "done": return doneTasks;
      default: return null;
    }
  }, [statusFilter, openTasks, inProgressTasks, overdueTasks, doneTasks]);

  if (loadingStatus || (isConfigured && loadingProjects)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400/40" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="panel-zoho-onboarding">
        <div className={cn(cmdPanel, "p-5 inline-flex mb-4")}>
          <FolderOpen className="w-8 h-8 text-indigo-400/40" />
        </div>
        <h3 className="text-sm font-medium text-foreground mb-1">Zoho Projects not connected</h3>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
          Connect your Zoho account to manage projects and tasks directly from Orbia.
        </p>
        <p className="text-xs text-muted-foreground/40 mt-3">
          Ask your admin to configure Zoho credentials in settings.
        </p>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className={cn(cmdPanel, "p-5 inline-flex mb-4")}>
          <AlertCircle className="w-8 h-8 text-red-400/40" />
        </div>
        <p className="text-sm text-muted-foreground">Unable to reach Zoho right now</p>
        <p className="text-xs text-muted-foreground/50 mt-1 mb-3">This may be a temporary issue. Try again in a moment.</p>
        <Button
          size="sm"
          variant="outline"
          className="text-xs border-indigo-500/20 text-indigo-400"
          onClick={() => refetchProjects()}
          data-testid="button-retry-zoho"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className={cn(cmdPanel, "p-5 inline-flex mb-4")}>
          <FolderOpen className="w-8 h-8 text-indigo-400/30" />
        </div>
        <p className="text-sm text-muted-foreground">No active projects in Zoho</p>
        <p className="text-xs text-muted-foreground/50 mt-1">Create a project in Zoho to see it here.</p>
      </div>
    );
  }

  const activeTasks = [...overdueTasks, ...inProgressTasks, ...openTasks];
  const displayTasks = filteredByStatus || activeTasks;

  const SectionGroup = ({ label, tasks, color, iconEl }: { label: string; tasks: ZohoTask[]; color: string; iconEl: React.ReactNode }) => {
    if (tasks.length === 0) return null;
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/[0.03] border-b border-indigo-500/8">
          {iconEl}
          <span className={cn("text-[9px] uppercase tracking-[0.12em] font-medium", color)} style={mono}>
            {label} ({tasks.length})
          </span>
        </div>
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            projectId={activeProjectId}
            members={members}
            statusOptions={statusOptions}
            tasklists={tasklists}
          />
        ))}
      </>
    );
  };

  const isDefaultProject = selectedProjectId === activeProjectId && !!selectedProjectId;
  const currentProject = projects.find(p => p.id === activeProjectId);

  const TasksPanel = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <select
            value={activeProjectId}
            onChange={e => setDefaultProject(e.target.value)}
            className="text-xs bg-black/40 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 text-foreground/90 focus:outline-none focus:border-indigo-500/35 min-w-0 max-w-[200px]"
            data-testid="select-zoho-project"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {isDefaultProject && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0" style={mono}>
              <Pin className="w-2.5 h-2.5 inline mr-0.5" />DEFAULT
            </span>
          )}
        </div>

        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-500 text-xs h-7 px-3"
          onClick={() => setShowCreate(true)}
          data-testid="button-new-task"
        >
          <Plus className="w-3 h-3 mr-1" />
          New
        </Button>
      </div>

      {tasklists.length > 1 && (
        <div className="flex gap-1 overflow-x-auto scrollbar-none mb-2 shrink-0">
          <button
            onClick={() => setFilterTasklist("")}
            className={cn(
              "text-[9px] px-2 py-1 rounded-md border whitespace-nowrap",
              !filterTasklist ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-300" : "border-zinc-700/30 text-muted-foreground/40"
            )}
            style={mono}
            data-testid="chip-filter-all"
          >
            All
          </button>
          {tasklists.map((tl: any) => (
            <button
              key={tl.id}
              onClick={() => setFilterTasklist(tl.id === filterTasklist ? "" : tl.id)}
              className={cn(
                "text-[9px] px-2 py-1 rounded-md border whitespace-nowrap",
                filterTasklist === tl.id ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-300" : "border-zinc-700/30 text-muted-foreground/40"
              )}
              style={mono}
              data-testid={`chip-filter-${tl.id}`}
            >
              {tl.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5 mb-2 shrink-0">
        {[
          { key: "open", label: "Open", count: openTasks.length, icon: Circle, color: "text-indigo-400" },
          { key: "active", label: "Active", count: inProgressTasks.length, icon: Clock, color: "text-amber-400" },
          { key: "overdue", label: "Overdue", count: overdueTasks.length, icon: AlertTriangle, color: overdueTasks.length > 0 ? "text-red-400" : "text-red-400/40" },
          { key: "done", label: "Done", count: doneTasks.length, icon: CheckCircle2, color: "text-emerald-400/60" },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(statusFilter === s.key ? "" : s.key)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all text-left",
              statusFilter === s.key
                ? "bg-indigo-500/10 border-indigo-500/25"
                : "bg-black/20 border-indigo-500/8 hover:border-indigo-500/15"
            )}
            data-testid={`card-pulse-${s.label.toLowerCase()}`}
          >
            <s.icon className={cn("w-3 h-3 shrink-0", s.color)} />
            <span className="text-sm font-bold text-foreground leading-none" style={mono}>{s.count}</span>
            <span className="text-[8px] uppercase text-muted-foreground/50 hidden xl:inline" style={mono}>{s.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateTaskPanel
            projectId={activeProjectId}
            tasklists={tasklists}
            members={members}
            onClose={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>

      <div className={cn(cmdPanel, "flex-1 overflow-hidden flex flex-col min-h-0")}>
        {loadingTasks ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400/40" />
          </div>
        ) : filteredByStatus ? (
          <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-indigo-500/10">
            {filteredByStatus.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground/50">No tasks in this category</p>
              </div>
            ) : (
              filteredByStatus.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projectId={activeProjectId}
                  members={members}
                  statusOptions={statusOptions}
                  tasklists={tasklists}
                />
              ))
            )}
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-indigo-500/10">
            <SectionGroup label="Needs Attention" tasks={overdueTasks} color="text-red-400" iconEl={<AlertTriangle className="w-3 h-3 text-red-400" />} />
            <SectionGroup label="In Progress" tasks={inProgressTasks} color="text-amber-400" iconEl={<Clock className="w-3 h-3 text-amber-400" />} />
            <SectionGroup label="Up Next" tasks={openTasks} color="text-indigo-400" iconEl={<Circle className="w-3 h-3 text-indigo-400" />} />

            {doneTasks.length > 0 && (
              <>
                <button
                  onClick={() => setShowDone(!showDone)}
                  className="flex items-center gap-2 px-3 py-1.5 w-full bg-indigo-500/[0.03] border-b border-indigo-500/8 hover:bg-indigo-500/[0.06]"
                  data-testid="button-toggle-done"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400/50" />
                  <span className="text-[9px] uppercase tracking-[0.12em] font-medium text-emerald-400/50" style={mono}>
                    Completed ({doneTasks.length})
                  </span>
                  <div className="flex-1" />
                  {showDone ? <ChevronUp className="w-3 h-3 text-muted-foreground/30" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/30" />}
                </button>
                {showDone && doneTasks.slice(0, 10).map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectId={activeProjectId}
                    members={members}
                    statusOptions={statusOptions}
                    tasklists={tasklists}
                  />
                ))}
              </>
            )}

            {overdueTasks.length === 0 && inProgressTasks.length === 0 && openTasks.length === 0 && doneTasks.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-6 h-6 text-emerald-400/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No tasks found</p>
                <p className="text-xs text-muted-foreground/50">Create one to get started</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div data-testid="panel-zoho" className="flex flex-col h-full">
      <div className="hidden lg:grid lg:grid-cols-[1fr_minmax(300px,0.8fr)] gap-4 flex-1 min-h-0">
        <TasksPanel />
        <div className={cn(cmdPanelGlow, "flex flex-col min-h-0 overflow-hidden")}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-indigo-500/10 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs uppercase tracking-[0.15em] text-indigo-400/70 font-medium" style={mono}>
              Zoho Assistant
            </span>
          </div>
          <ZohoChat projectId={activeProjectId} />
        </div>
      </div>

      <div className="lg:hidden flex flex-col h-full min-h-0">
        <div className="flex gap-1 mb-3 p-1 bg-black/30 rounded-xl border border-indigo-500/10 shrink-0">
          <button
            onClick={() => setMobileView("tasks")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              mobileView === "tasks"
                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="tab-mobile-zoho-tasks"
          >
            <ListTodo className="w-3.5 h-3.5" />
            Tasks
          </button>
          <button
            onClick={() => setMobileView("ai")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              mobileView === "ai"
                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="tab-mobile-zoho-ai"
          >
            <Bot className="w-3.5 h-3.5" />
            Assistant
          </button>
        </div>

        {mobileView === "tasks" ? (
          <TasksPanel />
        ) : (
          <div className={cn(cmdPanelGlow, "flex flex-col flex-1 min-h-[400px] overflow-hidden")}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-indigo-500/10 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs uppercase tracking-[0.15em] text-indigo-400/70 font-medium" style={mono}>
                Zoho Assistant
              </span>
            </div>
            <ZohoChat projectId={activeProjectId} />
          </div>
        )}
      </div>
    </div>
  );
}
