import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Battery,
  Plus,
  Calendar,
  RefreshCw,
  AlertCircle,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  useToggleRoutineActivity,
  useCreateTrackerEntry
} from "@/lib/api-hooks";
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
  { label: "Today summary", prompt: "Give me a quick summary of today" },
  { label: "What's left?", prompt: "What's left to do today?" },
  { label: "Low-capacity mode", prompt: "I'm overwhelmed, switch to low-capacity mode" },
  { label: "What now?", prompt: "What should I do next?" },
  { label: "Add habit", prompt: "Help me add a new habit" },
];

const ORBIT_SYSTEM_PROMPT = `You are Orbit, a calm operational co-pilot for NeuroZen. You only use NeuroZen data provided in context. You help the user operate the app: summarize today briefly, suggest the smallest next step when asked, and execute user requests by returning at most one action JSON object.

TONE: Calm, brief, operational. No "you should", no praise/shame, no deep emotional probing. Uses data-grounded language: "Based on today's logs…"

WHAT YOU MUST NOT DO:
- Diagnose or interpret psychology
- Explain "why you feel this way"  
- Encourage dependence ("I'm always here for you")
- Invent data or pretend you completed actions
- Use motivational pressure or shame

WHEN TO USE ACTIONS:
If the user asks to mark something done, add a habit, toggle a task, etc., output ONLY a JSON action object like:
{"type":"action","name":"mark_habit","args":{"habit_id":"...","date":"YYYY-MM-DD","done":true},"confirm":false}

SUPPORTED ACTIONS:
- mark_habit: {"habit_id": "...", "date": "YYYY-MM-DD", "done": true/false}
- add_task: {"title": "...", "priority": "low/medium/high"}
- mark_task: {"task_id": "...", "completed": true/false}
- mark_routine_activity: {"activity_id": "...", "date": "YYYY-MM-DD", "done": true/false, "habit_id": "..." or null}
- set_low_capacity_mode: {} (enables low-capacity overlay for today)
- unset_low_capacity_mode: {} (disables low-capacity mode)

For destructive actions (removing habits, major changes), set confirm:true with confirm_text.

LOW-CAPACITY MODE: When activated, highlight 3 core actions:
1) 1-minute grounding
2) Stretch back 5 minutes  
3) Leave the house once OR walk 10-20 min
And mark other routine items as optional.

If unsure about user intent, ask ONE clarifying question. Keep responses brief and operational.`;

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
  const { data: members } = useMembers();
  
  const addHabitCompletion = useAddHabitCompletion();
  const removeHabitCompletion = useRemoveHabitCompletion();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const toggleRoutineActivity = useToggleRoutineActivity();
  const createTrackerEntry = useCreateTrackerEntry();

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
  const [lowCapacityMode, setLowCapacityMode] = useState(() => {
    return localStorage.getItem(`orbit_low_capacity_${today}`) === "true";
  });
  const [pendingAction, setPendingAction] = useState<{ action: OrbitAction; messageId: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("orbit_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
  const latestFronter = latestEntry?.frontingMemberId 
    ? members?.find(m => m.id === latestEntry.frontingMemberId)?.name 
    : null;
  
  const externalPressure = latestEntry 
    ? Math.round(((latestEntry.workLoad || 0) * 10 + (latestEntry.stress || 0)) / 2)
    : null;
  const internalStability = latestEntry
    ? Math.round(100 - ((latestEntry.dissociation || 0) + (100 - (latestEntry.capacity ?? 3) * 20) + (100 - (latestEntry.mood || 5) * 10)) / 3)
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
      lowCapacityMode,
      snapshot: {
        habitsCompleted: habitsCompletedToday,
        totalHabits,
        routinePercent,
        latestFronter,
        externalPressure,
        internalStability
      },
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
        dissociation: e.dissociation,
        fronter: members?.find(m => m.id === e.frontingMemberId)?.name
      })),
      allHabits: habits?.map(h => ({ id: h.id, name: h.title })) || [],
      allTodos: todos?.map(t => ({ id: t.id, title: t.title, completed: !!t.completed })) || [],
      allRoutineActivities: routineActivities?.map(a => ({ id: a.id, name: a.name, habitId: a.habitId })) || []
    };
  };

  const executeAction = async (action: OrbitAction): Promise<{ success: boolean; message: string }> => {
    try {
      switch (action.name) {
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
        
        case "set_low_capacity_mode": {
          setLowCapacityMode(true);
          localStorage.setItem(`orbit_low_capacity_${today}`, "true");
          return { success: true, message: "Low-capacity mode activated. Focus on 3 core actions today." };
        }
        
        case "unset_low_capacity_mode": {
          setLowCapacityMode(false);
          localStorage.removeItem(`orbit_low_capacity_${today}`);
          return { success: true, message: "Low-capacity mode deactivated. Full routine restored." };
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
    setIsLoading(true);

    try {
      const context = buildContext();
      
      const response = await fetch("/api/orbit/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          context,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

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
        fullContent += chunk;
        
        setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, content: fullContent }
            : m
        ));
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

  const lowCapacityCoreActions = [
    { icon: "🧘", name: "1-minute grounding", done: false },
    { icon: "🤸", name: "Stretch back 5 minutes", done: false },
    { icon: "🚶", name: "Leave house / walk 10-20 min", done: false },
  ];

  return (
    <Layout>
      <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <OrbitIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight">Orbit</h1>
              <p className="text-xs text-muted-foreground">Your calm co-pilot</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {lowCapacityMode && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                <Battery className="w-3 h-3" /> Low Capacity
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-400">Habits:</span>
                <span className="font-mono font-bold text-slate-100">{habitsCompletedToday}/{totalHabits}</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-slate-400">Routine:</span>
                <span className="font-mono font-bold text-slate-100">{routinePercent}%</span>
              </div>
              {latestFronter && (
                <>
                  <div className="w-px h-4 bg-slate-700" />
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-slate-400">Front:</span>
                    <span className="font-medium text-slate-100">{latestFronter}</span>
                  </div>
                </>
              )}
              {externalPressure !== null && (
                <>
                  <div className="w-px h-4 bg-slate-700" />
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-slate-400">Load:</span>
                    <span className="font-mono font-bold text-amber-400">{externalPressure}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-400">Stable:</span>
                    <span className="font-mono font-bold text-emerald-400">{internalStability}%</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {lowCapacityMode && (
          <Card className="bg-amber-500/10 border-amber-500/30 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Battery className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-amber-600">Low-Capacity Mode Active</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Focus on these 3 core actions today:</p>
              <div className="grid grid-cols-3 gap-3">
                {lowCapacityCoreActions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-amber-500/20">
                    <span className="text-lg">{action.icon}</span>
                    <span className="text-xs font-medium">{action.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                    <OrbitIcon className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">Ready to help</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Ask me what to do next, get a summary of today, or say you're overwhelmed for low-capacity mode.
                  </p>
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
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.role === "user" 
                        ? "bg-indigo-600 text-white" 
                        : "bg-slate-800 text-slate-100"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.action && !message.actionResult && pendingAction?.messageId === message.id && (
                        <div className="mt-3 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
                          <p className="text-xs font-medium text-amber-400 mb-2">
                            {message.action.confirm_text || "Confirm this action?"}
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={confirmAction} className="bg-amber-500 hover:bg-amber-600 text-amber-950">
                              <Check className="w-3 h-3 mr-1" /> Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelAction}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {message.actionResult && (
                        <div className={cn(
                          "mt-2 flex items-center gap-2 text-xs",
                          message.actionResult.success ? "text-emerald-400" : "text-red-400"
                        )}>
                          {message.actionResult.success 
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <AlertCircle className="w-3 h-3" />
                          }
                          {message.actionResult.message}
                        </div>
                      )}
                      
                      <p className="text-[10px] opacity-50 mt-1">
                        {format(message.timestamp, "h:mm a")}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_CHIPS.map((chip) => (
              <Button
                key={chip.label}
                variant="outline"
                size="sm"
                onClick={() => handleSend(chip.prompt)}
                disabled={isLoading}
                className="text-xs bg-slate-900/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
                data-testid={`chip-${chip.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {chip.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask Orbit anything..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border-slate-700 focus:border-indigo-500"
              data-testid="input-orbit-message"
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-send-orbit"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
