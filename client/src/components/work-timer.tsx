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
  const progressAngle = (progress / 100) * 360 - 90;

  const getStatusColor = () => {
    if (status === "running") return { stroke: "#14b8a6", glow: "rgba(20, 184, 166, 0.6)" };
    if (status === "paused") return { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.6)" };
    return { stroke: "#0891b2", glow: "rgba(8, 145, 178, 0.4)" };
  };

  const colors = getStatusColor();

  if (!isExpanded) {
    return (
      <div
        className="relative w-20 h-20 cursor-pointer group"
        onClick={() => setIsExpanded(true)}
        data-testid="work-timer-collapsed"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]" />
        
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" fill="none" strokeWidth="1" className="stroke-cyan-900/50" strokeDasharray="2 4" />
          <circle
            cx="40" cy="40" r="35"
            fill="none" strokeWidth="3"
            strokeDasharray={219.91}
            strokeDashoffset={219.91 - (progress / 100) * 219.91}
            strokeLinecap="round"
            stroke={colors.stroke}
            style={{ filter: `drop-shadow(0 0 6px ${colors.glow})`, transition: "stroke-dashoffset 0.3s" }}
          />
        </svg>

        {progress > 0 && (
          <div
            className="absolute w-2 h-2 rounded-full bg-cyan-400"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) rotate(${progressAngle}deg) translateY(-35px)`,
              boxShadow: `0 0 8px ${colors.glow}`,
            }}
          />
        )}

        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-cyan-500/20">
          <span className="font-mono text-sm font-bold text-cyan-400 tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>

        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-500/5" />
      </div>
    );
  }

  return (
    <div 
      className="relative w-80 p-6 rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 50%, rgba(15,23,42,0.98) 100%)",
        boxShadow: "0 0 60px -15px rgba(6,182,212,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        border: "1px solid rgba(6,182,212,0.2)",
      }}
      data-testid="work-timer-expanded"
    >
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(circle at 50% 30%, rgba(20,184,166,0.15) 0%, transparent 60%), radial-gradient(circle at 30% 70%, rgba(6,182,212,0.1) 0%, transparent 50%)",
        }}
      />

      <div className="relative flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow: "0 0 8px rgba(6,182,212,0.8)" }} />
          <span className="text-xs text-cyan-400/80 font-medium tracking-wider uppercase">Orbital Focus</span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="w-7 h-7 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-600/50"
          data-testid="timer-close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative mb-6">
        <div className="relative w-52 h-52 mx-auto">
          
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 208 208">
            <circle cx="104" cy="104" r="100" fill="none" strokeWidth="0.5" className="stroke-cyan-500/10" strokeDasharray="2 6" />
            <circle cx="104" cy="104" r="85" fill="none" strokeWidth="0.3" className="stroke-cyan-500/5" strokeDasharray="1 8" />
          </svg>

          {DURATION_OPTIONS.map((d, i) => {
            const angle = -90 + (i * 90);
            const x = Math.cos((angle * Math.PI) / 180) * 88;
            const y = Math.sin((angle * Math.PI) / 180) * 88;
            const isSelected = duration === d;
            const canSelect = status === "idle";
            
            return (
              <button
                key={d}
                type="button"
                onClick={() => selectDuration(d)}
                disabled={!canSelect}
                className={cn(
                  "absolute w-11 h-11 rounded-full flex items-center justify-center",
                  "font-mono text-sm font-bold transition-all duration-200",
                  "border-2",
                  isSelected
                    ? "bg-gradient-to-br from-teal-400 to-cyan-500 text-white border-teal-300/60"
                    : canSelect
                    ? "bg-slate-800/90 text-slate-400 border-slate-600/40 hover:border-cyan-500/60 hover:text-cyan-300 hover:scale-110"
                    : "bg-slate-800/50 text-slate-600 border-slate-700/40 cursor-not-allowed"
                )}
                style={{
                  left: `calc(50% + ${x}px - 22px)`,
                  top: `calc(50% + ${y}px - 22px)`,
                  boxShadow: isSelected ? "0 0 25px rgba(20,184,166,0.6)" : undefined,
                }}
                data-testid={`duration-${d}`}
              >
                {d}
              </button>
            );
          })}

          <svg className="absolute inset-[26px] w-[156px] h-[156px] -rotate-90" viewBox="0 0 156 156">
            <circle cx="78" cy="78" r="68" fill="none" strokeWidth="1" className="stroke-slate-700/50" strokeDasharray="4 8" />
            <circle
              cx="78" cy="78" r="68"
              fill="none" strokeWidth="5"
              strokeDasharray={427.26}
              strokeDashoffset={427.26 - (progress / 100) * 427.26}
              strokeLinecap="round"
              stroke={colors.stroke}
              style={{ filter: `drop-shadow(0 0 12px ${colors.glow})`, transition: "stroke-dashoffset 0.3s" }}
            />
          </svg>

          {progress > 0 && (
            <div
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: "50%",
                top: "50%",
                background: `linear-gradient(135deg, ${colors.stroke}, white)`,
                transform: `translate(-50%, -50%) rotate(${progressAngle}deg) translateY(-68px)`,
                boxShadow: `0 0 12px ${colors.glow}, 0 0 4px white`,
              }}
            />
          )}

          <div
            className="absolute inset-[38px] w-[132px] h-[132px] rounded-full flex flex-col items-center justify-center"
            style={{
              background: status === "running" 
                ? "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #06b6d4 100%)"
                : status === "paused"
                ? "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)"
                : "linear-gradient(135deg, #0e7490 0%, #0891b2 50%, #06b6d4 100%)",
              boxShadow: `0 0 40px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.1)`,
              border: "2px solid rgba(255,255,255,0.2)",
            }}
          >
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            <span className="relative font-mono text-3xl font-bold text-white tabular-nums drop-shadow-lg">
              {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
            </span>
            <span className="relative text-[10px] text-white/60 uppercase tracking-widest mt-1">
              {status === "running" ? "focusing" : status === "paused" ? "paused" : "ready"}
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex justify-center gap-3">
        {status === "idle" && (
          <button
            type="button"
            onClick={start}
            className="h-11 px-7 rounded-full font-semibold flex items-center gap-2 text-white transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
              boxShadow: "0 0 25px rgba(20,184,166,0.5)",
            }}
            data-testid="timer-start"
          >
            <Play className="w-4 h-4 fill-white" />
            Launch
          </button>
        )}

        {status === "running" && (
          <>
            <button
              type="button"
              onClick={pause}
              className="h-11 px-5 rounded-full font-semibold flex items-center gap-2 text-amber-400 border-2 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 transition-all"
              data-testid="timer-pause"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
            <button
              type="button"
              onClick={reset}
              className="h-11 px-5 rounded-full font-semibold flex items-center gap-2 text-slate-300 border-2 border-slate-500/50 bg-slate-700/50 hover:bg-slate-600/50 transition-all"
              data-testid="timer-stop"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </>
        )}

        {status === "paused" && (
          <>
            <button
              type="button"
              onClick={resume}
              className="h-11 px-5 rounded-full font-semibold flex items-center gap-2 text-white transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
                boxShadow: "0 0 20px rgba(20,184,166,0.4)",
              }}
              data-testid="timer-resume"
            >
              <Play className="w-4 h-4 fill-white" />
              Resume
            </button>
            <button
              type="button"
              onClick={reset}
              className="h-11 px-5 rounded-full font-semibold flex items-center gap-2 text-slate-300 border-2 border-slate-500/50 bg-slate-700/50 hover:bg-slate-600/50 transition-all"
              data-testid="timer-reset"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}
