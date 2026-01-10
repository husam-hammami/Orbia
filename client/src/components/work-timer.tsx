import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [15, 25, 45, 60];

type Status = "idle" | "running" | "paused";

export function WorkTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [status, setStatus] = useState<Status>("idle");
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === "running") {
      intervalRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setStatus("idle");
            return duration * 60;
          }
          return r - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, duration]);

  const start = () => setStatus("running");
  const pause = () => setStatus("paused");
  const resume = () => setStatus("running");
  const reset = () => {
    setStatus("idle");
    setRemaining(duration * 60);
  };

  const selectDuration = (d: number) => {
    if (status === "idle") {
      setDuration(d);
      setRemaining(d * 60);
    }
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = ((duration * 60 - remaining) / (duration * 60)) * 100;

  if (!isExpanded) {
    return (
      <div
        className="w-16 h-16 rounded-full bg-slate-900 border border-teal-500/30 flex items-center justify-center cursor-pointer hover:border-teal-400/60 transition-colors"
        onClick={() => setIsExpanded(true)}
        data-testid="work-timer-collapsed"
      >
        <svg className="absolute w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" strokeWidth="2" className="stroke-slate-700" />
          <circle
            cx="32" cy="32" r="28"
            fill="none" strokeWidth="3"
            strokeDasharray={175.93}
            strokeDashoffset={175.93 - (progress / 100) * 175.93}
            strokeLinecap="round"
            className="stroke-teal-500"
          />
        </svg>
        <span className="font-mono text-xs text-teal-400 z-10">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
    );
  }

  return (
    <div className="w-72 p-5 rounded-2xl bg-slate-900 border border-teal-500/30 shadow-xl" data-testid="work-timer-expanded">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-slate-400 font-medium">Focus Timer</span>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          data-testid="timer-close"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {DURATION_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => selectDuration(d)}
            disabled={status !== "idle"}
            className={cn(
              "w-10 h-10 rounded-full font-mono text-sm font-bold transition-all",
              duration === d
                ? "bg-teal-500 text-white"
                : status === "idle"
                ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                : "bg-slate-800/50 text-slate-600 cursor-not-allowed"
            )}
            data-testid={`duration-${d}`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="relative w-40 h-40 mx-auto mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" strokeWidth="4" className="stroke-slate-700" />
          <circle
            cx="80" cy="80" r="70"
            fill="none" strokeWidth="6"
            strokeDasharray={439.82}
            strokeDashoffset={439.82 - (progress / 100) * 439.82}
            strokeLinecap="round"
            className="stroke-teal-500"
            style={{ transition: "stroke-dashoffset 0.3s" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-4xl font-bold text-white">
            {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        {status === "idle" && (
          <button
            type="button"
            onClick={start}
            className="h-10 px-6 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-semibold flex items-center gap-2"
            data-testid="timer-start"
          >
            <Play className="w-4 h-4 fill-white" />
            Start
          </button>
        )}

        {status === "running" && (
          <button
            type="button"
            onClick={pause}
            className="h-10 px-6 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-2"
            data-testid="timer-pause"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        )}

        {status === "paused" && (
          <>
            <button
              type="button"
              onClick={resume}
              className="h-10 px-5 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-semibold flex items-center gap-2"
              data-testid="timer-resume"
            >
              <Play className="w-4 h-4 fill-white" />
              Resume
            </button>
            <button
              type="button"
              onClick={reset}
              className="h-10 px-5 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-semibold flex items-center gap-2"
              data-testid="timer-reset"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </>
        )}

        {status === "running" && (
          <button
            type="button"
            onClick={reset}
            className="h-10 px-5 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-semibold flex items-center gap-2"
            data-testid="timer-stop"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
