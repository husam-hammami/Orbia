import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useSearch } from "wouter";
import { MoodTracker } from "@/components/mood-tracker";
import { RoutineTimeline } from "@/components/routine-timeline";
import { RoutineEditor } from "@/components/routine-editor";
import { HabitGrid } from "@/components/habit-grid";
import { HabitGarden } from "@/components/habit-garden";
import { HabitListCompact } from "@/components/habit-list-compact";
import { HabitForm } from "@/components/habit-form";
import { TodoList } from "@/components/todo-list";
import { DailySummary } from "@/components/daily-summary";
import { JournalTab } from "@/components/journal-tab";
import { FoodTracker } from "@/components/food-tracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Activity, Calendar, Sparkles, LayoutGrid, List, Flower2, Loader2, ListTodo, BookOpen, Utensils } from "lucide-react";
import { WorkTimer } from "@/components/work-timer";
import { Habit } from "@/lib/types";
import { toast } from "sonner";
import { useHabits, useCreateHabit, useDeleteHabit, useUpdateHabit, useAddHabitCompletion, useRemoveHabitCompletion } from "@/lib/api-hooks";
import { useQuery } from "@tanstack/react-query";

async function fetchAllCompletions(habitIds: string[]): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};
  await Promise.all(
    habitIds.map(async (id) => {
      try {
        const response = await fetch(`/api/habits/${id}/completions`);
        if (response.ok) {
          const completions = await response.json();
          results[id] = completions.map((c: any) => c.completedDate);
        } else {
          results[id] = [];
        }
      } catch {
        results[id] = [];
      }
    })
  );
  return results;
}

