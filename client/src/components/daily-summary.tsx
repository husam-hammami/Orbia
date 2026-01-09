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
    selectedBg: "bg-gradient-to-br from-emerald-400 to-cyan-500",
    glowColor: "rgba(16, 185, 129, 0.5)",
  },
  { 
    value: "average", 
    label: "About average", 
    icon: Cloud, 
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    border: "border-slate-200 dark:border-slate-800",
    selectedBg: "bg-gradient-to-br from-slate-500 to-indigo-600",
    glowColor: "rgba(99, 102, 241, 0.4)",
  },
  { 
    value: "heavier", 
    label: "Heavier than usual", 
    icon: CloudRain, 
    color: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-200 dark:border-violet-800",
    selectedBg: "bg-gradient-to-br from-violet-400 to-purple-500",
    glowColor: "rgba(139, 92, 246, 0.5)",
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
    <Card 
      className="relative overflow-hidden border-dashed border-primary/30 bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 backdrop-blur-sm" 
      data-testid="card-daily-summary"
      style={{
        boxShadow: saved ? '0 0 30px -10px rgba(6, 182, 212, 0.3)' : undefined
      }}
    >
      {saved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-indigo-400/5 pointer-events-none"
        />
      )}
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>End of Day Reflection</span>
          {saved && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400"
              style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.4))' }}
            >
              <Check className="w-3.5 h-3.5" />
              Saved
            </motion.span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 relative z-10">
        <p className="text-sm text-foreground font-medium">
          Overall, today felt:
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {feelings.map((feeling) => {
            const Icon = feeling.icon;
            const isSelected = selectedFeeling === feeling.value;
            const isPending = upsertMutation.isPending && selectedFeeling === feeling.value;
            
            return (
              <motion.button
                key={feeling.value}
                onClick={() => handleSelect(feeling.value)}
                disabled={upsertMutation.isPending}
                data-testid={`button-feeling-${feeling.value}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-300",
                  isSelected
                    ? `${feeling.selectedBg} text-white border-transparent`
                    : `${feeling.bg} ${feeling.border} ${feeling.color} hover:border-current`
                )}
                style={{
                  boxShadow: isSelected ? `0 0 25px -5px ${feeling.glowColor}` : undefined
                }}
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 rounded-xl blur-xl opacity-30"
                      style={{ backgroundColor: feeling.glowColor }}
                    />
                  )}
                </AnimatePresence>
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                ) : (
                  <Icon className="w-5 h-5 relative z-10" style={{ filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : undefined }} />
                )}
                <span className="text-sm font-medium relative z-10">{feeling.label}</span>
              </motion.button>
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
