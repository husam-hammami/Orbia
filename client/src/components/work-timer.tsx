import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, X, Volume2, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [15, 25, 45, 60];

type Status = "idle" | "running" | "paused";
type SoundType = "celestial" | "zen" | "crystal" | "aurora" | "nebula";

const SOUND_OPTIONS: { id: SoundType; name: string; icon: string }[] = [
  { id: "celestial", name: "Celestial Rise", icon: "✨" },
  { id: "zen", name: "Zen Bowl", icon: "🔔" },
  { id: "crystal", name: "Crystal Chime", icon: "💎" },
  { id: "aurora", name: "Aurora Waves", icon: "🌊" },
  { id: "nebula", name: "Nebula Pulse", icon: "🌌" },
];

function playSound(type: SoundType) {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playTone = (
    frequency: number, 
    startTime: number, 
    duration: number, 
    volume: number,
    waveType: OscillatorType = "sine"
  ) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
    oscillator.type = waveType;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + startTime + duration);
    
    oscillator.start(audioContext.currentTime + startTime);
    oscillator.stop(audioContext.currentTime + startTime + duration);
  };

  switch (type) {
    case "celestial":
      playTone(523.25, 0, 0.4, 0.12);
      playTone(659.25, 0.15, 0.4, 0.10);
      playTone(783.99, 0.3, 0.5, 0.08);
      playTone(1046.50, 0.45, 0.8, 0.06);
      break;
      
    case "zen":
      playTone(220, 0, 1.5, 0.08);
      playTone(330, 0.1, 1.4, 0.06);
      playTone(440, 0.2, 1.3, 0.05);
      playTone(550, 0.3, 1.2, 0.04);
      break;
      
    case "crystal":
      playTone(1318.51, 0, 0.3, 0.08, "triangle");
      playTone(1567.98, 0.1, 0.3, 0.07, "triangle");
      playTone(1975.53, 0.2, 0.4, 0.06, "triangle");
      playTone(2637.02, 0.35, 0.6, 0.05, "triangle");
      break;
      
    case "aurora":
      playTone(196, 0, 1.0, 0.10);
      playTone(261.63, 0.2, 0.9, 0.08);
      playTone(329.63, 0.5, 0.8, 0.07);
      playTone(392, 0.8, 1.0, 0.06);
      playTone(523.25, 1.1, 1.2, 0.05);
      break;
      
    case "nebula":
      playTone(110, 0, 0.8, 0.10);
      playTone(146.83, 0.15, 0.7, 0.08);
      playTone(174.61, 0.3, 0.6, 0.08);
      playTone(220, 0.45, 0.8, 0.07);
      playTone(293.66, 0.6, 1.0, 0.06);
      playTone(349.23, 0.8, 1.2, 0.05);
      break;
  }
}

export function WorkTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [status, setStatus] = useState<Status>("idle");
  const [selectedSound, setSelectedSound] = useState<SoundType>(() => {
    const stored = localStorage.getItem("orbya-timer-sound");
    return (stored as SoundType) || "celestial";
  });
  const intervalRef = useRef<number | null>(null);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("orbya-timer-sound", selectedSound);
  }, [selectedSound]);

  useEffect(() => {
    if (status === "running") {
      hasPlayedRef.current = false;
      intervalRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setStatus("idle");
            if (!hasPlayedRef.current) {
              hasPlayedRef.current = true;
              playSound(selectedSound);
            }
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
  }, [status, duration, selectedSound]);

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

  const testSound = () => {
    playSound(selectedSound);
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
  const currentSoundOption = SOUND_OPTIONS.find(s => s.id === selectedSound);

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-colors border",
              showSettings 
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" 
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 border-slate-600/50"
            )}
            data-testid="timer-settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="w-7 h-7 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-600/50"
            data-testid="timer-close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="relative space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-300 font-medium">Notification Sound</span>
              <button
                type="button"
                onClick={testSound}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors border border-cyan-500/30"
                data-testid="test-sound"
              >
                <Volume2 className="w-3 h-3" />
                Test
              </button>
            </div>
            
            <div className="space-y-2">
              {SOUND_OPTIONS.map((sound) => (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => setSelectedSound(sound.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                    selectedSound === sound.id
                      ? "bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/40"
                      : "bg-slate-800/50 border border-slate-700/50 hover:border-slate-600"
                  )}
                  data-testid={`sound-${sound.id}`}
                >
                  <span className="text-lg">{sound.icon}</span>
                  <span className={cn(
                    "text-sm font-medium",
                    selectedSound === sound.id ? "text-cyan-300" : "text-slate-400"
                  )}>
                    {sound.name}
                  </span>
                  {selectedSound === sound.id && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 8px rgba(6,182,212,0.8)" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Back to Timer
          </button>
        </div>
      ) : (
        <>
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
                <span className="relative text-xs text-white/60 uppercase tracking-widest mt-1">
                  {status === "running" ? "focusing" : status === "paused" ? "paused" : "ready"}
                </span>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center gap-3 mb-4">
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

          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <span>{currentSoundOption?.icon}</span>
              <span>{currentSoundOption?.name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
