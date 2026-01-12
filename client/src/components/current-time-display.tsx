import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function CurrentTimeDisplay({ className }: { className?: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = format(time, "HH");
  const minutes = format(time, "mm");

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center gap-0.5 px-5 py-1.5 rounded-2xl bg-gradient-to-r from-card/60 via-card/40 to-primary/10 backdrop-blur-xl border border-primary/30 shadow-lg">
        <span className="font-mono text-xl font-medium tracking-[0.15em] text-foreground tabular-nums">
          {hours}
        </span>
        <span className="font-mono text-xl font-medium text-primary animate-pulse">:</span>
        <span className="font-mono text-xl font-medium tracking-[0.15em] text-foreground tabular-nums">
          {minutes}
        </span>
      </div>
    </div>
  );
}
