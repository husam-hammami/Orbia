import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbit, X, Send, Loader2, Sparkles, ExternalLink, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLocation, Link } from "wouter";
import { 
  useHabits, 
  useAllHabitCompletions,
  useRoutineBlocks,
  useRoutineActivities,
  useRoutineLogs,
  useTodos,
  useTrackerEntries,
  useMembers,
  useAddHabitCompletion,
  useRemoveHabitCompletion,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
  useToggleRoutineActivity,
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
  useDeleteJournalEntry
} from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface QuickMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pendingAction?: any;
}

const QUICK_PROMPTS = [
  "What's left?",
  "Today summary",
  "What now?",
];

function parseActionFromContent(content: string): { action: any | null; cleanContent: string } {
  const actionMatch = content.match(/\{[\s\S]*"type"\s*:\s*"action"[\s\S]*\}/);
  if (actionMatch) {
    try {
      const action = JSON.parse(actionMatch[0]);
      if (action.type === "action") {
        return { action, cleanContent: content.replace(actionMatch[0], "").trim() };
      }
    } catch {}
  }
  return { action: null, cleanContent: content };
}

function formatMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function OrbitFab() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");
  
  const { data: habits } = useHabits();
  const { data: allCompletions } = useAllHabitCompletions();
  const { data: routineBlocks } = useRoutineBlocks();
  const { data: routineActivities } = useRoutineActivities();
  const { data: routineLogs } = useRoutineLogs(today);
  const { data: todos } = useTodos();
  const { data: trackerEntries } = useTrackerEntries(7);
  const { data: members } = useMembers();
  const { data: careerProjects } = useCareerProjects();
  const { data: careerTasks } = useCareerTasks();
  const { data: expenses } = useExpenses();
  const { data: journalEntries } = useJournalEntries();

  const addHabitCompletion = useAddHabitCompletion();
  const removeHabitCompletion = useRemoveHabitCompletion();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const toggleRoutineActivity = useToggleRoutineActivity();
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

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (location === "/orbit") return null;

  const buildContext = () => {
    const todayCompletions = allCompletions?.filter(c => c.completedDate === today) || [];
    const habitsCompletedToday = todayCompletions.length;
    const totalHabits = habits?.length || 0;
    
    const totalRoutineActivities = routineActivities?.length || 0;
    const completedRoutineActivities = routineLogs?.length || 0;
    const routinePercent = totalRoutineActivities > 0 
      ? Math.round((completedRoutineActivities / totalRoutineActivities) * 100) 
      : 0;

    const latestEntry = trackerEntries?.[0];
    const latestFronter = latestEntry?.frontingMemberId 
      ? members?.find(m => m.id === latestEntry.frontingMemberId)?.name 
      : null;

    const incompleteTodos = todos?.filter(t => !t.completed) || [];
    const incompleteHabits = habits?.filter(h => 
      !todayCompletions.some(c => c.habitId === h.id)
    ) || [];

    return {
      date: today,
      time: format(new Date(), "h:mm a"),
      snapshot: { habitsCompleted: habitsCompletedToday, totalHabits, routinePercent, latestFronter },
      incompleteHabits: incompleteHabits.slice(0, 5).map(h => ({ id: h.id, name: h.title, category: h.category })),
      incompleteTodos: incompleteTodos.slice(0, 5).map(t => ({ id: t.id, title: t.title, priority: t.priority })),
      allHabits: habits?.map(h => ({ id: h.id, name: h.title, category: h.category })) || [],
      allTodos: todos?.map(t => ({ id: t.id, title: t.title, completed: !!t.completed, priority: t.priority })) || [],
      allRoutineActivities: routineActivities?.map(a => ({ id: a.id, name: a.name, habitId: a.habitId, blockId: a.blockId })) || [],
      allRoutineBlocks: routineBlocks?.map(b => ({ id: b.id, name: b.name, emoji: b.emoji })) || [],
      allCareerProjects: careerProjects?.map(p => ({ id: p.id, title: p.title, status: p.status, progress: p.progress })) || [],
      allCareerTasks: careerTasks?.map(t => ({ id: t.id, title: t.title, projectId: t.projectId, completed: !!t.completed, priority: t.priority })) || [],
      allExpenses: expenses?.map(e => ({ id: e.id, name: e.name, amount: e.amount, category: e.category, status: e.status })) || [],
      recentJournalEntries: journalEntries?.slice(0, 10).map(j => ({ 
        id: j.id, 
        content: j.content.substring(0, 200), 
        entryType: j.entryType, 
        mood: j.mood, 
        energy: j.energy,
        tags: j.tags,
        createdAt: j.createdAt
      })) || []
    };
  };

  const executeAction = async (action: any): Promise<{ success: boolean; message: string }> => {
    try {
      switch (action.name) {
        case "mark_habit": {
          const { habit_id, date, done } = action.args;
          if (done) await addHabitCompletion.mutateAsync({ habitId: habit_id, date });
          else await removeHabitCompletion.mutateAsync({ habitId: habit_id, date });
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
            color: `hsl(${Math.floor(Math.random() * 360)} 60% 50%)`
          });
          return { success: true, message: `Created: "${title}"` };
        }
        case "update_habit": {
          const { habit_id, ...updates } = action.args;
          await updateHabit.mutateAsync({ id: habit_id, ...updates });
          const habit = habits?.find(h => h.id === habit_id);
          return { success: true, message: `Updated: "${habit?.title || habit_id}"` };
        }
        case "delete_habit": {
          const { habit_id } = action.args;
          const habit = habits?.find(h => h.id === habit_id);
          await deleteHabit.mutateAsync(habit_id);
          return { success: true, message: `Deleted: "${habit?.title || habit_id}"` };
        }
        case "add_task": {
          const { title, priority } = action.args;
          await createTodo.mutateAsync({ title, priority: priority || "medium" });
          return { success: true, message: `Added: "${title}"` };
        }
        case "mark_task": {
          const { task_id, completed } = action.args;
          await updateTodo.mutateAsync({ id: task_id, completed: completed ? 1 : 0 });
          const task = todos?.find(t => t.id === task_id);
          return { success: true, message: `${completed ? "Done" : "Reopened"}: "${task?.title || task_id}"` };
        }
        case "update_task": {
          const { task_id, ...updates } = action.args;
          await updateTodo.mutateAsync({ id: task_id, ...updates });
          const task = todos?.find(t => t.id === task_id);
          return { success: true, message: `Updated: "${task?.title || task_id}"` };
        }
        case "delete_task": {
          const { task_id } = action.args;
          const task = todos?.find(t => t.id === task_id);
          await deleteTodo.mutateAsync(task_id);
          return { success: true, message: `Deleted: "${task?.title || task_id}"` };
        }
        case "mark_routine_activity": {
          const { activity_id, date, done, habit_id } = action.args;
          await toggleRoutineActivity.mutateAsync({ activityId: activity_id, date, habitId: habit_id || null, action: done ? "add" : "remove" });
          const activity = routineActivities?.find(a => a.id === activity_id);
          return { success: true, message: `${done ? "Done" : "Undid"}: "${activity?.name || activity_id}"` };
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
          return { success: true, message: `Updated: "${project?.title || project_id}"` };
        }
        case "delete_career_project": {
          const { project_id } = action.args;
          const project = careerProjects?.find(p => p.id === project_id);
          await deleteCareerProject.mutateAsync(project_id);
          return { success: true, message: `Deleted: "${project?.title || project_id}"` };
        }
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
          return { success: true, message: `Created: "${title}"` };
        }
        case "update_career_task": {
          const { task_id, ...updates } = action.args;
          await updateCareerTask.mutateAsync({ id: task_id, ...updates });
          const task = careerTasks?.find(t => t.id === task_id);
          return { success: true, message: `Updated: "${task?.title || task_id}"` };
        }
        case "delete_career_task": {
          const { task_id } = action.args;
          const task = careerTasks?.find(t => t.id === task_id);
          await deleteCareerTask.mutateAsync(task_id);
          return { success: true, message: `Deleted: "${task?.title || task_id}"` };
        }
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
          return { success: true, message: `Created: "${name}"` };
        }
        case "update_expense": {
          const { expense_id, ...updates } = action.args;
          await updateExpense.mutateAsync({ id: expense_id, ...updates });
          const expense = expenses?.find(e => e.id === expense_id);
          return { success: true, message: `Updated: "${expense?.name || expense_id}"` };
        }
        case "delete_expense": {
          const { expense_id } = action.args;
          const expense = expenses?.find(e => e.id === expense_id);
          await deleteExpense.mutateAsync(expense_id);
          return { success: true, message: `Deleted: "${expense?.name || expense_id}"` };
        }
        case "create_journal": {
          const { content, entry_type, mood, energy, tags, is_private } = action.args;
          await createJournalEntry.mutateAsync({
            content,
            entryType: entry_type || "reflection",
            mood: mood || null,
            energy: energy || null,
            tags: tags || [],
            isPrivate: is_private || false,
            alterId: null
          });
          return { success: true, message: `Created journal entry` };
        }
        case "update_journal": {
          const { entry_id, content, entry_type, mood, energy, tags } = action.args;
          const updates: any = {};
          if (content) updates.content = content;
          if (entry_type) updates.entryType = entry_type;
          if (mood !== undefined) updates.mood = mood;
          if (energy !== undefined) updates.energy = energy;
          if (tags) updates.tags = tags;
          await updateJournalEntry.mutateAsync({ id: entry_id, ...updates });
          return { success: true, message: `Updated journal entry` };
        }
        case "delete_journal": {
          const { entry_id } = action.args;
          await deleteJournalEntry.mutateAsync(entry_id);
          return { success: true, message: `Deleted journal entry` };
        }
        default:
          return { success: false, message: `Unknown action` };
      }
    } catch (error: any) {
      return { success: false, message: error.message || "Failed" };
    }
  };

  const handleConfirmAction = async (messageId: string, action: any, confirmed: boolean) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return { ...m, pendingAction: undefined };
      }
      return m;
    }));

    if (confirmed) {
      const result = await executeAction(action);
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, content: m.content + (result.success ? ` ✓ ${result.message}` : ` ✗ ${result.message}`) }
          : m
      ));
      queryClient.invalidateQueries();
    } else {
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, content: m.content + " (Cancelled)" }
          : m
      ));
    }
  };

  const handleSend = async (prompt?: string) => {
    const messageText = prompt || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: QuickMessage = { id: crypto.randomUUID(), role: "user", content: messageText };
    const assistantMessageId = crypto.randomUUID();

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const context = buildContext();
      
      const response = await fetch("/api/orbit/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          context,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) throw new Error("Request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullContent = "";

      setMessages(prev => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        
        const { cleanContent } = parseActionFromContent(fullContent);
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: cleanContent || "..." } : m));
      }

      if (!fullContent.trim()) {
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: "No response. Try again." } : m));
        return;
      }

      const { action, cleanContent } = parseActionFromContent(fullContent);
      
      if (action) {
        if (action.confirm) {
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, content: cleanContent || action.confirm_text || "Confirm action?", pendingAction: action }
              : m
          ));
        } else {
          const result = await executeAction(action);
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, content: cleanContent + (result.success ? ` ✓ ${result.message}` : ` ✗ ${result.message}`) }
              : m
          ));
          queryClient.invalidateQueries();
        }
      } else {
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: cleanContent } : m));
      }
    } catch (error) {
      console.error("Orbit error:", error);
      setMessages(prev => {
        const hasEmptyAssistant = prev.some(m => m.id === assistantMessageId && !m.content);
        if (hasEmptyAssistant) {
          return prev.map(m => m.id === assistantMessageId ? { ...m, content: "Something went wrong. Try again." } : m);
        }
        return [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Something went wrong. Try again." }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-20 right-4 md:right-8 w-80 h-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          >
            <div className="flex items-center justify-between p-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <Orbit className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Orbit</span>
              </div>
              <div className="flex items-center gap-1">
                <Link href="/orbit">
                  <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3">
              <div className="space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 mx-auto text-primary/50 mb-2" />
                    <p className="text-xs text-muted-foreground">Quick access to Orbit</p>
                    <div className="flex flex-wrap gap-1 justify-center mt-3">
                      {QUICK_PROMPTS.map((p) => (
                        <Button key={p} variant="outline" size="sm" onClick={() => handleSend(p)} className="text-[10px] h-6 px-2">
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div key={message.id}>
                    <div
                      className={cn(
                        "text-xs rounded-xl px-3 py-2 max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-sm",
                        message.role === "user" 
                          ? "bg-primary text-primary-foreground ml-auto" 
                          : "bg-muted/80 text-foreground border border-border/50"
                      )}
                    >
                      {message.role === "assistant" ? formatMarkdown(message.content) : message.content}
                    </div>
                    {message.pendingAction && (
                      <div className="flex gap-2 mt-2 ml-0">
                        <Button 
                          size="sm" 
                          className="h-6 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => handleConfirmAction(message.id, message.pendingAction, true)}
                          data-testid="button-confirm-action"
                        >
                          <Check className="w-3 h-3 mr-1" /> Confirm
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => handleConfirmAction(message.id, message.pendingAction, false)}
                          data-testid="button-cancel-action"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="bg-muted/80 border border-border/50 rounded-xl px-3 py-2 w-fit shadow-sm">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-2 border-t border-border">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ask Orbit..."
                  disabled={isLoading}
                  className="flex-1 h-8 text-xs bg-background border-input"
                  data-testid="input-orbit-fab"
                />
                <Button onClick={() => handleSend()} disabled={isLoading || !input.trim()} size="icon" className="h-8 w-8" data-testid="button-send-orbit-fab">
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-4 right-4 md:right-8 w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-50 transition-colors",
          isOpen ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground shadow-primary/30"
        )}
        data-testid="button-orbit-fab"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Orbit className="w-5 h-5" />}
      </motion.button>
    </>
  );
}
