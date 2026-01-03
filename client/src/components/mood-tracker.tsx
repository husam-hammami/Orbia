import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Smile, Frown, Meh, Zap, Battery, BatteryLow, BatteryMedium, BatteryFull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function MoodTracker() {
  const [mood, setMood] = useState<string | null>(null);
  const [motivation, setMotivation] = useState([5]);

  const moods = [
    { value: "terrible", icon: Frown, color: "text-red-500", bg: "bg-red-100" },
    { value: "bad", icon: Meh, color: "text-orange-500", bg: "bg-orange-100" },
    { value: "neutral", icon: Meh, color: "text-yellow-500", bg: "bg-yellow-100" },
    { value: "good", icon: Smile, color: "text-green-500", bg: "bg-green-100" },
    { value: "excellent", icon: Zap, color: "text-blue-500", bg: "bg-blue-100" },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <h3 className="font-display font-semibold text-lg mb-4">Daily Check-in</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Mood Section */}
        <div>
          <label className="text-sm text-muted-foreground font-medium mb-3 block">How are you feeling today?</label>
          <div className="flex justify-between gap-2">
            {moods.map((m) => {
              const Icon = m.icon;
              const isSelected = mood === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl transition-all w-full",
                    isSelected 
                      ? `${m.bg} ring-2 ring-offset-2 ring-${m.color.split('-')[1]}-500` 
                      : "hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("w-6 h-6 transition-transform", isSelected ? `scale-110 ${m.color}` : "text-muted-foreground")} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Motivation Section */}
        <div>
           <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-muted-foreground font-medium">Motivation Level</label>
              <span className="text-sm font-mono font-bold">{motivation[0]}/10</span>
           </div>
           
           <div className="px-1 py-4">
              <Slider
                value={motivation}
                onValueChange={setMotivation}
                max={10}
                step={1}
                className="cursor-pointer"
              />
           </div>
           
           <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span className="flex items-center gap-1"><BatteryLow className="w-3 h-3" /> Low</span>
              <span className="flex items-center gap-1"><BatteryMedium className="w-3 h-3" /> Medium</span>
              <span className="flex items-center gap-1"><BatteryFull className="w-3 h-3" /> High</span>
           </div>
        </div>
      </div>
    </div>
  );
}
