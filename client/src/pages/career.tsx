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
  
  const [editingLearningSkillIdx, setEditingLearningSkillIdx] = useState<number | null>(null);
  const [editingLearningResourceIdx, setEditingLearningResourceIdx] = useState<number | null>(null);
  const [editingLearningResource, setEditingLearningResource] = useState<{ title: string; type: string; url: string; timeCommitment: string }>({ title: "", type: "course", url: "", timeCommitment: "" });
  const [addingResourceToSkill, setAddingResourceToSkill] = useState<number | null>(null);
  const [newResourceData, setNewResourceData] = useState<{ title: string; type: string; url: string; timeCommitment: string }>({ title: "", type: "course", url: "", timeCommitment: "1-2 hours" });

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
  const [expandedParentTasks, setExpandedParentTasks] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const getProjectTasks = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId);
  };

  const getParentTasks = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId && !t.parentId);
  };

  const getSubtasks = (parentId: string) => {
    return tasks.filter(t => t.parentId === parentId);
  };

  const toggleParentExpanded = (taskId: string) => {
    setExpandedParentTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
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
      parentId: null,
      completed: 0,
      priority: "medium",
      due: null,
      tags: [],
      description: ""
    }, {
      onSuccess: () => setNewProjectTask("")
    });
  };

  const handleAddSubtask = (parentId: string, projectId: string) => {
    if (!newSubtaskTitle.trim()) return;
    createTask.mutate({
      title: newSubtaskTitle,
      projectId,
      parentId,
      completed: 0,
      priority: "medium",
      due: null,
      tags: [],
      description: ""
    }, {
      onSuccess: () => {
        setNewSubtaskTitle("");
        setAddingSubtaskTo(null);
        setExpandedParentTasks(prev => new Set(Array.from(prev).concat(parentId)));
      }
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

  const [addingMilestoneToPhase, setAddingMilestoneToPhase] = useState<number | null>(null);
  const [newMilestoneText, setNewMilestoneText] = useState("");
  const [regeneratingPhase, setRegeneratingPhase] = useState<number | null>(null);

  const addMilestone = (phaseIndex: number) => {
    if (!newMilestoneText.trim() || !coachData?.roadmap?.[phaseIndex]) return;
    
    const phase = coachData.roadmap[phaseIndex];
    createTask.mutate({
      title: newMilestoneText.trim(),
      description: `Phase: ${phase.phase} | ${phase.timeframe}`,
      projectId: null,
      parentId: null,
      completed: 0,
      priority: "medium",
      due: null,
      tags: ["coach", "milestone", `phase-${phaseIndex}`],
    }, {
      onSuccess: () => {
        setNewMilestoneText("");
        setAddingMilestoneToPhase(null);
        toast.success("Milestone added!");
      }
    });
  };

  const regeneratePhase = async (phaseIndex: number) => {
    if (!coachData?.roadmap?.[phaseIndex]) return;
    
    const currentPhase = coachData.roadmap[phaseIndex];
    setRegeneratingPhase(phaseIndex);
    
    try {
      const response = await fetch("/api/career/regenerate-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseIndex,
          currentPhase,
          vision: vision,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.newPhase) {
          const updatedRoadmap = [...coachData.roadmap];
          updatedRoadmap[phaseIndex] = data.newPhase;
          
          const saveResponse = await fetch("/api/career/coach/roadmap", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roadmap: updatedRoadmap }),
          });
          
          if (saveResponse.ok) {
            const savedData = await saveResponse.json();
            setCoachData(prev => prev ? { ...prev, roadmap: savedData.roadmap } : null);
            toast.success("Phase regenerated!");
          }
        }
      } else {
        toast.error("Failed to regenerate phase");
      }
    } catch (error) {
      console.error("Failed to regenerate phase:", error);
      toast.error("Failed to regenerate phase");
    } finally {
      setRegeneratingPhase(null);
    }
  };

  const getPhaseProgressPercent = (phaseIndex: number) => {
    const phase = coachData?.roadmap?.[phaseIndex];
    if (!phase?.milestones?.length) return 0;
    const totalMilestones = phase.milestones.length;
    let completed = 0;
    phase.milestones.forEach(milestone => {
      if (isMilestoneCompleted(phaseIndex, milestone)) {
        completed++;
      }
    });
    return Math.round((completed / totalMilestones) * 100);
  };

  const getPhaseCompletedCount = (phaseIndex: number) => {
    const phase = coachData?.roadmap?.[phaseIndex];
    if (!phase?.milestones?.length) return 0;
    let completed = 0;
    phase.milestones.forEach(milestone => {
      if (isMilestoneCompleted(phaseIndex, milestone)) {
        completed++;
      }
    });
    return completed;
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

  const startEditLearningResource = (skillIdx: number, resourceIdx: number) => {
    const resource = coachData?.learningPath?.[skillIdx]?.resources?.[resourceIdx];
    if (resource) {
      setEditingLearningSkillIdx(skillIdx);
      setEditingLearningResourceIdx(resourceIdx);
      setEditingLearningResource({ ...resource });
    }
  };

  const saveLearningResourceEdit = async () => {
    if (editingLearningSkillIdx === null || editingLearningResourceIdx === null || !coachData?.learningPath) return;
    
    const updatedLearningPath = [...coachData.learningPath];
    updatedLearningPath[editingLearningSkillIdx] = {
      ...updatedLearningPath[editingLearningSkillIdx],
      resources: updatedLearningPath[editingLearningSkillIdx].resources.map((r, idx) =>
        idx === editingLearningResourceIdx ? { ...editingLearningResource } : r
      )
    };
    
    try {
      const response = await fetch("/api/career/coach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningPath: updatedLearningPath })
      });
      if (response.ok) {
        setCoachData(prev => prev ? { ...prev, learningPath: updatedLearningPath } : null);
        toast.success("Resource updated!");
      }
    } catch (error) {
      toast.error("Failed to update resource");
    }
    
    setEditingLearningSkillIdx(null);
    setEditingLearningResourceIdx(null);
  };

  const cancelLearningResourceEdit = () => {
    setEditingLearningSkillIdx(null);
    setEditingLearningResourceIdx(null);
    setEditingLearningResource({ title: "", type: "course", url: "", timeCommitment: "" });
  };

  const deleteLearningResource = async (skillIdx: number, resourceIdx: number) => {
    if (!coachData?.learningPath) return;
    
    const updatedLearningPath = [...coachData.learningPath];
    updatedLearningPath[skillIdx] = {
      ...updatedLearningPath[skillIdx],
      resources: updatedLearningPath[skillIdx].resources.filter((_, idx) => idx !== resourceIdx)
    };
    
    try {
      const response = await fetch("/api/career/coach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningPath: updatedLearningPath })
      });
      if (response.ok) {
        setCoachData(prev => prev ? { ...prev, learningPath: updatedLearningPath } : null);
        toast.success("Resource removed!");
      }
    } catch (error) {
      toast.error("Failed to remove resource");
    }
  };

  const addLearningResource = async (skillIdx: number) => {
    if (!newResourceData.title.trim() || !coachData?.learningPath) return;
    
    const updatedLearningPath = [...coachData.learningPath];
    updatedLearningPath[skillIdx] = {
      ...updatedLearningPath[skillIdx],
      resources: [...updatedLearningPath[skillIdx].resources, { ...newResourceData }]
    };
    
    try {
      const response = await fetch("/api/career/coach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningPath: updatedLearningPath })
      });
      if (response.ok) {
        setCoachData(prev => prev ? { ...prev, learningPath: updatedLearningPath } : null);
        toast.success("Resource added!");
        setNewResourceData({ title: "", type: "course", url: "", timeCommitment: "1-2 hours" });
        setAddingResourceToSkill(null);
      }
    } catch (error) {
      toast.error("Failed to add resource");
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
      parentId: null,
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
            parentId: null,
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
                parentId: null,
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
      <div className="space-y-4 pb-12 max-w-6xl mx-auto w-full px-3 md:px-4">
        
        {/* Compact Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl md:text-3xl font-display font-bold text-primary">Goals & Vision</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Your growth dashboard</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={openEditVision}
            className="text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <Pencil className="w-3.5 h-3.5 md:mr-1.5" />
            <span className="hidden md:inline text-xs">Edit</span>
          </Button>
        </motion.div>

        {/* North Star Vision - Horizontal Scroll on Mobile */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Target className="w-4 h-4 text-primary" />
            North Star Vision
          </h2>
          
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0 md:grid md:grid-cols-3 scrollbar-hide">
            {vision.map((item, index) => {
              const Icon = VISION_ICONS[index] || Sparkles;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    glassCard,
                    "p-3 md:p-4 shrink-0 w-[200px] md:w-auto group hover:border-primary/40 transition-all duration-300"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 md:w-4.5 md:h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-xs md:text-sm leading-tight line-clamp-2">{item.title}</h3>
                      <span className="text-[10px] md:text-xs text-primary/70 font-medium">{item.timeframe}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Compact Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(glassCard, "w-full grid grid-cols-2 p-0.5 h-auto")}>
            <TabsTrigger 
              value="projects" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm py-2 text-xs md:text-sm rounded-lg transition-all"
            >
              <Rocket className="w-3.5 h-3.5 mr-1.5" />
              Goals
            </TabsTrigger>
            <TabsTrigger 
              value="coach" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm py-2 text-xs md:text-sm rounded-lg transition-all"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              Coach
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Rocket className="w-4 h-4 text-primary" />
                Active Goals
              </h2>
              <Button 
                onClick={() => openProjectDialog(null)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 h-7 text-xs px-2.5"
                size="sm"
                data-testid="button-add-goal"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>

            {projects.map((project, index) => {
              const projectTasks = getProjectTasks(project.id);
              const parentTasks = getParentTasks(project.id);
              const completedTasks = projectTasks.filter(t => t.completed === 1).length;
              const progress = getProjectProgress(project.id);
              const deadline = getDeadlineDisplay(project.deadline);
              const isProjectOpen = expandedProjects.has(project.id);

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={cn(glassCard, "overflow-hidden")}
                  data-testid={`card-project-${project.id}`}
                >
                  <button
                    onClick={() => toggleProjectExpanded(project.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
                    data-testid={`button-toggle-project-${project.id}`}
                  >
                    <CircularProgress progress={progress} size={36} strokeWidth={3} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-1">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {projectTasks.length > 0 ? `${completedTasks}/${projectTasks.length} tasks` : STATUS_DISPLAY[project.status] || project.status}
                        </span>
                        {deadline && (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", deadline.className)}>
                            {deadline.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-project-menu-${project.id}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => { setSelectedProject(project); openProjectDialog(project); }}>
                            <Pencil className="w-3 h-3 mr-2" />
                            Edit Goal
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteProject.mutate(project.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        isProjectOpen && "rotate-180"
                      )} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isProjectOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border/40"
                      >
                        <div className="p-3 space-y-2">
                          {project.description && (
                            <p className="text-xs text-muted-foreground mb-2">{project.description}</p>
                          )}

                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a task..."
                              value={selectedProject?.id === project.id ? newProjectTask : ""}
                              onChange={(e) => { setSelectedProject(project); setNewProjectTask(e.target.value); }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  setSelectedProject(project);
                                  handleAddProjectTask(project.id);
                                }
                              }}
                              onClick={(e) => { e.stopPropagation(); setSelectedProject(project); }}
                              className="flex-1 h-8 text-sm"
                              data-testid={`input-add-task-${project.id}`}
                            />
                            <Button 
                              size="sm"
                              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(project);
                                handleAddProjectTask(project.id);
                              }}
                              disabled={!(selectedProject?.id === project.id && newProjectTask.trim()) || createTask.isPending}
                              data-testid={`button-add-task-${project.id}`}
                            >
                              {createTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            </Button>
                          </div>

                          {parentTasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3">No tasks yet</p>
                          ) : (
                            <div className="space-y-1.5">
                              {parentTasks.map((parentTask, tIdx) => {
                                const subtasks = getSubtasks(parentTask.id);
                                const completedSubtasks = subtasks.filter(s => s.completed === 1).length;
                                const isExpanded = expandedParentTasks.has(parentTask.id);
                                const isAddingSubtask = addingSubtaskTo === parentTask.id;

                                return (
                                  <div
                                    key={parentTask.id}
                                    className="rounded-lg border border-border/40 bg-card/50 overflow-hidden"
                                    data-testid={`task-item-${parentTask.id}`}
                                  >
                                    <div className="flex items-center gap-2 px-2.5 py-2 hover:bg-muted/30 transition-colors group">
                                      {subtasks.length > 0 || true ? (
                                        <motion.button
                                          onClick={() => toggleParentExpanded(parentTask.id)}
                                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0"
                                          whileTap={{ scale: 0.9 }}
                                          data-testid={`button-expand-task-${parentTask.id}`}
                                        >
                                          <ChevronDown className={cn(
                                            "w-3.5 h-3.5 text-muted-foreground transition-transform",
                                            isExpanded && "rotate-180"
                                          )} />
                                        </motion.button>
                                      ) : null}
                                      <AnimatedCheckbox
                                        checked={parentTask.completed === 1}
                                        onChange={() => toggleTask(parentTask.id)}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className={cn(
                                          "text-sm",
                                          parentTask.completed === 1 && "line-through text-muted-foreground"
                                        )}>
                                          {parentTask.title}
                                        </span>
                                        {subtasks.length > 0 && (
                                          <span className="ml-1.5 text-[10px] text-muted-foreground">
                                            {completedSubtasks}/{subtasks.length}
                                          </span>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:bg-primary/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAddingSubtaskTo(isAddingSubtask ? null : parentTask.id);
                                          setNewSubtaskTitle("");
                                          if (!isExpanded) toggleParentExpanded(parentTask.id);
                                        }}
                                        data-testid={`button-add-subtask-${parentTask.id}`}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteTask.mutate(parentTask.id);
                                        }}
                                        data-testid={`button-delete-task-${parentTask.id}`}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>

                                    <AnimatePresence>
                                      {(isExpanded || isAddingSubtask) && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.15 }}
                                          className="border-t border-border/30 bg-muted/10"
                                        >
                                          {isAddingSubtask && (
                                            <div className="px-2.5 py-1.5 border-b border-border/30">
                                              <div className="flex gap-1.5 pl-5">
                                                <Input
                                                  placeholder="Add subtask..."
                                                  value={newSubtaskTitle}
                                                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                  onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                      e.preventDefault();
                                                      handleAddSubtask(parentTask.id, project.id);
                                                    }
                                                    if (e.key === "Escape") {
                                                      setAddingSubtaskTo(null);
                                                      setNewSubtaskTitle("");
                                                    }
                                                  }}
                                                  className="flex-1 h-7 text-xs"
                                                  autoFocus
                                                />
                                                <Button
                                                  size="sm"
                                                  className="h-7 px-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                                                  onClick={() => handleAddSubtask(parentTask.id, project.id)}
                                                  disabled={!newSubtaskTitle.trim() || createTask.isPending}
                                                >
                                                  {createTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                                                </Button>
                                              </div>
                                            </div>
                                          )}

                                          {subtasks.length > 0 && (
                                            <div className="px-2.5 py-1.5 space-y-0.5">
                                              {subtasks.map((subtask) => (
                                                <div
                                                  key={subtask.id}
                                                  className="flex items-center gap-2 pl-5 pr-1 py-1 rounded hover:bg-muted/40 group/subtask"
                                                  data-testid={`subtask-item-${subtask.id}`}
                                                >
                                                  <AnimatedCheckbox
                                                    checked={subtask.completed === 1}
                                                    onChange={() => toggleTask(subtask.id)}
                                                  />
                                                  <span className={cn(
                                                    "flex-1 text-xs",
                                                    subtask.completed === 1 && "line-through text-muted-foreground"
                                                  )}>
                                                    {subtask.title}
                                                  </span>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0 opacity-0 group-hover/subtask:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      deleteTask.mutate(subtask.id);
                                                    }}
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {subtasks.length === 0 && !isAddingSubtask && (
                                            <p className="text-[10px] text-muted-foreground text-center py-2">No subtasks</p>
                                          )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => openProjectDialog(null)}
              className={cn(
                glassCard,
                "w-full p-3 border-dashed border-2 border-primary/20 flex items-center justify-center gap-2",
                "text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-200"
              )}
              data-testid="button-add-new-goal"
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs font-medium">New Goal</span>
            </motion.button>
          </TabsContent>

          <TabsContent value="coach" className="mt-4 space-y-3">
            {(isLoadingStoredCoach || coachLoading) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(glassCard, "p-4 flex items-center justify-center gap-2")}
              >
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  {isLoadingStoredCoach ? "Loading..." : "Generating guidance..."}
                </p>
              </motion.div>
            )}

            {!coachData && !coachLoading && !coachError && !isLoadingStoredCoach && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(glassCard, "p-5 text-center")}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Compass className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">Ready for personalized guidance?</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                  I'll create a focused roadmap based on your vision.
                </p>
                <Button 
                  onClick={fetchCoach}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 h-8 text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Get Started
                </Button>
              </motion.div>
            )}

            {coachError && !coachLoading && !isLoadingStoredCoach && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(glassCard, "p-3 border-red-200/60 dark:border-red-700/40")}
              >
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <X className="w-3 h-3 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-xs mb-0.5">Unable to Generate</h4>
                    <p className="text-[10px] text-muted-foreground mb-1.5">{coachError}</p>
                    <Button 
                      onClick={fetchCoach}
                      variant="outline"
                      size="sm"
                      className="border-primary/40 text-primary h-6 text-[10px] px-2"
                    >
                      <RefreshCw className="w-2.5 h-2.5 mr-1" />
                      Retry
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {coachData && !coachLoading && !isLoadingStoredCoach && (
              <div className="space-y-3">
                {/* Active Sprint FIRST - Main Focus */}
                {activePhase && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(glassCard, "p-3")}
                  >
                    {/* Sprint Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <h4 className="font-medium text-foreground text-xs">Active Sprint</h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Select value={String(activePhaseIndex)} onValueChange={(v) => setActivePhaseOverride(Number(v))}>
                          <SelectTrigger className="h-6 w-[100px] text-[10px] border-0 bg-muted/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {coachData?.roadmap?.map((phase, idx) => (
                              <SelectItem key={idx} value={String(idx)} className="text-xs">
                                Phase {idx + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={fetchCoach}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <RefreshCw className={cn("w-3 h-3", coachLoading && "animate-spin")} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Phase Title & Progress Bar */}
                    <div className="mb-2">
                      <p className="text-xs font-medium text-foreground line-clamp-1">{activePhase.phase}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${getPhaseProgressPercent(activePhaseIndex)}%` }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                        <span className="text-[10px] text-primary font-medium">
                          {getPhaseCompletedCount(activePhaseIndex)}/{activePhase.milestones?.length || 0}
                        </span>
                      </div>
                    </div>
                    
                    {/* Up Next Milestones - Compact List */}
                    <div className="space-y-1">
                      {activePhase.milestones?.map((milestone, mIdx) => {
                        const isCompleted = isMilestoneCompleted(activePhaseIndex, milestone);
                        const milestoneTasks = getMilestoneTasks(activePhaseIndex);
                        const milestoneTask = milestoneTasks.find(t => t.title === milestone);
                        const isEditing = milestoneTask && editingMilestoneId === milestoneTask.id;
                        const isRegenerating = milestoneTask && regeneratingMilestoneId === milestoneTask.id;
                        
                        if (isEditing) {
                          return (
                            <div key={mIdx} className="flex items-center gap-1 p-1 rounded-lg bg-muted">
                              <Input
                                value={editingMilestoneText}
                                onChange={(e) => setEditingMilestoneText(e.target.value)}
                                className="h-7 text-[11px] flex-1"
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
                            </div>
                          );
                        }
                        
                        return (
                          <div
                            key={mIdx}
                            className={cn(
                              "flex items-start gap-2 p-1.5 rounded-lg transition-colors group",
                              isCompleted ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"
                            )}
                          >
                            <div 
                              className="flex items-start gap-2 flex-1 cursor-pointer"
                              onClick={() => toggleMilestone(activePhaseIndex, milestone)}
                            >
                              <AnimatedCheckbox
                                checked={isCompleted}
                                onChange={() => toggleMilestone(activePhaseIndex, milestone)}
                              />
                              <span className={cn(
                                "text-[11px] leading-tight flex-1",
                                isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                              )}>{milestone}</span>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isRegenerating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="w-3 h-3" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem onClick={() => startEditMilestone(activePhaseIndex, milestone)}>
                                  <Pencil className="w-3 h-3 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => deleteMilestone(activePhaseIndex, milestone)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                      {activePhase.milestones?.filter(m => !isMilestoneCompleted(activePhaseIndex, m)).length === 0 && (
                        <div className="p-2 text-center rounded-lg bg-primary/10 border border-primary/20">
                          <Check className="w-4 h-4 text-primary mx-auto mb-0.5" />
                          <p className="text-[10px] font-medium text-primary">Phase Complete!</p>
                        </div>
                      )}
                      
                      {/* Add Milestone */}
                      {addingMilestoneToPhase === activePhaseIndex ? (
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted mt-1">
                          <Input
                            value={newMilestoneText}
                            onChange={(e) => setNewMilestoneText(e.target.value)}
                            placeholder="New milestone..."
                            className="h-7 text-[11px] flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addMilestone(activePhaseIndex);
                              if (e.key === 'Escape') {
                                setAddingMilestoneToPhase(null);
                                setNewMilestoneText("");
                              }
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => addMilestone(activePhaseIndex)}>
                            <Check className="w-3 h-3 text-primary" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                            setAddingMilestoneToPhase(null);
                            setNewMilestoneText("");
                          }}>
                            <X className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-6 text-[10px] text-muted-foreground hover:text-foreground mt-1"
                          onClick={() => setAddingMilestoneToPhase(activePhaseIndex)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Milestone
                        </Button>
                      )}
                    </div>
                    
                    {/* Quick Actions Row */}
                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-7 text-[10px] bg-muted/50"
                        onClick={() => setIsLogWinDialogOpen(true)}
                      >
                        <Trophy className="w-3 h-3 mr-1" />
                        Log Win
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Roadmap Phases - Horizontal Pills */}
                {coachData.roadmap && coachData.roadmap.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Map className="w-3.5 h-3.5 text-primary" />
                        <h4 className="font-medium text-foreground text-xs">Roadmap</h4>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {getTotalCompletedMilestones()}/{getTotalMilestones()} total
                      </span>
                    </div>
                    
                    {/* Horizontal Phase Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
                      {coachData.roadmap.map((phase, index) => {
                        const progress = getPhaseProgressPercent(index);
                        const isActive = index === activePhaseIndex;
                        return (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setActivePhaseOverride(index)}
                            className={cn(
                              "shrink-0 p-2 rounded-xl border transition-all",
                              isActive 
                                ? "bg-primary/10 border-primary/40" 
                                : "bg-card/60 border-border/40 hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="relative w-8 h-8">
                                <svg className="w-8 h-8 -rotate-90">
                                  <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="none" className="text-muted" />
                                  <circle 
                                    cx="16" cy="16" r="12" 
                                    stroke="currentColor" 
                                    strokeWidth="3" 
                                    fill="none" 
                                    strokeLinecap="round"
                                    strokeDasharray={75.4}
                                    strokeDashoffset={75.4 - (progress / 100) * 75.4}
                                    className="text-primary"
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground">
                                  {progress}%
                                </span>
                              </div>
                              <div className="text-left">
                                <p className="text-[10px] font-medium text-foreground line-clamp-1">Phase {index + 1}</p>
                                <p className="text-[8px] text-muted-foreground">{phase.timeframe}</p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Coach's Note */}
                {coachData?.coachingNote && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 rounded-xl border-l-4 border-primary/30 bg-primary/10"
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <Lightbulb className="w-3 h-3 text-primary" />
                      <span className="text-[9px] font-semibold text-primary uppercase">Coach's Note</span>
                    </div>
                    <p className="text-[11px] text-primary">{coachData.coachingNote}</p>
                  </motion.div>
                )}

                {/* Learning Resources Section */}
                {coachData?.learningPath && coachData.learningPath.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      <h4 className="font-medium text-foreground text-xs">Recommended Learning</h4>
                    </div>
                    
                    <div className="space-y-2">
                      {coachData.learningPath.map((skill, sIdx) => (
                        <Collapsible key={sIdx} className={cn(glassCard, "overflow-hidden")}>
                          <CollapsibleTrigger className="w-full p-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <BookOpen className="w-3 h-3 text-primary" />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-medium text-foreground">{skill.skill}</p>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{skill.importance}</p>
                              </div>
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-2.5 pb-2.5">
                            <div className="space-y-1.5 pt-1 border-t border-border/30">
                              {skill.resources.map((resource, rIdx) => {
                                const isEditing = editingLearningSkillIdx === sIdx && editingLearningResourceIdx === rIdx;
                                
                                if (isEditing) {
                                  return (
                                    <div key={rIdx} className="p-2 rounded-lg bg-muted/80 space-y-2">
                                      <Input
                                        value={editingLearningResource.title}
                                        onChange={(e) => setEditingLearningResource(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Resource title"
                                        className="h-7 text-xs"
                                        autoFocus
                                      />
                                      <Input
                                        value={editingLearningResource.url}
                                        onChange={(e) => setEditingLearningResource(prev => ({ ...prev, url: e.target.value }))}
                                        placeholder="URL (or search: query)"
                                        className="h-7 text-xs"
                                      />
                                      <div className="flex gap-2">
                                        <select
                                          value={editingLearningResource.type}
                                          onChange={(e) => setEditingLearningResource(prev => ({ ...prev, type: e.target.value }))}
                                          className="h-7 px-2 text-xs rounded border border-border bg-background flex-1"
                                        >
                                          <option value="course">Course</option>
                                          <option value="book">Book</option>
                                          <option value="tutorial">Tutorial</option>
                                          <option value="practice">Practice</option>
                                        </select>
                                        <Input
                                          value={editingLearningResource.timeCommitment}
                                          onChange={(e) => setEditingLearningResource(prev => ({ ...prev, timeCommitment: e.target.value }))}
                                          placeholder="Time (e.g., 2 hours)"
                                          className="h-7 text-xs flex-1"
                                        />
                                      </div>
                                      <div className="flex gap-1 justify-end">
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={cancelLearningResourceEdit}>
                                          Cancel
                                        </Button>
                                        <Button size="sm" className="h-6 px-2 text-xs" onClick={saveLearningResourceEdit}>
                                          Save
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div
                                    key={rIdx}
                                    className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                                  >
                                    <div className={cn(
                                      "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0",
                                      resource.type === 'course' && "bg-blue-500/20 text-blue-600",
                                      resource.type === 'book' && "bg-amber-500/20 text-amber-600",
                                      resource.type === 'tutorial' && "bg-green-500/20 text-green-600",
                                      resource.type === 'practice' && "bg-purple-500/20 text-purple-600"
                                    )}>
                                      {resource.type === 'course' && '📚'}
                                      {resource.type === 'book' && '📖'}
                                      {resource.type === 'tutorial' && '🎓'}
                                      {resource.type === 'practice' && '✍️'}
                                    </div>
                                    <a
                                      href={resource.url.startsWith('search:') ? `https://www.google.com/search?q=${encodeURIComponent(resource.url.replace('search: ', ''))}` : resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 min-w-0"
                                    >
                                      <p className="text-[11px] font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                        {resource.title}
                                      </p>
                                      <p className="text-[9px] text-muted-foreground">{resource.timeCommitment}</p>
                                    </a>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-5 w-5"
                                        onClick={(e) => { e.stopPropagation(); startEditLearningResource(sIdx, rIdx); }}
                                      >
                                        <Pencil className="w-2.5 h-2.5 text-muted-foreground hover:text-primary" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-5 w-5"
                                        onClick={(e) => { e.stopPropagation(); deleteLearningResource(sIdx, rIdx); }}
                                      >
                                        <Trash2 className="w-2.5 h-2.5 text-muted-foreground hover:text-rose-500" />
                                      </Button>
                                    </div>
                                    <a
                                      href={resource.url.startsWith('search:') ? `https://www.google.com/search?q=${encodeURIComponent(resource.url.replace('search: ', ''))}` : resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" />
                                    </a>
                                  </div>
                                );
                              })}
                              
                              {addingResourceToSkill === sIdx ? (
                                <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                                  <Input
                                    value={newResourceData.title}
                                    onChange={(e) => setNewResourceData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Resource title"
                                    className="h-7 text-xs"
                                    autoFocus
                                  />
                                  <Input
                                    value={newResourceData.url}
                                    onChange={(e) => setNewResourceData(prev => ({ ...prev, url: e.target.value }))}
                                    placeholder="URL (or search: query for search)"
                                    className="h-7 text-xs"
                                  />
                                  <div className="flex gap-2">
                                    <select
                                      value={newResourceData.type}
                                      onChange={(e) => setNewResourceData(prev => ({ ...prev, type: e.target.value }))}
                                      className="h-7 px-2 text-xs rounded border border-border bg-background flex-1"
                                    >
                                      <option value="course">Course</option>
                                      <option value="book">Book</option>
                                      <option value="tutorial">Tutorial</option>
                                      <option value="practice">Practice</option>
                                    </select>
                                    <Input
                                      value={newResourceData.timeCommitment}
                                      onChange={(e) => setNewResourceData(prev => ({ ...prev, timeCommitment: e.target.value }))}
                                      placeholder="Time (e.g., 2 hours)"
                                      className="h-7 text-xs flex-1"
                                    />
                                  </div>
                                  <div className="flex gap-1 justify-end">
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-6 px-2 text-xs" 
                                      onClick={() => {
                                        setAddingResourceToSkill(null);
                                        setNewResourceData({ title: "", type: "course", url: "", timeCommitment: "1-2 hours" });
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      className="h-6 px-2 text-xs" 
                                      onClick={() => addLearningResource(sIdx)}
                                      disabled={!newResourceData.title.trim()}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full h-7 text-xs text-muted-foreground hover:text-primary"
                                  onClick={() => setAddingResourceToSkill(sIdx)}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Resource
                                </Button>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Keep dialogs below */}
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
                      <h4 className="text-sm font-semibold text-foreground">Tasks</h4>
                      <span className="text-xs text-muted-foreground">{projectTasks.length} items</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a new task..."
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

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {(() => {
                        const parentTasks = getParentTasks(selectedProject.id);
                        if (parentTasks.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No tasks yet. Add your first task above.
                            </p>
                          );
                        }
                        return parentTasks.map((parentTask, index) => {
                          const subtasks = getSubtasks(parentTask.id);
                          const completedSubtasks = subtasks.filter(s => s.completed === 1).length;
                          const isExpanded = expandedParentTasks.has(parentTask.id);
                          const isAddingSubtask = addingSubtaskTo === parentTask.id;
                          
                          return (
                            <motion.div
                              key={parentTask.id}
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="rounded-xl border border-border/60 bg-card/50 overflow-hidden"
                            >
                              <div className="flex items-center gap-2 p-3 hover:bg-muted/30 transition-colors group">
                                <motion.button
                                  onClick={() => toggleParentExpanded(parentTask.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors shrink-0"
                                  whileTap={{ scale: 0.9 }}
                                  data-testid={`button-expand-task-${parentTask.id}`}
                                >
                                  <ChevronDown className={cn(
                                    "w-4 h-4 text-muted-foreground transition-transform",
                                    isExpanded && "rotate-180"
                                  )} />
                                </motion.button>
                                <AnimatedCheckbox
                                  checked={parentTask.completed === 1}
                                  onChange={() => toggleTask(parentTask.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className={cn(
                                    "text-sm font-medium",
                                    parentTask.completed === 1 && "line-through text-muted-foreground"
                                  )}>
                                    {parentTask.title}
                                  </span>
                                  {subtasks.length > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {completedSubtasks}/{subtasks.length}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddingSubtaskTo(isAddingSubtask ? null : parentTask.id);
                                    setNewSubtaskTitle("");
                                  }}
                                  data-testid={`button-add-subtask-${parentTask.id}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask.mutate(parentTask.id);
                                  }}
                                  data-testid={`button-delete-task-${parentTask.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              
                              <AnimatePresence>
                                {(isExpanded || isAddingSubtask) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-border/40 bg-muted/20"
                                  >
                                    {isAddingSubtask && (
                                      <div className="p-2 border-b border-border/40">
                                        <div className="flex gap-2">
                                          <Input
                                            placeholder="Add subtask..."
                                            value={newSubtaskTitle}
                                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddSubtask(parentTask.id, selectedProject.id);
                                              }
                                              if (e.key === "Escape") {
                                                setAddingSubtaskTo(null);
                                                setNewSubtaskTitle("");
                                              }
                                            }}
                                            className="flex-1 h-8 text-sm"
                                            autoFocus
                                          />
                                          <Button
                                            size="sm"
                                            className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                                            onClick={() => handleAddSubtask(parentTask.id, selectedProject.id)}
                                            disabled={!newSubtaskTitle.trim() || createTask.isPending}
                                          >
                                            {createTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {subtasks.length > 0 && (
                                      <div className="p-2 space-y-1">
                                        {subtasks.map((subtask, sIdx) => (
                                          <motion.div
                                            key={subtask.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: sIdx * 0.02 }}
                                            className="flex items-center gap-2 pl-6 pr-2 py-1.5 rounded-lg hover:bg-muted/50 group/subtask"
                                          >
                                            <AnimatedCheckbox
                                              checked={subtask.completed === 1}
                                              onChange={() => toggleTask(subtask.id)}
                                            />
                                            <span className={cn(
                                              "flex-1 text-sm",
                                              subtask.completed === 1 && "line-through text-muted-foreground"
                                            )}>
                                              {subtask.title}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0 opacity-0 group-hover/subtask:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTask.mutate(subtask.id);
                                              }}
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </motion.div>
                                        ))}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        });
                      })()}
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
