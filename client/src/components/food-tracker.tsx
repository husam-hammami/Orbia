import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Utensils, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { toast } from "sonner";

export function FoodTracker() {
  const today = format(new Date(), "yyyy-MM-dd");
  
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: [`/api/daily-summaries/${today}`],
  });

  const [food, setFood] = useState({
    breakfast: "Cereals milk honey",
    lunch: "Simple ham and cheese",
    dinner: "",
  });

  useEffect(() => {
    if (summary) {
      setFood({
        breakfast: summary.breakfast || "Cereals milk honey",
        lunch: summary.lunch || "Simple ham and cheese",
        dinner: summary.dinner || "",
      });
    }
  }, [summary]);

  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch("/api/daily-summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          feeling: summary?.feeling || "average",
          ...newData,
        }),
      });
      if (!res.ok) throw new Error("Failed to save food");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/daily-summaries/${today}`] });
      toast.success("Meals saved successfully");
    },
    onError: () => {
      toast.error("Failed to save meals");
    },
  });

  const handleSave = () => {
    mutation.mutate(food);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-primary" />
          <CardTitle>Meal Tracker</CardTitle>
        </div>
        <CardDescription>Plan and track your nutrition for today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="breakfast">Breakfast</Label>
            <Input
              id="breakfast"
              value={food.breakfast}
              onChange={(e) => setFood({ ...food, breakfast: e.target.value })}
              placeholder="What did you have for breakfast?"
              data-testid="input-breakfast"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lunch">Lunch</Label>
            <Input
              id="lunch"
              value={food.lunch}
              onChange={(e) => setFood({ ...food, lunch: e.target.value })}
              placeholder="What did you have for lunch?"
              data-testid="input-lunch"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dinner">Dinner</Label>
            <Input
              id="dinner"
              value={food.dinner}
              onChange={(e) => setFood({ ...food, dinner: e.target.value })}
              placeholder="Enter dinner details..."
              data-testid="input-dinner"
            />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={mutation.isPending}
          className="w-full gap-2"
          data-testid="button-save-food"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Meals
        </Button>
      </CardContent>
    </Card>
  );
}
