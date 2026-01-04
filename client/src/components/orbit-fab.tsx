import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbit, X, Send, Loader2, Sparkles, ExternalLink } from "lucide-react";
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
  useToggleRoutineActivity
} from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface QuickMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
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

  const addHabitCompletion = useAddHabitCompletion();
  const removeHabitCompletion = useRemoveHabitCompletion();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const toggleRoutineActivity = useToggleRoutineActivity();

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
      allHabits: habits?.map(h => ({ id: h.id, name: h.title })) || [],
      allTodos: todos?.map(t => ({ id: t.id, title: t.title, completed: !!t.completed })) || []
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
        case "mark_routine_activity": {
          const { activity_id, date, done, habit_id } = action.args;
          await toggleRoutineActivity.mutateAsync({ activityId: activity_id, date, habitId: habit_id || null, action: done ? "add" : "remove" });
          const activity = routineActivities?.find(a => a.id === activity_id);
          return { success: true, message: `${done ? "Done" : "Undid"}: "${activity?.name || activity_id}"` };
        }
        default:
          return { success: false, message: `Unknown action` };
      }
    } catch (error: any) {
      return { success: false, message: error.message || "Failed" };
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
      
      if (action && !action.confirm) {
        const result = await executeAction(action);
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, content: cleanContent + (result.success ? ` ✓ ${result.message}` : ` ✗ ${result.message}`) }
            : m
        ));
        queryClient.invalidateQueries();
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
            className="fixed bottom-20 right-4 md:right-8 w-80 h-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
              <div className="flex items-center gap-2">
                <Orbit className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-sm text-slate-100">Orbit</span>
              </div>
              <div className="flex items-center gap-1">
                <Link href="/orbit">
                  <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-slate-100">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-slate-100" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 mx-auto text-indigo-400/50 mb-2" />
                    <p className="text-xs text-muted-foreground">Quick access to Orbit</p>
                    <div className="flex flex-wrap gap-1 justify-center mt-3">
                      {QUICK_PROMPTS.map((p) => (
                        <Button key={p} variant="outline" size="sm" onClick={() => handleSend(p)} className="text-[10px] h-6 px-2 bg-slate-800 border-slate-600">
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "text-xs rounded-xl px-3 py-2 max-w-[85%] whitespace-pre-wrap",
                      message.role === "user" ? "bg-indigo-600 text-white ml-auto" : "bg-slate-800 text-slate-100"
                    )}
                  >
                    {message.content}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="bg-slate-800 rounded-xl px-3 py-2 w-fit">
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-2 border-t border-slate-700">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ask Orbit..."
                  disabled={isLoading}
                  className="flex-1 h-8 text-xs bg-slate-800 border-slate-600"
                  data-testid="input-orbit-fab"
                />
                <Button onClick={() => handleSend()} disabled={isLoading || !input.trim()} size="icon" className="h-8 w-8 bg-indigo-600 hover:bg-indigo-700" data-testid="button-send-orbit-fab">
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
          isOpen ? "bg-slate-700 text-slate-300" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30"
        )}
        data-testid="button-orbit-fab"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Orbit className="w-5 h-5" />}
      </motion.button>
    </>
  );
}
