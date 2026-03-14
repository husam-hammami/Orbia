import React, { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Orbit as OrbitIcon,
  CheckCircle2,
  Clock,
  Activity,
  Zap,
  Loader2,
  Sparkles,
  ListTodo,
  Plus,
  Calendar,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  Bell,
  Brain,
  Heart
} from "lucide-react";
import { VoiceInputButton } from "@/components/voice-input-button";
import { cn } from "@/lib/utils";
import {
  useHabits,
  useAllHabitCompletions,
  useRoutineBlocks,
  useRoutineActivities,
  useRoutineLogs,
  useTodos,
  useTrackerEntries,
  useAddHabitCompletion,
  useRemoveHabitCompletion,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
  useToggleRoutineActivity,
  useCreateTrackerEntry,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useCreateRoutineActivity,
  useUpdateRoutineActivity,
  useDeleteRoutineActivity,
  useCareerProjects,
  useCareerTasks,
  useCreateCareerProject,
  useUpdateCareerProject,
  useDeleteCareerProject,
  useCreateCareerTask,
  useUpdateCareerTask,
  useDeleteCareerTask,
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useJournalEntries,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  useDashboardInsights,
  useCareerVision,
  useCreateVisionItem,
  useUpdateVisionItem,
  useDeleteVisionItem,
  useCreateTransaction,
  useCreateLoanPayment
} from "@/lib/api-hooks";
import UnloadSheet from "@/components/unload-sheet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

interface OrbitMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  action?: OrbitAction;
  actionResult?: { success: boolean; message: string };
}

interface OrbitAction {
  type: "action";
  name: string;
  args: Record<string, any>;
  confirm: boolean;
  confirm_text?: string;
}

const QUICK_CHIPS = [
  { label: "How's my day?", prompt: "What does my day look like? Include my schedule, tasks, and how I'm feeling" },
  { label: "What's next?", prompt: "What should I focus on next?" },
  { label: "Am I meeting-ready?", prompt: "Am I ready for my next meeting? Check my energy and calendar" },
  { label: "Send a Teams message", prompt: "I want to send a Teams message" },
  { label: "Motivate me!", prompt: "I need some encouragement today" },
  { label: "Health + work check", prompt: "How's my health affecting my work lately?" },
];

const THERAPY_CHIPS = [
  { label: "I need to talk", prompt: "I have something on my mind that I need to process" },
  { label: "Feeling stuck", prompt: "I feel stuck and I'm not sure why" },
  { label: "Something's off", prompt: "Something feels off today but I can't put my finger on it" },
  { label: "Check in on me", prompt: "Can you check in on how I've really been doing lately?" },
];

function formatMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}


