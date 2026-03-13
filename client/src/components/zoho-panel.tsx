import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Plus, ChevronDown, ChevronUp, AlertTriangle,
  Clock, CheckCircle2, Circle, X, Save, Play, Check,
  FolderOpen, Users, CalendarDays, Flag, AlertCircle, RefreshCw
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

function CmdLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[10px] uppercase tracking-[0.15em] text-indigo-400/60", className)} style={mono}>
      {children}
    </span>
  );
}

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
  return real?.first_name || real?.name || "Unassigned";
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

function getPriorityColor(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case "high": return "text-red-400";
    case "medium": return "text-amber-400";
    case "low": return "text-emerald-400";
    default: return "text-muted-foreground/40";
  }
}

function getPriorityBg(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case "high": return "bg-red-500/15 border-red-500/20 text-red-400";
    case "medium": return "bg-amber-500/15 border-amber-500/20 text-amber-400";
    case "low": return "bg-emerald-500/15 border-emerald-500/20 text-emerald-400";
    default: return "bg-zinc-500/10 border-zinc-500/15 text-muted-foreground";
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

function PulseCard({ label, count, icon: Icon, color, active, onClick }: {
  label: string;
  count: number;
  icon: typeof Circle;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onClick={onClick}
      className={cn(
        cmdPanel,
        "p-4 text-left transition-all group cursor-pointer",
        active && "ring-1 ring-indigo-500/30 shadow-[0_0_20px_rgba(100,80,255,0.08)]"
      )}
      data-testid={`card-pulse-${label.toLowerCase()}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("w-4 h-4", color)} />
        {active && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
      </div>
      <p className="text-2xl font-bold text-foreground" style={mono}>{count}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5" style={mono}>{label}</p>
    </motion.button>
  );
}

function TaskCard({ task, index, projectId, members, statusOptions, tasklists }: {
  task: ZohoTask;
  index: number;
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

  const handleMarkDone = () => {
    const closedStatus = statusOptions.find(s => s.name.toLowerCase().includes("close") || s.name.toLowerCase().includes("done") || s.name.toLowerCase().includes("complete"));
    if (closedStatus) {
      updateMutation.mutate({ status: { id: closedStatus.id } });
    } else {
      updateMutation.mutate({ percent_complete: 100 });
    }
  };

  const handleStart = () => {
    const inProgressStatus = statusOptions.find(s => s.name.toLowerCase().includes("progress") || s.name.toLowerCase().includes("active"));
    if (inProgressStatus) {
      updateMutation.mutate({ status: { id: inProgressStatus.id } });
    }
  };

  const borderAccent = overdue
    ? "border-l-4 border-l-red-500/50"
    : task.status?.name?.toLowerCase().includes("progress")
      ? "border-l-4 border-l-amber-500/40"
      : isDone
        ? "border-l-4 border-l-emerald-500/30"
        : "";

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        cmdPanel,
        "p-4 transition-all hover:border-indigo-500/25",
        borderAccent,
        isDone && "opacity-60"
      )}
      data-testid={`card-task-${task.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {task.prefix && (
              <span className="text-[10px] text-indigo-400/50 shrink-0" style={mono}>
                {task.prefix}
              </span>
            )}
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full border shrink-0",
              getPriorityBg(task.priority)
            )} style={mono}>
              {task.priority || "none"}
            </span>
            {overdue && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 shrink-0 flex items-center gap-1" style={mono}>
                <AlertTriangle className="w-2.5 h-2.5" />
                LATE
              </span>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left w-full"
            data-testid={`button-expand-task-${task.id}`}
          >
            <p className="text-[13px] font-medium text-foreground/90 leading-snug">
              {task.name}
            </p>
          </button>

          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
                <span className="text-[8px] font-bold text-indigo-400">
                  {ownerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">{ownerName}</span>
            </div>

            {(task.start_date || task.end_date) && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground" style={mono}>
                <CalendarDays className="w-3 h-3" />
                {task.start_date && task.end_date
                  ? `${formatDate(task.start_date)} → ${formatDate(task.end_date)}`
                  : task.end_date
                    ? `Due ${formatDate(task.end_date)}`
                    : `Started ${formatDate(task.start_date)}`
                }
              </div>
            )}

            {task.tasklist?.name && (
              <span className="text-[9px] text-muted-foreground/50 truncate max-w-[120px]" style={mono}>
                {task.tasklist.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && !editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-3 border-t border-indigo-500/10">
              {task.description && (
                <p className="text-xs text-foreground/60 leading-relaxed mb-3 whitespace-pre-wrap">
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {!isDone && !task.status?.name?.toLowerCase().includes("progress") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-7 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                    onClick={handleStart}
                    disabled={updateMutation.isPending}
                    data-testid={`button-start-task-${task.id}`}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-7 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                  onClick={() => setEditing(true)}
                  data-testid={`button-edit-task-${task.id}`}
                >
                  Edit
                </Button>
                {!isDone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-7 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={handleMarkDone}
                    disabled={updateMutation.isPending}
                    data-testid={`button-done-task-${task.id}`}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Done
                  </Button>
                )}
                {updateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
              </div>
            </div>
          </motion.div>
        )}

        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-3 border-t border-indigo-500/10 space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Name</label>
                <Input
                  value={editData.name}
                  onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                  className="text-xs bg-black/30 border-indigo-500/15 h-8"
                  data-testid={`input-edit-name-${task.id}`}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Description</label>
                <textarea
                  value={editData.description}
                  onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                  className="w-full text-xs bg-black/30 border border-indigo-500/15 rounded-lg p-2 text-foreground/80 min-h-[60px] resize-none focus:outline-none focus:border-indigo-500/30"
                  data-testid={`input-edit-desc-${task.id}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Priority</label>
                  <div className="flex gap-1">
                    {["none", "low", "medium", "high"].map(p => (
                      <button
                        key={p}
                        onClick={() => setEditData(d => ({ ...d, priority: p }))}
                        className={cn(
                          "text-[9px] px-2 py-1 rounded-lg border transition-all capitalize",
                          editData.priority === p
                            ? getPriorityBg(p)
                            : "border-zinc-700/30 text-muted-foreground/40 hover:border-zinc-600/40"
                        )}
                        style={mono}
                        data-testid={`button-priority-${p}-${task.id}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Owner</label>
                  <select
                    value={editData.person_responsible}
                    onChange={e => setEditData(d => ({ ...d, person_responsible: e.target.value }))}
                    className="w-full text-xs bg-black/30 border border-indigo-500/15 rounded-lg p-1.5 text-foreground/80 focus:outline-none focus:border-indigo-500/30"
                    data-testid={`select-owner-${task.id}`}
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.zpuid || m.id} value={m.zpuid || m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Start</label>
                  <Input
                    type="date"
                    value={editData.start_date}
                    onChange={e => setEditData(d => ({ ...d, start_date: e.target.value }))}
                    className="text-xs bg-black/30 border-indigo-500/15 h-8"
                    data-testid={`input-start-date-${task.id}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Due</label>
                  <Input
                    type="date"
                    value={editData.end_date}
                    onChange={e => setEditData(d => ({ ...d, end_date: e.target.value }))}
                    className="text-xs bg-black/30 border-indigo-500/15 h-8"
                    data-testid={`input-end-date-${task.id}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="text-[10px] h-7 bg-indigo-600 hover:bg-indigo-500"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  data-testid={`button-save-task-${task.id}`}
                >
                  {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[10px] h-7 text-muted-foreground"
                  onClick={() => setEditing(false)}
                  data-testid={`button-cancel-edit-${task.id}`}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
    start_date: "",
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
    if (form.start_date) payload.start_date = form.start_date + "T00:00:00.000Z";
    if (form.end_date) payload.end_date = form.end_date + "T00:00:00.000Z";
    if (form.person_responsible) payload.person_responsible = form.person_responsible;
    createMutation.mutate(payload);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className={cn(cmdPanel, "p-5 mb-5")} data-testid="panel-create-task">
        <div className="flex items-center justify-between mb-4">
          <CmdLabel>New Task</CmdLabel>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-create">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="Task name..."
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="text-sm bg-black/30 border-indigo-500/15 focus:border-indigo-500/30"
            autoFocus
            data-testid="input-create-name"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full text-xs bg-black/30 border border-indigo-500/15 rounded-lg p-2.5 text-foreground/80 min-h-[60px] resize-none focus:outline-none focus:border-indigo-500/30 placeholder:text-muted-foreground/40"
            data-testid="input-create-desc"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Task List</label>
              <select
                value={form.tasklist_id}
                onChange={e => setForm(f => ({ ...f, tasklist_id: e.target.value }))}
                className="w-full text-xs bg-black/30 border border-indigo-500/15 rounded-lg p-1.5 text-foreground/80 focus:outline-none focus:border-indigo-500/30"
                data-testid="select-create-tasklist"
              >
                {tasklists.map(tl => (
                  <option key={tl.id} value={tl.id}>{tl.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Owner</label>
              <select
                value={form.person_responsible}
                onChange={e => setForm(f => ({ ...f, person_responsible: e.target.value }))}
                className="w-full text-xs bg-black/30 border border-indigo-500/15 rounded-lg p-1.5 text-foreground/80 focus:outline-none focus:border-indigo-500/30"
                data-testid="select-create-owner"
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.zpuid || m.id} value={m.zpuid || m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Priority</label>
            <div className="flex gap-1.5">
              {["none", "low", "medium", "high"].map(p => (
                <button
                  key={p}
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={cn(
                    "text-[10px] px-2.5 py-1 rounded-lg border transition-all capitalize",
                    form.priority === p
                      ? getPriorityBg(p)
                      : "border-zinc-700/30 text-muted-foreground/40 hover:border-zinc-600/40"
                  )}
                  style={mono}
                  data-testid={`button-create-priority-${p}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Start</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="text-xs bg-black/30 border-indigo-500/15 h-8"
                data-testid="input-create-start"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block" style={mono}>Due</label>
              <Input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="text-xs bg-black/30 border-indigo-500/15 h-8"
                data-testid="input-create-end"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-xs"
              onClick={handleCreate}
              disabled={!form.name.trim() || createMutation.isPending}
              data-testid="button-create-submit"
            >
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Create Task
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ZohoPanel() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [filterTasklist, setFilterTasklist] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDone, setShowDone] = useState(false);

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

  const activeProjectId = selectedProjectId || projects[0]?.id || "";

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
        <p className="text-[10px] text-muted-foreground/40 mt-3">
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

  const renderSection = (title: string, tasks: ZohoTask[], icon: typeof Circle, color: string, defaultOpen: boolean = true) => {
    if (tasks.length === 0) return null;
    return (
      <TaskSection
        key={title}
        title={title}
        tasks={tasks}
        icon={icon}
        color={color}
        defaultOpen={defaultOpen}
        projectId={activeProjectId}
        members={members}
        statusOptions={statusOptions}
        tasklists={tasklists}
      />
    );
  };

  return (
    <div data-testid="panel-zoho">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={activeProjectId}
            onChange={e => { setSelectedProjectId(e.target.value); setFilterTasklist(""); setStatusFilter(""); }}
            className="text-sm bg-black/40 border border-indigo-500/20 rounded-xl px-3 py-2 text-foreground/90 focus:outline-none focus:border-indigo-500/35 backdrop-blur-xl"
            data-testid="select-zoho-project"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-500 text-xs"
          onClick={() => setShowCreate(true)}
          data-testid="button-new-task"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Task
        </Button>
      </div>

      {tasklists.length > 1 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterTasklist("")}
            className={cn(
              "text-[10px] px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all",
              !filterTasklist
                ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-300"
                : "border-zinc-700/30 text-muted-foreground/50 hover:border-zinc-600/40 hover:text-muted-foreground"
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
                "text-[10px] px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all",
                filterTasklist === tl.id
                  ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-300"
                  : "border-zinc-700/30 text-muted-foreground/50 hover:border-zinc-600/40 hover:text-muted-foreground"
              )}
              style={mono}
              data-testid={`chip-filter-${tl.id}`}
            >
              {tl.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <PulseCard
          label="Open"
          count={openTasks.length}
          icon={Circle}
          color="text-indigo-400"
          active={statusFilter === "open"}
          onClick={() => setStatusFilter(statusFilter === "open" ? "" : "open")}
        />
        <PulseCard
          label="Active"
          count={inProgressTasks.length}
          icon={Clock}
          color="text-amber-400"
          active={statusFilter === "active"}
          onClick={() => setStatusFilter(statusFilter === "active" ? "" : "active")}
        />
        <PulseCard
          label="Overdue"
          count={overdueTasks.length}
          icon={AlertTriangle}
          color={overdueTasks.length > 0 ? "text-red-400" : "text-red-400/40"}
          active={statusFilter === "overdue"}
          onClick={() => setStatusFilter(statusFilter === "overdue" ? "" : "overdue")}
        />
        <PulseCard
          label="Done"
          count={doneTasks.length}
          icon={CheckCircle2}
          color="text-emerald-400/60"
          active={statusFilter === "done"}
          onClick={() => setStatusFilter(statusFilter === "done" ? "" : "done")}
        />
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

      {loadingTasks ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400/40" />
        </div>
      ) : filteredByStatus ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredByStatus.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              index={i}
              projectId={activeProjectId}
              members={members}
              statusOptions={statusOptions}
              tasklists={tasklists}
            />
          ))}
          {filteredByStatus.length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-xs text-muted-foreground/50">No tasks in this category</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection("Needs Attention", overdueTasks, AlertTriangle, "text-red-400")}
          {renderSection("In Progress", inProgressTasks, Clock, "text-amber-400")}
          {renderSection("Up Next", openTasks, Circle, "text-indigo-400")}

          {doneTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-2 mb-3 group"
                data-testid="button-toggle-done"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50" />
                  <CmdLabel className="text-emerald-400/40">Completed ({doneTasks.length})</CmdLabel>
                </div>
                {showDone ? (
                  <ChevronUp className="w-3 h-3 text-muted-foreground/30" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground/30" />
                )}
              </button>
              <AnimatePresence>
                {showDone && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {doneTasks.slice(0, 10).map((task, i) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={i}
                          projectId={activeProjectId}
                          members={members}
                          statusOptions={statusOptions}
                          tasklists={tasklists}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {overdueTasks.length === 0 && inProgressTasks.length === 0 && openTasks.length === 0 && doneTasks.length === 0 && (
            <div className="text-center py-12">
              <div className={cn(cmdPanel, "p-5 inline-flex mb-4")}>
                <CheckCircle2 className="w-8 h-8 text-emerald-400/30" />
              </div>
              <p className="text-sm text-muted-foreground">No tasks found</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Create one to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskSection({ title, tasks, icon: Icon, color, defaultOpen, projectId, members, statusOptions, tasklists }: {
  title: string;
  tasks: ZohoTask[];
  icon: typeof Circle;
  color: string;
  defaultOpen: boolean;
  projectId: string;
  members: ZohoMember[];
  statusOptions: { id: string; name: string }[];
  tasklists: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-3 group w-full"
        data-testid={`button-section-${title.toLowerCase().replace(/\s/g, "-")}`}
      >
        <Icon className={cn("w-3.5 h-3.5", color)} />
        <CmdLabel className={color.replace("text-", "text-").replace("/40", "/60")}>
          {title} ({tasks.length})
        </CmdLabel>
        <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/10 to-transparent ml-2" />
        {open ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground/30" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground/30" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {tasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  projectId={projectId}
                  members={members}
                  statusOptions={statusOptions}
                  tasklists={tasklists}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
