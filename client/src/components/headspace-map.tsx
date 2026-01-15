import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, Clock, Zap, Calendar, BarChart3, TrendingUp, Users, ChevronLeft, ChevronRight, Sparkles, Waves, Layers } from "lucide-react";
import { useMembers, useTrackerEntries } from "@/lib/api-hooks";
import { 
  format, 
  subHours, 
  subDays,
  isAfter, 
  parseISO, 
  startOfHour, 
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameDay,
  differenceInMinutes,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  getDay,
  getWeek,
  getYear
} from "date-fns";
import { Grid3x3 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts";

interface TimelineSegment {
  time: Date;
  member: { id: string; name: string; color: string; normalizedColor: string } | null;
  entry: any | null;
  label: string;
}

interface DailyPresence {
  date: Date;
  dateStr: string;
  dayLabel: string;
  members: { [memberId: string]: number };
  totalMinutes: number;
  dominantMember: { id: string; name: string; color: string } | null;
  transitionCount: number;
  entryCount: number;
}

interface MemberStats {
  id: string;
  name: string;
  color: string;
  normalizedColor: string;
  totalMinutes: number;
  totalHours: number;
  avgPerDay: number;
  daysActive: number;
  percentOfTotal: number;
}

function normalizeColor(hex: string): string {
  if (!hex || hex.length < 7) return "#6366f1";
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

function computeDailyPresence(
  entries: any[],
  members: any[],
  days: Date[]
): DailyPresence[] {
  return days.map(day => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    
    const dayEntries = entries
      .filter(e => {
        const ts = parseISO(e.timestamp);
        return ts >= dayStart && ts <= dayEnd;
      })
      .sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());
    
    const memberMinutes: { [id: string]: number } = {};
    let transitionCount = 0;
    let prevMemberId: string | null = null;
    
    for (let i = 0; i < dayEntries.length; i++) {
      const entry = dayEntries[i];
      const memberId = entry.frontingMemberId;
      if (!memberId) continue;
      
      const entryTime = parseISO(entry.timestamp);
      const nextEntry = dayEntries[i + 1];
      const endTime = nextEntry ? parseISO(nextEntry.timestamp) : dayEnd;
      
      const mins = Math.min(differenceInMinutes(endTime, entryTime), 24 * 60);
      memberMinutes[memberId] = (memberMinutes[memberId] || 0) + Math.max(0, mins);
      
      if (prevMemberId && prevMemberId !== memberId) {
        transitionCount++;
      }
      prevMemberId = memberId;
    }
    
    const totalMinutes = Object.values(memberMinutes).reduce((a, b) => a + b, 0);
    
    let dominantMember = null;
    let maxMins = 0;
    for (const [id, mins] of Object.entries(memberMinutes)) {
      if (mins > maxMins) {
        maxMins = mins;
        const m = members.find(m => m.id === id);
        if (m) {
          dominantMember = { id: m.id, name: m.name, color: normalizeColor(m.color) };
        }
      }
    }
    
    return {
      date: day,
      dateStr: format(day, "yyyy-MM-dd"),
      dayLabel: format(day, "EEE"),
      members: memberMinutes,
      totalMinutes,
      dominantMember,
      transitionCount,
      entryCount: dayEntries.length
    };
  });
}

function build24hTimeline(
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
      label: format(blockTime, "h:mm a")
    };
  });
}