export default function TrackerPage() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get("tab");
  
  const [activeTab, setActiveTab] = useState(tabFromUrl || "habits");
  
  useEffect(() => {
    if (tabFromUrl && ["habits", "mood", "routine", "todos", "journal", "food"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  const { data: dbHabits, isLoading: habitsLoading } = useHabits();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "garden">("garden");
  
  const habitIds = dbHabits?.map(h => h.id) || [];
  
  const { data: allCompletions, isLoading: completionsLoading } = useQuery({
    queryKey: ["allCompletions", habitIds.join(",")],
    queryFn: () => fetchAllCompletions(habitIds),
    enabled: habitIds.length > 0,
  });

  const createHabitMutation = useCreateHabit();
  const deleteHabitMutation = useDeleteHabit();
  const updateHabitMutation = useUpdateHabit();
  const addCompletionMutation = useAddHabitCompletion();
  const removeCompletionMutation = useRemoveHabitCompletion();

  const today = format(new Date(), "yyyy-MM-dd");

  const habits: Habit[] = (dbHabits || []).map(dbHabit => {
    const history = allCompletions?.[dbHabit.id] || [];
    const completedToday = history.includes(today);
    return {
      id: dbHabit.id,
      title: dbHabit.title,
      description: dbHabit.description || undefined,
      category: dbHabit.category as Habit["category"],
      frequency: dbHabit.frequency as Habit["frequency"],
      streak: dbHabit.streak,
      completedToday,
      history,
      color: dbHabit.color,
      target: dbHabit.target,
      unit: dbHabit.unit || undefined,
      icon: dbHabit.icon || undefined,
    };
  });
  
  const handleToggle = (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    if (habit.completedToday) {
      removeCompletionMutation.mutate({ habitId: id, date: today }, {
        onError: () => toast.error("Failed to update habit"),
      });
    } else {
      addCompletionMutation.mutate({ habitId: id, date: today }, {
        onSuccess: () => toast.success("Great job!"),
        onError: () => toast.error("Failed to update habit"),
      });
    }
  };

  const handleAddHabit = (data: Omit<Habit, "id" | "streak" | "completedToday" | "history">) => {
    createHabitMutation.mutate({
      title: data.title,
      description: data.description || null,
      category: data.category,
      frequency: data.frequency,
      streak: 0,
      color: data.color,
      target: data.target,
      unit: data.unit || null,
      icon: null,
    }, {
      onSuccess: () => toast.success("New habit planted!"),
      onError: () => toast.error("Failed to create habit"),
    });
  };

  const handleDelete = (id: string) => {
    deleteHabitMutation.mutate(id, {
      onSuccess: () => toast.success("Habit removed"),
      onError: () => toast.error("Failed to delete habit"),
    });
  };

  const handleUpdate = (id: string, data: Partial<Omit<Habit, "id" | "streak" | "completedToday" | "history">>) => {
    updateHabitMutation.mutate({ id, ...data }, {
      onSuccess: () => toast.success("Habit updated"),
      onError: () => toast.error("Failed to update habit"),
    });
  };

  const isLoading = habitsLoading || (habitIds.length > 0 && completionsLoading);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{format(new Date(), "EEEE, MMMM do")}</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Daily Tracker
            </h1>
          </div>
          
          <WorkTimer />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex h-12 items-center justify-center gap-1 rounded-xl bg-muted/60 p-1.5 border border-border/50 shadow-sm">
            <TabsTrigger 
              value="habits" 
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground hover:text-foreground hover:bg-background/50" 
              data-testid="tab-habits"
            >
              <Sparkles className="w-4 h-4" />
              <span>Habits</span>
            </TabsTrigger>
            <TabsTrigger 
              value="mood" 
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground hover:text-foreground hover:bg-background/50" 
              data-testid="tab-mood"
            >
              <Activity className="w-4 h-4" />
              <span>Mood</span>
            </TabsTrigger>
            <TabsTrigger 
              value="routine" 
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground hover:text-foreground hover:bg-background/50" 
              data-testid="tab-routine"
            >
              <Calendar className="w-4 h-4" />
              <span>Routine</span>
            </TabsTrigger>
            <TabsTrigger 
              value="food" 
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground hover:text-foreground hover:bg-background/50" 
              data-testid="tab-food"
            >
              <Utensils className="w-4 h-4" />
              <span>Food</span>
            </TabsTrigger>
            <TabsTrigger 
              value="todos" 
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground hover:text-foreground hover:bg-background/50" 
              data-testid="tab-todos"
            >
              <ListTodo className="w-4 h-4" />
              <span>Tasks</span>
            </TabsTrigger>
            <TabsTrigger 
              value="journal" 
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground hover:text-foreground hover:bg-background/50" 
              data-testid="tab-journal"
            >
              <BookOpen className="w-4 h-4" />
              <span>Journal</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="habits" className="mt-4" data-testid="content-habits">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-muted/30 px-4 py-2 rounded-full border border-border/50">
                    <span className="text-sm font-bold text-primary font-mono">
                      {habits.filter(h => h.completedToday).length} <span className="text-muted-foreground font-normal">/ {habits.length}</span>
                    </span>
                  </div>
                  <div className="w-32 h-2 bg-background rounded-full overflow-hidden border border-border/50">
                    <div 
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: habits.length > 0 ? `${(habits.filter(h => h.completedToday).length / habits.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-muted/50 p-1 rounded-lg flex items-center">
                    <button 
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Weekly Grid"
                      data-testid="button-view-grid"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Compact List"
                      data-testid="button-view-list"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode("garden")}
                      className={`p-2 rounded-md transition-all ${viewMode === 'garden' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Zen Garden"
                      data-testid="button-view-garden"
                    >
                      <Flower2 className="w-4 h-4" />
                    </button>
                  </div>
                  <HabitForm onSubmit={handleAddHabit} />
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading habits...
                </div>
              ) : habits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg mb-2">No habits yet</p>
                  <p className="text-sm">Add your first habit to start tracking!</p>
                </div>
              ) : (
                <>
                  {viewMode === "grid" && (
                    <HabitGrid habits={habits} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleUpdate} />
                  )}
                  
                  {viewMode === "list" && (
                    <HabitListCompact habits={habits} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleUpdate} />
                  )}

                  {viewMode === "garden" && (
                    <HabitGarden habits={habits} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleUpdate} />
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="mood" className="mt-4 space-y-4" data-testid="content-mood">
            <MoodTracker />
            <DailySummary />
          </TabsContent>
          
          <TabsContent value="routine" className="mt-4 space-y-3" data-testid="content-routine">
            <div className="flex justify-end">
              <RoutineEditor />
            </div>
            <RoutineTimeline />
          </TabsContent>
          
          <TabsContent value="food" className="mt-4" data-testid="content-food">
            <FoodTracker />
          </TabsContent>
          
          <TabsContent value="todos" className="mt-4" data-testid="content-todos">
            <TodoList />
          </TabsContent>
          
          <TabsContent value="journal" className="mt-4" data-testid="content-journal">
            <JournalTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
