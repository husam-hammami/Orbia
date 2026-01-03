import { useState } from "react";
import { Layout } from "@/components/layout";
import { HabitGrid } from "@/components/habit-grid";
import { HabitGarden } from "@/components/habit-garden";
import { HabitListCompact } from "@/components/habit-list-compact";
import { MoodTracker } from "@/components/mood-tracker";
import { SystemJournal } from "@/components/system-journal";
import { HeadspaceMap } from "@/components/headspace-map";
import { GroundingAnchor } from "@/components/grounding-anchor";
import { HabitForm } from "@/components/habit-form";
import { MOCK_HABITS, MOCK_STATS } from "@/lib/mock-data";
import { Habit } from "@/lib/types";
import { format } from "date-fns";
import { Plus, LayoutGrid, List, Flower2, NotebookPen, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Dashboard() {
  const [habits, setHabits] = useState(MOCK_HABITS);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "garden">("garden");
  const [showHeadspace, setShowHeadspace] = useState(false);
  
  const handleToggle = (id: string) => {
    setHabits(habits.map(h => {
      if (h.id === id) {
        const newCompleted = !h.completedToday;
        return {
          ...h,
          completedToday: newCompleted,
          streak: newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    }));
  };

  const handleAddHabit = (data: Omit<Habit, "id" | "streak" | "completedToday" | "history">) => {
    const newHabit: Habit = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      streak: 0,
      completedToday: false,
      history: []
    };
    setHabits([...habits, newHabit]);
    toast.success("New habit planted!");
  };

  const handleDelete = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
    toast.success("Habit removed");
  };

  const today = new Date();

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{format(today, "EEEE, MMMM do")}</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Mindful Tracking
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             {/* Compact Daily Progress */}
             <div className="hidden lg:flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-border/50 mr-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Progress</span>
                <div className="flex items-center gap-3">
                   <span className="text-sm font-bold text-primary font-mono">{habits.filter(h => h.completedToday).length} <span className="text-muted-foreground font-normal">/ {habits.length}</span></span>
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
            >
               <BrainCircuit className="w-4 h-4" />
               {showHeadspace ? "Hide Headspace" : "Show Headspace"}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-primary/20 text-primary hover:bg-primary/5" title="System Journal">
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

        {/* Headspace Map (Collapsible) */}
        {showHeadspace && (
           <div className="animate-in slide-in-from-top-4 duration-300">
              <HeadspaceMap />
           </div>
        )}

        {/* Mood Tracker (Full Width) */}
        <MoodTracker />

        {/* Habits Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Your Habits</h2>
            
            <div className="bg-muted/50 p-1 rounded-lg flex items-center">
               <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Weekly Grid"
               >
                  <LayoutGrid className="w-4 h-4" />
               </button>
               <button 
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Compact List"
               >
                  <List className="w-4 h-4" />
               </button>
               <button 
                  onClick={() => setViewMode("garden")}
                  className={`p-2 rounded-md transition-all ${viewMode === 'garden' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Zen Garden"
               >
                  <Flower2 className="w-4 h-4" />
               </button>
            </div>
          </div>
          
          {viewMode === "grid" && (
             <HabitGrid habits={habits} onToggle={handleToggle} onDelete={handleDelete} />
          )}
          
          {viewMode === "list" && (
             <HabitListCompact habits={habits} onToggle={handleToggle} onDelete={handleDelete} />
          )}

          {viewMode === "garden" && (
             <HabitGarden habits={habits} onToggle={handleToggle} onDelete={handleDelete} />
          )}
        </div>
      </div>
      <GroundingAnchor />
    </Layout>
  );
}
