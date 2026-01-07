import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Utensils, Save, Loader2, Plus, Trash2, Check, ChefHat, ChevronDown, ChevronUp, Calendar, Clock, Edit2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format, subDays, parseISO } from "date-fns";
import { toast } from "sonner";

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

export function FoodTracker() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<FoodOption | null>(null);
  const [editRecipeMode, setEditRecipeMode] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState("");
  const [newOption, setNewOption] = useState({ name: "", mealType: "dinner", description: "" });
  const [expandedHistory, setExpandedHistory] = useState(true);
  
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
    setSelections(prev => ({ ...prev, [mealType]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(selections);
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

  if (optionsLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" />
              <CardTitle>Today's Meals</CardTitle>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1" data-testid="button-add-option">
                  <Plus className="w-4 h-4" />
                  Add Meal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Meal Option</DialogTitle>
                  <DialogDescription>Create a meal option you can select each day</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Meal Type</Label>
                    <Select
                      value={newOption.mealType}
                      onValueChange={(val) => setNewOption({ ...newOption, mealType: val })}
                    >
                      <SelectTrigger data-testid="select-new-option-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Meal Name</Label>
                    <Input
                      value={newOption.name}
                      onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                      placeholder="e.g., Grilled chicken with rice"
                      data-testid="input-new-option-name"
                    />
                  </div>
                  {newOption.mealType === "dinner" && (
                    <div className="space-y-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Label className="flex items-center gap-2 text-amber-600">
                        <ChefHat className="w-4 h-4" />
                        Recipe / Cooking Steps
                      </Label>
                      <Textarea
                        value={newOption.description}
                        onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                        placeholder={`Example:\n1. Season chicken with salt & pepper\n2. Heat pan with olive oil\n3. Cook 6 min each side\n4. Serve with steamed rice`}
                        rows={6}
                        className="font-mono text-sm"
                        data-testid="input-new-option-recipe"
                      />
                      <p className="text-xs text-muted-foreground">
                        Add simple steps you can follow when cooking this meal
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => addOptionMutation.mutate(newOption)}
                    disabled={!newOption.name.trim() || addOptionMutation.isPending}
                    className="w-full gap-2"
                    data-testid="button-save-new-option"
                  >
                    {addOptionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Meal Option
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>{format(new Date(), "EEEE, MMMM do")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <MealSection
              label="Breakfast"
              emoji="🌅"
              options={breakfastOptions}
              selected={selections.breakfast}
              onSelect={(val) => handleSelect("breakfast", val)}
              onDelete={(id) => deleteOptionMutation.mutate(id)}
              testIdPrefix="breakfast"
            />
            
            <MealSection
              label="Lunch"
              emoji="☀️"
              options={lunchOptions}
              selected={selections.lunch}
              onSelect={(val) => handleSelect("lunch", val)}
              onDelete={(id) => deleteOptionMutation.mutate(id)}
              testIdPrefix="lunch"
            />
            
            <DinnerSection
              options={dinnerOptions}
              selected={selections.dinner}
              onSelect={(val) => handleSelect("dinner", val)}
              onDelete={(id) => deleteOptionMutation.mutate(id)}
              onShowRecipe={showRecipe}
            />
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            className="w-full gap-2"
            data-testid="button-save-meals"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Today's Meals
          </Button>
        </CardContent>
      </Card>

      <Collapsible open={expandedHistory} onOpenChange={setExpandedHistory}>
        <Card className="border-border/50 bg-card/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <CardTitle className="text-base">Meal History</CardTitle>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {recentMealLogs.length} days
                  </span>
                </div>
                {expandedHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {historySummariesLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : recentMealLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No meal entries yet. Save your meals to see history here.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentMealLogs.map((log) => {
                    const isToday = log.date === today;
                    const dateLabel = isToday ? "Today" : format(parseISO(log.date), "EEE, MMM d");
                    return (
                      <div 
                        key={log.id} 
                        className={`p-3 rounded-lg border ${isToday ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/20'}`}
                        data-testid={`meal-log-${log.date}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                            {dateLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">Breakfast</span>
                            <p className="font-medium truncate" title={log.breakfast || undefined}>
                              {log.breakfast || <span className="text-muted-foreground italic">-</span>}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Lunch</span>
                            <p className="font-medium truncate" title={log.lunch || undefined}>
                              {log.lunch || <span className="text-muted-foreground italic">-</span>}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Dinner</span>
                            <p className="font-medium truncate" title={log.dinner || undefined}>
                              {log.dinner || <span className="text-muted-foreground italic">-</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-amber-500" />
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
                    className="flex-1 gap-2"
                  >
                    {updateRecipeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Recipe
                  </Button>
                </div>
              </>
            ) : (
              <>
                {selectedRecipe?.description ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                      {selectedRecipe.description}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No recipe added yet</p>
                    <p className="text-sm">Add cooking steps to reference later</p>
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
  label,
  emoji,
  options,
  selected,
  onSelect,
  onDelete,
  testIdPrefix,
}: {
  label: string;
  emoji: string;
  options: FoodOption[];
  selected: string;
  onSelect: (val: string) => void;
  onDelete: (id: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium flex items-center gap-2">
        <span>{emoji}</span> {label}
      </Label>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground italic pl-6">No options yet. Add one above!</p>
      ) : (
        <div className="grid gap-2">
          {options.map((opt) => (
            <div
              key={opt.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                selected === opt.name
                  ? "border-primary bg-primary/10"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              }`}
              onClick={() => onSelect(opt.name)}
              data-testid={`option-${testIdPrefix}-${opt.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selected === opt.name ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {selected === opt.name && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className={selected === opt.name ? "font-medium" : ""}>{opt.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(opt.id);
                }}
                data-testid={`delete-${testIdPrefix}-${opt.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DinnerSection({
  options,
  selected,
  onSelect,
  onDelete,
  onShowRecipe,
}: {
  options: FoodOption[];
  selected: string;
  onSelect: (val: string) => void;
  onDelete: (id: string) => void;
  onShowRecipe: (opt: FoodOption) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium flex items-center gap-2">
        <span>🌙</span> Dinner
        <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
          <ChefHat className="w-3 h-3" /> with recipes
        </span>
      </Label>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground italic pl-6">No dinner options yet. Add one above!</p>
      ) : (
        <div className="grid gap-2">
          {options.map((opt) => (
            <div
              key={opt.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                selected === opt.name
                  ? "border-primary bg-primary/10"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              }`}
              onClick={() => onSelect(opt.name)}
              data-testid={`option-dinner-${opt.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selected === opt.name ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {selected === opt.name && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div className="flex flex-col">
                  <span className={selected === opt.name ? "font-medium" : ""}>{opt.name}</span>
                  {opt.description && (
                    <span className="text-xs text-amber-600">Has recipe</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowRecipe(opt);
                  }}
                  data-testid={`recipe-dinner-${opt.id}`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span className="text-xs">Recipe</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(opt.id);
                  }}
                  data-testid={`delete-dinner-${opt.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
