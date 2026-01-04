import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, Clock, Zap } from "lucide-react";
import { useMembers, useTrackerEntries } from "@/lib/api-hooks";
import { format, subHours, isAfter, parseISO, startOfHour } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimelineSegment {
  time: Date;
  member: { id: string; name: string; color: string; normalizedColor: string } | null;
  entry: any | null;
  label: string;
}

function normalizeColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
    if (max === rNorm) h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
    else if (max === gNorm) h = ((bNorm - rNorm) / d + 2) / 6;
    else h = ((rNorm - gNorm) / d + 4) / 6;
  }
  
  const targetL = Math.max(l, 0.45);
  const targetS = Math.max(s, 0.5);
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = targetL < 0.5 ? targetL * (1 + targetS) : targetL + targetS - targetL * targetS;
  const p = 2 * targetL - q;
  const rOut = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const gOut = Math.round(hue2rgb(p, q, h) * 255);
  const bOut = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  
  return `#${rOut.toString(16).padStart(2, '0')}${gOut.toString(16).padStart(2, '0')}${bOut.toString(16).padStart(2, '0')}`;
}

function buildTimelineSegments(
  entries: any[],
  members: any[],
  timeBlocks: Date[]
): TimelineSegment[] {
  if (entries.length === 0) return [];

  return timeBlocks.map(blockTime => {
    const entry = entries
      .filter(e => isAfter(parseISO(e.timestamp), subHours(blockTime, 1)) && !isAfter(parseISO(e.timestamp), blockTime))
      .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())[0];

    const lastEntry = entry || entries
      .filter(e => !isAfter(parseISO(e.timestamp), blockTime))
      .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())[0];

    const frontingMember = lastEntry ? members.find(m => m.id === lastEntry.frontingMemberId) : null;
    
    return {
      time: blockTime,
      member: frontingMember ? { 
        id: frontingMember.id, 
        name: frontingMember.name, 
        color: frontingMember.color,
        normalizedColor: normalizeColor(frontingMember.color)
      } : null,
      entry: lastEntry,
      label: format(blockTime, "HH:mm")
    };
  });
}

