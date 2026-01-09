import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  Plus, Target, Rocket, Sparkles, ChevronDown, Check, 
  Calendar, Clock, Pencil, Loader2, X, Map, Zap, Lightbulb, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isToday, isThisWeek, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCareerProjects,
  useCareerTasks,
  useCreateCareerProject,
  useUpdateCareerProject,
  useDeleteCareerProject,
  useCreateCareerTask,
  useUpdateCareerTask,
  useDeleteCareerTask,
  useCareerVision,
  useUpdateCareerVision,
} from "@/lib/api-hooks";
import type { CareerProject, CareerTask } from "@shared/schema";

const DEFAULT_VISION = [
  { id: "1", title: "Senior Frontend Engineer", timeframe: "2 Years", color: "text-teal-500", order: 0 },
  { id: "2", title: "Launch SaaS Product", timeframe: "This Year", color: "text-cyan-500", order: 1 },
  { id: "3", title: "Deep Work Mastery", timeframe: "Ongoing", color: "text-violet-500", order: 2 },
];

const VISION_ICONS = [Target, Rocket, Sparkles];

const STATUS_DISPLAY: Record<string, string> = {
  "planning": "Planning",
  "in_progress": "In Progress",
  "ongoing": "Ongoing",
  "completed": "Completed",
};

function CircularProgress({ progress, size = 64, strokeWidth = 6 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-200/60 dark:text-slate-700/60"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-foreground">{progress}%</span>
      </div>
    </div>
  );
}

function AnimatedCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn(
        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0",
        checked 
          ? "bg-gradient-to-br from-teal-500 to-cyan-500 border-transparent" 
          : "border-slate-300 dark:border-slate-600 hover:border-teal-500"
      )}
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

const glassCard = "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg rounded-2xl";
const glassCardHover = "hover:shadow-xl hover:scale-[1.02] transition-all duration-300";