export function HeadspaceMap() {
  const [activeView, setActiveView] = useState("alltime");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: entries = [], isLoading: entriesLoading } = useTrackerEntries(2000);

  const now = new Date();
  
  const currentWeekStart = useMemo(() => {
    return startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
  }, [weekOffset]);
  
  const currentWeekEnd = useMemo(() => {
    return endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  }, [currentWeekStart]);
  
  const currentMonthStart = useMemo(() => {
    return startOfMonth(addMonths(now, monthOffset));
  }, [monthOffset]);
  
  const currentMonthEnd = useMemo(() => {
    return endOfMonth(currentMonthStart);
  }, [currentMonthStart]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
  }, [currentWeekStart, currentWeekEnd]);
  
  const monthDays = useMemo(() => {
    return eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });
  }, [currentMonthStart, currentMonthEnd]);

  const last30Days = useMemo(() => {
    return eachDayOfInterval({ start: subDays(now, 29), end: now });
  }, []);

  const weeklyPresence = useMemo(() => {
    return computeDailyPresence(entries, members, weekDays);
  }, [entries, members, weekDays]);
  
  const monthlyPresence = useMemo(() => {
    return computeDailyPresence(entries, members, monthDays);
  }, [entries, members, monthDays]);
  
  const last30Presence = useMemo(() => {
    return computeDailyPresence(entries, members, last30Days);
  }, [entries, members, last30Days]);

  const memberStats: MemberStats[] = useMemo(() => {
    const stats: { [id: string]: { mins: number; days: Set<string> } } = {};
    let grandTotal = 0;
    
    last30Presence.forEach(day => {
      Object.entries(day.members).forEach(([id, mins]) => {
        if (!stats[id]) stats[id] = { mins: 0, days: new Set() };
        stats[id].mins += mins;
        stats[id].days.add(day.dateStr);
        grandTotal += mins;
      });
    });
    
    return members.map(m => {
      const s = stats[m.id] || { mins: 0, days: new Set() };
      return {
        id: m.id,
        name: m.name,
        color: m.color,
        normalizedColor: normalizeColor(m.color),
        totalMinutes: s.mins,
        totalHours: Math.round(s.mins / 60 * 10) / 10,
        avgPerDay: s.days.size > 0 ? Math.round(s.mins / s.days.size / 60 * 10) / 10 : 0,
        daysActive: s.days.size,
        percentOfTotal: grandTotal > 0 ? Math.round(s.mins / grandTotal * 100) : 0
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [members, last30Presence]);

  const summaryStats = useMemo(() => {
    const totalTransitions = last30Presence.reduce((a, d) => a + d.transitionCount, 0);
    const daysWithEntries = last30Presence.filter(d => d.entryCount > 0).length;
    const avgTransitionsPerDay = daysWithEntries > 0 
      ? Math.round(totalTransitions / daysWithEntries * 10) / 10
      : 0;
    
    const topMember = memberStats[0];
    const daysWithData = last30Presence.filter(d => d.entryCount > 0).length;
    
    return {
      totalTransitions,
      avgTransitionsPerDay,
      topMember,
      daysWithData,
      totalEntries: entries.length
    };
  }, [last30Presence, memberStats, entries]);

  const weeklyChartData = useMemo(() => {
    return weeklyPresence.map(day => {
      const data: any = { day: format(day.date, "EEE"), date: format(day.date, "MMM d") };
      members.forEach(m => {
        const mins = day.members[m.id] || 0;
        data[m.name] = Math.round(mins / 60 * 10) / 10;
      });
      return data;
    });
  }, [weeklyPresence, members]);

  const trendChartData = useMemo(() => {
    return last30Presence.map(day => {
      const data: any = { date: format(day.date, "MMM d") };
      members.forEach(m => {
        const mins = day.members[m.id] || 0;
        data[m.name] = Math.round(mins / 60 * 10) / 10;
      });
      return data;
    });
  }, [last30Presence, members]);

  const allTimePresence = useMemo(() => {
    if (entries.length === 0) return [];
    
    const sortedEntries = [...entries].sort((a, b) => {
      const aDate = typeof a.timestamp === 'string' ? parseISO(a.timestamp) : a.timestamp;
      const bDate = typeof b.timestamp === 'string' ? parseISO(b.timestamp) : b.timestamp;
      return aDate.getTime() - bDate.getTime();
    });
    const firstEntry = sortedEntries[0];
    const firstTimestamp = typeof firstEntry.timestamp === 'string' ? parseISO(firstEntry.timestamp) : firstEntry.timestamp;
    const firstDate = startOfDay(firstTimestamp);
    const allDays = eachDayOfInterval({ start: firstDate, end: now });
    
    return computeDailyPresence(entries, members, allDays);
  }, [entries, members]);

  const allTimeWeeks = useMemo(() => {
    if (allTimePresence.length === 0) return [];
    
    const weeks: { weekStart: Date; days: DailyPresence[] }[] = [];
    let currentWeek: DailyPresence[] = [];
    let currentWeekStart: Date | null = null;
    
    allTimePresence.forEach(day => {
      const weekStart = startOfWeek(day.date, { weekStartsOn: 1 });
      
      if (!currentWeekStart || weekStart.getTime() !== currentWeekStart.getTime()) {
        if (currentWeek.length > 0) {
          weeks.push({ weekStart: currentWeekStart!, days: currentWeek });
        }
        currentWeek = [];
        currentWeekStart = weekStart;
      }
      currentWeek.push(day);
    });
    
    if (currentWeek.length > 0 && currentWeekStart) {
      weeks.push({ weekStart: currentWeekStart, days: currentWeek });
    }
    
    return weeks;
  }, [allTimePresence]);

  const timeBlocks = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const time = subHours(startOfHour(now), 23 - i);
      return time;
    });
  }, []);

  const timelineData = useMemo(() => {
    return build24hTimeline(entries, members, timeBlocks);
  }, [entries, members, timeBlocks]);

  if (membersLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="headspace-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 animate-pulse" />
            <Clock className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
          </div>
          <span className="text-sm font-medium text-muted-foreground tracking-wide">Loading presence data...</span>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="headspace-empty">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center border border-indigo-500/20">
          <Activity className="w-8 h-8 text-indigo-400/50" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground/70">No presence data yet</p>
          <p className="text-xs text-muted-foreground">Log entries with active state to visualize activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2" data-testid="headspace-timeline">
      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <TabsList className="bg-white/90 border border-slate-200 shadow-sm p-1 rounded-xl">
          <TabsTrigger 
            value="alltime" 
            className="gap-2 text-xs rounded-lg transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-violet-600 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700" 
            data-testid="view-alltime"
          >
            <Grid3x3 className="w-3.5 h-3.5" /> All Time
          </TabsTrigger>
          <TabsTrigger 
            value="weekly" 
            className="gap-2 text-xs rounded-lg transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700" 
            data-testid="view-weekly"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Weekly
          </TabsTrigger>
          <TabsTrigger 
            value="calendar" 
            className="gap-2 text-xs rounded-lg transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700" 
            data-testid="view-calendar"
          >
            <Calendar className="w-3.5 h-3.5" /> Monthly
          </TabsTrigger>
          <TabsTrigger 
            value="trends" 
            className="gap-2 text-xs rounded-lg transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-fuchsia-600 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700" 
            data-testid="view-trends"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Trends
          </TabsTrigger>
          <TabsTrigger 
            value="today" 
            className="gap-2 text-xs rounded-lg transition-all data-[state=active]:bg-slate-100 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700" 
            data-testid="view-today"
          >
            <Clock className="w-3.5 h-3.5" /> 24h
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alltime" className="space-y-4">
          <Card className="border-0 bg-transparent overflow-hidden shadow-none">
            <CardHeader className="pb-3 px-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-400"
                      animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.3, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                      Neural River
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">Consciousness flow across time</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">{entries.length} moments</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Waves className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                  </motion.div>
                  <p className="text-slate-500 text-sm">The river awaits its first drop...</p>
                  <p className="text-slate-400 text-xs mt-1">Log an entry to begin your stream</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <div className="relative p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-violet-500" />
                        <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Flowing States</span>
                      </div>

                      <div className="relative h-32 flex items-end gap-[2px] overflow-hidden">
                        {(() => {
                          const sortedEntries = [...entries].sort((a, b) => {
                            const aDate = typeof a.timestamp === 'string' ? parseISO(a.timestamp) : a.timestamp;
                            const bDate = typeof b.timestamp === 'string' ? parseISO(b.timestamp) : b.timestamp;
                            return aDate.getTime() - bDate.getTime();
                          });
                          
                          const displayEntries = sortedEntries.slice(-120);
                          
                          return displayEntries.map((entry, idx) => {
                            const member = members.find(m => m.id === entry.frontingMemberId);
                            const moodNorm = (entry.mood || 5) / 10;
                            const stressNorm = (entry.stress || 50) / 100;
                            const height = 20 + moodNorm * 80;
                            const prevEntry = idx > 0 ? displayEntries[idx - 1] : null;
                            const isSwitch = prevEntry && prevEntry.frontingMemberId !== entry.frontingMemberId;
                            const color = member?.color || '#64748b';
                            
                            return (
                              <TooltipProvider key={entry.id || idx} delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <motion.div
                                      className="relative cursor-pointer group"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height, opacity: 1 }}
                                      transition={{ delay: idx * 0.008, duration: 0.4, ease: "easeOut" }}
                                      style={{ flex: '1 1 0', minWidth: 3, maxWidth: 12 }}
                                    >
                                      {isSwitch && (
                                        <motion.div
                                          className="absolute -top-1 left-1/2 -translate-x-1/2 z-20"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: idx * 0.008 + 0.2 }}
                                        >
                                          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50" />
                                        </motion.div>
                                      )}
                                      
                                      <motion.div
                                        className="w-full h-full rounded-t-sm relative overflow-hidden"
                                        style={{
                                          background: `linear-gradient(180deg, ${color} 0%, ${color}aa 40%, ${color}44 100%)`,
                                          boxShadow: `0 0 ${12 + moodNorm * 12}px ${color}50, inset 0 1px 0 ${color}88`,
                                        }}
                                        whileHover={{ 
                                          scaleY: 1.1, 
                                          filter: 'brightness(1.3)',
                                          boxShadow: `0 0 20px ${color}80`
                                        }}
                                      >
                                        <div 
                                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-500/50 to-transparent"
                                          style={{ height: `${stressNorm * 40}%` }}
                                        />
                                        <motion.div
                                          className="absolute inset-0 bg-white/20"
                                          animate={{ opacity: [0, 0.3, 0] }}
                                          transition={{ duration: 2, repeat: Infinity, delay: idx * 0.1 % 2 }}
                                        />
                                      </motion.div>
                                    </motion.div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white backdrop-blur-xl border border-slate-200 p-4 shadow-xl rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div 
                                        className="w-3 h-3 rounded-full shadow-lg"
                                        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                                      />
                                      <span className="font-bold text-slate-900">{member?.name || 'Unknown'}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">
                                      {format(typeof entry.timestamp === 'string' ? parseISO(entry.timestamp) : entry.timestamp, "EEEE, MMM d 'at' h:mm a")}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-slate-600">Mood: <span className="font-semibold text-slate-900">{entry.mood}/10</span></span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span className="text-slate-600">Stress: <span className="font-semibold text-slate-900">{entry.stress}%</span></span>
                                      </div>
                                    </div>
                                    {isSwitch && (
                                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200">
                                        <Zap className="w-3 h-3 text-amber-500" />
                                        <span className="text-[10px] text-amber-600 font-medium">State shift</span>
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          });
                        })()}
                      </div>

                      <div className="flex justify-between mt-3 text-[10px] text-slate-600 font-mono">
                        <span>← Earlier</span>
                        <span>Recent →</span>
                      </div>
                    </div>

                    <div className="relative px-6 pb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4 text-fuchsia-500" />
                        <span className="text-xs font-semibold text-fuchsia-600 uppercase tracking-wider">State Distribution</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {members.map((m, mIdx) => {
                          const count = entries.filter(e => e.frontingMemberId === m.id).length;
                          const pct = entries.length > 0 ? Math.round(count / entries.length * 100) : 0;
                          const avgMood = entries.filter(e => e.frontingMemberId === m.id).reduce((sum, e) => sum + (e.mood || 5), 0) / (count || 1);
                          
                          return (
                            <motion.div
                              key={m.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: mIdx * 0.05 }}
                              className="relative group"
                            >
                              <div 
                                className="rounded-xl p-3 backdrop-blur-sm border transition-all cursor-pointer hover:scale-[1.02]"
                                style={{
                                  background: `linear-gradient(135deg, ${m.color}15 0%, ${m.color}08 100%)`,
                                  borderColor: `${m.color}30`,
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <motion.div
                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-bold shadow-lg"
                                    style={{ backgroundColor: m.color, boxShadow: `0 0 12px ${m.color}50` }}
                                    animate={{ boxShadow: [`0 0 8px ${m.color}30`, `0 0 16px ${m.color}60`, `0 0 8px ${m.color}30`] }}
                                    transition={{ duration: 3, repeat: Infinity, delay: mIdx * 0.3 }}
                                  >
                                    {m.name.substring(0, 2).toUpperCase()}
                                  </motion.div>
                                  <span className="text-sm font-semibold text-slate-900 truncate">{m.name}</span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-2xl font-bold text-slate-900">{pct}%</span>
                                  <div className="text-right">
                                    <p className="text-[10px] text-slate-500">{count} entries</p>
                                    <p className="text-[10px] text-slate-500">avg mood {avgMood.toFixed(1)}</p>
                                  </div>
                                </div>
                                <div className="mt-2 h-1 rounded-full bg-slate-200 overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: m.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ delay: 0.5 + mIdx * 0.1, duration: 0.8 }}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {entries.length > 120 && (
                      <div className="px-6 pb-4">
                        <div className="text-center text-xs text-slate-500 py-2 rounded-lg bg-slate-100 border border-slate-200">
                          Displaying last 120 of {entries.length} entries for optimal visualization
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                    <BarChart3 className="w-4 h-4 text-indigo-500" /> 
                    Weekly Balance
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Hours per day by each member</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)} data-testid="week-prev">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-mono text-slate-600 min-w-[140px] text-center">
                    {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset >= 0} data-testid="week-next">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[260px] rounded-xl bg-slate-100 border border-slate-200 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                    <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#cbd5e1' }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      labelStyle={{ color: '#334155' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {members.map(m => (
                      <Bar key={m.id} dataKey={m.name} stackId="a" fill={normalizeColor(m.color)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                    <Calendar className="w-4 h-4 text-emerald-500" /> 
                    Monthly Presence
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Each day colored by dominant state</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => m - 1)} data-testid="month-prev">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-mono text-slate-600 min-w-[100px] text-center">
                    {format(currentMonthStart, "MMMM yyyy")}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => Math.min(m + 1, 0))} disabled={monthOffset >= 0} data-testid="month-next">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-xl bg-slate-100 border border-slate-200 p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase">{d}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: (getDay(currentMonthStart) + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  
                  {monthlyPresence.map((day, i) => {
                    const isToday = isSameDay(day.date, now);
                    const hasData = day.entryCount > 0;
                    
                    return (
                      <TooltipProvider key={day.dateStr} delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.01 }}
                              className={cn(
                                "aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-110 relative group",
                                isToday ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950" : ""
                              )}
                              style={day.dominantMember ? {
                                background: `linear-gradient(135deg, ${day.dominantMember.color}cc 0%, ${day.dominantMember.color}88 100%)`,
                                boxShadow: hasData ? `0 0 8px ${day.dominantMember.color}60` : 'none'
                              } : {
                                background: hasData ? '#334155' : '#1e293b'
                              }}
                              data-testid={`calendar-day-${day.dateStr}`}
                            >
                              <span className={cn(
                                "text-xs font-mono",
                                hasData ? "text-white font-bold" : "text-slate-500"
                              )}>
                                {format(day.date, "d")}
                              </span>
                              {day.transitionCount > 0 && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  <Zap className="w-2 h-2 text-amber-400" />
                                  <span className="text-[8px] text-amber-400 font-bold">{day.transitionCount}</span>
                                </div>
                              )}
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-3 shadow-xl">
                            <p className="font-semibold text-slate-900 dark:text-white mb-1">{format(day.date, "EEEE, MMMM d")}</p>
                            {hasData ? (
                              <div className="space-y-1 text-xs">
                                {day.dominantMember && (
                                  <p className="text-slate-600 dark:text-slate-300">
                                    Dominant: <span className="font-semibold" style={{ color: day.dominantMember.color }}>{day.dominantMember.name}</span>
                                  </p>
                                )}
                                <p className="text-slate-500">{day.entryCount} entries, {day.transitionCount} state shifts</p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">No data</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded shadow-lg" 
                      style={{ backgroundColor: m.color, boxShadow: `0 2px 8px ${m.color}40` }} 
                    />
                    <span className="text-xs text-slate-600">{m.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                <TrendingUp className="w-4 h-4 text-fuchsia-500" /> 
                30-Day Trends
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Active hours per day over the last month</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[280px] rounded-xl bg-slate-100 border border-slate-200 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={{ stroke: '#cbd5e1' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#cbd5e1' }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      labelStyle={{ color: '#334155' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {members.map(m => (
                      <Area 
                        key={m.id} 
                        type="monotone" 
                        dataKey={m.name} 
                        stackId="1"
                        stroke={normalizeColor(m.color)} 
                        fill={normalizeColor(m.color)}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {memberStats.slice(0, 6).map((stat, i) => (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-lg rounded-xl overflow-hidden relative">
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: stat.normalizedColor }}
                  />
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
                        style={{ 
                          background: `linear-gradient(135deg, ${stat.normalizedColor}cc, ${stat.normalizedColor}88)`,
                          boxShadow: `0 4px 12px ${stat.normalizedColor}40`
                        }}
                      >
                        {stat.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{stat.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <p className="text-slate-500">Total</p>
                        <p className="font-mono font-bold text-slate-700">{stat.totalHours}h</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Avg/Day</p>
                        <p className="font-mono font-bold text-slate-700">{stat.avgPerDay}h</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Days Active</p>
                        <p className="font-mono font-bold text-slate-700">{stat.daysActive}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Share</p>
                        <p className="font-mono font-bold text-slate-700">{stat.percentOfTotal}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="today" className="space-y-4">
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span className="text-[11px] font-mono font-medium text-slate-600">24h window</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-fuchsia-500/5 rounded-2xl blur-xl" />
            
            <div className="relative rounded-2xl border border-slate-200/60 bg-slate-100 backdrop-blur-sm p-4 overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
              
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
                                "group-hover/slot:scale-y-110 group-hover/slot:brightness-110",
                                slot.member ? "" : "bg-slate-300/50"
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
                          className="p-0 overflow-hidden border-0 shadow-xl"
                        >
                          <div className="bg-white backdrop-blur-xl border border-slate-200 rounded-lg overflow-hidden min-w-[200px]">
                            <div 
                              className="px-4 py-2 flex items-center justify-between gap-4"
                              style={slot.member ? {
                                background: `linear-gradient(90deg, ${slot.member.normalizedColor}30 0%, transparent 100%)`
                              } : undefined}
                            >
                              <span className="text-sm font-mono font-bold text-slate-700">{slot.label}</span>
                              {slot.member && (
                                <div 
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow"
                                  style={{ 
                                    backgroundColor: slot.member.normalizedColor,
                                    boxShadow: `0 0 8px ${slot.member.normalizedColor}60`
                                  }}
                                >
                                  {slot.member.name}
                                </div>
                              )}
                            </div>
                            
                            <div className="px-4 py-3 space-y-2 border-t border-slate-200">
                              {slot.entry ? (
                                <>
                                  {slot.entry.notes && (
                                    <p className="text-xs text-slate-600 italic line-clamp-2">
                                      "{slot.entry.notes}"
                                    </p>
                                  )}
                                  <div className="flex gap-4 pt-1">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span className="text-[11px] font-medium text-slate-600">Mood {slot.entry.mood}/10</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      <span className="text-[11px] font-medium text-slate-600">Stress {slot.entry.stress}%</span>
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
                <span className="text-[10px] font-mono text-slate-500">{format(subHours(now, 24), "h:mm a")}</span>
                <span className="text-[10px] font-mono text-slate-500">{format(subHours(now, 18), "h:mm a")}</span>
                <span className="text-[10px] font-mono text-slate-500">{format(subHours(now, 12), "h:mm a")}</span>
                <span className="text-[10px] font-mono text-slate-500">{format(subHours(now, 6), "h:mm a")}</span>
                <span className="text-[10px] font-mono font-bold text-indigo-400">Now</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {members.map(member => {
              const hours = timelineData.filter(d => d.member?.id === member.id).length;
              const normalizedColor = normalizeColor(member.color);
              
              return (
                <motion.div 
                  key={member.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group"
                  data-testid={`member-presence-${member.id}`}
                >
                  <div 
                    className="absolute inset-0 rounded-xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity"
                    style={{ backgroundColor: normalizedColor }}
                  />
                  
                  <div 
                    className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm border transition-all duration-200 group-hover:scale-105 shadow-sm"
                    style={{ 
                      borderColor: `${normalizedColor}40`,
                    }}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg"
                      style={{ 
                        background: `linear-gradient(135deg, ${normalizedColor} 0%, ${normalizedColor}cc 100%)`,
                        boxShadow: `0 4px 12px ${normalizedColor}40`
                      }}
                    >
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        {member.name.substring(0, 2)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900 leading-tight">{member.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{hours}h presence</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
