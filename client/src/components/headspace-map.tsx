import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, Clock, Zap, Calendar, BarChart3, TrendingUp, Users, ChevronLeft, ChevronRight } from "lucide-react";
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
      label: format(blockTime, "HH:mm")
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
          <p className="text-xs text-muted-foreground">Log entries with fronting member to visualize system activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2" data-testid="headspace-timeline">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Top Fronter</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{summaryStats.topMember?.name || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Avg Switches/Day</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{summaryStats.avgTransitionsPerDay || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Days Tracked</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{summaryStats.daysWithData} / 30</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Total Entries</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{summaryStats.totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
          <TabsTrigger value="alltime" className="gap-2 text-xs data-[state=active]:bg-violet-100 dark:data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300" data-testid="view-alltime">
            <Grid3x3 className="w-3.5 h-3.5" /> All Time
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2 text-xs data-[state=active]:bg-indigo-100 dark:data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300" data-testid="view-weekly">
            <BarChart3 className="w-3.5 h-3.5" /> Weekly
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 text-xs data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300" data-testid="view-calendar">
            <Calendar className="w-3.5 h-3.5" /> Monthly
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2 text-xs data-[state=active]:bg-fuchsia-100 dark:data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-700 dark:data-[state=active]:text-fuchsia-300" data-testid="view-trends">
            <TrendingUp className="w-3.5 h-3.5" /> Trends
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2 text-xs data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300" data-testid="view-today">
            <Clock className="w-3.5 h-3.5" /> 24h
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alltime" className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
                    <Grid3x3 className="w-4 h-4 text-violet-500" /> 
                    Presence Stream
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Continuous fronting data visualization</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{entries.length} entries</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-4">
              {entries.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                  No tracking data yet. Log your first entry to see the stream.
                </div>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(139,92,246,0.03)_50%,transparent_100%)] pointer-events-none" />
                    
                    <div className="flex flex-wrap gap-1">
                      {entries.slice(0, 200).map((entry, idx) => {
                        const member = members.find(m => m.id === entry.frontingMemberId);
                        const moodIntensity = (entry.mood || 5) / 10;
                        const size = 12 + (entry.mood || 5) * 1.5;
                        
                        return (
                          <TooltipProvider key={entry.id || idx} delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: idx * 0.005, type: "spring", stiffness: 300 }}
                                  className="cursor-pointer transition-all hover:scale-150 hover:z-20 relative"
                                  style={{
                                    width: size,
                                    height: size,
                                    borderRadius: '50%',
                                    background: member 
                                      ? `radial-gradient(circle at 30% 30%, ${member.color} 0%, ${member.color}88 100%)`
                                      : 'radial-gradient(circle at 30% 30%, #64748b 0%, #475569 100%)',
                                    boxShadow: member 
                                      ? `0 0 ${8 + moodIntensity * 8}px ${member.color}80`
                                      : 'none',
                                    opacity: 0.6 + moodIntensity * 0.4
                                  }}
                                  data-testid={`stream-entry-${idx}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-3 shadow-xl">
                                <p className="font-semibold text-slate-900 dark:text-white mb-1">
                                  {format(typeof entry.timestamp === 'string' ? parseISO(entry.timestamp) : entry.timestamp, "MMM d, yyyy HH:mm")}
                                </p>
                                <div className="space-y-1 text-xs">
                                  {member && (
                                    <p className="text-slate-600 dark:text-slate-300">
                                      Fronter: <span className="font-semibold" style={{ color: member.color }}>{member.name}</span>
                                    </p>
                                  )}
                                  <p className="text-slate-500">Mood: {entry.mood}/10 | Stress: {entry.stress}%</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                    
                    {entries.length > 200 && (
                      <div className="mt-3 text-center text-xs text-slate-500">
                        Showing first 200 of {entries.length} entries
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {members.map(m => {
                      const count = entries.filter(e => e.frontingMemberId === m.id).length;
                      const pct = entries.length > 0 ? Math.round(count / entries.length * 100) : 0;
                      return (
                        <div key={m.id} className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: m.color, boxShadow: `0 0 6px ${m.color}60` }} 
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{m.name}</span>
                          <span className="text-xs text-slate-500">({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
                    <BarChart3 className="w-4 h-4 text-indigo-500" /> 
                    Weekly Balance
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Hours per day by each member</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)} data-testid="week-prev">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-mono text-slate-400 min-w-[140px] text-center">
                    {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset >= 0} data-testid="week-next">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[260px] rounded-xl bg-slate-950 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#475569' }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
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
          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
                    <Calendar className="w-4 h-4 text-emerald-500" /> 
                    Monthly Presence
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Each day colored by dominant fronter</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => m - 1)} data-testid="month-prev">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-mono text-slate-400 min-w-[100px] text-center">
                    {format(currentMonthStart, "MMMM yyyy")}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => Math.min(m + 1, 0))} disabled={monthOffset >= 0} data-testid="month-next">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-xl bg-slate-950 p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
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
                                <p className="text-slate-500">{day.entryCount} entries, {day.transitionCount} switches</p>
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
              
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: m.color }} 
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{m.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <TrendingUp className="w-4 h-4 text-fuchsia-500" /> 
                30-Day Trends
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Fronting hours per day over the last month</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[280px] rounded-xl bg-slate-950 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={{ stroke: '#475569' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#475569' }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
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
                <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: stat.normalizedColor }}
                      >
                        {stat.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{stat.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <p className="text-slate-500">Total</p>
                        <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{stat.totalHours}h</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Avg/Day</p>
                        <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{stat.avgPerDay}h</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Days Active</p>
                        <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{stat.daysActive}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Share</p>
                        <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{stat.percentOfTotal}%</p>
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
                    className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur-sm border transition-all duration-200 group-hover:scale-105"
                    style={{ 
                      borderColor: `${normalizedColor}40`,
                      boxShadow: `inset 0 1px 0 ${normalizedColor}20`
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
                      <span className="text-sm font-semibold text-slate-200 leading-tight">{member.name}</span>
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
