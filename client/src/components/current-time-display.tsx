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
  const seconds = format(time, "ss");

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center gap-1 px-4 py-2 rounded-full bg-gradient-to-r from-slate-50/80 to-white/60 backdrop-blur-sm border border-slate-200/50 shadow-sm">
        <span className="font-mono text-2xl font-light tracking-tight text-slate-700 tabular-nums">
          {hours}
        </span>
        <span className="font-mono text-2xl font-light text-teal-500 animate-pulse">:</span>
        <span className="font-mono text-2xl font-light tracking-tight text-slate-700 tabular-nums">
          {minutes}
        </span>
        <span className="text-xs text-slate-400 font-mono ml-1 tabular-nums self-end mb-1">
          {seconds}
        </span>
      </div>
    </div>
  );
}
