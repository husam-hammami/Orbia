import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Utensils, Save, Loader2, Plus, Trash2, Check, ChefHat, Calendar, Clock, Edit2, Sunrise, Sun, Moon, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FoodOption {
  id: string;
  name: string;
  mealType: string;
  description?: string;
}

interface DailySummary {
  id: string;
  date: string;
  feeling: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

const DEFAULT_OPTIONS: { name: string; mealType: string; description?: string }[] = [
  { name: "Cereals milk honey", mealType: "breakfast" },
  { name: "Simple ham and cheese", mealType: "lunch" },
];

const mealConfig = {
  breakfast: {
    label: "Breakfast",
    icon: Sunrise,
    gradient: "from-card to-muted/30",
    border: "border-border",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    selectedBg: "bg-primary/10",
    selectedBorder: "border-primary/40",
    accentColor: "text-primary",
    chipBg: "bg-muted/50",
    addBtnBg: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
  lunch: {
    label: "Lunch",
    icon: Sun,
    gradient: "from-card to-muted/30",
    border: "border-border",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    selectedBg: "bg-primary/10",
    selectedBorder: "border-primary/40",
    accentColor: "text-primary",
    chipBg: "bg-muted/50",
    addBtnBg: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
  dinner: {
    label: "Dinner",
    icon: Moon,
    gradient: "from-card to-muted/30",
    border: "border-border",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    selectedBg: "bg-primary/10",
    selectedBorder: "border-primary/40",
    accentColor: "text-primary",
    chipBg: "bg-muted/50",
    addBtnBg: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
};

export function FoodTracker() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<FoodOption | null>(null);
  const [editRecipeMode, setEditRecipeMode] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState("");
  const [newOption, setNewOption] = useState({ name: "", mealType: "dinner", description: "" });
  const [showHistory, setShowHistory] = useState(false);
  
  const { data: foodOptions = [], isLoading: optionsLoading } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<DailySummary>({
    queryKey: [`/api/daily-summaries/${today}`],
  });

  const { data: allSummaries = [], isLoading: historySummariesLoading } = useQuery<DailySummary[]>({
    queryKey: ["/api/daily-summaries"],
  });

  const [selections, setSelections] = useState({
    breakfast: "",
    lunch: "",
    dinner: "",
  });

  useEffect(() => {
    if (summary) {
      setSelections({
        breakfast: summary.breakfast || "",
        lunch: summary.lunch || "",
        dinner: summary.dinner || "",
      });
    }
  }, [summary]);

  useEffect(() => {
    const initializeDefaults = async () => {
      if (!optionsLoading && foodOptions.length === 0) {
        for (const opt of DEFAULT_OPTIONS) {
          try {
            await fetch("/api/food-options", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(opt),
            });
          } catch (e) {}
        }
        queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      }
    };
    initializeDefaults();
  }, [optionsLoading, foodOptions.length]);

  const saveMutation = useMutation({
    mutationFn: async (newSelections: typeof selections) => {
      const res = await fetch("/api/daily-summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          feeling: summary?.feeling || "average",
          breakfast: newSelections.breakfast,
          lunch: newSelections.lunch,
          dinner: newSelections.dinner,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/daily-summaries/${today}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-summaries"] });
      toast.success("Meals saved!");
    },
    onError: () => toast.error("Failed to save meals"),
  });

  const addOptionMutation = useMutation({
    mutationFn: async (opt: { name: string; mealType: string; description?: string }) => {
      const res = await fetch("/api/food-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opt),
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      setNewOption({ name: "", mealType: "dinner", description: "" });
      setAddDialogOpen(false);
      toast.success("Meal option added!");
    },
    onError: () => toast.error("Failed to add option"),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/food-options/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      toast.success("Option removed");
    },
    onError: () => toast.error("Failed to delete option"),
  });

  const updateRecipeMutation = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const res = await fetch(`/api/food-options/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      setEditRecipeMode(false);
      toast.success("Recipe updated!");
    },
    onError: () => toast.error("Failed to update recipe"),
  });

  const breakfastOptions = foodOptions.filter(o => o.mealType === "breakfast");
  const lunchOptions = foodOptions.filter(o => o.mealType === "lunch");
  const dinnerOptions = foodOptions.filter(o => o.mealType === "dinner");

  const handleSelect = (mealType: "breakfast" | "lunch" | "dinner", value: string) => {
    const newSelections = { ...selections, [mealType]: value };
    setSelections(newSelections);
    saveMutation.mutate(newSelections);
  };

  const showRecipe = (opt: FoodOption) => {
    setSelectedRecipe(opt);
    setEditedRecipe(opt.description || "");
    setEditRecipeMode(false);
    setRecipeDialogOpen(true);
  };

  const handleSaveRecipe = () => {
    if (selectedRecipe) {
      updateRecipeMutation.mutate({ id: selectedRecipe.id, description: editedRecipe });
    }
  };

  const recentMealLogs = allSummaries
    .filter(s => s.breakfast || s.lunch || s.dinner)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  const completedMeals = [selections.breakfast, selections.lunch, selections.dinner].filter(Boolean).length;

  if (optionsLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-background/50 backdrop-blur-xl rounded-2xl border border-border/20 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Today's Meals</h2>
              <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM do")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">{completedMeals}/3</span>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90" data-testid="button-add-option">
                  <Plus className="w-4 h-4" />
                  Add Meal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Add New Meal Option
                  </DialogTitle>
                  <DialogDescription>Create a meal option you can quickly select each day</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Meal Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["breakfast", "lunch", "dinner"] as const).map((type) => {
                        const config = mealConfig[type];
                        const Icon = config.icon;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewOption({ ...newOption, mealType: type })}
                            className={cn(
                              "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5",
                              newOption.mealType === type
                                ? `${config.selectedBorder} ${config.selectedBg}`
                                : "border-border hover:border-muted-foreground"
                            )}
                          >
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.iconBg)}>
                              <Icon className={cn("w-4 h-4", config.iconColor)} />
                            </div>
                            <span className={cn("text-sm font-medium", newOption.mealType === type ? config.accentColor : "text-foreground")}>
                              {config.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Meal Name</Label>
                    <Input
                      value={newOption.name}
                      onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                      placeholder="e.g., Grilled chicken with rice"
                      className="bg-background"
                      data-testid="input-new-option-name"
                    />
                  </div>
                  {newOption.mealType === "dinner" && (
                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30">
                      <Label className="flex items-center gap-2 text-primary">
                        <ChefHat className="w-4 h-4" />
                        Recipe / Cooking Steps
                      </Label>
                      <Textarea
                        value={newOption.description}
                        onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                        placeholder={`Example:\n1. Season chicken with salt & pepper\n2. Heat pan with olive oil\n3. Cook 6 min each side\n4. Serve with steamed rice`}
                        rows={5}
                        className="font-mono text-sm bg-background/80"
                        data-testid="input-new-option-recipe"
                      />
                    </div>
                  )}
                  <Button
                    onClick={() => addOptionMutation.mutate(newOption)}
                    disabled={!newOption.name.trim() || addOptionMutation.isPending}
                    className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground"
                    data-testid="button-save-new-option"
                  >
                    {addOptionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add {mealConfig[newOption.mealType as keyof typeof mealConfig].label} Option
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-4">
          <MealSection
            mealType="breakfast"
            options={breakfastOptions}
            selected={selections.breakfast}
            onSelect={(val) => handleSelect("breakfast", val)}
            onDelete={(id) => deleteOptionMutation.mutate(id)}
            onShowRecipe={showRecipe}
          />
          
          <MealSection
            mealType="lunch"
            options={lunchOptions}
            selected={selections.lunch}
            onSelect={(val) => handleSelect("lunch", val)}
            onDelete={(id) => deleteOptionMutation.mutate(id)}
            onShowRecipe={showRecipe}
          />
          
          <MealSection
            mealType="dinner"
            options={dinnerOptions}
            selected={selections.dinner}
            onSelect={(val) => handleSelect("dinner", val)}
            onDelete={(id) => deleteOptionMutation.mutate(id)}
            onShowRecipe={showRecipe}
          />
        </div>

        {saveMutation.isPending && (
          <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/80 overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Calendar className="w-4 h-4 text-foreground" />
            </div>
            <span className="font-medium text-foreground">Meal History</span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
              {recentMealLogs.length} days
            </span>
          </div>
          <motion.div
            animate={{ rotate: showHistory ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </button>
        
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-3">
                {historySummariesLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : recentMealLogs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No meal entries yet</p>
                  </div>
                ) : (
                  recentMealLogs.map((log, index) => {
                    const isToday = log.date === today;
                    const dateLabel = isToday ? "Today" : format(parseISO(log.date), "EEE, MMM d");
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "p-4 rounded-xl border",
                          isToday 
                            ? "bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30" 
                            : "bg-muted/50 border-border"
                        )}
                        data-testid={`meal-log-${log.date}`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className={cn(
                            "text-sm font-medium",
                            isToday ? "text-primary" : "text-foreground"
                          )}>
                            {dateLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {(["breakfast", "lunch", "dinner"] as const).map((mealType) => {
                            const config = mealConfig[mealType];
                            const meal = log[mealType];
                            const Icon = config.icon;
                            return (
                              <div key={mealType} className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Icon className={cn("w-3.5 h-3.5", config.iconColor)} />
                                  <span className="text-xs text-muted-foreground">{config.label}</span>
                                </div>
                                <p className={cn(
                                  "text-sm font-medium truncate",
                                  meal ? "text-foreground" : "text-muted-foreground italic"
                                )} title={meal || undefined}>
                                  {meal || "—"}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-primary" />
              </div>
              {selectedRecipe?.name}
            </DialogTitle>
            <DialogDescription>Recipe and cooking instructions</DialogDescription>
          </DialogHeader>
          <div className="pt-2 space-y-4">
            {editRecipeMode ? (
              <>
                <Textarea
                  value={editedRecipe}
                  onChange={(e) => setEditedRecipe(e.target.value)}
                  placeholder={`Add your recipe steps here...\n\n1. First step\n2. Second step\n3. Third step`}
                  rows={8}
                  className="font-mono text-sm"
                  data-testid="textarea-edit-recipe"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditRecipeMode(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveRecipe}
                    disabled={updateRecipeMutation.isPending}
                    className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground"
                  >
                    {updateRecipeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Recipe
                  </Button>
                </div>
              </>
            ) : (
              <>
                {selectedRecipe?.description ? (
                  <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30 rounded-xl p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground">
                      {selectedRecipe.description}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No recipe added yet</p>
                    <p className="text-sm text-muted-foreground/70">Add cooking steps to reference later</p>
                  </div>
                )}
                <Button 
                  onClick={() => setEditRecipeMode(true)}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {selectedRecipe?.description ? "Edit Recipe" : "Add Recipe"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MealSection({
  mealType,
  options,
  selected,
  onSelect,
  onDelete,
  onShowRecipe,
}: {
  mealType: "breakfast" | "lunch" | "dinner";
  options: FoodOption[];
  selected: string;
  onSelect: (val: string) => void;
  onDelete: (id: string) => void;
  onShowRecipe: (opt: FoodOption) => void;
}) {
  const config = mealConfig[mealType];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-xl border p-4 bg-gradient-to-br transition-all",
      config.gradient,
      config.border
    )}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.iconBg)}>
          <Icon className={cn("w-4 h-4", config.iconColor)} />
        </div>
        <span className={cn("font-medium", config.accentColor)}>{config.label}</span>
        {mealType === "dinner" && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <ChefHat className="w-3 h-3" /> recipes
          </span>
        )}
      </div>

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground italic pl-10">No options yet — add one above!</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {options.map((opt) => (
              <motion.div
                key={opt.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative flex items-center gap-1"
              >
                <button
                  onClick={() => onSelect(selected === opt.name ? "" : opt.name)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm font-medium",
                    selected === opt.name
                      ? `${config.selectedBg} ${config.selectedBorder} ${config.accentColor}`
                      : "bg-card/80 border-border text-foreground hover:border-muted-foreground"
                  )}
                  data-testid={`option-${mealType}-${opt.id}`}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    selected === opt.name 
                      ? `${config.selectedBorder} ${config.selectedBg}` 
                      : "border-border"
                  )}>
                    {selected === opt.name && <Check className="w-3 h-3" />}
                  </div>
                  {opt.name}
                </button>
                {mealType === "dinner" && (
                  <button
                    onClick={() => onShowRecipe(opt)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      opt.description 
                        ? "bg-primary/10 text-primary hover:bg-primary/20" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                    title={opt.description ? "View recipe" : "Add recipe"}
                    data-testid={`recipe-${opt.id}`}
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(opt.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-rose-600"
                  data-testid={`delete-${mealType}-${opt.id}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
