import { useState } from "react";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "@/lib/api-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function TodoList() {
  const { data: todos = [], isLoading } = useTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  
  const [newTodo, setNewTodo] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const handleAdd = () => {
    if (!newTodo.trim()) return;
    createTodo.mutate({ title: newTodo.trim(), priority }, {
      onSuccess: () => {
        setNewTodo("");
        toast.success("Task added");
      },
      onError: () => toast.error("Failed to add task"),
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

  const incompleteTodos = todos.filter(t => t.completed === 0);
  const completedTodos = todos.filter(t => t.completed === 1);

  const priorityColors = {
    low: "border-l-slate-400",
    medium: "border-l-amber-500",
    high: "border-l-rose-500",
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
      <div className="flex gap-2">
        <Input
          placeholder="Add a new task..."
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
          data-testid="input-new-todo"
        />
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <button
            onClick={() => setPriority("low")}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium transition-all",
              priority === "low" ? "bg-slate-500/20 text-slate-600" : "text-muted-foreground hover:text-foreground"
            )}
            title="Low priority"
            data-testid="button-priority-low"
          >
            Low
          </button>
          <button
            onClick={() => setPriority("medium")}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium transition-all",
              priority === "medium" ? "bg-amber-500/20 text-amber-600" : "text-muted-foreground hover:text-foreground"
            )}
            title="Medium priority"
            data-testid="button-priority-medium"
          >
            Med
          </button>
          <button
            onClick={() => setPriority("high")}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium transition-all",
              priority === "high" ? "bg-rose-500/20 text-rose-600" : "text-muted-foreground hover:text-foreground"
            )}
            title="High priority"
            data-testid="button-priority-high"
          >
            High
          </button>
        </div>
        <Button onClick={handleAdd} size="icon" disabled={!newTodo.trim() || createTodo.isPending} data-testid="button-add-todo">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {todos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg mb-1">No tasks yet</p>
          <p className="text-sm">Add your first task to get started</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {incompleteTodos.map((todo) => (
              <div 
                key={todo.id} 
                className={cn(
                  "flex items-center gap-3 p-3 bg-card rounded-lg border-l-4 border border-border/50 hover:border-border transition-all group",
                  priorityColors[todo.priority as keyof typeof priorityColors] || priorityColors.medium
                )}
                data-testid={`todo-item-${todo.id}`}
              >
                <Checkbox
                  checked={todo.completed === 1}
                  onCheckedChange={() => handleToggle(todo.id, todo.completed)}
                  data-testid={`checkbox-todo-${todo.id}`}
                />
                <span className="flex-1 text-sm">{todo.title}</span>
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide",
                  todo.priority === "high" && "bg-rose-500/10 text-rose-600",
                  todo.priority === "medium" && "bg-amber-500/10 text-amber-600",
                  todo.priority === "low" && "bg-slate-500/10 text-slate-600",
                )}>
                  {todo.priority}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(todo.id)}
                  data-testid={`button-delete-todo-${todo.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {completedTodos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed ({completedTodos.length})</p>
              {completedTodos.map((todo) => (
                <div 
                  key={todo.id} 
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/30 group"
                  data-testid={`todo-item-completed-${todo.id}`}
                >
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => handleToggle(todo.id, todo.completed)}
                    data-testid={`checkbox-todo-completed-${todo.id}`}
                  />
                  <span className="flex-1 text-sm line-through text-muted-foreground">{todo.title}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(todo.id)}
                    data-testid={`button-delete-todo-completed-${todo.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {todos.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          {incompleteTodos.length} pending · {completedTodos.length} completed
        </div>
      )}
    </div>
  );
}
