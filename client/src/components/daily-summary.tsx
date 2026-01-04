import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDailySummary, useUpsertDailySummary } from "@/lib/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudSun, Cloud, CloudRain, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const feelings = [
  { 
    value: "lighter", 
    label: "Lighter than usual", 
    icon: CloudSun, 
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    selectedBg: "bg-emerald-500",
  },
  { 
    value: "average", 
    label: "About average", 
    icon: Cloud, 
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    border: "border-slate-200 dark:border-slate-800",
    selectedBg: "bg-slate-500",
  },
  { 
    value: "heavier", 
    label: "Heavier than usual", 
    icon: CloudRain, 
    color: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-200 dark:border-violet-800",
    selectedBg: "bg-violet-500",
  },
];

export function DailySummary() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: existingSummary, isLoading } = useDailySummary(today);
  const upsertMutation = useUpsertDailySummary();
  
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existingSummary?.feeling) {
      setSelectedFeeling(existingSummary.feeling);
      setSaved(true);
    }
  }, [existingSummary]);

  const handleSelect = (feeling: string) => {
    setSelectedFeeling(feeling);
    upsertMutation.mutate({ date: today, feeling }, {
      onSuccess: () => {
        setSaved(true);
        toast.success("Daily reflection saved");
      },
      onError: () => toast.error("Failed to save reflection"),
    });
  };

  if (isLoading) {
    return (
      <Card className="border-dashed" data-testid="card-daily-summary-loading">
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-primary/30" data-testid="card-daily-summary">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>End of Day Reflection</span>
          {saved && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs text-emerald-600"
            >
              <Check className="w-3.5 h-3.5" />
              Saved
            </motion.span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground font-medium">
          Overall, today felt:
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {feelings.map((feeling) => {
            const Icon = feeling.icon;
            const isSelected = selectedFeeling === feeling.value;
            const isPending = upsertMutation.isPending && selectedFeeling === feeling.value;
            
            return (
              <button
                key={feeling.value}
                onClick={() => handleSelect(feeling.value)}
                disabled={upsertMutation.isPending}
                data-testid={`button-feeling-${feeling.value}`}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                  isSelected
                    ? `${feeling.selectedBg} text-white border-transparent`
                    : `${feeling.bg} ${feeling.border} ${feeling.color} hover:border-current`
                )}
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{feeling.label}</span>
              </button>
            );
          })}
        </div>
        
        <p className="text-[10px] text-muted-foreground text-center">
          This helps us anchor insights against your daily experience
        </p>
      </CardContent>
    </Card>
  );
}
