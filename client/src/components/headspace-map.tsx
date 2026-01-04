import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, Clock } from "lucide-react";
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
  member: { id: string; name: string; color: string } | null;
  entry: any | null;
  label: string;
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
      member: frontingMember ? { id: frontingMember.id, name: frontingMember.name, color: frontingMember.color } : null,
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

  if (membersLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground" data-testid="headspace-loading">
        <Clock className="w-4 h-4 mr-2 animate-spin" />
        Generating timeline...
      </div>
    );
  }

  if (timelineData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2" data-testid="headspace-empty">
        <Activity className="w-8 h-8 opacity-30" />
        <p className="text-sm">No tracker entries yet</p>
        <p className="text-xs">Log your first entry to see presence over time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4" data-testid="headspace-timeline">
      <div className="flex items-center justify-between px-2 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-indigo-500/20 border border-indigo-500/40" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Presence History</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Transition Events</span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
          Last 24 Hours
        </div>
      </div>

      <div className="relative group">
        <div className="flex h-16 w-full gap-0.5 items-stretch bg-muted/20 rounded-lg overflow-hidden border border-border/50 p-1">
          <TooltipProvider delayDuration={0}>
            {timelineData.map((slot, i) => {
              const isTransition = i > 0 && slot.member?.id !== timelineData[i-1].member?.id;
              
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className="flex-1 relative cursor-help" data-testid={`timeline-slot-${i}`}>
                      <motion.div
                        initial={{ opacity: 0, scaleY: 0.5 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: i * 0.015 }}
                        className={cn(
                          "w-full h-full transition-all duration-300 rounded-sm",
                          slot.member ? "opacity-100" : "opacity-10"
                        )}
                        style={{ 
                          backgroundColor: slot.member?.color || "var(--muted)",
                          borderLeft: isTransition ? "2px solid rgba(255,255,255,0.4)" : "none"
                        }}
                      />
                      {isTransition && (
                        <div className="absolute top-0 left-0 w-0.5 h-full bg-white/30 z-10" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="p-3 max-w-[220px] space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-mono font-bold">{slot.label}</span>
                      {slot.member && (
                        <span 
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-white"
                          style={{ backgroundColor: slot.member.color }}
                        >
                          {slot.member.name}
                        </span>
                      )}
                    </div>
                    {slot.entry ? (
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground line-clamp-2 italic">
                          "{slot.entry.notes || "No notes logged"}"
                        </div>
                        <div className="grid grid-cols-2 gap-1 pt-1 border-t border-border/50">
                          <div className="text-[9px]">Mood: {slot.entry.mood}/10</div>
                          <div className="text-[9px]">Stress: {slot.entry.stress}%</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground italic">No data recorded</div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        <div className="flex justify-between mt-2 px-1 text-[9px] font-mono text-muted-foreground">
          <span>{format(subHours(now, 24), "HH:mm")}</span>
          <span>{format(subHours(now, 12), "HH:mm")}</span>
          <span>Now</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-4">
        {members.map(member => {
          const hours = timelineData.filter(d => d.member?.id === member.id).length;
          return (
            <div 
              key={member.id} 
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50"
              data-testid={`member-presence-${member.id}`}
            >
              <div 
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center bg-background shrink-0"
                style={{ borderColor: member.color }}
              >
                <div className="text-[8px] font-bold" style={{ color: member.color }}>
                  {member.name.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold">{member.name}</span>
                <span className="text-xs text-muted-foreground">{hours}h</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
