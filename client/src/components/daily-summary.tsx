import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDailySummary, useUpsertDailySummary } from "@/lib/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudSun, Cloud, CloudRain, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const feelings = [
  { value: "lighter", label: "Lighter than usual", icon: CloudSun },
  { value: "average", label: "About average", icon: Cloud },
  { value: "heavier", label: "Heavier than usual", icon: CloudRain },
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
      className="relative overflow-hidden border-dashed border-primary/20 bg-background/50 backdrop-blur-xl" 
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
                  "relative flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 border-border text-foreground hover:border-primary/50 hover:bg-muted"
                )}
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{feeling.label}</span>
              </motion.button>
            );
          })}
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          This helps us anchor insights against your daily experience
        </p>
      </CardContent>
    </Card>
  );
}