export function HeadspaceMap() {
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: entries = [], isLoading: entriesLoading } = useTrackerEntries();

  const now = new Date();
  const timeBlocks = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const time = subHours(startOfHour(now), 23 - i);
      return time;
    });
  }, []);

  const timelineData = useMemo(() => {
    return buildTimelineSegments(entries, members, timeBlocks);
  }, [entries, members, timeBlocks]);

  const membersWithHours = useMemo(() => {
    return members.map(member => ({
      ...member,
      normalizedColor: normalizeColor(member.color),
      hours: timelineData.filter(d => d.member?.id === member.id).length
    }));
  }, [members, timelineData]);

  if (membersLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="headspace-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 animate-pulse" />
            <Clock className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
          </div>
          <span className="text-sm font-medium text-muted-foreground tracking-wide">Syncing timeline...</span>
        </div>
      </div>
    );
  }

  if (timelineData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="headspace-empty">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center border border-indigo-500/20">
          <Activity className="w-8 h-8 text-indigo-400/50" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground/70">No presence data yet</p>
          <p className="text-xs text-muted-foreground">Log your first entry to visualize system activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2" data-testid="headspace-timeline">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30" />
            <span className="text-xs font-semibold tracking-wide text-foreground/80 uppercase">Presence Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-xs font-semibold tracking-wide text-foreground/80 uppercase">Transitions</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-600/30">
          <Clock className="w-3 h-3 text-indigo-400" />
          <span className="text-[11px] font-mono font-medium text-slate-300">24h window</span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-fuchsia-500/5 rounded-2xl blur-xl" />
        
        <div className="relative rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-950/80 backdrop-blur-sm p-4 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex h-20 w-full gap-0.5 items-stretch relative z-10">
            <TooltipProvider delayDuration={0}>
              {timelineData.map((slot, i) => {
                const isTransition = i > 0 && slot.member?.id !== timelineData[i-1].member?.id;
                const isNow = i === timelineData.length - 1;
                
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div 
                        className={cn(
                          "flex-1 relative cursor-pointer group/slot",
                          isTransition && "ml-1"
                        )}
                        data-testid={`timeline-slot-${i}`}
                      >
                        {isTransition && (
                          <div className="absolute -left-1 top-0 h-full w-0.5 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-400 shadow-lg shadow-amber-500/50 z-20" />
                        )}
                        
                        <motion.div
                          initial={{ opacity: 0, scaleY: 0.3 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{ delay: i * 0.012, type: "spring", stiffness: 200 }}
                          className={cn(
                            "w-full h-full rounded-sm relative overflow-hidden transition-all duration-200",
                            "group-hover/slot:scale-y-110 group-hover/slot:brightness-125",
                            slot.member ? "" : "bg-slate-800/40"
                          )}
                          style={slot.member ? {
                            background: `linear-gradient(180deg, ${slot.member.normalizedColor}dd 0%, ${slot.member.normalizedColor}99 50%, ${slot.member.normalizedColor}66 100%)`,
                            boxShadow: `0 0 12px ${slot.member.normalizedColor}40, inset 0 1px 0 ${slot.member.normalizedColor}88`
                          } : undefined}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/10 pointer-events-none" />
                          
                          {isNow && (
                            <motion.div 
                              className="absolute inset-0 bg-white/20"
                              animate={{ opacity: [0.2, 0.4, 0.2] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </motion.div>
                      </div>
                    </TooltipTrigger>
                    
                    <TooltipContent 
                      side="top" 
                      className="p-0 overflow-hidden border-0 shadow-2xl shadow-black/50"
                    >
                      <div className="bg-gradient-to-b from-slate-800 to-slate-900 backdrop-blur-xl border border-slate-700/50 rounded-lg overflow-hidden min-w-[200px]">
                        <div 
                          className="px-4 py-2 flex items-center justify-between gap-4"
                          style={slot.member ? {
                            background: `linear-gradient(90deg, ${slot.member.normalizedColor}30 0%, transparent 100%)`
                          } : undefined}
                        >
                          <span className="text-sm font-mono font-bold text-white">{slot.label}</span>
                          {slot.member && (
                            <div 
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-lg"
                              style={{ 
                                backgroundColor: slot.member.normalizedColor,
                                boxShadow: `0 0 8px ${slot.member.normalizedColor}60`
                              }}
                            >
                              {slot.member.name}
                            </div>
                          )}
                        </div>
                        
                        <div className="px-4 py-3 space-y-2 border-t border-slate-700/30">
                          {slot.entry ? (
                            <>
                              {slot.entry.notes && (
                                <p className="text-xs text-slate-400 italic line-clamp-2">
                                  "{slot.entry.notes}"
                                </p>
                              )}
                              <div className="flex gap-4 pt-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span className="text-[11px] font-medium text-slate-300">Mood {slot.entry.mood}/10</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  <span className="text-[11px] font-medium text-slate-300">Stress {slot.entry.stress}%</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-slate-500 italic">No data recorded</p>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>

          <div className="flex justify-between mt-3 px-1 relative z-10">
            <span className="text-[10px] font-mono text-slate-500">{format(subHours(now, 24), "HH:mm")}</span>
            <span className="text-[10px] font-mono text-slate-500">{format(subHours(now, 18), "HH:mm")}</span>
            <span className="text-[10px] font-mono text-slate-500">{format(subHours(now, 12), "HH:mm")}</span>
            <span className="text-[10px] font-mono text-slate-500">{format(subHours(now, 6), "HH:mm")}</span>
            <span className="text-[10px] font-mono font-bold text-indigo-400">Now</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {membersWithHours.map(member => (
          <motion.div 
            key={member.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group"
            data-testid={`member-presence-${member.id}`}
          >
            <div 
              className="absolute inset-0 rounded-xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity"
              style={{ backgroundColor: member.normalizedColor }}
            />
            
            <div 
              className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur-sm border transition-all duration-200 group-hover:scale-105"
              style={{ 
                borderColor: `${member.normalizedColor}40`,
                boxShadow: `inset 0 1px 0 ${member.normalizedColor}20`
              }}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${member.normalizedColor} 0%, ${member.normalizedColor}cc 100%)`,
                  boxShadow: `0 4px 12px ${member.normalizedColor}40`
                }}
              >
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  {member.name.substring(0, 2)}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200 leading-tight">{member.name}</span>
                <span className="text-[10px] font-mono text-slate-500">{member.hours}h presence</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
