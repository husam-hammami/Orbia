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
      <div className="flex items-center gap-0.5 px-5 py-1.5 rounded-2xl bg-gradient-to-r from-white/40 via-white/25 to-teal-50/40 backdrop-blur-xl border border-teal-300/30 shadow-[0_4px_20px_-4px_rgba(15,118,110,0.12)]">
        <span className="font-mono text-xl font-medium tracking-[0.15em] text-slate-700 tabular-nums">
          {hours}
        </span>
        <span className="font-mono text-xl font-medium text-teal-500 animate-pulse drop-shadow-[0_0_6px_rgba(20,184,166,0.5)]">:</span>
        <span className="font-mono text-xl font-medium tracking-[0.15em] text-slate-700 tabular-nums">
          {minutes}
        </span>
      </div>
    </div>
  );
}