export default function OrbitPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const queryClient = useQueryClient();
  
  const { data: habits } = useHabits();
  const { data: allCompletions } = useAllHabitCompletions();
  const { data: routineBlocks } = useRoutineBlocks();
  const { data: routineActivities } = useRoutineActivities();
  const { data: routineLogs } = useRoutineLogs(today);
  const { data: todos } = useTodos();
  const { data: trackerEntries } = useTrackerEntries(7);
  
  const { data: careerProjects } = useCareerProjects();
  const { data: careerTasks } = useCareerTasks();
  const { data: expenses } = useExpenses();
  const { data: journalEntries } = useJournalEntries();
  const { data: dashboardInsights } = useDashboardInsights();
  
  const { data: foodOptions } = useQuery<{ id: string; name: string; mealType: string; description?: string }[]>({
    queryKey: ["/api/food-options"],
  });
  const { data: todayMeals } = useQuery<{ breakfast?: string; lunch?: string; dinner?: string } | null>({
    queryKey: [`/api/daily-summaries/${today}`],
  });
  
  const addHabitCompletion = useAddHabitCompletion();
  const removeHabitCompletion = useRemoveHabitCompletion();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const toggleRoutineActivity = useToggleRoutineActivity();
  const createTrackerEntry = useCreateTrackerEntry();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const createRoutineActivity = useCreateRoutineActivity();
  const updateRoutineActivity = useUpdateRoutineActivity();
  const deleteRoutineActivity = useDeleteRoutineActivity();
  const createCareerProject = useCreateCareerProject();
  const updateCareerProject = useUpdateCareerProject();
  const deleteCareerProject = useDeleteCareerProject();
  const createCareerTask = useCreateCareerTask();
  const updateCareerTask = useUpdateCareerTask();
  const deleteCareerTask = useDeleteCareerTask();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const createJournalEntry = useCreateJournalEntry();
  const updateJournalEntry = useUpdateJournalEntry();
  const deleteJournalEntry = useDeleteJournalEntry();
  const { data: visionItems } = useCareerVision();
  const createVisionItem = useCreateVisionItem();
  const updateVisionItem = useUpdateVisionItem();
  const deleteVisionItem = useDeleteVisionItem();
  const createTransaction = useCreateTransaction();
  const createLoanPayment = useCreateLoanPayment();

  const [unloadOpen, setUnloadOpen] = useState(false);
  const [therapyMode, setTherapyMode] = useState(false);
  
  const logMealMutation = useMutation({
    mutationFn: async (data: { date: string; breakfast?: string; lunch?: string; dinner?: string }) => {
      const existingRes = await fetch(`/api/daily-summaries/${data.date}`);
      const existing = existingRes.ok ? await existingRes.json() : null;
      
      const mergedData = {
        date: data.date,
        feeling: existing?.feeling || "average",
        breakfast: data.breakfast !== undefined ? data.breakfast : (existing?.breakfast || ""),
        lunch: data.lunch !== undefined ? data.lunch : (existing?.lunch || ""),
        dinner: data.dinner !== undefined ? data.dinner : (existing?.dinner || ""),
      };
      
      const res = await fetch("/api/daily-summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedData),
      });
      if (!res.ok) throw new Error("Failed to log meal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/daily-summaries/${today}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-summaries"] });
    },
  });
  
  const addMealOptionMutation = useMutation({
    mutationFn: async (data: { name: string; mealType: string; description?: string }) => {
      const res = await fetch("/api/food-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add meal option");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/food-options"] }),
  });
  
  const deleteMealOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/food-options/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete meal option");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/food-options"] }),
  });

  const [messages, setMessages] = useState<OrbitMessage[]>(() => {
    const saved = localStorage.getItem("orbit_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch { return []; }
    }
    return [];
  });
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: OrbitAction; messageId: string } | null>(null);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(() => {
    const saved = sessionStorage.getItem("orbit_dismissed_nudges");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem("orbit_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const scrollToBottom = () => {
      const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      }
    };
    
    scrollToBottom();
    // Second scroll for content that might render slightly after
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const todayCompletions = allCompletions?.filter(c => c.completedDate === today) || [];
  const habitsCompletedToday = todayCompletions.length;
  const totalHabits = habits?.length || 0;
  
  const totalRoutineActivities = routineActivities?.length || 0;
  const completedRoutineActivities = routineLogs?.length || 0;
  const routinePercent = totalRoutineActivities > 0 
    ? Math.round((completedRoutineActivities / totalRoutineActivities) * 100) 
    : 0;

  const latestEntry = trackerEntries?.[0];
  
  const externalPressure = latestEntry 
    ? Math.round(((latestEntry.workLoad || 0) * 10 + (latestEntry.stress || 0)) / 2)
    : null;
  const internalStability = latestEntry
    ? Math.round(100 - ((100 - (latestEntry.capacity ?? 3) * 20) + (100 - (latestEntry.mood || 5) * 10)) / 2)
    : null;

  const buildContext = () => {
    const currentHour = new Date().getHours();
    const currentBlock = routineBlocks?.find(b => {
      const [startH] = b.startTime.split(":").map(Number);
      const [endH] = b.endTime.split(":").map(Number);
      return currentHour >= startH && currentHour < endH;
    });

    const blockActivities = currentBlock 
      ? routineActivities?.filter(a => a.blockId === currentBlock.id) || []
      : [];
    
    const completedActivityIds = new Set(routineLogs?.map(l => l.activityId) || []);
    const pendingActivities = blockActivities.filter(a => !completedActivityIds.has(a.id));

    const incompleteTodos = todos?.filter(t => !t.completed) || [];
    const incompleteHabits = habits?.filter(h => 
      !todayCompletions.some(c => c.habitId === h.id)
    ) || [];

    return {
      date: today,
      time: format(new Date(), "h:mm a"),
      snapshot: {
        habitsCompleted: habitsCompletedToday,
        totalHabits,
        routinePercent,
        externalPressure,
        internalStability
      },
      dashboardInsights: dashboardInsights ? {
        moodCorrelation: dashboardInsights.habits?.moodCorrelation || null,
        recommendations: dashboardInsights.recommendations || [],
        trend7Day: dashboardInsights.mood?.trend7Day || null
      } : null,
      currentBlock: currentBlock ? {
        name: currentBlock.name,
        emoji: currentBlock.emoji,
        startTime: currentBlock.startTime,
        endTime: currentBlock.endTime
      } : null,
      pendingRoutineActivities: pendingActivities.map(a => ({
        id: a.id,
        name: a.name,
        habitId: a.habitId
      })),
      incompleteHabits: incompleteHabits.map(h => ({
        id: h.id,
        name: h.title,
        category: h.category
      })),
      incompleteTodos: incompleteTodos.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority
      })),
      recentMoodLogs: (trackerEntries || []).slice(0, 3).map(e => ({
        date: format(new Date(e.timestamp), "MMM d"),
        mood: e.mood,
        stress: e.stress,
      })),
      allHabits: habits?.map(h => ({ id: h.id, name: h.title, category: h.category })) || [],
      allTodos: todos?.map(t => ({ id: t.id, title: t.title, completed: !!t.completed, priority: t.priority })) || [],
      allRoutineActivities: routineActivities?.map(a => ({ id: a.id, name: a.name, habitId: a.habitId, blockId: a.blockId })) || [],
      allRoutineBlocks: routineBlocks?.map(b => ({ id: b.id, name: b.name, emoji: b.emoji, startTime: b.startTime, endTime: b.endTime })) || [],
      allCareerProjects: careerProjects?.map(p => ({ id: p.id, title: p.title, status: p.status, progress: p.progress, deadline: p.deadline })) || [],
      allCareerTasks: careerTasks?.map(t => ({ id: t.id, title: t.title, projectId: t.projectId, completed: !!t.completed, priority: t.priority, due: t.due })) || [],
      allExpenses: expenses?.map(e => ({ id: e.id, name: e.name, amount: e.amount, budget: e.budget, category: e.category, status: e.status, month: e.month })) || [],
      recentJournalEntries: (journalEntries || []).slice(0, 5).map(j => ({
        id: j.id,
        type: j.entryType,
        mood: j.mood,
        energy: j.energy,
        tags: j.tags,
        date: format(new Date(j.createdAt), "MMM d, h:mm a"),
        preview: j.content.slice(0, 100) + (j.content.length > 100 ? "..." : "")
      })),
      allJournalEntries: (journalEntries || []).map(j => ({ id: j.id, type: j.entryType, mood: j.mood, energy: j.energy, tags: j.tags })),
      todaysMeals: todayMeals ? { breakfast: todayMeals.breakfast, lunch: todayMeals.lunch, dinner: todayMeals.dinner } : null,
      allMealOptions: (foodOptions || []).map(o => ({ id: o.id, name: o.name, mealType: o.mealType, hasRecipe: !!o.description }))
    };
  };

  const executeAction = async (action: OrbitAction): Promise<{ success: boolean; message: string }> => {
    try {
      switch (action.name) {
        // HABIT ACTIONS
        case "mark_habit": {
          const { habit_id, date, done } = action.args;
          if (done) {
            await addHabitCompletion.mutateAsync({ habitId: habit_id, date });
          } else {
            await removeHabitCompletion.mutateAsync({ habitId: habit_id, date });
          }
          const habit = habits?.find(h => h.id === habit_id);
          return { success: true, message: `${done ? "Marked" : "Unmarked"} "${habit?.title || habit_id}"` };
        }
        
        case "create_habit": {
          const { title, category, description, target, unit } = action.args;
          await createHabit.mutateAsync({
            title,
            category: category || "health",
            description: description || null,
            target: target || 1,
            unit: unit || "times",
            frequency: "daily",
            color: `hsl(${Math.floor(Math.random() * 360)} 60% 50%)`,
            icon: null
          });
          return { success: true, message: `Created habit: "${title}"` };
        }
        
        case "update_habit": {
          const { habit_id, ...updates } = action.args;
          await updateHabit.mutateAsync({ id: habit_id, ...updates });
          const habit = habits?.find(h => h.id === habit_id);
          return { success: true, message: `Updated habit: "${habit?.title || habit_id}"` };
        }
        
        case "delete_habit": {
          const { habit_id } = action.args;
          const habit = habits?.find(h => h.id === habit_id);
          await deleteHabit.mutateAsync(habit_id);
          return { success: true, message: `Deleted habit: "${habit?.title || habit_id}"` };
        }
        
        // TASK ACTIONS
        case "add_task": {
          const { title, priority } = action.args;
          await createTodo.mutateAsync({ title, priority: priority || "medium" });
          return { success: true, message: `Added task: "${title}"` };
        }
        
        case "mark_task": {
          const { task_id, completed } = action.args;
          await updateTodo.mutateAsync({ id: task_id, completed: completed ? 1 : 0 });
          const task = todos?.find(t => t.id === task_id);
          return { success: true, message: `${completed ? "Completed" : "Reopened"} "${task?.title || task_id}"` };
        }
        
        case "update_task": {
          const { task_id, ...updates } = action.args;
          await updateTodo.mutateAsync({ id: task_id, ...updates });
          const task = todos?.find(t => t.id === task_id);
          return { success: true, message: `Updated task: "${task?.title || task_id}"` };
        }
        
        case "delete_task": {
          const { task_id } = action.args;
          const task = todos?.find(t => t.id === task_id);
          await deleteTodo.mutateAsync(task_id);
          return { success: true, message: `Deleted task: "${task?.title || task_id}"` };
        }
        
        // ROUTINE ACTIVITY ACTIONS
        case "mark_routine_activity": {
          const { activity_id, date, done, habit_id } = action.args;
          await toggleRoutineActivity.mutateAsync({
            activityId: activity_id,
            date,
            habitId: habit_id || null,
            action: done ? "add" : "remove"
          });
          const activity = routineActivities?.find(a => a.id === activity_id);
          return { success: true, message: `${done ? "Completed" : "Undid"} "${activity?.name || activity_id}"` };
        }
        
        case "create_routine_activity": {
          const { block_id, name, time, description, habit_id } = action.args;
          const block = routineBlocks?.find(b => b.id === block_id);
          const existingActivities = routineActivities?.filter(a => a.blockId === block_id) || [];
          await createRoutineActivity.mutateAsync({
            blockId: block_id,
            name,
            time: time || null,
            description: description || null,
            habitId: habit_id || null,
            order: existingActivities.length
          });
          return { success: true, message: `Added "${name}" to ${block?.name || "routine"}` };
        }
        
        case "update_routine_activity": {
          const { activity_id, ...updates } = action.args;
          await updateRoutineActivity.mutateAsync({ id: activity_id, ...updates });
          const activity = routineActivities?.find(a => a.id === activity_id);
          return { success: true, message: `Updated: "${activity?.name || activity_id}"` };
        }
        
        case "delete_routine_activity": {
          const { activity_id } = action.args;
          const activity = routineActivities?.find(a => a.id === activity_id);
          await deleteRoutineActivity.mutateAsync(activity_id);
          return { success: true, message: `Deleted: "${activity?.name || activity_id}"` };
        }
        
        // CAREER PROJECT ACTIONS
        case "create_career_project": {
          const { title, description, status, deadline, color } = action.args;
          await createCareerProject.mutateAsync({
            title,
            description: description || null,
            status: status || "planning",
            progress: 0,
            deadline: deadline || null,
            nextAction: null,
            color: color || "bg-indigo-500",
            tags: []
          });
          return { success: true, message: `Created project: "${title}"` };
        }
        
        case "update_career_project": {
          const { project_id, ...updates } = action.args;
          await updateCareerProject.mutateAsync({ id: project_id, ...updates });
          const project = careerProjects?.find(p => p.id === project_id);
          return { success: true, message: `Updated project: "${project?.title || project_id}"` };
        }
        
        case "delete_career_project": {
          const { project_id } = action.args;
          const project = careerProjects?.find(p => p.id === project_id);
          await deleteCareerProject.mutateAsync(project_id);
          return { success: true, message: `Deleted project: "${project?.title || project_id}"` };
        }
        
        // CAREER TASK ACTIONS
        case "create_career_task": {
          const { title, project_id, priority, due, description } = action.args;
          await createCareerTask.mutateAsync({
            title,
            projectId: project_id || null,
            priority: priority || "medium",
            due: due || null,
            description: description || null,
            completed: 0,
            tags: []
          });
          return { success: true, message: `Created career task: "${title}"` };
        }
        
        case "update_career_task": {
          const { task_id, ...updates } = action.args;
          await updateCareerTask.mutateAsync({ id: task_id, ...updates });
          const task = careerTasks?.find(t => t.id === task_id);
          return { success: true, message: `Updated career task: "${task?.title || task_id}"` };
        }
        
        case "delete_career_task": {
          const { task_id } = action.args;
          const task = careerTasks?.find(t => t.id === task_id);
          await deleteCareerTask.mutateAsync(task_id);
          return { success: true, message: `Deleted career task: "${task?.title || task_id}"` };
        }
        
        // EXPENSE ACTIONS
        case "create_expense": {
          const { name, amount, budget, category, status, date, month } = action.args;
          await createExpense.mutateAsync({
            name,
            amount: amount || 0,
            budget: budget || amount || 0,
            category: category || "Variable",
            status: status || "pending",
            date: date || format(new Date(), "MMM d"),
            month: month || format(new Date(), "MMMM")
          });
          return { success: true, message: `Created expense: "${name}"` };
        }
        
        case "update_expense": {
          const { expense_id, ...updates } = action.args;
          await updateExpense.mutateAsync({ id: expense_id, ...updates });
          const expense = expenses?.find(e => e.id === expense_id);
          return { success: true, message: `Updated expense: "${expense?.name || expense_id}"` };
        }
        
        case "delete_expense": {
          const { expense_id } = action.args;
          const expense = expenses?.find(e => e.id === expense_id);
          await deleteExpense.mutateAsync(expense_id);
          return { success: true, message: `Deleted expense: "${expense?.name || expense_id}"` };
        }
        
        // JOURNAL ACTIONS
        case "create_journal": {
          const { content, entry_type, mood, energy, tags, is_private } = action.args;
          await createJournalEntry.mutateAsync({
            content,
            entryType: entry_type || "reflection",
            mood: mood || null,
            energy: energy || null,
            tags: tags || [],
            isPrivate: is_private ? 1 : 0,
            authorId: null,
            timeOfDay: (() => {
              const hour = new Date().getHours();
              if (hour >= 5 && hour < 12) return "morning";
              if (hour >= 12 && hour < 17) return "afternoon";
              if (hour >= 17 && hour < 21) return "evening";
              return "night";
            })()
          });
          return { success: true, message: `Created ${entry_type || "reflection"} journal entry` };
        }
        
        case "update_journal": {
          const { entry_id, content, entry_type, mood, energy, tags } = action.args;
          const updateData: any = {};
          if (content !== undefined) updateData.content = content;
          if (entry_type !== undefined) updateData.entryType = entry_type;
          if (mood !== undefined) updateData.mood = mood;
          if (energy !== undefined) updateData.energy = energy;
          if (tags !== undefined) updateData.tags = tags;
          await updateJournalEntry.mutateAsync({ id: entry_id, data: updateData });
          return { success: true, message: "Updated journal entry" };
        }
        
        case "delete_journal": {
          const { entry_id } = action.args;
          await deleteJournalEntry.mutateAsync(entry_id);
          return { success: true, message: "Deleted journal entry" };
        }
        
        // MEAL/FOOD ACTIONS
        case "log_meal": {
          const { date, breakfast, lunch, dinner } = action.args;
          const mealData: any = { date: date || today };
          if (breakfast !== undefined) mealData.breakfast = breakfast;
          if (lunch !== undefined) mealData.lunch = lunch;
          if (dinner !== undefined) mealData.dinner = dinner;
          await logMealMutation.mutateAsync(mealData);
          const parts = [];
          if (breakfast) parts.push(`breakfast: ${breakfast}`);
          if (lunch) parts.push(`lunch: ${lunch}`);
          if (dinner) parts.push(`dinner: ${dinner}`);
          return { success: true, message: `Logged ${parts.join(", ") || "meals"}` };
        }
        
        case "add_meal_option": {
          const { name, meal_type, recipe } = action.args;
          await addMealOptionMutation.mutateAsync({
            name,
            mealType: meal_type,
            description: recipe || undefined
          });
          return { success: true, message: `Added ${meal_type} option: "${name}"` };
        }
        
        case "delete_meal_option": {
          const { option_id } = action.args;
          const option = foodOptions?.find(o => o.id === option_id);
          await deleteMealOptionMutation.mutateAsync(option_id);
          return { success: true, message: `Deleted meal option: "${option?.name || option_id}"` };
        }
        
        // VISION ACTIONS
        case "create_vision": {
          const { title, timeframe, color } = action.args;
          await createVisionItem.mutateAsync({
            title,
            timeframe: timeframe || "1 year",
            color: color || "text-blue-500"
          });
          return { success: true, message: `Created vision: "${title}"` };
        }
        
        case "update_vision": {
          const { vision_id, ...updates } = action.args;
          await updateVisionItem.mutateAsync({ id: vision_id, ...updates });
          const vision = visionItems?.find(v => v.id === vision_id);
          return { success: true, message: `Updated vision: "${vision?.title || vision_id}"` };
        }
        
        case "delete_vision": {
          const { vision_id } = action.args;
          const vision = visionItems?.find(v => v.id === vision_id);
          await deleteVisionItem.mutateAsync(vision_id);
          return { success: true, message: `Deleted vision: "${vision?.title || vision_id}"` };
        }
        
        // TRACKER ENTRY
        case "create_tracker_entry": {
          const { mood, energy, stress, sleepHours, capacity, pain, notes } = action.args;
          await createTrackerEntry.mutateAsync({
            userId: "",
            timestamp: new Date(),
            mood: mood || 5,
            energy: energy || 5,
            stress: stress ?? 50,
            sleepHours: sleepHours || undefined,
            capacity: capacity || undefined,
            pain: pain || undefined,
            notes: notes || undefined,
          } as any);
          return { success: true, message: `Logged wellness check: mood ${mood}/10` };
        }

        // TRANSACTION (Finance)
        case "add_transaction": {
          const { type, name, amount, category, notes: txNotes } = action.args;
          const now = new Date();
          await createTransaction.mutateAsync({
            type: type || "expense",
            name,
            amount: Math.round(Number(amount)),
            category: category || "other",
            date: now,
            month: now.toLocaleString("en-US", { month: "long" }),
            isRecurring: 0,
            notes: txNotes || null,
          });
          return { success: true, message: `Logged ${type || "expense"}: ${name} (${amount})` };
        }

        case "delete_transaction": {
          const resp = await fetch(`/api/transactions/${action.args.transaction_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete transaction");
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
          return { success: true, message: `Deleted transaction` };
        }

        case "log_income_payment": {
          const { income_stream_id, amount: incPayAmt } = action.args;
          const now = new Date();
          await createTransaction.mutateAsync({
            type: "income",
            name: `Income payment`,
            amount: Math.round(Number(incPayAmt)),
            category: "salary",
            date: now,
            month: now.toLocaleString("en-US", { month: "long" }),
            isRecurring: 0,
            incomeStreamId: income_stream_id,
            notes: null,
          });
          return { success: true, message: `Logged income payment: ${incPayAmt}` };
        }

        // LOAN PAYMENT
        case "add_loan_payment": {
          const { loan_id, amount: payAmount, notes: payNotes } = action.args;
          await createLoanPayment.mutateAsync({
            loanId: loan_id,
            amount: Math.round(Number(payAmount)),
            paymentDate: new Date(),
            notes: payNotes || null,
          });
          return { success: true, message: `Logged loan payment: ${payAmount}` };
        }

        // MEDICAL NOTE (from Unload — flagged for awareness, stored as journal)
        case "medical_note": {
          const { type: medType, condition, note: medNote } = action.args;
          await createJournalEntry.mutateAsync({
            content: `[Medical: ${medType}] ${condition ? condition + " — " : ""}${medNote}`,
            entryType: "reflection",
            tags: ["medical", medType || "observation"],
            isPrivate: 1,
            authorId: null,
            timeOfDay: (() => {
              const hour = new Date().getHours();
              if (hour >= 5 && hour < 12) return "morning";
              if (hour >= 12 && hour < 17) return "afternoon";
              if (hour >= 17 && hour < 21) return "evening";
              return "night";
            })()
          });
          return { success: true, message: `Medical note saved: ${condition || medType}` };
        }

        // WORK NOTE (from Unload — flagged only, not auto-executed)
        case "work_note": {
          return { success: true, message: `Work action noted: ${action.args.details || action.args.type}` };
        }

        // MEDICAL DIAGNOSES
        case "create_diagnosis": {
          const { label, severity, description, onsetDate } = action.args;
          const resp = await fetch("/api/medical/diagnoses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ label, severity: severity || "moderate", description: description || "", onsetDate: onsetDate || null }),
          });
          if (!resp.ok) throw new Error("Failed to create diagnosis");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/diagnoses"] });
          return { success: true, message: `Added diagnosis: "${label}"` };
        }
        case "update_diagnosis": {
          const { diagnosis_id, ...diagUpdates } = action.args;
          const resp = await fetch(`/api/medical/diagnoses/${diagnosis_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(diagUpdates),
          });
          if (!resp.ok) throw new Error("Failed to update diagnosis");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/diagnoses"] });
          return { success: true, message: `Updated diagnosis` };
        }
        case "delete_diagnosis": {
          const resp = await fetch(`/api/medical/diagnoses/${action.args.diagnosis_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete diagnosis");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/diagnoses"] });
          return { success: true, message: `Deleted diagnosis` };
        }

        // MEDICAL MEDICATIONS
        case "create_medication": {
          const { name: medName, dosage, purpose, frequency, startDate } = action.args;
          const resp = await fetch("/api/medical/medications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: medName, dosage: dosage || "", purpose: purpose || "", frequency: frequency || "daily", startDate: startDate || null }),
          });
          if (!resp.ok) throw new Error("Failed to create medication");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/medications"] });
          return { success: true, message: `Added medication: "${medName}"` };
        }
        case "update_medication": {
          const { medication_id, ...medUpdates } = action.args;
          const resp = await fetch(`/api/medical/medications/${medication_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(medUpdates),
          });
          if (!resp.ok) throw new Error("Failed to update medication");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/medications"] });
          return { success: true, message: `Updated medication` };
        }
        case "delete_medication": {
          const resp = await fetch(`/api/medical/medications/${action.args.medication_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete medication");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/medications"] });
          return { success: true, message: `Deleted medication` };
        }

        // MEDICAL PRIORITIES
        case "create_med_priority": {
          const { label: prioLabel, description: prioDesc, severity: prioSev } = action.args;
          const resp = await fetch("/api/medical/priorities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ label: prioLabel, description: prioDesc || "", severity: prioSev || "medium" }),
          });
          if (!resp.ok) throw new Error("Failed to create priority");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/priorities"] });
          return { success: true, message: `Added medical priority: "${prioLabel}"` };
        }
        case "update_med_priority": {
          const { priority_id, ...prioUpdates } = action.args;
          const resp = await fetch(`/api/medical/priorities/${priority_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(prioUpdates),
          });
          if (!resp.ok) throw new Error("Failed to update priority");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/priorities"] });
          return { success: true, message: `Updated medical priority` };
        }
        case "delete_med_priority": {
          const resp = await fetch(`/api/medical/priorities/${action.args.priority_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete priority");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/priorities"] });
          return { success: true, message: `Deleted medical priority` };
        }

        // MEDICAL TIMELINE EVENTS
        case "create_timeline_event": {
          const { title: tlTitle, date: tlDate, type: tlType, description: tlDesc } = action.args;
          const resp = await fetch("/api/medical/timeline-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ title: tlTitle, date: tlDate || new Date().toISOString().split("T")[0], eventType: tlType || "standard", description: tlDesc || "" }),
          });
          if (!resp.ok) throw new Error("Failed to create timeline event");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/timeline-events"] });
          return { success: true, message: `Added timeline event: "${tlTitle}"` };
        }
        case "update_timeline_event": {
          const { event_id: tlEvtId, ...tlEvtUpdates } = action.args;
          const resp = await fetch(`/api/medical/timeline-events/${tlEvtId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(tlEvtUpdates),
          });
          if (!resp.ok) throw new Error("Failed to update timeline event");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/timeline-events"] });
          return { success: true, message: `Updated timeline event` };
        }
        case "delete_timeline_event": {
          const resp = await fetch(`/api/medical/timeline-events/${action.args.event_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete timeline event");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/timeline-events"] });
          return { success: true, message: `Deleted timeline event` };
        }

        // MEDICAL NETWORK (DOCTORS)
        case "create_med_contact": {
          const { name: docName, role, facility, category, status: contactStatus } = action.args;
          const resp = await fetch("/api/medical/medical-network", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: docName, role: role || "doctor", facility: facility || "", category: category || "treating", status: contactStatus || "current" }),
          });
          if (!resp.ok) throw new Error("Failed to add contact");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/medical-network"] });
          return { success: true, message: `Added to medical network: "${docName}"` };
        }
        case "update_med_contact": {
          const { contact_id, ...contactUpdates } = action.args;
          const resp = await fetch(`/api/medical/medical-network/${contact_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(contactUpdates),
          });
          if (!resp.ok) throw new Error("Failed to update contact");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/medical-network"] });
          return { success: true, message: `Updated doctor contact` };
        }
        case "delete_med_contact": {
          const resp = await fetch(`/api/medical/medical-network/${action.args.contact_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete contact");
          queryClient.invalidateQueries({ queryKey: ["/api/medical/medical-network"] });
          return { success: true, message: `Deleted doctor contact` };
        }

        // NEWS TOPICS
        case "create_news_topic": {
          const { name: topicName } = action.args;
          const resp = await fetch("/api/news/topics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ topic: topicName, isCustom: true }),
          });
          if (!resp.ok) throw new Error("Failed to create topic");
          queryClient.invalidateQueries({ queryKey: ["/api/news/topics"] });
          return { success: true, message: `Added news topic: "${topicName}"` };
        }
        case "delete_news_topic": {
          const resp = await fetch(`/api/news/topics/${action.args.topic_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete topic");
          queryClient.invalidateQueries({ queryKey: ["/api/news/topics"] });
          return { success: true, message: `Removed news topic` };
        }

        // SAVED ARTICLES
        case "save_article": {
          const { title: artTitle, url: artUrl, source, description: artDesc } = action.args;
          const resp = await fetch("/api/news/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ title: artTitle, link: artUrl, source: source || "", description: artDesc || "" }),
          });
          if (!resp.ok) throw new Error("Failed to save article");
          queryClient.invalidateQueries({ queryKey: ["/api/news/saved"] });
          return { success: true, message: `Saved article: "${artTitle}"` };
        }
        case "delete_saved_article": {
          const resp = await fetch(`/api/news/saved/${action.args.article_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete saved article");
          queryClient.invalidateQueries({ queryKey: ["/api/news/saved"] });
          return { success: true, message: `Removed saved article` };
        }

        // SCHEDULED MESSAGES
        case "create_scheduled_message": {
          const { chatId, recipientName, message: schedMsg, timeOfDay, recurrence } = action.args;
          const resp = await fetch("/api/work/scheduled-messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ chatId, recipientName, message: schedMsg, timeOfDay, recurrence: recurrence || "daily", active: true }),
          });
          if (!resp.ok) throw new Error("Failed to create scheduled message");
          queryClient.invalidateQueries({ queryKey: ["/api/work/scheduled-messages"] });
          return { success: true, message: `Scheduled message to ${recipientName} at ${timeOfDay}` };
        }
        case "update_scheduled_message": {
          const { message_id, ...schedUpdates } = action.args;
          const resp = await fetch(`/api/work/scheduled-messages/${message_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(schedUpdates),
          });
          if (!resp.ok) throw new Error("Failed to update scheduled message");
          queryClient.invalidateQueries({ queryKey: ["/api/work/scheduled-messages"] });
          return { success: true, message: `Updated scheduled message` };
        }
        case "delete_scheduled_message": {
          const resp = await fetch(`/api/work/scheduled-messages/${action.args.message_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete scheduled message");
          queryClient.invalidateQueries({ queryKey: ["/api/work/scheduled-messages"] });
          return { success: true, message: `Deleted scheduled message` };
        }

        // INCOME STREAMS
        case "create_income_stream": {
          const { name: streamName, amount: streamAmt, frequency: streamFreq, category: streamCat } = action.args;
          const resp = await fetch("/api/income-streams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: streamName, amount: Math.round(Number(streamAmt)), frequency: streamFreq || "monthly", category: streamCat || "other", isActive: 1 }),
          });
          if (!resp.ok) throw new Error("Failed to create income stream");
          queryClient.invalidateQueries({ queryKey: ["/api/income-streams"] });
          return { success: true, message: `Added income stream: "${streamName}"` };
        }
        case "update_income_stream": {
          const { stream_id, ...streamUpdates } = action.args;
          if (streamUpdates.amount) streamUpdates.amount = Math.round(Number(streamUpdates.amount));
          const resp = await fetch(`/api/income-streams/${stream_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(streamUpdates),
          });
          if (!resp.ok) throw new Error("Failed to update income stream");
          queryClient.invalidateQueries({ queryKey: ["/api/income-streams"] });
          return { success: true, message: `Updated income stream` };
        }
        case "delete_income_stream": {
          const resp = await fetch(`/api/income-streams/${action.args.stream_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete income stream");
          queryClient.invalidateQueries({ queryKey: ["/api/income-streams"] });
          return { success: true, message: `Deleted income stream` };
        }

        // LOANS
        case "create_loan": {
          const { name: loanName, originalAmount, currentBalance, interestRate, monthlyPayment, type: loanType, lender, startDate: loanStart } = action.args;
          const resp = await fetch("/api/loans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: loanName,
              originalAmount: Math.round(Number(originalAmount)),
              currentBalance: Math.round(Number(currentBalance || originalAmount)),
              interestRate: Number(interestRate || 0),
              monthlyPayment: Math.round(Number(monthlyPayment || 0)),
              type: loanType || "personal",
              lender: lender || "",
              startDate: loanStart || new Date().toISOString().split("T")[0],
              status: "active",
            }),
          });
          if (!resp.ok) throw new Error("Failed to create loan");
          queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
          return { success: true, message: `Added loan: "${loanName}"` };
        }
        case "update_loan": {
          const { loan_id, ...loanUpdates } = action.args;
          if (loanUpdates.currentBalance) loanUpdates.currentBalance = Math.round(Number(loanUpdates.currentBalance));
          if (loanUpdates.monthlyPayment) loanUpdates.monthlyPayment = Math.round(Number(loanUpdates.monthlyPayment));
          const resp = await fetch(`/api/loans/${loan_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(loanUpdates),
          });
          if (!resp.ok) throw new Error("Failed to update loan");
          queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
          return { success: true, message: `Updated loan` };
        }
        case "delete_loan": {
          const resp = await fetch(`/api/loans/${action.args.loan_id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Failed to delete loan");
          queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
          return { success: true, message: `Deleted loan` };
        }

        // ROADMAP ACTION
        case "refresh_roadmap": {
          const response = await fetch("/api/career/coach", { method: "POST" });
          if (!response.ok) {
            throw new Error("Failed to regenerate roadmap");
          }
          const data = await response.json();
          if (data.error) {
            return { success: false, message: data.message || "Failed to regenerate roadmap" };
          }
          return { success: true, message: "Roadmap regenerated with your updated vision! Check Career & Vision page." };
        }
        
        default:
          return { success: false, message: `Unknown action: ${action.name}` };
      }
    } catch (error: any) {
      return { success: false, message: error.message || "Action failed" };
    }
  };

  const handleSend = async (prompt?: string) => {
    const messageText = prompt || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: OrbitMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setIsLoading(true);

    try {
      const context = buildContext();
      
      const response = await fetch("/api/orbit/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: messageText,
          context,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          therapyMode
        })
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let sseBuffer = "";
      const workActionResults: string[] = [];

      const assistantMessage: OrbitMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        sseBuffer += chunk;

        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setMessages(prev => prev.map(m => 
                m.id === assistantMessage.id 
                  ? { ...m, content: fullContent }
                  : m
              ));
            }
            if (data.action === "teams_sent") {
              workActionResults.push(`Sent Teams message to chat`);
            } else if (data.action === "event_created") {
              workActionResults.push(`Created calendar event: ${data.subject}`);
            } else if (data.action === "task_created") {
              workActionResults.push(`Created task: ${data.title}`);
            } else if (data.action === "email_sent") {
              workActionResults.push(`Email sent to ${data.to}`);
            } else if (data.action === "message_scheduled") {
              workActionResults.push(`Scheduled message to ${data.recipient} at ${data.time}`);
            }
          } catch {}
        }
      }

      if (workActionResults.length > 0) {
        const suffix = "\n\n" + workActionResults.map(r => `✓ ${r}`).join("\n");
        setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, content: fullContent + suffix }
            : m
        ));
        queryClient.invalidateQueries();
      }

      const actionMatch = fullContent.match(/\{[\s\S]*"type"\s*:\s*"action"[\s\S]*\}/);
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[0]) as OrbitAction;
          
          const textContent = fullContent.replace(actionMatch[0], "").trim();
          
          setMessages(prev => prev.map(m => 
            m.id === assistantMessage.id 
              ? { ...m, content: textContent || "Processing action...", action }
              : m
          ));

          if (action.confirm) {
            setPendingAction({ action, messageId: assistantMessage.id });
          } else {
            const result = await executeAction(action);
            setMessages(prev => prev.map(m => 
              m.id === assistantMessage.id 
                ? { ...m, actionResult: result }
                : m
            ));
            
            queryClient.invalidateQueries();
          }
        } catch (e) {
          console.error("Failed to parse action:", e);
        }
      }
    } catch (error) {
      console.error("Orbit error:", error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I encountered an issue. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    
    const result = await executeAction(pendingAction.action);
    setMessages(prev => prev.map(m => 
      m.id === pendingAction.messageId 
        ? { ...m, actionResult: result }
        : m
    ));
    setPendingAction(null);
    queryClient.invalidateQueries();
  };

  const cancelAction = () => {
    if (!pendingAction) return;
    setMessages(prev => prev.map(m => 
      m.id === pendingAction.messageId 
        ? { ...m, actionResult: { success: false, message: "Action cancelled" } }
        : m
    ));
    setPendingAction(null);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("orbit_messages");
  };

  const dismissNudge = (nudgeId: string) => {
    setDismissedNudges(prev => {
      const newSet = new Set(prev);
      newSet.add(nudgeId);
      sessionStorage.setItem("orbit_dismissed_nudges", JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const generateNudges = () => {
    const nudges: { id: string; message: string; icon: React.ReactNode }[] = [];
    const currentHour = new Date().getHours();
    
    const currentBlock = routineBlocks?.find(b => {
      const [startH] = b.startTime.split(":").map(Number);
      const [endH] = b.endTime.split(":").map(Number);
      return currentHour >= startH && currentHour < endH;
    });
    
    if (currentBlock) {
      const blockNudgeId = `block-${currentBlock.id}-${today}`;
      if (!dismissedNudges.has(blockNudgeId)) {
        nudges.push({
          id: blockNudgeId,
          message: `Your ${currentBlock.emoji} ${currentBlock.name} has started`,
          icon: <Clock className="w-4 h-4 text-blue-500" />
        });
      }
    }
    
    if (currentHour >= 12) {
      const incompleteHabits = habits?.filter(h => 
        !todayCompletions.some(c => c.habitId === h.id)
      ) || [];
      
      if (incompleteHabits.length > 0) {
        const firstIncomplete = incompleteHabits[0];
        const habitNudgeId = `habit-${firstIncomplete.id}-${today}`;
        if (!dismissedNudges.has(habitNudgeId)) {
          nudges.push({
            id: habitNudgeId,
            message: `You haven't logged "${firstIncomplete.title}" today`,
            icon: <CheckCircle2 className="w-4 h-4 text-amber-500" />
          });
        }
      }
    }
    
    if (currentHour >= 18 && routinePercent < 50 && totalRoutineActivities > 0) {
      const remaining = totalRoutineActivities - completedRoutineActivities;
      const routineNudgeId = `routine-evening-${today}`;
      if (!dismissedNudges.has(routineNudgeId) && remaining > 0) {
        nudges.push({
          id: routineNudgeId,
          message: `Still time to complete ${remaining} more routine item${remaining > 1 ? 's' : ''}`,
          icon: <Activity className="w-4 h-4 text-teal-600" />
        });
      }
    }
    
    return nudges.slice(0, 1);
  };

  const activeNudges = generateNudges();

  return (
    <Layout>
      <div className={cn(
        "h-[calc(100dvh-120px)] md:h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-500 transition-all pb-20 md:pb-0",
        therapyMode && "relative"
      )}>
        {/* Therapy mode ambient glow */}
        {therapyMode && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "12s" }} />
          </div>
        )}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500",
              therapyMode
                ? "bg-gradient-to-br from-amber-500 to-violet-600 shadow-amber-500/30"
                : "bg-primary shadow-primary/30"
            )}>
              {therapyMode
                ? <Heart className="w-5 h-5 text-white" />
                : <OrbitIcon className="w-5 h-5 text-primary-foreground" />
              }
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight">
                {therapyMode ? "Go Deeper" : "Orbia"}
              </h1>
              <p className={cn(
                "text-xs transition-colors duration-500",
                therapyMode ? "text-amber-600/70 dark:text-amber-400/70" : "text-muted-foreground"
              )}>
                {therapyMode ? "A safe space to explore what's underneath" : "Hey! How can I help?"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={therapyMode ? "default" : "outline"}
              size="sm"
              onClick={() => setTherapyMode(!therapyMode)}
              className={cn(
                "text-xs gap-1.5 transition-all duration-500",
                therapyMode
                  ? "bg-gradient-to-r from-amber-600 to-violet-600 hover:from-amber-700 hover:to-violet-700 text-white border-0 shadow-lg shadow-amber-500/20"
                  : "border-amber-400/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", therapyMode && "animate-pulse")} />
              {therapyMode ? "Deeper" : "Go Deeper"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnloadOpen(true)}
              className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Brain className="w-3.5 h-3.5" /> Unload
            </Button>
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {activeNudges.map((nudge) => (
            <motion.div
              key={nudge.id}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-3"
            >
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    {nudge.icon}
                  </div>
                  <span className="text-sm font-medium">{nudge.message}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 text-muted-foreground hover:text-foreground"
                  onClick={() => dismissNudge(nudge.id)}
                  data-testid={`nudge-dismiss-${nudge.id}`}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-h-0 relative z-10">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  {therapyMode ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-violet-500/10 flex items-center justify-center mb-4">
                        <Heart className="w-8 h-8 text-amber-500" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">I'm here</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        No agenda. No rush. Say whatever comes to mind — or just sit here for a moment. This space is yours.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <OrbitIcon className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Hi there!</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        I'm here to help you stay on track. Ask me about your goals, get help with tasks, or just chat about your day!
                      </p>
                    </>
                  )}
                </div>
              )}
              
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-colors duration-500",
                      message.role === "user"
                        ? therapyMode
                          ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white"
                          : "bg-primary text-primary-foreground"
                        : therapyMode
                          ? "bg-gradient-to-br from-amber-50/80 to-violet-50/80 dark:from-amber-950/30 dark:to-violet-950/30 text-foreground border border-amber-200/30 dark:border-amber-800/30"
                          : "bg-muted/80 text-foreground border border-border/50"
                    )}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.role === "assistant" ? formatMarkdown(message.content) : message.content}
                      </p>
                      
                      {message.action && !message.actionResult && pendingAction?.messageId === message.id && (
                        <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                            {message.action.confirm_text || "Confirm this action?"}
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={confirmAction} className="bg-amber-600 hover:bg-amber-700 text-white">
                              <Check className="w-3 h-3 mr-1" /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelAction}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {message.actionResult && (
                        <div className={cn(
                          "mt-2 flex items-center gap-2 text-xs",
                          message.actionResult.success ? "text-emerald-600" : "text-destructive"
                        )}>
                          {message.actionResult.success 
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <AlertCircle className="w-3 h-3" />
                          }
                          {message.actionResult.message}
                        </div>
                      )}
                      
                      <p className="text-xs text-foreground/80 font-medium mt-1.5">
                        {format(message.timestamp, "h:mm a")}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted/80 border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex flex-wrap gap-2 mb-3">
            {(therapyMode ? THERAPY_CHIPS : QUICK_CHIPS).map((chip) => (
              <Button
                key={chip.label}
                variant="outline"
                size="sm"
                onClick={() => handleSend(chip.prompt)}
                disabled={isLoading}
                className={cn(
                  "text-xs",
                  therapyMode
                    ? "border-amber-400/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                data-testid={`chip-${chip.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {chip.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={therapyMode ? "What's on your mind..." : "Chat with Orbia..."}
              disabled={isLoading}
              className="flex-1 bg-background border-input focus:border-primary resize-none min-h-[40px] max-h-[150px] py-2"
              rows={1}
              data-testid="input-orbit-message"
            />
            <VoiceInputButton
              onTranscript={(text) => {
                setInput(prev => prev ? prev + "\n" + text : text);
                setTimeout(() => {
                  if (inputRef.current) {
                    inputRef.current.style.height = "auto";
                    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + "px";
                  }
                }, 0);
              }}
              disabled={isLoading}
              conversationMode={true}
              onConversationResponse={(userText, assistantText) => {
                const userMsg: OrbitMessage = {
                  id: crypto.randomUUID(),
                  role: "user",
                  content: userText,
                  timestamp: new Date(),
                };
                const assistantMsg: OrbitMessage = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: assistantText,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, userMsg, assistantMsg]);
              }}
              chatHistory={messages.slice(-10).map(m => ({ role: m.role, content: m.content }))}
              therapyMode={therapyMode}
              aiMode="orbit"
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={isLoading || !input.trim()}
              data-testid="button-send-orbit"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <UnloadSheet
        open={unloadOpen}
        onOpenChange={setUnloadOpen}
        onExecuteAction={async (actionName, actionArgs) => {
          const action = { type: "action" as const, name: actionName, args: actionArgs, confirm: false };
          const result = await executeAction(action);
          if (result.success) {
            queryClient.invalidateQueries();
          }
          return result;
        }}
      />
    </Layout>
  );
}
