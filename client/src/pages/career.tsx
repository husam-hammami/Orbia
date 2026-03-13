import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Target, Rocket, Sparkles, ChevronDown, Check, 
  Calendar, Clock, Pencil, Loader2, X, Map, Zap, Lightbulb, RefreshCw,
  GraduationCap, ExternalLink, BookOpen, TrendingUp, Compass, Star,
  MoreHorizontal, Trash2, MessageCircle, Trophy, AlertCircle
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

const DEFAULT_VISION: { id: string; title: string; timeframe: string; color: string; order: number }[] = [];

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
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        
        {/* Header Row — vision inline */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between py-3 shrink-0"
        >
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-2xl font-display font-bold text-primary shrink-0">Career Roadmap</h1>
            {vision.length > 0 && (
              <div className="hidden md:flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">Vision:</span>
                {vision.map((item, index) => (
                  <Badge key={item.id} variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20 shrink-0">
                    {item.title}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={openEditVision}
              className="text-muted-foreground hover:text-foreground h-8 px-3 text-sm"
              data-testid="button-edit-vision"
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit Vision
            </Button>
            <Button
              onClick={fetchCoach}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              data-testid="button-refresh-coach"
            >
              <RefreshCw className={cn("w-4 h-4", coachLoading && "animate-spin")} />
            </Button>
          </div>
        </motion.div>

        {/* FTUX: No Vision */}
        {vision.length === 0 && !coachData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(glassCard, "p-8 text-center mx-auto max-w-md mt-12")}
            data-testid="panel-vision-onboarding"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Target className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Define Your North Star</h3>
            <p className="text-sm text-muted-foreground mb-1 max-w-sm mx-auto">
              Where do you want to be in 1, 3, and 5 years?
            </p>
            <p className="text-xs text-muted-foreground/70 mb-5 max-w-sm mx-auto">
              Set your career vision and Orbia will create a personalized roadmap with actionable steps.
            </p>
            <Button 
              onClick={openEditVision}
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 h-10 text-sm px-6"
              data-testid="button-setup-vision"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Set Up Your Vision
            </Button>
          </motion.div>
        )}

        {/* FTUX: Has vision but no coach data */}
        {vision.length > 0 && !coachData && !coachLoading && !coachError && !isLoadingStoredCoach && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(glassCard, "p-8 text-center mx-auto max-w-md mt-12")}
            data-testid="panel-coach-onboarding"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Compass className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Ready for your roadmap?</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Based on your vision, Orbia will build a personalized career roadmap.
            </p>
            <Button 
              onClick={fetchCoach}
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 h-10 text-sm px-6"
              data-testid="button-start-coach"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Roadmap
            </Button>
          </motion.div>
        )}

        {/* Loading State */}
        {(isLoadingStoredCoach || coachLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(glassCard, "p-8 flex items-center justify-center gap-3 mx-auto max-w-md mt-12")}
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {isLoadingStoredCoach ? "Loading your roadmap..." : "Generating guidance..."}
            </p>
          </motion.div>
        )}

        {/* Error State */}
        {coachError && !coachLoading && !isLoadingStoredCoach && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(glassCard, "p-6 text-center mx-auto max-w-md mt-12")}
            data-testid="panel-coach-error"
          >
            {coachError.includes("vision") ? (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-medium text-foreground text-base mb-1">Vision needed first</h4>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                  Set up your North Star Vision so Orbia can build a personalized roadmap.
                </p>
                <Button 
                  onClick={openEditVision}
                  variant="outline"
                  className="border-primary/30 text-primary h-9 text-sm px-4"
                  data-testid="button-error-setup-vision"
                >
                  <Target className="w-4 h-4 mr-1.5" />
                  Define Vision
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-sm mb-0.5">Something went wrong</h4>
                  <p className="text-xs text-muted-foreground">This is usually temporary.</p>
                </div>
                <Button 
                  onClick={fetchCoach}
                  variant="outline"
                  size="sm"
                  className="border-primary/40 text-primary h-8 text-xs px-3 shrink-0"
                  data-testid="button-retry-coach"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Retry
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════ MAIN 2-COLUMN LAYOUT ═══════ */}
        {coachData && !coachLoading && !isLoadingStoredCoach && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0 pb-4">

            {/* ── LEFT: Active Sprint (3/5 width) ── */}
            <div className="lg:col-span-3 flex flex-col min-h-0">
              {activePhase && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(glassCard, "p-5 flex flex-col flex-1 min-h-0")}
                >
                  {/* Sprint Header */}
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <h2 className="font-semibold text-foreground text-base">Active Sprint</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={String(activePhaseIndex)} onValueChange={(v) => setActivePhaseOverride(Number(v))}>
                        <SelectTrigger className="h-8 w-[120px] text-sm border-border/50 bg-muted/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {coachData?.roadmap?.map((phase, idx) => (
                            <SelectItem key={idx} value={String(idx)} className="text-sm">
                              Phase {idx + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Phase Title & Progress */}
                  <div className="mb-4 shrink-0">
                    <p className="text-sm font-medium text-foreground mb-2">{activePhase.phase}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${getPhaseProgressPercent(activePhaseIndex)}%` }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <span className="text-sm text-primary font-semibold tabular-nums">
                        {getPhaseCompletedCount(activePhaseIndex)}/{activePhase.milestones?.length || 0}
                      </span>
                    </div>
                  </div>
                  
                  {/* Milestone List — scrollable */}
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
                    {activePhase.milestones?.map((milestone, mIdx) => {
                      const isCompleted = isMilestoneCompleted(activePhaseIndex, milestone);
                      const milestoneTasks = getMilestoneTasks(activePhaseIndex);
                      const milestoneTask = milestoneTasks.find(t => t.title === milestone);
                      const isEditing = milestoneTask && editingMilestoneId === milestoneTask.id;
                      const isRegenerating = milestoneTask && regeneratingMilestoneId === milestoneTask.id;
                      
                      if (isEditing) {
                        return (
                          <div key={mIdx} className="flex items-center gap-2 p-2 rounded-xl bg-muted">
                            <Input
                              value={editingMilestoneText}
                              onChange={(e) => setEditingMilestoneText(e.target.value)}
                              className="h-9 text-sm flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveMilestoneEdit();
                                if (e.key === 'Escape') cancelMilestoneEdit();
                              }}
                            />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={saveMilestoneEdit}>
                              <Check className="w-4 h-4 text-primary" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={cancelMilestoneEdit}>
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        );
                      }
                      
                      return (
                        <div
                          key={mIdx}
                          className={cn(
                            "flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors group",
                            isCompleted ? "bg-primary/5" : "bg-muted/40 hover:bg-muted/70"
                          )}
                        >
                          <div 
                            className="flex items-start gap-3 flex-1 cursor-pointer min-w-0"
                            onClick={() => toggleMilestone(activePhaseIndex, milestone)}
                          >
                            <div className="mt-0.5 shrink-0">
                              <AnimatedCheckbox
                                checked={isCompleted}
                                onChange={() => toggleMilestone(activePhaseIndex, milestone)}
                              />
                            </div>
                            <span className={cn(
                              "text-sm leading-relaxed flex-1",
                              isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                            )}>{milestone}</span>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isRegenerating ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={() => startEditMilestone(activePhaseIndex, milestone)}>
                                <Pencil className="w-3.5 h-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteMilestone(activePhaseIndex, milestone)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                    {activePhase.milestones?.filter(m => !isMilestoneCompleted(activePhaseIndex, m)).length === 0 && (
                      <div className="p-4 text-center rounded-xl bg-primary/10 border border-primary/20">
                        <Check className="w-5 h-5 text-primary mx-auto mb-1" />
                        <p className="text-sm font-medium text-primary">Phase Complete!</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Bottom Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/40 shrink-0">
                    {addingMilestoneToPhase === activePhaseIndex ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={newMilestoneText}
                          onChange={(e) => setNewMilestoneText(e.target.value)}
                          placeholder="New milestone..."
                          className="h-9 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addMilestone(activePhaseIndex);
                            if (e.key === 'Escape') {
                              setAddingMilestoneToPhase(null);
                              setNewMilestoneText("");
                            }
                          }}
                        />
                        <Button size="sm" className="h-9 px-3" onClick={() => addMilestone(activePhaseIndex)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 px-3" onClick={() => {
                          setAddingMilestoneToPhase(null);
                          setNewMilestoneText("");
                        }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-sm flex-1 border-dashed"
                          onClick={() => setAddingMilestoneToPhase(activePhaseIndex)}
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add Milestone
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-sm border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                          onClick={() => setIsLogWinDialogOpen(true)}
                        >
                          <Trophy className="w-4 h-4 mr-1.5" />
                          Log Win
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── RIGHT: Roadmap + Coach + Learning (2/5 width) ── */}
            <div className="lg:col-span-2 flex flex-col gap-4 min-h-0 overflow-y-auto pb-1 pr-1">

              {/* Roadmap Phases — vertical stepper */}
              {coachData.roadmap && coachData.roadmap.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(glassCard, "p-4")}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Map className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground text-sm">Roadmap</h3>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      {getTotalCompletedMilestones()}/{getTotalMilestones()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {coachData.roadmap.map((phase, index) => {
                      const progress = getPhaseProgressPercent(index);
                      const isActive = index === activePhaseIndex;
                      const completed = getPhaseCompletedCount(index);
                      const total = phase.milestones?.length || 0;
                      return (
                        <button
                          key={index}
                          onClick={() => setActivePhaseOverride(index)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                            isActive 
                              ? "bg-primary/10 border border-primary/30" 
                              : "hover:bg-muted/60 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                            progress === 100 
                              ? "bg-green-500/20 text-green-600" 
                              : isActive 
                                ? "bg-primary/20 text-primary" 
                                : "bg-muted text-muted-foreground"
                          )}>
                            {progress === 100 ? <Check className="w-3.5 h-3.5" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium line-clamp-1",
                              isActive ? "text-foreground" : "text-muted-foreground"
                            )}>Phase {index + 1}</p>
                            <p className="text-xs text-muted-foreground">{phase.timeframe}</p>
                          </div>
                          <span className={cn(
                            "text-xs font-semibold tabular-nums shrink-0",
                            progress === 100 ? "text-green-600" : isActive ? "text-primary" : "text-muted-foreground"
                          )}>
                            {completed}/{total}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Coach's Note */}
              {coachData?.coachingNote && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border-l-4 border-primary/30 bg-primary/5"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">Coach's Note</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{coachData.coachingNote}</p>
                </motion.div>
              )}

              {/* Learning Resources — collapsed by default */}
              {coachData?.learningPath && coachData.learningPath.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(glassCard, "overflow-hidden")}
                >
                  <div className="flex items-center gap-2 p-4 pb-3">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">Learning Path</h3>
                  </div>
                  
                  <div className="px-2 pb-2 space-y-1">
                    {coachData.learningPath.map((skill, sIdx) => (
                      <Collapsible key={sIdx}>
                        <CollapsibleTrigger className="w-full px-3 py-2.5 flex items-center justify-between rounded-xl hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <BookOpen className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-sm font-medium text-foreground line-clamp-1">{skill.skill}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{skill.importance}</p>
                            </div>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3">
                          <div className="space-y-1.5 pt-2 border-t border-border/30">
                            {skill.resources.map((resource, rIdx) => {
                              const isEditing = editingLearningSkillIdx === sIdx && editingLearningResourceIdx === rIdx;
                              
                              if (isEditing) {
                                return (
                                  <div key={rIdx} className="p-3 rounded-xl bg-muted/80 space-y-2">
                                    <Input
                                      value={editingLearningResource.title}
                                      onChange={(e) => setEditingLearningResource(prev => ({ ...prev, title: e.target.value }))}
                                      placeholder="Resource title"
                                      className="h-9 text-sm"
                                      autoFocus
                                    />
                                    <Input
                                      value={editingLearningResource.url}
                                      onChange={(e) => setEditingLearningResource(prev => ({ ...prev, url: e.target.value }))}
                                      placeholder="URL"
                                      className="h-9 text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <select
                                        value={editingLearningResource.type}
                                        onChange={(e) => setEditingLearningResource(prev => ({ ...prev, type: e.target.value }))}
                                        className="h-9 px-2 text-sm rounded-lg border border-border bg-background flex-1"
                                      >
                                        <option value="course">Course</option>
                                        <option value="book">Book</option>
                                        <option value="tutorial">Tutorial</option>
                                        <option value="practice">Practice</option>
                                      </select>
                                      <Input
                                        value={editingLearningResource.timeCommitment}
                                        onChange={(e) => setEditingLearningResource(prev => ({ ...prev, timeCommitment: e.target.value }))}
                                        placeholder="Time"
                                        className="h-9 text-sm flex-1"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="ghost" className="h-8 text-sm" onClick={cancelLearningResourceEdit}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" className="h-8 text-sm" onClick={saveLearningResourceEdit}>
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <div
                                  key={rIdx}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/60 transition-colors group"
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0",
                                    resource.type === 'course' && "bg-blue-500/15 text-blue-500",
                                    resource.type === 'book' && "bg-amber-500/15 text-amber-500",
                                    resource.type === 'tutorial' && "bg-green-500/15 text-green-500",
                                    resource.type === 'practice' && "bg-purple-500/15 text-purple-500"
                                  )}>
                                    {resource.type === 'course' && <BookOpen className="w-3 h-3" />}
                                    {resource.type === 'book' && <BookOpen className="w-3 h-3" />}
                                    {resource.type === 'tutorial' && <GraduationCap className="w-3 h-3" />}
                                    {resource.type === 'practice' && <Pencil className="w-3 h-3" />}
                                  </div>
                                  <a
                                    href={resource.url.startsWith('search:') ? `https://www.google.com/search?q=${encodeURIComponent(resource.url.replace('search: ', ''))}` : resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 min-w-0"
                                  >
                                    <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                      {resource.title}
                                    </p>
                                  </a>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={(e) => { e.stopPropagation(); startEditLearningResource(sIdx, rIdx); }}
                                    >
                                      <Pencil className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={(e) => { e.stopPropagation(); deleteLearningResource(sIdx, rIdx); }}
                                    >
                                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                  </div>
                                  <a
                                    href={resource.url.startsWith('search:') ? `https://www.google.com/search?q=${encodeURIComponent(resource.url.replace('search: ', ''))}` : resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                                  </a>
                                </div>
                              );
                            })}
                            
                            {addingResourceToSkill === sIdx ? (
                              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                                <Input
                                  value={newResourceData.title}
                                  onChange={(e) => setNewResourceData(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="Resource title"
                                  className="h-9 text-sm"
                                  autoFocus
                                />
                                <Input
                                  value={newResourceData.url}
                                  onChange={(e) => setNewResourceData(prev => ({ ...prev, url: e.target.value }))}
                                  placeholder="URL"
                                  className="h-9 text-sm"
                                />
                                <div className="flex gap-2">
                                  <select
                                    value={newResourceData.type}
                                    onChange={(e) => setNewResourceData(prev => ({ ...prev, type: e.target.value }))}
                                    className="h-9 px-2 text-sm rounded-lg border border-border bg-background flex-1"
                                  >
                                    <option value="course">Course</option>
                                    <option value="book">Book</option>
                                    <option value="tutorial">Tutorial</option>
                                    <option value="practice">Practice</option>
                                  </select>
                                  <Input
                                    value={newResourceData.timeCommitment}
                                    onChange={(e) => setNewResourceData(prev => ({ ...prev, timeCommitment: e.target.value }))}
                                    placeholder="Time"
                                    className="h-9 text-sm flex-1"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 text-sm" 
                                    onClick={() => {
                                      setAddingResourceToSkill(null);
                                      setNewResourceData({ title: "", type: "course", url: "", timeCommitment: "1-2 hours" });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="h-8 text-sm" 
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
                                className="w-full h-8 text-sm text-muted-foreground hover:text-primary"
                                onClick={() => setAddingResourceToSkill(sIdx)}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
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
          </div>
        )}

        {/* ═══════ DIALOGS ═══════ */}
        <Dialog open={isVisionDialogOpen} onOpenChange={setIsVisionDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit North Star Vision</DialogTitle>
              <DialogDescription>Define your guiding principles and long-term goals.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingVision.map((item, index) => (
                <div key={item.id} className="space-y-2 p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      {index === 0 && <Target className="w-4 h-4" />}
                      {index === 1 && <Rocket className="w-4 h-4" />}
                      {index === 2 && <Sparkles className="w-4 h-4" />}
                      {index > 2 && <Star className="w-4 h-4" />}
                      Vision {index + 1}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setEditingVision(editingVision.filter(v => v.id !== item.id))}
                      data-testid={`button-remove-vision-${index}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={item.title}
                    onChange={(e) => setEditingVision(editingVision.map(v => v.id === item.id ? { ...v, title: e.target.value } : v))}
                    placeholder="Vision title"
                    className="font-medium"
                    data-testid={`input-vision-title-${index}`}
                  />
                  <Input
                    value={item.timeframe}
                    onChange={(e) => setEditingVision(editingVision.map(v => v.id === item.id ? { ...v, timeframe: e.target.value } : v))}
                    placeholder="Timeframe (e.g., 2 Years, Ongoing)"
                    className="text-sm"
                    data-testid={`input-vision-timeframe-${index}`}
                  />
                </div>
              ))}
              {editingVision.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No vision items yet. Add your first one below.</p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setEditingVision([...editingVision, { id: `new-${Date.now()}`, title: "", timeframe: "", color: "blue", order: editingVision.length }])}
                data-testid="button-add-vision"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Vision
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVisionDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveVision} disabled={updateVisionMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0" data-testid="button-save-vision">
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
