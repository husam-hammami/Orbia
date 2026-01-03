import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { HabitGrid } from "@/components/habit-grid";
import { HabitGarden } from "@/components/habit-garden";
import { HabitListCompact } from "@/components/habit-list-compact";
import { MoodTracker } from "@/components/mood-tracker";
import { SystemJournal } from "@/components/system-journal";
import { HeadspaceMap } from "@/components/headspace-map";
import { GroundingAnchor } from "@/components/grounding-anchor";
import { HabitForm } from "@/components/habit-form";
import { Habit } from "@/lib/types";
import { format } from "date-fns";
import { Plus, LayoutGrid, List, Flower2, NotebookPen, BrainCircuit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useHabits, useCreateHabit, useDeleteHabit, useAddHabitCompletion, useRemoveHabitCompletion } from "@/lib/api-hooks";
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

export default function Dashboard() {
  const { data: dbHabits, isLoading: habitsLoading, error: habitsError } = useHabits();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "garden">("garden");
  const [showHeadspace, setShowHeadspace] = useState(false);
  
  const habitIds = dbHabits?.map(h => h.id) || [];
  
  const { data: allCompletions, isLoading: completionsLoading } = useQuery({
    queryKey: ["allCompletions", habitIds.join(",")],
    queryFn: () => fetchAllCompletions(habitIds),
    enabled: habitIds.length > 0,
  });

  const createHabitMutation = useCreateHabit();
  const deleteHabitMutation = useDeleteHabit();
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

  const isLoading = habitsLoading || (habitIds.length > 0 && completionsLoading);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{format(new Date(), "EEEE, MMMM do")}</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Mindful Tracking
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="hidden lg:flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-border/50 mr-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Progress</span>
                <div className="flex items-center gap-3">
                   <span className="text-sm font-bold text-primary font-mono">
                     {habits.filter(h => h.completedToday).length} <span className="text-muted-foreground font-normal">/ {habits.length}</span>
                   </span>
                   <div className="w-24 h-2 bg-background rounded-full overflow-hidden border border-border/50">
                      <div 
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: habits.length > 0 ? `${(habits.filter(h => h.completedToday).length / habits.length) * 100}%` : '0%' }}
                      />
                   </div>
                </div>
             </div>

            <Button 
               variant={showHeadspace ? "default" : "outline"}
               size="sm" 
               className="gap-2 hidden md:flex"
               onClick={() => setShowHeadspace(!showHeadspace)}
               data-testid="button-toggle-headspace"
            >
               <BrainCircuit className="w-4 h-4" />
               {showHeadspace ? "Hide Headspace" : "Show Headspace"}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-primary/20 text-primary hover:bg-primary/5" title="System Journal" data-testid="button-open-journal">
                  <NotebookPen className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader className="mb-4">
                  <SheetTitle>System Journal</SheetTitle>
                  <SheetDescription>
                    A shared space for notes, reminders, and communication.
                  </SheetDescription>
                </SheetHeader>
                <SystemJournal />
              </SheetContent>
            </Sheet>
            <HabitForm onSubmit={handleAddHabit} />
          </div>
        </div>

        {showHeadspace && (
           <div className="animate-in slide-in-from-top-4 duration-300">
              <HeadspaceMap />
           </div>
        )}

        <MoodTracker />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Your Habits</h2>
            
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
                 <HabitGrid habits={habits} onToggle={handleToggle} onDelete={handleDelete} />
              )}
              
              {viewMode === "list" && (
                 <HabitListCompact habits={habits} onToggle={handleToggle} onDelete={handleDelete} />
              )}

              {viewMode === "garden" && (
                 <HabitGarden habits={habits} onToggle={handleToggle} onDelete={handleDelete} />
              )}
            </>
          )}
        </div>
      </div>
      <GroundingAnchor />
    </Layout>
  );
}
