import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Rocket, Check, Calendar, Clock, Pencil, Loader2, X,
  ChevronDown, Trash2, ArrowLeft, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useCareerProjects, useCareerTasks,
  useCreateCareerProject, useUpdateCareerProject, useDeleteCareerProject,
  useCreateCareerTask, useUpdateCareerTask, useDeleteCareerTask,
} from "@/lib/api-hooks";
import type { CareerProject } from "@shared/schema";
import { differenceInDays } from "date-fns";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const cmdPanel = "bg-black/40 backdrop-blur-xl border border-indigo-500/15 shadow-[0_0_15px_rgba(100,80,255,0.04)] rounded-2xl";

type EditingTask = {
  id: string;
  title: string;
  completed: number;
  isNew?: boolean;
  isDeleted?: boolean;
};

const STATUS_DISPLAY: Record<string, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  ongoing: "Ongoing",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  in_progress: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  ongoing: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed: "bg-zinc-500/20 text-zinc-500 border-zinc-500/20",
};

function CircularProgress({ progress, size = 44, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-indigo-500/10" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#progressGradWork)" strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progressGradWork" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-indigo-300" style={mono}>{progress}%</span>
      </div>
    </div>
  );
}

function getDeadlineDisplay(deadline: string | null) {
  if (!deadline) return null;
  const days = differenceInDays(new Date(deadline), new Date());
  if (days < 0) return { text: "Overdue", className: "text-red-400" };
  if (days === 0) return { text: "Due today", className: "text-amber-400" };
  if (days === 1) return { text: "Tomorrow", className: "text-amber-400" };
  return { text: `${days}d left`, className: "text-zinc-500" };
}

