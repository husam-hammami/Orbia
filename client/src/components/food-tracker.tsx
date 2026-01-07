import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Utensils, Save, Loader2, Plus, Trash2, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { toast } from "sonner";

interface FoodOption {
  id: string;
  name: string;
  mealType: string;
  description?: string;
}

const DEFAULT_OPTIONS: { name: string; mealType: string }[] = [
  { name: "Cereals milk honey", mealType: "breakfast" },
  { name: "Simple ham and cheese", mealType: "lunch" },
];

export function FoodTracker() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newOption, setNewOption] = useState({ name: "", mealType: "breakfast" });
  
  const { data: foodOptions = [], isLoading: optionsLoading } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<any>({
    queryKey: [`/api/daily-summaries/${today}`],
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
      toast.success("Meals saved!");
    },
    onError: () => toast.error("Failed to save meals"),
  });

  const addOptionMutation = useMutation({
    mutationFn: async (opt: { name: string; mealType: string }) => {
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
      setNewOption({ name: "", mealType: "breakfast" });
      setAddDialogOpen(false);
      toast.success("Option added!");
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

  const breakfastOptions = foodOptions.filter(o => o.mealType === "breakfast");
  const lunchOptions = foodOptions.filter(o => o.mealType === "lunch");
  const dinnerOptions = foodOptions.filter(o => o.mealType === "dinner");

  const handleSelect = (mealType: "breakfast" | "lunch" | "dinner", value: string) => {
    setSelections(prev => ({ ...prev, [mealType]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(selections);
  };

  if (optionsLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            <CardTitle>Meal Tracker</CardTitle>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1" data-testid="button-add-option">
                <Plus className="w-4 h-4" />
                Add Option
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Meal Option</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Meal Name</Label>
                  <Input
                    value={newOption.name}
                    onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                    placeholder="e.g., Grilled chicken salad"
                    data-testid="input-new-option-name"
                  />
                </div>
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
                <Button
                  onClick={() => addOptionMutation.mutate(newOption)}
                  disabled={!newOption.name.trim() || addOptionMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-save-new-option"
                >
                  {addOptionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Option
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Select your meals for today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <MealSection
            label="Breakfast"
            options={breakfastOptions}
            selected={selections.breakfast}
            onSelect={(val) => handleSelect("breakfast", val)}
            onDelete={(id) => deleteOptionMutation.mutate(id)}
            testIdPrefix="breakfast"
          />
          
          <MealSection
            label="Lunch"
            options={lunchOptions}
            selected={selections.lunch}
            onSelect={(val) => handleSelect("lunch", val)}
            onDelete={(id) => deleteOptionMutation.mutate(id)}
            testIdPrefix="lunch"
          />
          
          <MealSection
            label="Dinner"
            options={dinnerOptions}
            selected={selections.dinner}
            onSelect={(val) => handleSelect("dinner", val)}
            onDelete={(id) => deleteOptionMutation.mutate(id)}
            testIdPrefix="dinner"
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
  );
}

function MealSection({
  label,
  options,
  selected,
  onSelect,
  onDelete,
  testIdPrefix,
}: {
  label: string;
  options: FoodOption[];
  selected: string;
  onSelect: (val: string) => void;
  onDelete: (id: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium">{label}</Label>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No options yet. Add one above!</p>
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
