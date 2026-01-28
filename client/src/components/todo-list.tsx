import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "@/lib/api-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Loader2, CheckCircle2, Calendar, Clock, AlertTriangle, ChevronRight, ChevronDown, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import type { Todo } from "@shared/schema";

export function TodoList() {
  const { data: todos = [], isLoading } = useTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  
  const [newTodo, setNewTodo] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [subtaskText, setSubtaskText] = useState("");

  const handleAdd = () => {
    if (!newTodo.trim()) return;
    createTodo.mutate({ 
      title: newTodo.trim(), 
      priority,
      dueDate: dueDate ? new Date(dueDate + "T12:00:00") : undefined
    }, {
      onSuccess: () => {
        setNewTodo("");
        setDueDate("");
        toast.success("Task added");
      },
      onError: () => toast.error("Failed to add task"),
    });
  };

  const handleAddSubtask = (parentId: string) => {
    if (!subtaskText.trim()) return;
    createTodo.mutate({ 
      title: subtaskText.trim(), 
      priority: "medium",
      parentId
    }, {
      onSuccess: () => {
        setSubtaskText("");
        setAddingSubtaskFor(null);
        setExpandedTasks(prev => new Set([...prev, parentId]));
        toast.success("Subtask added");
      },
      onError: () => toast.error("Failed to add subtask"),
    });
  };

  const handleToggle = (id: string, currentCompleted: number) => {
    updateTodo.mutate({ id, completed: currentCompleted === 1 ? 0 : 1 });
  };

  const handleDelete = (id: string) => {
    deleteTodo.mutate(id, {
      onSuccess: () => toast.success("Task removed"),
      onError: () => toast.error("Failed to delete task"),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const toggleExpanded = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const parentTodos = todos.filter(t => !t.parentId);
  const getSubtasks = (parentId: string) => todos.filter(t => t.parentId === parentId);
  
  const incompleteParentTodos = parentTodos.filter(t => t.completed === 0);
  const completedParentTodos = parentTodos.filter(t => t.completed === 1);

  const priorityConfig = {
    low: { 
      border: "border-l-muted-foreground", 
      bg: "bg-muted/30", 
      text: "text-muted-foreground",
      glow: ""
    },
    medium: { 
      border: "border-l-amber-500", 
      bg: "bg-amber-500/10", 
      text: "text-amber-600 dark:text-amber-400",
      glow: ""
    },
    high: { 
      border: "border-l-rose-500", 
      bg: "bg-rose-500/10", 
      text: "text-rose-600 dark:text-rose-400",
      glow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]"
    },
  };

  const getDueDateInfo = (date: Date | string | null | undefined) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    
    if (isOverdue) {
      const daysAgo = Math.abs(differenceInDays(new Date(), dueDate));
      return { 
        label: daysAgo === 1 ? "Yesterday" : `${daysAgo} days overdue`, 
        color: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
        isOverdue: true
      };
    }
    if (isToday(dueDate)) {
      return { label: "Today", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10", isOverdue: false };
    }
    if (isTomorrow(dueDate)) {
      return { label: "Tomorrow", color: "text-blue-600 dark:text-blue-400 bg-blue-500/10", isOverdue: false };
    }
    const daysUntil = differenceInDays(dueDate, new Date());
    if (daysUntil <= 7) {
      return { label: format(dueDate, "EEEE"), color: "text-primary bg-primary/10", isOverdue: false };
    }
    return { label: format(dueDate, "MMM d"), color: "text-muted-foreground bg-muted/50", isOverdue: false };
  };

  const renderTodoItem = (todo: Todo, isSubtask = false) => {
    const config = priorityConfig[todo.priority as keyof typeof priorityConfig] || priorityConfig.medium;
    const dueDateInfo = getDueDateInfo(todo.dueDate);
    const isOverdue = dueDateInfo?.isOverdue && todo.completed === 0;
    const subtasks = getSubtasks(todo.id);
    const isExpanded = expandedTasks.has(todo.id);
    const completedSubtasks = subtasks.filter(s => s.completed === 1).length;
    const isAddingSubtask = addingSubtaskFor === todo.id;
    
    return (
      <div key={todo.id}>
        <motion.div 
          layout
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          className={cn(
            "flex items-center gap-3 p-4 bg-card/90 backdrop-blur-sm rounded-xl border-l-4 border border-border/80 hover:border-border transition-all group",
            config.border,
            config.glow,
            isOverdue && "animate-pulse border-rose-200",
            isSubtask && "ml-8 p-3"
          )}
          data-testid={`todo-item-${todo.id}`}
        >
          {!isSubtask && subtasks.length > 0 && (
            <button 
              onClick={() => toggleExpanded(todo.id)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <Checkbox
            checked={todo.completed === 1}
            onCheckedChange={() => handleToggle(todo.id, todo.completed)}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            data-testid={`checkbox-todo-${todo.id}`}
          />
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-sm font-medium text-foreground block truncate",
              todo.completed === 1 && "line-through text-muted-foreground"
            )}>
              {todo.title}
            </span>
            <div className="flex items-center gap-2 mt-1">
              {dueDateInfo && (
                <div className="flex items-center gap-1">
                  {isOverdue ? (
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                  ) : (
                    <Clock className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", dueDateInfo.color)}>
                    {dueDateInfo.label}
                  </span>
                </div>
              )}
              {!isSubtask && subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedSubtasks}/{subtasks.length} subtasks
                </span>
              )}
            </div>
          </div>
          <span className={cn(
            "text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide shrink-0",
            config.bg,
            config.text
          )}>
            {todo.priority}
          </span>
          {!isSubtask && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
              onClick={() => {
                setAddingSubtaskFor(todo.id);
                setExpandedTasks(prev => new Set([...prev, todo.id]));
              }}
              data-testid={`button-add-subtask-${todo.id}`}
            >
              <ListPlus className="w-4 h-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 shrink-0"
            onClick={() => handleDelete(todo.id)}
            data-testid={`button-delete-todo-${todo.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </motion.div>
        
        {!isSubtask && isExpanded && (
          <div className="space-y-2 mt-2">
            {subtasks.map(subtask => renderTodoItem(subtask, true))}
            
            {isAddingSubtask && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="ml-8 flex gap-2"
              >
                <Input
                  placeholder="Add subtask..."
                  value={subtaskText}
                  onChange={(e) => setSubtaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSubtask(todo.id);
                    if (e.key === "Escape") {
                      setAddingSubtaskFor(null);
                      setSubtaskText("");
                    }
                  }}
                  className="flex-1 h-9 text-sm"
                  autoFocus
                  data-testid={`input-subtask-${todo.id}`}
                />
                <Button 
                  size="sm"
                  onClick={() => handleAddSubtask(todo.id)}
                  disabled={!subtaskText.trim()}
                  className="h-9"
                >
                  Add
                </Button>
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingSubtaskFor(null);
                    setSubtaskText("");
                  }}
                  className="h-9"
                >
                  Cancel
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a new task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-background border-border"
            data-testid="input-new-todo"
          />
          <Button 
            onClick={handleAdd} 
            size="icon" 
            disabled={!newTodo.trim() || createTodo.isPending} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md min-w-[44px] h-11"
            data-testid="button-add-todo"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(["low", "medium", "high"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  priority === p 
                    ? cn(priorityConfig[p].bg, priorityConfig[p].text) 
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`button-priority-${p}`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              data-testid="input-due-date"
            />
            {dueDate && (
              <button
                onClick={() => setDueDate("")}
                className="text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-clear-date"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {parentTodos.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground mb-1">No tasks yet</p>
          <p className="text-sm text-muted-foreground">Add your first task to get started</p>
        </motion.div>
      ) : (
        <>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {incompleteParentTodos.map((todo) => renderTodoItem(todo))}
            </AnimatePresence>
          </div>

          {completedParentTodos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Completed ({completedParentTodos.length})
              </p>
              <AnimatePresence mode="popLayout">
                {completedParentTodos.map((todo) => renderTodoItem(todo))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {parentTodos.length > 0 && (
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-card/60 backdrop-blur-sm rounded-full border border-border/50 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {incompleteParentTodos.length} pending
            </span>
            <span className="w-px h-3 bg-border" />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {completedParentTodos.length} completed
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