export default function ProjectsTab() {
  const { data: projects = [] } = useCareerProjects();
  const { data: tasks = [] } = useCareerTasks();

  const createProject = useCreateCareerProject();
  const updateProject = useUpdateCareerProject();
  const deleteProject = useDeleteCareerProject();
  const createTask = useCreateCareerTask();
  const updateTask = useUpdateCareerTask();
  const deleteTask = useDeleteCareerTask();

  const [selectedProject, setSelectedProject] = useState<CareerProject | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<CareerProject | null>(null);
  const [newProjectTask, setNewProjectTask] = useState("");
  const [editingProjectTasks, setEditingProjectTasks] = useState<EditingTask[]>([]);
  const [newEditingProjectTask, setNewEditingProjectTask] = useState("");
  const [expandedParentTasks, setExpandedParentTasks] = useState<Set<string>>(new Set());
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const getProjectTasks = (projectId: string) => tasks.filter(t => t.projectId === projectId);
  const getParentTasks = (projectId: string) => tasks.filter(t => t.projectId === projectId && !t.parentId);
  const getSubtasks = (parentId: string) => tasks.filter(t => t.parentId === parentId);
  const getProjectProgress = (projectId: string) => {
    const pt = getProjectTasks(projectId);
    if (pt.length === 0) return 0;
    return Math.round((pt.filter(t => t.completed === 1).length / pt.length) * 100);
  };

  const getEmptyProject = (): Partial<CareerProject> => ({
    title: "", description: "", status: "planning", progress: 0,
    deadline: null, nextAction: "", color: "bg-indigo-500", tags: [],
  });

  const openProjectDialog = (project: CareerProject | null) => {
    if (project) {
      setSelectedProject(project);
      setEditingProjectTasks(getProjectTasks(project.id).map(t => ({
        id: t.id, title: t.title, completed: t.completed,
      })));
    } else {
      setSelectedProject(null);
      setEditingProjectTasks([]);
    }
    setNewEditingProjectTask("");
    setIsProjectDialogOpen(true);
  };

  const handleAddEditingTask = () => {
    if (!newEditingProjectTask.trim()) return;
    setEditingProjectTasks(prev => [...prev, {
      id: `temp-${Date.now()}`, title: newEditingProjectTask, completed: 0, isNew: true,
    }]);
    setNewEditingProjectTask("");
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.title) return;
    const projectData = {
      title: selectedProject.title,
      description: selectedProject.description || "",
      status: selectedProject.status || "planning",
      progress: selectedProject.id ? getProjectProgress(selectedProject.id) : 0,
      deadline: selectedProject.deadline || "",
      nextAction: selectedProject.nextAction || "",
      color: selectedProject.color || "bg-indigo-500",
      tags: selectedProject.tags || [],
    };
    if (selectedProject.id) {
      updateProject.mutate({ id: selectedProject.id, ...projectData });
      const originalTasks = getProjectTasks(selectedProject.id);
      for (const task of editingProjectTasks) {
        if (task.isDeleted && !task.isNew) {
          deleteTask.mutate(task.id);
        } else if (task.isNew && !task.isDeleted) {
          createTask.mutate({ title: task.title, projectId: selectedProject.id, parentId: null, completed: task.completed, priority: "medium", due: null, tags: [], description: "" });
        } else if (!task.isNew && !task.isDeleted) {
          const original = originalTasks.find(t => t.id === task.id);
          if (original && (original.title !== task.title || original.completed !== task.completed)) {
            updateTask.mutate({ id: task.id, title: task.title, completed: task.completed });
          }
        }
      }
    } else {
      createProject.mutate(projectData, {
        onSuccess: (newProject) => {
          for (const task of editingProjectTasks) {
            if (!task.isDeleted) {
              createTask.mutate({ title: task.title, projectId: newProject.id, parentId: null, completed: task.completed, priority: "medium", due: null, tags: [], description: "" });
            }
          }
        },
      });
    }
    setIsProjectDialogOpen(false);
    setSelectedProject(null);
  };

  const handleAddProjectTask = (projectId: string) => {
    if (!newProjectTask.trim()) return;
    createTask.mutate({
      title: newProjectTask, projectId, parentId: null, completed: 0,
      priority: "medium", due: null, tags: [], description: "",
    }, { onSuccess: () => setNewProjectTask("") });
  };

  const handleAddSubtask = (parentId: string, projectId: string) => {
    if (!newSubtaskTitle.trim()) return;
    createTask.mutate({
      title: newSubtaskTitle, projectId, parentId, completed: 0,
      priority: "medium", due: null, tags: [], description: "",
    }, {
      onSuccess: () => {
        setNewSubtaskTitle("");
        setAddingSubtaskTo(null);
        setExpandedParentTasks(prev => new Set(Array.from(prev).concat(parentId)));
      },
    });
  };

  const toggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) updateTask.mutate({ id: taskId, completed: task.completed === 1 ? 0 : 1 });
  };

  // If viewing a project detail
  if (detailProject) {
    const projectTasks = getProjectTasks(detailProject.id);
    const completedTasks = projectTasks.filter(t => t.completed === 1).length;
    const progress = getProjectProgress(detailProject.id);
    const deadline = getDeadlineDisplay(detailProject.deadline);
    const parentTasks = getParentTasks(detailProject.id);

    return (
      <div className="flex flex-col h-full">
        {/* Back button + header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setDetailProject(null)} className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 h-8 px-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{detailProject.title}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs border", STATUS_COLORS[detailProject.status])}>
                {STATUS_DISPLAY[detailProject.status]}
              </Badge>
              {deadline && <span className={cn("text-xs", deadline.className)} style={mono}>{deadline.text}</span>}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-foreground h-8 px-2" onClick={() => { openProjectDialog(detailProject); }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <CircularProgress progress={progress} size={48} strokeWidth={4} />
          <div className="flex-1">
            <div className="text-xs text-zinc-400" style={mono}>{completedTasks}/{projectTasks.length} tasks</div>
            <div className="w-full h-1.5 bg-indigo-500/10 rounded-full overflow-hidden mt-1">
              <motion.div className="h-full bg-indigo-500/60 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {detailProject.description && (
          <p className="text-xs text-zinc-400 mb-3 px-1">{detailProject.description}</p>
        )}

        {/* Add task */}
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a task..."
            value={newProjectTask}
            onChange={(e) => setNewProjectTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddProjectTask(detailProject.id); } }}
            className="flex-1 h-8 text-xs bg-black/30 border-indigo-500/15 focus-visible:ring-indigo-500/30"
          />
          <Button size="sm" onClick={() => handleAddProjectTask(detailProject.id)} disabled={!newProjectTask.trim()} className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Task list */}
        <ScrollArea className="flex-1">
          <div className="space-y-1.5 pb-4">
            {parentTasks.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-8">No tasks yet. Add your first task above.</p>
            )}
            {parentTasks.map((parentTask) => {
              const subtasks = getSubtasks(parentTask.id);
              const completedSubs = subtasks.filter(s => s.completed === 1).length;
              const isExpanded = expandedParentTasks.has(parentTask.id);
              const isAddingSub = addingSubtaskTo === parentTask.id;

              return (
                <div key={parentTask.id} className={cn(cmdPanel, "overflow-hidden")}>
                  <div className="flex items-center gap-2 p-2.5 group">
                    {subtasks.length > 0 && (
                      <button onClick={() => setExpandedParentTasks(prev => {
                        const next = new Set(prev);
                        next.has(parentTask.id) ? next.delete(parentTask.id) : next.add(parentTask.id);
                        return next;
                      })} className="w-5 h-5 flex items-center justify-center rounded hover:bg-indigo-500/10">
                        <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-500 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                    )}
                    {subtasks.length === 0 && <div className="w-5" />}
                    <button
                      onClick={() => toggleTask(parentTask.id)}
                      className={cn(
                        "w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        parentTask.completed === 1 ? "bg-indigo-500 border-transparent" : "border-zinc-600 hover:border-indigo-400"
                      )}
                    >
                      {parentTask.completed === 1 && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={cn("flex-1 text-xs", parentTask.completed === 1 ? "line-through text-zinc-600" : "text-foreground")}>
                      {parentTask.title}
                    </span>
                    {subtasks.length > 0 && (
                      <span className="text-xs text-zinc-500" style={mono}>{completedSubs}/{subtasks.length}</span>
                    )}
                    <button onClick={() => { setAddingSubtaskTo(isAddingSub ? null : parentTask.id); setNewSubtaskTitle(""); }}
                      className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteTask.mutate(parentTask.id)}
                      className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {(isExpanded || isAddingSub) && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-indigo-500/10 bg-black/20">
                        {isAddingSub && (
                          <div className="p-2 border-b border-indigo-500/10">
                            <div className="flex gap-2">
                              <Input placeholder="Add subtask..." value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(parentTask.id, detailProject.id); if (e.key === "Escape") { setAddingSubtaskTo(null); setNewSubtaskTitle(""); } }}
                                className="flex-1 h-7 text-xs bg-black/30 border-indigo-500/15" autoFocus
                              />
                              <Button size="sm" className="h-7 px-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                                onClick={() => handleAddSubtask(parentTask.id, detailProject.id)} disabled={!newSubtaskTitle.trim()}>
                                Add
                              </Button>
                            </div>
                          </div>
                        )}
                        {subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2 pl-10 pr-2.5 py-1.5 hover:bg-indigo-500/5 group/sub">
                            <button onClick={() => toggleTask(subtask.id)}
                              className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                subtask.completed === 1 ? "bg-indigo-500/70 border-transparent" : "border-zinc-600 hover:border-indigo-400")}>
                              {subtask.completed === 1 && <Check className="w-2.5 h-2.5 text-white" />}
                            </button>
                            <span className={cn("flex-1 text-[11px]", subtask.completed === 1 ? "line-through text-zinc-600" : "text-zinc-300")}>
                              {subtask.title}
                            </span>
                            <button onClick={() => deleteTask.mutate(subtask.id)}
                              className="w-4 h-4 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Project edit dialog */}
        {renderProjectDialog()}
      </div>
    );
  }

  // Project board view
  function renderProjectDialog() {
    return (
      <Dialog open={isProjectDialogOpen} onOpenChange={(open) => {
        setIsProjectDialogOpen(open);
        if (!open) { setSelectedProject(null); setEditingProjectTasks([]); }
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedProject?.id ? "Edit Project" : "New Project"}</DialogTitle>
            <DialogDescription>{selectedProject?.id ? "Update project details and tasks." : "Create a new project to work on."}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={selectedProject?.title || ""} onChange={(e) => setSelectedProject(prev => prev ? { ...prev, title: e.target.value } : { ...getEmptyProject(), title: e.target.value } as CareerProject)} placeholder="e.g. Website Redesign" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={selectedProject?.description || ""} className="min-h-[80px]" onChange={(e) => setSelectedProject(prev => prev ? { ...prev, description: e.target.value } : { ...getEmptyProject(), description: e.target.value } as CareerProject)} placeholder="What is this project about?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedProject?.status || "planning"} onValueChange={(val) => setSelectedProject(prev => prev ? { ...prev, status: val } : { ...getEmptyProject(), status: val } as CareerProject)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input type="date" value={selectedProject?.deadline || ""} onChange={(e) => setSelectedProject(prev => prev ? { ...prev, deadline: e.target.value || null } : { ...getEmptyProject(), deadline: e.target.value || null } as CareerProject)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Next Action</Label>
                <Input value={selectedProject?.nextAction || ""} onChange={(e) => setSelectedProject(prev => prev ? { ...prev, nextAction: e.target.value } : { ...getEmptyProject(), nextAction: e.target.value } as CareerProject)} placeholder="What's the immediate next step?" />
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Tasks</Label>
                  <span className="text-xs text-muted-foreground">{editingProjectTasks.filter(t => !t.isDeleted).length} tasks</span>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add a task..." value={newEditingProjectTask} onChange={(e) => setNewEditingProjectTask(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEditingTask(); } }} className="flex-1" />
                  <Button type="button" size="sm" onClick={handleAddEditingTask} disabled={!newEditingProjectTask.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {editingProjectTasks.filter(t => !t.isDeleted).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No tasks yet.</p>
                  ) : (
                    editingProjectTasks.filter(t => !t.isDeleted).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group">
                        <button onClick={() => setEditingProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: t.completed === 1 ? 0 : 1 } : t))}
                          className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0", task.completed === 1 ? "bg-primary border-transparent" : "border-border hover:border-primary")}>
                          {task.completed === 1 && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                        <Input value={task.title} onChange={(e) => setEditingProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: e.target.value } : t))}
                          className={cn("flex-1 h-8 text-sm border-0 bg-transparent px-1 focus-visible:ring-1", task.completed === 1 && "line-through text-muted-foreground")} />
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600"
                          onClick={() => setEditingProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, isDeleted: true } : t))}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 pt-4 border-t">
            {selectedProject?.id && (
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 mr-auto"
                onClick={() => { deleteProject.mutate(selectedProject.id); setIsProjectDialogOpen(false); setSelectedProject(null); setDetailProject(null); }}>
                <X className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
            <Button onClick={handleSaveProject} disabled={updateProject.isPending || createProject.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {(updateProject.isPending || createProject.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {selectedProject?.id ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-indigo-400" />
          <span className="text-xs uppercase tracking-[0.15em] text-indigo-400/60" style={mono}>Projects</span>
        </div>
        <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => openProjectDialog(null)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New
        </Button>
      </div>

      {/* Project cards grid */}
      {projects.length === 0 ? (
        <div className={cn(cmdPanel, "p-8 text-center")}>
          <Target className="w-8 h-8 mx-auto text-indigo-400/30 mb-3" />
          <p className="text-xs text-zinc-500 mb-3">No projects yet. Create your first project.</p>
          <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => openProjectDialog(null)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((project, index) => {
            const projectTasks = getProjectTasks(project.id);
            const completedTasks = projectTasks.filter(t => t.completed === 1).length;
            const progress = getProjectProgress(project.id);
            const deadline = getDeadlineDisplay(project.deadline);

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setDetailProject(project)}
                className={cn(cmdPanel, "p-3.5 cursor-pointer hover:border-indigo-500/30 transition-all group")}
              >
                <div className="flex items-start gap-3">
                  <CircularProgress progress={progress} size={44} strokeWidth={4} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate group-hover:text-indigo-300 transition-colors">{project.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border", STATUS_COLORS[project.status])}>
                        {STATUS_DISPLAY[project.status]}
                      </Badge>
                      {projectTasks.length > 0 && (
                        <span className="text-xs text-zinc-500" style={mono}>{completedTasks}/{projectTasks.length}</span>
                      )}
                    </div>
                    {deadline && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        <span className={cn("text-xs", deadline.className)} style={mono}>{deadline.text}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {renderProjectDialog()}
    </div>
  );
}