export default function CareerPage() {
  const { data: projects = [], isLoading: projectsLoading } = useCareerProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useCareerTasks();
  
  const createProject = useCreateCareerProject();
  const updateProject = useUpdateCareerProject();
  const deleteProject = useDeleteCareerProject();
  const createTask = useCreateCareerTask();
  const updateTask = useUpdateCareerTask();
  const deleteTask = useDeleteCareerTask();
  
  const { data: visionData = [] } = useCareerVision();
  const updateVisionMutation = useUpdateCareerVision();
  
  const vision = visionData.length > 0 ? visionData : DEFAULT_VISION;
  
  const [newTask, setNewTask] = useState("");
  const [selectedTask, setSelectedTask] = useState<CareerTask | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<CareerProject | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isProjectDetailsOpen, setIsProjectDetailsOpen] = useState(false);
  const [isVisionDialogOpen, setIsVisionDialogOpen] = useState(false);
  const [editingVision, setEditingVision] = useState<typeof DEFAULT_VISION>([]);
  
  const [roadmapData, setRoadmapData] = useState<{
    roadmap: Array<{ phase: string; timeframe: string; milestones: string[]; focusAreas: string[] }>;
    suggestedActions: Array<{ title: string; description: string; priority: string; relatedProject: string | null; estimatedEffort: string }>;
    insights: string;
    message?: string;
    error?: string;
  } | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [roadmapExpanded, setRoadmapExpanded] = useState(true);

  const getEmptyProject = (): Partial<CareerProject> => ({
    title: "",
    description: "",
    status: "planning",
    progress: 0,
    deadline: null,
    nextAction: "",
    color: "bg-teal-500",
    tags: [],
  });
  
  const [todayOpen, setTodayOpen] = useState(true);
  const [weekOpen, setWeekOpen] = useState(true);
  const [laterOpen, setLaterOpen] = useState(false);
  const [newProjectTask, setNewProjectTask] = useState("");

  const getProjectTasks = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId);
  };

  const getProjectProgress = (projectId: string) => {
    const projectTasks = getProjectTasks(projectId);
    if (projectTasks.length === 0) return 0;
    const completed = projectTasks.filter(t => t.completed === 1).length;
    return Math.round((completed / projectTasks.length) * 100);
  };

  const handleAddProjectTask = (projectId: string) => {
    if (!newProjectTask.trim()) return;
    createTask.mutate({
      title: newProjectTask,
      projectId,
      completed: 0,
      priority: "medium",
      due: null,
      tags: [],
      description: ""
    }, {
      onSuccess: () => setNewProjectTask("")
    });
  };

  const openEditVision = () => {
    setEditingVision([...vision]);
    setIsVisionDialogOpen(true);
  };

  const saveVision = () => {
    updateVisionMutation.mutate(
      editingVision.map((v, i) => ({ title: v.title, timeframe: v.timeframe, color: v.color, order: i })),
      { onSuccess: () => setIsVisionDialogOpen(false) }
    );
  };

  const fetchRoadmap = async () => {
    setRoadmapLoading(true);
    setRoadmapError(null);
    try {
      const response = await fetch("/api/career/ai-roadmap");
      if (!response.ok) {
        throw new Error(`Failed to generate roadmap: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        setRoadmapError(data.message || "An error occurred while generating the roadmap.");
        setRoadmapData(null);
      } else {
        setRoadmapData(data);
      }
    } catch (error) {
      console.error("Failed to fetch roadmap:", error);
      setRoadmapError(error instanceof Error ? error.message : "Failed to generate roadmap. Please try again.");
      setRoadmapData(null);
    } finally {
      setRoadmapLoading(false);
    }
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      updateTask.mutate({ id, completed: task.completed === 1 ? 0 : 1 });
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    createTask.mutate({
      title: newTask,
      projectId: null,
      completed: 0,
      priority: "medium",
      due: format(new Date(), "yyyy-MM-dd"),
      tags: [],
      description: ""
    }, {
      onSuccess: () => setNewTask("")
    });
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.title) return;
    
    const projectData = {
      title: selectedProject.title,
      description: selectedProject.description || "",
      status: selectedProject.status || "planning",
      progress: selectedProject.id ? getProjectProgress(selectedProject.id) : 0,
      deadline: selectedProject.deadline || "",
      nextAction: selectedProject.nextAction || "",
      color: selectedProject.color || "bg-teal-500",
      tags: selectedProject.tags || [],
    };

    if (selectedProject.id) {
      updateProject.mutate({ id: selectedProject.id, ...projectData });
    } else {
      createProject.mutate(projectData);
    }
    setIsProjectDialogOpen(false);
    setSelectedProject(null);
  };

  const handleSaveTask = () => {
    if (selectedTask) {
      updateTask.mutate({
        id: selectedTask.id,
        title: selectedTask.title,
        description: selectedTask.description,
        priority: selectedTask.priority,
        due: selectedTask.due,
        tags: selectedTask.tags,
        projectId: selectedTask.projectId,
        completed: selectedTask.completed,
      });
    }
    setIsTaskDialogOpen(false);
    setSelectedTask(null);
  };

  const getProjectTitle = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.title || null;
  };

  const getDeadlineDisplay = (deadline: string | null) => {
    if (!deadline) return null;
    const days = differenceInDays(new Date(deadline), new Date());
    if (days < 0) return { text: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    if (days === 0) return { text: "Due today", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    if (days === 1) return { text: "Tomorrow", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    return { text: `${days} days left`, className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
  };

  const incompleteTasks = tasks.filter(t => t.completed === 0);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  const isValidDateString = (str: string | null): boolean => {
    if (!str || str === "Today" || str === "Tomorrow") return false;
    const parsed = Date.parse(str);
    return !isNaN(parsed);
  };

  const todayTasks = incompleteTasks.filter(t => {
    if (t.due === "Today" || t.due === todayStr) return true;
    if (!isValidDateString(t.due)) return false;
    try {
      return isToday(parseISO(t.due!));
    } catch { return false; }
  });

  const weekTasks = incompleteTasks.filter(t => {
    if (todayTasks.some(tt => tt.id === t.id)) return false;
    if (!isValidDateString(t.due)) return false;
    try {
      const dueDate = parseISO(t.due!);
      return isThisWeek(dueDate, { weekStartsOn: 1 }) && differenceInDays(dueDate, new Date()) <= 7 && differenceInDays(dueDate, new Date()) > 0;
    } catch { return false; }
  });

  const laterTasks = incompleteTasks.filter(t => 
    !todayTasks.some(tt => tt.id === t.id) && !weekTasks.some(wt => wt.id === t.id)
  );

  const isLoading = projectsLoading || tasksLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      </Layout>
    );
  }

  const priorityBadge = (priority: string) => {
    const classes = {
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      low: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    };
    return classes[priority as keyof typeof classes] || classes.medium;
  };

  const TaskRow = ({ task, index }: { task: CareerTask; index: number }) => {
    const projectName = getProjectTitle(task.projectId);
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => { setSelectedTask(task); setIsTaskDialogOpen(true); }}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
      >
        <AnimatedCheckbox 
          checked={task.completed === 1} 
          onChange={() => toggleTask(task.id)} 
        />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            task.completed === 1 && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          {projectName && (
            <p className="text-xs text-muted-foreground truncate">{projectName}</p>
          )}
        </div>
        <Badge className={cn("text-[10px] font-medium shrink-0", priorityBadge(task.priority))}>
          {task.priority}
        </Badge>
      </motion.div>
    );
  };

  const TaskSection = ({ 
    title, 
    tasks, 
    open, 
    onOpenChange, 
    accentColor = "text-foreground",
    emptyText = "No tasks"
  }: { 
    title: string; 
    tasks: CareerTask[]; 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    accentColor?: string;
    emptyText?: string;
  }) => (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className={cn("font-semibold text-sm", accentColor)}>{title}</span>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-2 space-y-1">
          {tasks.length > 0 ? (
            tasks.map((task, i) => <TaskRow key={task.id} task={task} index={i} />)
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">{emptyText}</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <Layout>
      <div className="space-y-8 pb-12 max-w-6xl mx-auto w-full px-4">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
            Career & Vision
          </h1>
          <p className="text-muted-foreground">Your professional growth dashboard</p>
        </motion.div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-teal-500" />
              North Star Vision
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={openEditVision}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit Vision
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vision.map((item, index) => {
              const Icon = VISION_ICONS[index] || Sparkles;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    glassCard,
                    "p-5 group hover:border-teal-500/40 transition-all duration-300"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-teal-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm leading-tight">{item.title}</h3>
                      <Badge variant="secondary" className="mt-2 text-xs font-normal">
                        {item.timeframe}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Rocket className="w-5 h-5 text-cyan-500" />
              Active Projects
            </h2>
            <Button 
              onClick={() => { setSelectedProject(null); setIsProjectDialogOpen(true); }}
              className={cn(glassCard, "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 hover:opacity-90")}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, index) => {
              const deadline = getDeadlineDisplay(project.deadline);
              const projectTasks = getProjectTasks(project.id);
              const completedTasks = projectTasks.filter(t => t.completed === 1).length;
              const progress = getProjectProgress(project.id);
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => { setSelectedProject(project); setNewProjectTask(""); setIsProjectDetailsOpen(true); }}
                  className={cn(glassCard, glassCardHover, "p-5 cursor-pointer group")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground leading-tight mb-1">{project.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] font-medium",
                              project.status === "in_progress" && "border-cyan-500/40 text-cyan-600 dark:text-cyan-400",
                              project.status === "planning" && "border-violet-500/40 text-violet-600 dark:text-violet-400",
                              project.status === "completed" && "border-slate-400/40 text-slate-500",
                              project.status === "ongoing" && "border-teal-500/40 text-teal-600 dark:text-teal-400"
                            )}
                          >
                            {STATUS_DISPLAY[project.status] || project.status}
                          </Badge>
                          {projectTasks.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {completedTasks}/{projectTasks.length} tasks
                            </span>
                          )}
                        </div>
                      </div>

                      {project.nextAction && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          <span className="text-teal-500 font-medium">Next:</span> {project.nextAction}
                        </p>
                      )}

                      {deadline && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", deadline.className)}>
                            {deadline.text}
                          </span>
                        </div>
                      )}
                    </div>

                    <CircularProgress progress={progress} size={56} strokeWidth={5} />
                  </div>
                </motion.div>
              );
            })}

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: projects.length * 0.1 }}
              onClick={() => { setSelectedProject(null); setIsProjectDialogOpen(true); }}
              className={cn(
                glassCard,
                "p-5 border-dashed border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2",
                "text-muted-foreground hover:text-teal-500 hover:border-teal-500/40 transition-all duration-300 min-h-[140px]"
              )}
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Project</span>
            </motion.button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Today's Focus
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(glassCard, "p-6 space-y-4")}
          >
            <form onSubmit={handleAddTask} className="flex gap-3">
              <Input 
                placeholder="Add a new task..." 
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="flex-1 bg-white/50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <Button 
                type="submit" 
                disabled={!newTask.trim() || createTask.isPending}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </form>

            <div className="space-y-2">
              <TaskSection 
                title="Today" 
                tasks={todayTasks} 
                open={todayOpen} 
                onOpenChange={setTodayOpen}
                accentColor="text-amber-600 dark:text-amber-400"
                emptyText="No tasks due today"
              />
              <TaskSection 
                title="This Week" 
                tasks={weekTasks} 
                open={weekOpen} 
                onOpenChange={setWeekOpen}
                accentColor="text-cyan-600 dark:text-cyan-400"
                emptyText="No tasks due this week"
              />
              <TaskSection 
                title="Later" 
                tasks={laterTasks} 
                open={laterOpen} 
                onOpenChange={setLaterOpen}
                emptyText="No upcoming tasks"
              />
            </div>
          </motion.div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Map className="w-5 h-5 text-violet-500" />
              AI Roadmap & Insights
            </h2>
            <Button 
              onClick={fetchRoadmap}
              disabled={roadmapLoading}
              variant="outline"
              size="sm"
              className="border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            >
              {roadmapLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {roadmapData ? "Refresh" : "Generate"} Roadmap
            </Button>
          </div>

          {!roadmapData && !roadmapLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(glassCard, "p-8 text-center")}
            >
              <Map className="w-12 h-12 text-violet-500/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Get AI-Powered Career Insights</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Based on your North Star vision and current projects, AI will generate a strategic roadmap with actionable next steps.
              </p>
              <Button 
                onClick={fetchRoadmap}
                className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 hover:opacity-90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Roadmap
              </Button>
            </motion.div>
          )}

          {roadmapLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(glassCard, "p-8 text-center")}
            >
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Analyzing your vision and projects...</p>
            </motion.div>
          )}

          {roadmapError && !roadmapLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(glassCard, "p-6 border-red-200/60 dark:border-red-700/40")}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">Unable to Generate Roadmap</h4>
                  <p className="text-sm text-muted-foreground mb-3">{roadmapError}</p>
                  <Button 
                    onClick={fetchRoadmap}
                    variant="outline"
                    size="sm"
                    className="border-violet-500/40 text-violet-600 dark:text-violet-400"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {roadmapData && !roadmapLoading && (
            <Collapsible open={roadmapExpanded} onOpenChange={setRoadmapExpanded}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(glassCard, "overflow-hidden")}
              >
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <span className="font-medium text-foreground">Strategic Insights</span>
                  </div>
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", roadmapExpanded && "rotate-180")} />
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-6">
                    {roadmapData.message && (
                      <p className="text-sm text-muted-foreground italic">{roadmapData.message}</p>
                    )}

                    {roadmapData.insights && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200/60 dark:border-violet-700/40">
                        <p className="text-sm text-foreground">{roadmapData.insights}</p>
                      </div>
                    )}

                    {roadmapData.roadmap && roadmapData.roadmap.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Map className="w-4 h-4" />
                          Roadmap Phases
                        </h4>
                        <div className="grid gap-3">
                          {roadmapData.roadmap.map((phase, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium text-foreground">{phase.phase}</h5>
                                <Badge variant="outline" className="border-violet-500/40 text-violet-600 dark:text-violet-400 text-xs">
                                  {phase.timeframe}
                                </Badge>
                              </div>
                              {phase.milestones && phase.milestones.length > 0 && (
                                <ul className="space-y-1">
                                  {phase.milestones.map((milestone, mIndex) => (
                                    <li key={mIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                                      {milestone}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {phase.focusAreas && phase.focusAreas.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {phase.focusAreas.map((area, aIndex) => (
                                    <Badge key={aIndex} variant="secondary" className="text-xs">
                                      {area}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {roadmapData.suggestedActions && roadmapData.suggestedActions.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Suggested Actions
                        </h4>
                        <div className="grid gap-2">
                          {roadmapData.suggestedActions.map((action, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-start gap-3"
                            >
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                action.priority === "high" && "bg-red-500",
                                action.priority === "medium" && "bg-amber-500",
                                action.priority === "low" && "bg-slate-400"
                              )} />
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-sm font-medium text-foreground">{action.title}</p>
                                <p className="text-xs text-muted-foreground">{action.description}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {action.estimatedEffort && (
                                    <Badge variant="outline" className="text-[10px]">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {action.estimatedEffort}
                                    </Badge>
                                  )}
                                  {action.relatedProject && (
                                    <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-600 dark:text-cyan-400">
                                      {action.relatedProject}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </motion.div>
            </Collapsible>
          )}
        </section>

        <Dialog open={isVisionDialogOpen} onOpenChange={setIsVisionDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit North Star Vision</DialogTitle>
              <DialogDescription>Define your guiding principles and long-term goals.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingVision.map((item, index) => (
                <div key={item.id} className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    {index === 0 && <Target className="w-4 h-4" />}
                    {index === 1 && <Rocket className="w-4 h-4" />}
                    {index === 2 && <Sparkles className="w-4 h-4" />}
                    Vision {index + 1}
                  </div>
                  <Input
                    value={item.title}
                    onChange={(e) => setEditingVision(editingVision.map(v => v.id === item.id ? { ...v, title: e.target.value } : v))}
                    placeholder="Vision title"
                    className="font-medium"
                  />
                  <Input
                    value={item.timeframe}
                    onChange={(e) => setEditingVision(editingVision.map(v => v.id === item.id ? { ...v, timeframe: e.target.value } : v))}
                    placeholder="Timeframe (e.g., 2 Years, Ongoing)"
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVisionDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveVision} disabled={updateVisionMutation.isPending} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0">
                {updateVisionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Task Details</DialogTitle>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-3">
                  <AnimatedCheckbox 
                    checked={selectedTask.completed === 1} 
                    onChange={() => {
                      toggleTask(selectedTask.id);
                      setSelectedTask({...selectedTask, completed: selectedTask.completed === 1 ? 0 : 1});
                    }} 
                  />
                  <Input 
                    value={selectedTask.title} 
                    className={cn("font-medium text-lg border-0 px-0 h-auto focus-visible:ring-0", selectedTask.completed === 1 && "line-through text-muted-foreground")}
                    onChange={(e) => setSelectedTask({...selectedTask, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Description</Label>
                  <Textarea 
                    value={selectedTask.description || ""}
                    placeholder="Add details..."
                    className="min-h-[80px] resize-none"
                    onChange={(e) => setSelectedTask({...selectedTask, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-semibold">Priority</Label>
                    <Select value={selectedTask.priority} onValueChange={(val) => setSelectedTask({...selectedTask, priority: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-semibold">Due Date</Label>
                    <Input 
                      type="date"
                      value={selectedTask.due || ""}
                      onChange={(e) => setSelectedTask({...selectedTask, due: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Project</Label>
                  <Select 
                    value={selectedTask.projectId || "none"} 
                    onValueChange={(val) => setSelectedTask({...selectedTask, projectId: val === "none" ? null : val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              {selectedTask && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 mr-auto"
                  onClick={() => {
                    deleteTask.mutate(selectedTask.id);
                    setIsTaskDialogOpen(false);
                    setSelectedTask(null);
                  }}
                >
                  <X className="w-4 h-4 mr-1" /> Delete
                </Button>
              )}
              <Button onClick={handleSaveTask} disabled={updateTask.isPending} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0">
                {updateTask.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isProjectDialogOpen} onOpenChange={(open) => {
          setIsProjectDialogOpen(open);
          if (!open) setSelectedProject(null);
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedProject?.id ? "Edit Project" : "New Project"}</DialogTitle>
              <DialogDescription>
                {selectedProject?.id ? "Update your project details." : "Create a new professional initiative."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Project Title</Label>
                <Input 
                  value={selectedProject?.title || ""} 
                  onChange={(e) => setSelectedProject(prev => prev ? ({...prev, title: e.target.value}) : ({...getEmptyProject(), title: e.target.value} as CareerProject))}
                  placeholder="e.g. Portfolio Redesign"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={selectedProject?.description || ""} 
                  className="min-h-[80px]"
                  onChange={(e) => setSelectedProject(prev => prev ? ({...prev, description: e.target.value}) : ({...getEmptyProject(), description: e.target.value} as CareerProject))}
                  placeholder="What is this project about?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedProject?.status || "planning"} onValueChange={(val) => setSelectedProject(prev => prev ? ({...prev, status: val}) : ({...getEmptyProject(), status: val} as CareerProject))}>
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
                  <Input 
                    type="date"
                    value={selectedProject?.deadline || ""}
                    onChange={(e) => setSelectedProject(prev => prev ? ({...prev, deadline: e.target.value || null}) : ({...getEmptyProject(), deadline: e.target.value || null} as CareerProject))}
                  />
                </div>
              </div>
              {selectedProject?.id && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <Label className="text-muted-foreground text-xs">Progress (calculated from sub-tasks)</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${getProjectProgress(selectedProject.id)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-teal-600">{getProjectProgress(selectedProject.id)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Add sub-tasks to track your progress automatically</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Next Action</Label>
                <Input 
                  value={selectedProject?.nextAction || ""}
                  onChange={(e) => setSelectedProject(prev => prev ? ({...prev, nextAction: e.target.value}) : ({...getEmptyProject(), nextAction: e.target.value} as CareerProject))}
                  placeholder="What's the immediate next step?"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              {selectedProject?.id && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 mr-auto"
                  onClick={() => {
                    deleteProject.mutate(selectedProject.id);
                    setIsProjectDialogOpen(false);
                    setSelectedProject(null);
                  }}
                >
                  <X className="w-4 h-4 mr-1" /> Delete
                </Button>
              )}
              <Button onClick={handleSaveProject} disabled={updateProject.isPending || createProject.isPending} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0">
                {(updateProject.isPending || createProject.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {selectedProject?.id ? "Save Changes" : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isProjectDetailsOpen} onOpenChange={(open) => {
          setIsProjectDetailsOpen(open);
          if (!open) setNewProjectTask("");
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            {selectedProject && (() => {
              const projectTasks = getProjectTasks(selectedProject.id);
              const completedTasks = projectTasks.filter(t => t.completed === 1).length;
              const progress = getProjectProgress(selectedProject.id);
              return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "font-medium",
                        selectedProject.status === "in_progress" && "border-cyan-500/40 text-cyan-600",
                        selectedProject.status === "planning" && "border-violet-500/40 text-violet-600",
                        selectedProject.status === "completed" && "border-slate-400/40 text-slate-500",
                        selectedProject.status === "ongoing" && "border-teal-500/40 text-teal-600"
                      )}
                    >
                      {STATUS_DISPLAY[selectedProject.status]}
                    </Badge>
                    <DialogTitle>{selectedProject.title}</DialogTitle>
                  </div>
                  {selectedProject.description && (
                    <DialogDescription className="text-sm">{selectedProject.description}</DialogDescription>
                  )}
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {completedTasks} of {projectTasks.length} tasks completed
                      </div>
                      <div className="w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                    <CircularProgress progress={progress} size={72} strokeWidth={6} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Deadline
                      </div>
                      <div className="text-sm font-medium">{selectedProject.deadline || "Not set"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Time Left
                      </div>
                      <div className="text-sm font-medium">
                        {selectedProject.deadline 
                          ? `${differenceInDays(new Date(selectedProject.deadline), new Date())} days` 
                          : "N/A"
                        }
                      </div>
                    </div>
                  </div>

                  {selectedProject.nextAction && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200/60 dark:border-teal-800/60">
                      <div className="text-xs text-teal-600 dark:text-teal-400 font-semibold uppercase mb-1">Next Action</div>
                      <p className="text-sm text-teal-700 dark:text-teal-300">{selectedProject.nextAction}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Sub-Tasks</h4>
                      <span className="text-xs text-muted-foreground">{projectTasks.length} items</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a new sub-task..."
                        value={newProjectTask}
                        onChange={(e) => setNewProjectTask(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddProjectTask(selectedProject.id);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button 
                        size="sm"
                        onClick={() => handleAddProjectTask(selectedProject.id)}
                        disabled={!newProjectTask.trim() || createTask.isPending}
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0"
                      >
                        {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {projectTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No tasks yet. Add your first sub-task above.
                        </p>
                      ) : (
                        projectTasks.map((task, index) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 group"
                          >
                            <AnimatedCheckbox
                              checked={task.completed === 1}
                              onChange={() => toggleTask(task.id)}
                            />
                            <span className={cn(
                              "flex-1 text-sm",
                              task.completed === 1 && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] opacity-0 group-hover:opacity-100 transition-opacity",
                                priorityBadge(task.priority)
                              )}
                            >
                              {task.priority}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask.mutate(task.id);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsProjectDetailsOpen(false);
                      setIsProjectDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Edit Project
                  </Button>
                </DialogFooter>
              </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
