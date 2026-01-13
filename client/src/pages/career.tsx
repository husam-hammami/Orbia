import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Target, Rocket, Sparkles, ChevronDown, Check, 
  Calendar, Clock, Pencil, Loader2, X, Map, Zap, Lightbulb, RefreshCw,
  GraduationCap, ExternalLink, BookOpen, TrendingUp, Compass, Star,
  MoreHorizontal, Trash2, MessageCircle, Trophy
} from "lucide-react";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type EditingTask = {
  id: string;
  title: string;
  completed: number;
  isNew?: boolean;
  isDeleted?: boolean;
};
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
  { id: "1", title: "Senior Frontend Engineer", timeframe: "2 Years", color: "text-primary", order: 0 },
  { id: "2", title: "Launch SaaS Product", timeframe: "This Year", color: "text-primary", order: 1 },
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
          className="text-border"
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
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.85" />
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
          ? "bg-primary border-transparent" 
          : "border-border hover:border-primary"
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

const glassCard = "bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg rounded-2xl";
const glassCardHover = "hover:shadow-xl hover:scale-[1.02] transition-all duration-300";

export default function CareerPage() {
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading: projectsLoading } = useCareerProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useCareerTasks();

  const { data: storedCoach, isLoading: isLoadingStoredCoach } = useQuery({
    queryKey: ["/api/career/coach"],
    queryFn: async () => {
      const res = await fetch("/api/career/coach");
      if (!res.ok) throw new Error("Failed to load coach data");
      return res.json();
    },
  });
  
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
  
  const [activeTab, setActiveTab] = useState("projects");
  
  const [coachData, setCoachData] = useState<{
    northStarAnalysis?: { summary: string; gaps: string[]; strengths: string[] };
    roadmap?: Array<{ phase: string; timeframe: string; goal: string; milestones: string[]; weeklyFocus: string }>;
    immediateActions?: Array<{ title: string; why: string; timeEstimate: string; priority: string }>;
    learningPath?: Array<{ skill: string; importance: string; resources: Array<{ title: string; type: string; url: string; timeCommitment: string }> }>;
    weeklyTheme?: string;
    coachingNote?: string;
    message?: string;
    error?: string;
  } | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachGeneratedAt, setCoachGeneratedAt] = useState<Date | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0]));
  const [activePhaseOverride, setActivePhaseOverride] = useState<number | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneText, setEditingMilestoneText] = useState("");
  const [isLogWinDialogOpen, setIsLogWinDialogOpen] = useState(false);
  const [logWinText, setLogWinText] = useState("");

  const getEmptyProject = (): Partial<CareerProject> => ({
    title: "",
    description: "",
    status: "planning",
    progress: 0,
    deadline: null,
    nextAction: "",
    color: "bg-primary",
    tags: [],
  });
  
  const [todayOpen, setTodayOpen] = useState(true);
  const [weekOpen, setWeekOpen] = useState(true);
  const [laterOpen, setLaterOpen] = useState(false);
  const [newProjectTask, setNewProjectTask] = useState("");
  const [editingProjectTasks, setEditingProjectTasks] = useState<EditingTask[]>([]);
  const [newEditingProjectTask, setNewEditingProjectTask] = useState("");

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

  const coachTasks = tasks.filter(t => t.tags?.includes("coach"));

  useEffect(() => {
    if (storedCoach && !storedCoach.empty) {
      setCoachData(storedCoach);
      if (storedCoach.generatedAt) {
        setCoachGeneratedAt(new Date(storedCoach.generatedAt));
      }
      setExpandedPhases(new Set([0]));
    }
  }, [storedCoach]);
  
  const getMilestoneTasks = (phaseIndex: number) => {
    return tasks.filter(t => 
      t.tags?.includes("coach") && 
      t.tags?.includes("milestone") && 
      t.tags?.includes(`phase-${phaseIndex}`)
    );
  };

  const toggleMilestone = (phaseIndex: number, title: string) => {
    const milestoneTasks = getMilestoneTasks(phaseIndex);
    const task = milestoneTasks.find(t => t.title === title);
    if (task) {
      updateTask.mutate({ id: task.id, completed: task.completed === 1 ? 0 : 1 });
    }
  };

  const isMilestoneCompleted = (phaseIndex: number, title: string) => {
    const milestoneTasks = getMilestoneTasks(phaseIndex);
    const task = milestoneTasks.find(t => t.title === title);
    return task?.completed === 1;
  };

  const deleteMilestone = (phaseIndex: number, title: string) => {
    if (!window.confirm("Delete this milestone?")) return;
    const milestoneTasks = getMilestoneTasks(phaseIndex);
    const task = milestoneTasks.find(t => t.title === title);
    if (task) {
      deleteTask.mutate(task.id);
    }
  };

  const startEditMilestone = (phaseIndex: number, title: string) => {
    const milestoneTasks = getMilestoneTasks(phaseIndex);
    const task = milestoneTasks.find(t => t.title === title);
    if (task) {
      setEditingMilestoneId(task.id);
      setEditingMilestoneText(task.title);
    }
  };

  const saveMilestoneEdit = () => {
    if (editingMilestoneId && editingMilestoneText.trim()) {
      updateTask.mutate({ id: editingMilestoneId, title: editingMilestoneText.trim() });
      setEditingMilestoneId(null);
      setEditingMilestoneText("");
    }
  };

  const cancelMilestoneEdit = () => {
    setEditingMilestoneId(null);
    setEditingMilestoneText("");
  };

  const [regeneratingMilestoneId, setRegeneratingMilestoneId] = useState<string | null>(null);

  const regenerateMilestone = async (phaseIndex: number, title: string) => {
    const milestoneTasks = getMilestoneTasks(phaseIndex);
    const task = milestoneTasks.find(t => t.title === title);
    if (!task || !coachData?.roadmap?.[phaseIndex]) return;
    
    const phase = coachData.roadmap[phaseIndex];
    setRegeneratingMilestoneId(task.id);
    
    try {
      const response = await fetch("/api/career/regenerate-milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentMilestone: title,
          phaseName: phase.phase,
          phaseGoal: phase.goal,
          vision: vision,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.newMilestone) {
          updateTask.mutate({ id: task.id, title: data.newMilestone });
          toast.success("Milestone regenerated!");
        }
      } else {
        toast.error("Failed to regenerate milestone");
      }
    } catch (error) {
      console.error("Failed to regenerate milestone:", error);
      toast.error("Failed to regenerate milestone");
    } finally {
      setRegeneratingMilestoneId(null);
    }
  };

  const getPhaseProgressPercent = (phaseIndex: number) => {
    const milestoneTasks = getMilestoneTasks(phaseIndex);
    if (milestoneTasks.length === 0) return 0;
    const completed = milestoneTasks.filter(t => t.completed === 1).length;
    return Math.round((completed / milestoneTasks.length) * 100);
  };

  const getPhaseCompletedCount = (phaseIndex: number) => {
    const milestoneTasks = getMilestoneTasks(phaseIndex);
    return milestoneTasks.filter(t => t.completed === 1).length;
  };

  const getTotalMilestones = () => {
    if (!coachData?.roadmap) return 0;
    return coachData.roadmap.reduce((sum, phase) => sum + (phase.milestones?.length || 0), 0);
  };

  const getTotalCompletedMilestones = () => {
    if (!coachData?.roadmap) return 0;
    return coachData.roadmap.reduce((sum, phase, idx) => sum + getPhaseCompletedCount(idx), 0);
  };

  const getActivePhaseIndex = () => {
    if (activePhaseOverride !== null) return activePhaseOverride;
    if (!coachData?.roadmap) return 0;
    
    for (let i = 0; i < coachData.roadmap.length; i++) {
      const progress = getPhaseProgressPercent(i);
      if (progress < 100) return i;
    }
    return coachData.roadmap.length - 1;
  };

  const activePhaseIndex = getActivePhaseIndex();
  const activePhase = coachData?.roadmap?.[activePhaseIndex];

  const fetchCoach = async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const response = await fetch("/api/career/coach", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Failed to regenerate coaching: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        setCoachError(data.message || "An error occurred");
        setCoachData(null);
      } else {
        setCoachData(data);
        setCoachGeneratedAt(new Date(data.generatedAt || Date.now()));
        setExpandedPhases(new Set([0]));
        queryClient.invalidateQueries({ queryKey: ["/api/career/tasks"] });
      }
    } catch (error) {
      console.error("Failed to regenerate coaching:", error);
      setCoachError(error instanceof Error ? error.message : "Failed to regenerate coaching");
      setCoachData(null);
    } finally {
      setCoachLoading(false);
    }
  };

  const toggleCoachTask = (actionTitle: string) => {
    const task = coachTasks.find(t => t.title === actionTitle);
    if (task) {
      updateTask.mutate({ id: task.id, completed: task.completed === 1 ? 0 : 1 });
    }
  };
  
  const isCoachActionCompleted = (actionTitle: string) => {
    const task = coachTasks.find(t => t.title === actionTitle);
    return task?.completed === 1;
  };

  const togglePhaseExpanded = (index: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getLearningResourcesForPhase = (phaseIndex: number) => {
    if (!coachData?.learningPath) return [];
    const phaseCount = coachData.roadmap?.length || 1;
    const resourcesPerPhase = Math.ceil(coachData.learningPath.length / phaseCount);
    const start = phaseIndex * resourcesPerPhase;
    return coachData.learningPath.slice(start, start + resourcesPerPhase);
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

  const openProjectDialog = (project: CareerProject | null) => {
    if (project) {
      setSelectedProject(project);
      const projectTasks = getProjectTasks(project.id);
      setEditingProjectTasks(projectTasks.map(t => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        isNew: false,
        isDeleted: false,
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
    const tempId = `temp-${Date.now()}`;
    setEditingProjectTasks(prev => [...prev, {
      id: tempId,
      title: newEditingProjectTask,
      completed: 0,
      isNew: true,
      isDeleted: false,
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
      color: selectedProject.color || "bg-primary",
      tags: selectedProject.tags || [],
    };

    if (selectedProject.id) {
      updateProject.mutate({ id: selectedProject.id, ...projectData });
      
      const originalTasks = getProjectTasks(selectedProject.id);
      
      for (const task of editingProjectTasks) {
        if (task.isDeleted && !task.isNew) {
          deleteTask.mutate(task.id);
        } else if (task.isNew && !task.isDeleted) {
          createTask.mutate({
            title: task.title,
            projectId: selectedProject.id,
            completed: task.completed,
            priority: "medium",
            due: null,
            tags: [],
            description: ""
          });
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
              createTask.mutate({
                title: task.title,
                projectId: newProject.id,
                completed: task.completed,
                priority: "medium",
                due: null,
                tags: [],
                description: ""
              });
            }
          }
        }
      });
    }
    setIsProjectDialogOpen(false);
    setSelectedProject(null);
    setEditingProjectTasks([]);
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
    return { text: `${days} days left`, className: "bg-muted text-muted-foreground" };
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

  const isLoading = projectsLoading || tasksLoading || isLoadingStoredCoach;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const priorityBadge = (priority: string) => {
    const classes = {
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      low: "bg-muted text-muted-foreground",
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
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
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
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors">
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
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary">Goals & Vision</h1>
          <p className="text-muted-foreground">Your professional growth dashboard</p>
        </motion.div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
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
                    "p-5 group hover:border-slate-400/60 transition-all duration-300"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(glassCard, "w-full grid grid-cols-2 p-1 h-auto")}>
            <TabsTrigger 
              value="projects" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm py-2.5 rounded-xl transition-all"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Goals
            </TabsTrigger>
            <TabsTrigger 
              value="coach" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm py-2.5 rounded-xl transition-all"
            >
              <Compass className="w-4 h-4 mr-2" />
              Coach
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-6 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  Active Goals
                </h2>
                <Button 
                  onClick={() => openProjectDialog(null)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Goal
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
                                  project.status === "in_progress" && "border-border text-muted-foreground bg-muted/50",
                                  project.status === "planning" && "border-border/60 text-muted-foreground",
                                  project.status === "completed" && "border-border/40 text-muted-foreground",
                                  project.status === "ongoing" && "border-border text-muted-foreground"
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
                              <span className="text-primary font-medium">Next:</span> {project.nextAction}
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
                  onClick={() => openProjectDialog(null)}
                  className={cn(
                    glassCard,
                    "p-5 border-dashed border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2",
                    "text-muted-foreground hover:text-slate-600 hover:border-slate-400 transition-all duration-300 min-h-[140px]"
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
                    className="flex-1 bg-card/50 border-border/60 focus:ring-primary/20 focus:border-primary"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newTask.trim() || createTask.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
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
          </TabsContent>

          <TabsContent value="coach" className="mt-6 space-y-4">
            {(isLoadingStoredCoach || coachLoading) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(glassCard, "p-6 flex items-center justify-center gap-3")}
              >
                <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                <p className="text-sm text-muted-foreground">
                  {isLoadingStoredCoach ? "Loading your guidance..." : "Generating your personalized guidance..."}
                </p>
              </motion.div>
            )}

            {!coachData && !coachLoading && !coachError && !isLoadingStoredCoach && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(glassCard, "p-8 text-center")}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
                  <Compass className="w-7 h-7 text-violet-500" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Ready for your personalized career guidance?</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Based on your North Star vision, I'll create a focused roadmap with weekly actions.
                </p>
                <Button 
                  onClick={fetchCoach}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Started
                </Button>
              </motion.div>
            )}

            {coachError && !coachLoading && !isLoadingStoredCoach && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(glassCard, "p-5 border-red-200/60 dark:border-red-700/40")}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-sm mb-1">Unable to Generate Insights</h4>
                    <p className="text-xs text-muted-foreground mb-2">{coachError}</p>
                    <Button 
                      onClick={fetchCoach}
                      variant="outline"
                      size="sm"
                      className="border-violet-500/40 text-violet-600 dark:text-violet-400 h-7 text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Try Again
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {coachData && !coachLoading && !isLoadingStoredCoach && (
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Compass className="w-5 h-5 text-primary" />
                      Coach
                    </h3>
                    {coachData.weeklyTheme && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        {coachData.weeklyTheme}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {coachGeneratedAt && (
                      <span>Generated {format(coachGeneratedAt, "MMM d, h:mm a")}</span>
                    )}
                    <Button
                      onClick={fetchCoach}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Refresh
                    </Button>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-3 space-y-3">
                    {coachData.roadmap && coachData.roadmap.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Map className="w-4 h-4 text-primary" />
                          <h4 className="font-medium text-foreground text-sm">Roadmap Timeline</h4>
                        </div>
                        {coachData.roadmap.map((phase, index) => {
                          const phaseResources = getLearningResourcesForPhase(index);
                          const isExpanded = expandedPhases.has(index);
                          const shouldCollapse = coachData.roadmap && coachData.roadmap.length >= 3;
                          const phaseProgress = getPhaseProgressPercent(index);
                          const completedCount = getPhaseCompletedCount(index);
                          const totalMilestones = phase.milestones?.length || 0;
                          const firstIncompleteIndex = phase.milestones?.findIndex(m => !isMilestoneCompleted(index, m)) ?? -1;
                          
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={cn(glassCard, "overflow-hidden")}
                            >
                              {totalMilestones > 0 && (
                                <div className="h-1 w-full bg-slate-200/60 dark:bg-slate-700/60">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${phaseProgress}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="h-full bg-primary/70"
                                  />
                                </div>
                              )}
                              {shouldCollapse ? (
                                <Collapsible open={isExpanded} onOpenChange={() => togglePhaseExpanded(index)}>
                                  <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <TrendingUp className="w-3 h-3 text-primary" />
                                      </div>
                                      <div className="text-left">
                                        <div className="flex items-center gap-2">
                                          <h5 className="font-medium text-foreground text-sm">{phase.phase}</h5>
                                          {totalMilestones > 0 && (
                                            <span className="text-[10px] text-muted-foreground">{completedCount}/{totalMilestones} done</span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{phase.timeframe}</p>
                                      </div>
                                    </div>
                                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3 space-y-2">
                                      {phase.goal && (
                                        <p className="text-xs text-muted-foreground">{phase.goal}</p>
                                      )}
                                      {phase.milestones?.length > 0 && (
                                        <ul className="space-y-1.5">
                                          {phase.milestones.map((milestone, mIndex) => {
                                            const isCompleted = isMilestoneCompleted(index, milestone);
                                            const isNext = mIndex === firstIncompleteIndex;
                                            const milestoneTasks = getMilestoneTasks(index);
                                            const task = milestoneTasks.find(t => t.title === milestone);
                                            const isEditing = task && editingMilestoneId === task.id;

                                            if (isEditing) {
                                              return (
                                                <li key={mIndex} className="flex items-center gap-2 p-1.5">
                                                  <Input
                                                    value={editingMilestoneText}
                                                    onChange={(e) => setEditingMilestoneText(e.target.value)}
                                                    className="h-7 text-xs flex-1"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveMilestoneEdit();
                                                      if (e.key === 'Escape') cancelMilestoneEdit();
                                                    }}
                                                  />
                                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveMilestoneEdit}>
                                                    <Check className="w-3 h-3 text-primary" />
                                                  </Button>
                                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelMilestoneEdit}>
                                                    <X className="w-3 h-3 text-muted-foreground" />
                                                  </Button>
                                                </li>
                                              );
                                            }

                                            return (
                                              <li 
                                                key={mIndex} 
                                                className={cn(
                                                  "text-xs flex items-start gap-2 p-1.5 rounded-lg transition-all group",
                                                  isCompleted && "text-muted-foreground",
                                                  isNext && "border-l-2 border-primary/30 bg-primary/10 pl-2"
                                                )}
                                              >
                                                <div className="flex-1 flex items-start gap-2 cursor-pointer" onClick={() => toggleMilestone(index, milestone)}>
                                                  <AnimatedCheckbox 
                                                    checked={isCompleted} 
                                                    onChange={() => toggleMilestone(index, milestone)} 
                                                  />
                                                  <span className={cn(isCompleted && "line-through")}>{milestone}</span>
                                                </div>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <MoreHorizontal className="w-3 h-3" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" className="w-36">
                                                    <DropdownMenuItem onClick={() => startEditMilestone(index, milestone)}>
                                                      <Pencil className="w-3 h-3 mr-2" />
                                                      Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => regenerateMilestone(index, milestone)}>
                                                      <RefreshCw className="w-3 h-3 mr-2" />
                                                      Regenerate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => deleteMilestone(index, milestone)} className="text-red-600">
                                                      <Trash2 className="w-3 h-3 mr-2" />
                                                      Delete
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      )}
                                      {phase.weeklyFocus && (
                                        <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-700/40">
                                          <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">Weekly Focus:</span>
                                          <p className="text-xs text-foreground mt-0.5">{phase.weeklyFocus}</p>
                                        </div>
                                      )}
                                      {phaseResources.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                          <div className="flex items-center gap-1 mb-1.5">
                                            <BookOpen className="w-3 h-3 text-cyan-500" />
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase">Learning Resources</span>
                                          </div>
                                          <div className="space-y-1">
                                            {phaseResources.flatMap(skill => skill.resources?.slice(0, 2) || []).slice(0, 3).map((resource, rIndex) => (
                                              <a
                                                key={rIndex}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                                <span className="truncate">{resource.title}</span>
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              ) : (
                                <div className="p-3 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                                      <TrendingUp className="w-3 h-3 text-violet-500" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-medium text-foreground text-sm">{phase.phase}</h5>
                                        {totalMilestones > 0 && (
                                          <span className="text-[10px] text-muted-foreground">{completedCount}/{totalMilestones} done</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground">{phase.timeframe}</p>
                                    </div>
                                  </div>
                                  {phase.goal && (
                                    <p className="text-xs text-muted-foreground">{phase.goal}</p>
                                  )}
                                  {phase.milestones?.length > 0 && (
                                    <ul className="space-y-1.5">
                                      {phase.milestones.map((milestone, mIndex) => {
                                        const isCompleted = isMilestoneCompleted(index, milestone);
                                        const isNext = mIndex === firstIncompleteIndex;
                                        const milestoneTasks = getMilestoneTasks(index);
                                        const task = milestoneTasks.find(t => t.title === milestone);
                                        const isEditing = task && editingMilestoneId === task.id;

                                        if (isEditing) {
                                          return (
                                            <li key={mIndex} className="flex items-center gap-2 p-1.5">
                                              <Input
                                                value={editingMilestoneText}
                                                onChange={(e) => setEditingMilestoneText(e.target.value)}
                                                className="h-7 text-xs flex-1"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') saveMilestoneEdit();
                                                  if (e.key === 'Escape') cancelMilestoneEdit();
                                                }}
                                              />
                                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveMilestoneEdit}>
                                                <Check className="w-3 h-3 text-primary" />
                                              </Button>
                                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelMilestoneEdit}>
                                                <X className="w-3 h-3 text-muted-foreground" />
                                              </Button>
                                            </li>
                                          );
                                        }

                                        return (
                                          <li 
                                            key={mIndex} 
                                            className={cn(
                                              "text-xs flex items-start gap-2 p-1.5 rounded-lg transition-all group",
                                              isCompleted && "text-muted-foreground",
                                              isNext && "border-l-2 border-primary/30 bg-primary/10 pl-2"
                                            )}
                                          >
                                            <div className="flex-1 flex items-start gap-2 cursor-pointer" onClick={() => toggleMilestone(index, milestone)}>
                                              <AnimatedCheckbox 
                                                checked={isCompleted} 
                                                onChange={() => toggleMilestone(index, milestone)} 
                                              />
                                              <span className={cn(isCompleted && "line-through")}>{milestone}</span>
                                            </div>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <MoreHorizontal className="w-3 h-3" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="w-36">
                                                <DropdownMenuItem onClick={() => startEditMilestone(index, milestone)}>
                                                  <Pencil className="w-3 h-3 mr-2" />
                                                  Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => regenerateMilestone(index, milestone)}>
                                                  <RefreshCw className="w-3 h-3 mr-2" />
                                                  Regenerate
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => deleteMilestone(index, milestone)} className="text-red-600">
                                                  <Trash2 className="w-3 h-3 mr-2" />
                                                  Delete
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                  {phase.weeklyFocus && (
                                    <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-700/40">
                                      <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">Weekly Focus:</span>
                                      <p className="text-xs text-foreground mt-0.5">{phase.weeklyFocus}</p>
                                    </div>
                                  )}
                                  {phaseResources.length > 0 && (
                                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                      <div className="flex items-center gap-1 mb-1.5">
                                        <BookOpen className="w-3 h-3 text-cyan-500" />
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">Learning Resources</span>
                                      </div>
                                      <div className="space-y-1">
                                        {phaseResources.flatMap(skill => skill.resources?.slice(0, 2) || []).slice(0, 3).map((resource, rIndex) => (
                                          <a
                                            key={rIndex}
                                            href={resource.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                            <span className="truncate">{resource.title}</span>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <div className="lg:sticky lg:top-4 space-y-3">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={cn(glassCard, "p-4")}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <h4 className="font-medium text-foreground text-sm">Active Sprint</h4>
                          </div>
                          <Select value={String(activePhaseIndex)} onValueChange={(v) => setActivePhaseOverride(Number(v))}>
                            <SelectTrigger className="h-7 w-[140px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {coachData?.roadmap?.map((phase, idx) => (
                                <SelectItem key={idx} value={String(idx)}>
                                  Phase {idx + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {activePhase && (
                          <>
                            <div className="mb-3">
                              <p className="text-sm font-medium text-foreground">{activePhase.phase}</p>
                              <p className="text-xs text-muted-foreground">{activePhase.timeframe}</p>
                            </div>
                            
                            <div className="p-2.5 rounded-lg bg-muted/80 border border-border/60 mb-3">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-muted-foreground">Phase Progress</span>
                                <span className="font-medium text-primary">
                                  {getPhaseCompletedCount(activePhaseIndex)}/{activePhase.milestones?.length || 0} done
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${getPhaseProgressPercent(activePhaseIndex)}%` }}
                                  className="h-full bg-primary/70 rounded-full"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
                                <span>Overall: {getTotalCompletedMilestones()}/{getTotalMilestones()} milestones</span>
                                <span>{Math.round((getTotalCompletedMilestones() / Math.max(getTotalMilestones(), 1)) * 100)}%</span>
                              </div>
                            </div>
                            
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase">Up Next</p>
                              {activePhase.milestones?.filter(m => !isMilestoneCompleted(activePhaseIndex, m)).slice(0, 4).map((milestone, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                  onClick={() => toggleMilestone(activePhaseIndex, milestone)}
                                >
                                  <AnimatedCheckbox
                                    checked={false}
                                    onChange={() => toggleMilestone(activePhaseIndex, milestone)}
                                  />
                                  <span className="text-xs text-foreground">{milestone}</span>
                                </div>
                              ))}
                              {activePhase.milestones?.filter(m => !isMilestoneCompleted(activePhaseIndex, m)).length === 0 && (
                                <div className="p-3 text-center rounded-lg bg-primary/10 border border-primary/30">
                                  <Check className="w-5 h-5 text-primary mx-auto mb-1" />
                                  <p className="text-xs font-medium text-primary">Phase Complete!</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Move to next phase or regenerate roadmap</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase mb-2">Quick Actions</p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() => window.location.href = '/orbit'}
                                >
                                  <MessageCircle className="w-3 h-3 mr-1.5" />
                                  Chat
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() => setIsLogWinDialogOpen(true)}
                                >
                                  <Trophy className="w-3 h-3 mr-1.5" />
                                  Log Win
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-8 text-xs text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                                  onClick={fetchCoach}
                                  disabled={coachLoading}
                                >
                                  <RefreshCw className={cn("w-3 h-3 mr-1.5", coachLoading && "animate-spin")} />
                                  Refresh
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                      
                      {coachData?.coachingNote && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="p-3 rounded-xl border-l-4 border-primary/30 bg-primary/10"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Lightbulb className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] font-semibold text-primary uppercase">Coach's Note</span>
                          </div>
                          <p className="text-xs text-primary line-clamp-2">{coachData.coachingNote}</p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={isVisionDialogOpen} onOpenChange={setIsVisionDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit North Star Vision</DialogTitle>
              <DialogDescription>Define your guiding principles and long-term goals.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingVision.map((item, index) => (
                <div key={item.id} className="space-y-2 p-4 rounded-xl bg-muted/50">
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
              <Button onClick={saveVision} disabled={updateVisionMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0">
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
              <Button onClick={handleSaveTask} disabled={updateTask.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0">
                {updateTask.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isProjectDialogOpen} onOpenChange={(open) => {
          setIsProjectDialogOpen(open);
          if (!open) {
            setSelectedProject(null);
            setEditingProjectTasks([]);
          }
        }}>
          <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedProject?.id ? "Edit Goal" : "New Goal"}</DialogTitle>
              <DialogDescription>
                {selectedProject?.id ? "Update your goal details and tasks." : "Create a new goal to work towards."}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
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
                <div className="space-y-2">
                  <Label>Next Action</Label>
                  <Input 
                    value={selectedProject?.nextAction || ""}
                    onChange={(e) => setSelectedProject(prev => prev ? ({...prev, nextAction: e.target.value}) : ({...getEmptyProject(), nextAction: e.target.value} as CareerProject))}
                    placeholder="What's the immediate next step?"
                  />
                </div>

                <div className="space-y-3 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Project Tasks</Label>
                    <span className="text-xs text-muted-foreground">
                      {editingProjectTasks.filter(t => !t.isDeleted).length} tasks
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new task..."
                      value={newEditingProjectTask}
                      onChange={(e) => setNewEditingProjectTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddEditingTask();
                        }
                      }}
                      className="flex-1 bg-white dark:bg-slate-900"
                    />
                    <Button 
                      type="button"
                      size="sm"
                      onClick={handleAddEditingTask}
                      disabled={!newEditingProjectTask.trim()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {editingProjectTasks.filter(t => !t.isDeleted).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No tasks yet. Add tasks above.
                      </p>
                    ) : (
                      editingProjectTasks.filter(t => !t.isDeleted).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 group"
                        >
                          <AnimatedCheckbox
                            checked={task.completed === 1}
                            onChange={() => {
                              setEditingProjectTasks(prev => prev.map(t => 
                                t.id === task.id ? { ...t, completed: t.completed === 1 ? 0 : 1 } : t
                              ));
                            }}
                          />
                          <Input
                            value={task.title}
                            onChange={(e) => {
                              setEditingProjectTasks(prev => prev.map(t =>
                                t.id === task.id ? { ...t, title: e.target.value } : t
                              ));
                            }}
                            className={cn(
                              "flex-1 h-8 text-sm border-0 bg-transparent px-1 focus-visible:ring-1",
                              task.completed === 1 && "line-through text-muted-foreground"
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setEditingProjectTasks(prev => prev.map(t =>
                                t.id === task.id ? { ...t, isDeleted: true } : t
                              ));
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="gap-2 pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
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
              <Button onClick={handleSaveProject} disabled={updateProject.isPending || createProject.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0">
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
                        selectedProject.status === "in_progress" && "border-slate-400/60 text-slate-600 bg-slate-50",
                        selectedProject.status === "planning" && "border-slate-300/60 text-slate-500",
                        selectedProject.status === "completed" && "border-slate-400/40 text-slate-500",
                        selectedProject.status === "ongoing" && "border-slate-400/60 text-slate-600"
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
                          className="h-full bg-primary/70 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                    <CircularProgress progress={progress} size={72} strokeWidth={6} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/50">
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
                    <div className="p-4 rounded-xl bg-muted/50 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="text-xs text-muted-foreground font-semibold uppercase mb-1">Next Action</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{selectedProject.nextAction}</p>
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
                        className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
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
                      openProjectDialog(selectedProject);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Edit Goal
                  </Button>
                </DialogFooter>
              </>
              );
            })()}
          </DialogContent>
        </Dialog>

        <Dialog open={isLogWinDialogOpen} onOpenChange={setIsLogWinDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Log a Win
              </DialogTitle>
              <DialogDescription>
                Celebrate your progress! What did you accomplish?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={logWinText}
                onChange={(e) => setLogWinText(e.target.value)}
                placeholder="e.g., Completed my first teaching observation, got positive feedback from the coordinator..."
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLogWinDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast.success("Win logged! Keep up the great work!");
                  setLogWinText("");
                  setIsLogWinDialogOpen(false);
                }}
                variant="outline"
                className="border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Save Win
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
