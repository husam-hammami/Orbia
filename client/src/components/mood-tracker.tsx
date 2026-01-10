import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Smile, Frown, Meh, Zap, BatteryFull, Activity, UserCircle2, CloudFog, AlertCircle, Flame, MessageSquare, ChevronDown, ChevronUp, Clock, Loader2, TrendingUp, Calendar, HeartPulse, BedDouble, Moon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMembers, useTrackerEntries, useCreateTrackerEntry, useUpdateTrackerEntry, useDeleteTrackerEntry } from "@/lib/api-hooks";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseTrackerNotes } from "@/lib/parse-notes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { TrackerEntry } from "@shared/schema";

export function MoodTracker() {
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: trackerEntries, isLoading: entriesLoading } = useTrackerEntries(30);
  const createEntryMutation = useCreateTrackerEntry();
  const updateEntryMutation = useUpdateTrackerEntry();
  const deleteEntryMutation = useDeleteTrackerEntry();

  const [isExpanded, setIsExpanded] = useState(true);
  const [editingEntry, setEditingEntry] = useState<TrackerEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [editMood, setEditMood] = useState([5]);
  const [editEnergy, setEditEnergy] = useState([5]);
  const [editStress, setEditStress] = useState([3]);
  const [editDissociation, setEditDissociation] = useState([2]);
  const [editCapacity, setEditCapacity] = useState([3]);
  const [editNotes, setEditNotes] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [motivation, setMotivation] = useState([5]);
  const [comfort, setComfort] = useState([5]); 
  const [dissociation, setDissociation] = useState([2]); 
  const [urges, setUrges] = useState([1]); 
  const [stress, setStress] = useState([3]);
  const [sleep, setSleep] = useState([7.5]);
  const [sleepQuality, setSleepQuality] = useState([6]); 
  const [systemComm, setSystemComm] = useState([5]); 
  const [capacity, setCapacity] = useState([3]); // 0-5 capacity scale
  const [triggerTag, setTriggerTag] = useState<string | null>(null); // optional context tag
  const [workLoad, setWorkLoad] = useState([0]); // 0-10: How hostile/draining was work today?
  const [workTag, setWorkTag] = useState<string | null>(null); // optional work-specific context
  const [selectedFronterId, setSelectedFronterId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [entryTime, setEntryTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Auto-calculate time of day based on current hour
  const getTimeOfDay = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
  };

  const triggerTags = [
    { value: "work", label: "Work", icon: "💼" },
    { value: "loneliness", label: "Loneliness", icon: "🫂" },
    { value: "pain", label: "Pain", icon: "🔥" },
    { value: "noise", label: "Noise/Env", icon: "🔊" },
    { value: "sleep", label: "Sleep", icon: "😴" },
    { value: "body", label: "Body/Health", icon: "🩺" },
    { value: "unknown", label: "Unknown", icon: "❓" },
  ];

  const workTags = [
    { value: "deadlines", label: "Deadlines" },
    { value: "conflict", label: "Conflict" },
    { value: "firefighting", label: "Firefighting" },
    { value: "unclear", label: "Unclear requirements" },
    { value: "blame", label: "Blame / criticism" },
    { value: "chaos", label: "Organizational chaos" },
  ];

  const selectedFronter = members?.find(m => m.id === selectedFronterId) || members?.[0];

  const entriesToday = (trackerEntries || []).filter(entry => {
    const entryDate = format(new Date(entry.timestamp), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    return entryDate === today;
  }).map(entry => ({
    time: format(new Date(entry.timestamp), "HH:mm"),
    mood: entry.mood <= 2 ? "bad" : entry.mood <= 3 ? "neutral" : "good"
  }));


  const emotionalStates = [
    { value: "terrible", icon: Frown, color: "text-red-500", bg: "bg-red-100", label: "Distressed" },
    { value: "bad", icon: Meh, color: "text-orange-500", bg: "bg-orange-100", label: "Struggling" },
    { value: "neutral", icon: Meh, color: "text-yellow-500", bg: "bg-yellow-100", label: "Neutral" },
    { value: "good", icon: Smile, color: "text-green-500", bg: "bg-green-100", label: "Stable" },
    { value: "excellent", icon: Zap, color: "text-blue-500", bg: "bg-blue-100", label: "Thriving" },
  ];

  const tags = [
    "Therapy", "Pain Spike", "Insomnia", "Triggered", "Shifting", "Productive", 
    "Socializing", "Medication", "Grounding", "Flashback", "Rest"
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddEntry = () => {
    const moodValue = mood === "terrible" ? 1 : mood === "bad" ? 3 : mood === "neutral" ? 5 : mood === "good" ? 7 : mood === "excellent" ? 10 : 5;
    
    const noteParts = [];
    if (note) noteParts.push(note);
    if (selectedTags.length > 0) noteParts.push(`Tags: ${selectedTags.join(", ")}`);
    noteParts.push(`Comfort: ${comfort[0]}/10`);
    noteParts.push(`System Comm: ${systemComm[0]}/10`);
    noteParts.push(`Sleep: ${sleep[0]}h`);
    noteParts.push(`Urges: ${urges[0]}/10`);

    createEntryMutation.mutate({
      frontingMemberId: selectedFronter?.id || null,
      mood: moodValue,
      energy: motivation[0],
      stress: stress[0] * 10,
      dissociation: dissociation[0] * 10,
      sleepHours: sleep[0] > 0 ? sleep[0] : null,
      sleepQuality: sleepQuality[0],
      capacity: capacity[0],
      pain: comfort[0],
      triggerTag: triggerTag,
      workLoad: workLoad[0] > 0 ? workLoad[0] : null,
      workTag: workTag,
      timeOfDay: getTimeOfDay(),
      notes: noteParts.join(" | "),
      timestamp: new Date(),
    }, {
      onSuccess: () => {
        toast.success("Entry logged successfully!");
        setNote("");
        setSelectedTags([]);
        setTriggerTag(null);
        setWorkLoad([0]);
        setWorkTag(null);
      },
      onError: () => toast.error("Failed to log entry"),
    });
  };

  const openEditDialog = (entry: TrackerEntry) => {
    setEditingEntry(entry);
    setEditMood([entry.mood]);
    setEditEnergy([entry.energy]);
    setEditStress([Math.round(entry.stress / 10)]);
    setEditDissociation([Math.round(entry.dissociation / 10)]);
    setEditCapacity([entry.capacity ?? 3]);
    const parsed = parseTrackerNotes(entry.notes);
    setEditNotes(parsed.text || "");
  };

  const handleUpdateEntry = () => {
    if (!editingEntry) return;
    
    const noteParts = [];
    if (editNotes) noteParts.push(editNotes);
    
    updateEntryMutation.mutate({
      id: editingEntry.id,
      data: {
        mood: editMood[0],
        energy: editEnergy[0],
        stress: editStress[0] * 10,
        dissociation: editDissociation[0] * 10,
        capacity: editCapacity[0],
        notes: noteParts.length > 0 ? noteParts.join(" | ") : editingEntry.notes,
      }
    }, {
      onSuccess: () => {
        toast.success("Entry updated!");
        setEditingEntry(null);
      },
      onError: () => toast.error("Failed to update entry"),
    });
  };

  const handleDeleteEntry = () => {
    if (!deletingEntryId) return;
    deleteEntryMutation.mutate(deletingEntryId, {
      onSuccess: () => {
        toast.success("Entry deleted");
        setDeletingEntryId(null);
      },
      onError: () => toast.error("Failed to delete entry"),
    });
  };

  return (
    <>
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-300">
      {/* Compact Header - Always Visible */}
      <div className="p-4 flex items-center justify-between gap-4">
         <div className="flex items-center gap-4 flex-1">
            <div>
                <h3 className="font-display font-semibold text-lg hidden sm:block">Input Metrics</h3>
                <p className="text-[10px] text-muted-foreground hidden sm:block">
                    {entriesToday.length} entries today{entriesToday.length > 0 ? ` • Last at ${entriesToday[entriesToday.length-1]?.time}` : ''}
                </p>
            </div>
            
            {/* Emotional State Select */}
            <div className="flex gap-1 bg-muted/30 p-1 rounded-full">
                {emotionalStates.map((m) => {
                  const Icon = m.icon;
                  const isSelected = mood === m.value;
                  const glowColor = m.value === "terrible" ? "rgba(239,68,68,0.4)" : 
                                    m.value === "bad" ? "rgba(249,115,22,0.4)" : 
                                    m.value === "neutral" ? "rgba(234,179,8,0.4)" : 
                                    m.value === "good" ? "rgba(34,197,94,0.4)" : 
                                    "rgba(59,130,246,0.4)";
                  return (
                    <motion.button
                      key={m.value}
                      onClick={(e) => { e.stopPropagation(); setMood(m.value); }}
                      title={m.label}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "p-2 rounded-full transition-all duration-300 relative",
                        isSelected 
                          ? `${m.bg} ${m.color}` 
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      style={isSelected ? { 
                        boxShadow: `0 0 20px -5px ${glowColor}`,
                      } : undefined}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 0.3, scale: 1 }}
                          className="absolute inset-0 rounded-full blur-md"
                          style={{ backgroundColor: glowColor }}
                        />
                      )}
                      <Icon className={cn("w-5 h-5 relative z-10", isSelected && "scale-110")} />
                    </motion.button>
                  );
                })}
            </div>

            {/* Quick Fronting Input */}
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-[200px] justify-end">
                {selectedFronter && (
                  <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-full border border-border/50">
                      <UserCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-medium" style={{ color: selectedFronter.color }}>{selectedFronter.name}</span>
                  </div>
                )}
            </div>
         </div>

            {isExpanded && (
                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border border-border/50">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <input 
                        type="time" 
                        value={entryTime}
                        onChange={(e) => setEntryTime(e.target.value)}
                        className="bg-transparent text-xs font-mono focus:outline-none w-16"
                    />
                </div>
            )}

            <Button 
            variant={isExpanded ? "secondary" : "default"} 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
         >
            {isExpanded ? "Close Entry" : "Log Metrics"}
            {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
         </Button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-border"
          >
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Headspace & System */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Internal System</h4>
                    
                    {/* Dissociation */}
                    <div 
                      className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-700"
                      style={{ 
                        boxShadow: dissociation[0] > 5 ? '0 0 25px -8px rgba(147,51,234,0.35)' : undefined,
                        background: dissociation[0] > 5 ? 'linear-gradient(135deg, rgba(147,51,234,0.05) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-purple-600">
                             <CloudFog className="w-3.5 h-3.5" style={{ filter: dissociation[0] > 5 ? 'drop-shadow(0 0 4px rgba(147,51,234,0.5))' : undefined }} />
                             <span className="text-xs font-semibold">Dissociation</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border">
                             {dissociation[0]}/10
                          </span>
                       </div>
                       <Slider value={dissociation} onValueChange={setDissociation} max={10} step={1} className="h-4" />
                    </div>

                    {/* System Comm */}
                    <div 
                      className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30 transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-700"
                      style={{ 
                        boxShadow: systemComm[0] > 5 ? '0 0 25px -8px rgba(99,102,241,0.35)' : undefined,
                        background: systemComm[0] > 5 ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-indigo-600">
                             <MessageSquare className="w-3.5 h-3.5" style={{ filter: systemComm[0] > 5 ? 'drop-shadow(0 0 4px rgba(99,102,241,0.5))' : undefined }} />
                             <span className="text-xs font-semibold">Communication</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border">
                             {systemComm[0]}/10
                          </span>
                       </div>
                       <Slider value={systemComm} onValueChange={setSystemComm} max={10} step={1} className="h-4 [&_.bg-primary]:bg-indigo-500" />
                    </div>
                    
                    {/* Active State */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Active State</label>
                        {membersLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                          </div>
                        ) : members && members.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                              {members.map(member => (
                                  <motion.button
                                      key={member.id}
                                      onClick={() => setSelectedFronterId(member.id)}
                                      data-testid={`button-fronter-${member.id}`}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      className={cn(
                                          "text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 relative",
                                          selectedFronter?.id === member.id 
                                              ? "bg-background border-indigo-500" 
                                              : "bg-muted/30 border-transparent hover:bg-muted"
                                      )}
                                      style={{ 
                                        color: selectedFronter?.id === member.id ? member.color : undefined,
                                        boxShadow: selectedFronter?.id === member.id ? `0 0 20px -5px ${member.color}` : undefined
                                      }}
                                  >
                                      <span 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ 
                                          backgroundColor: member.color,
                                          boxShadow: selectedFronter?.id === member.id ? `0 0 8px ${member.color}` : undefined
                                        }} 
                                      />
                                      {member.name}
                                  </motion.button>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No states yet. Add states in Deep Mind.</p>
                        )}
                    </div>

                    {/* Daily Note - moved here to fill space */}
                    <Textarea 
                         placeholder="Daily Note..."
                         className="bg-muted/30 resize-none h-[88px] text-xs"
                         value={note}
                         onChange={(e) => setNote(e.target.value)}
                    />
                </div>

                {/* 2. Physical Body */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Body Vitals</h4>
                    
                    {/* Pain Level */}
                    <div 
                      className="bg-rose-50/50 dark:bg-rose-900/10 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30 transition-all duration-300 hover:border-rose-300 dark:hover:border-rose-700"
                      style={{ 
                        boxShadow: comfort[0] >= 6 ? '0 0 25px -8px rgba(244,63,94,0.35)' : undefined,
                        background: comfort[0] >= 6 ? 'linear-gradient(135deg, rgba(244,63,94,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-rose-600">
                             <HeartPulse className="w-3.5 h-3.5" style={{ filter: comfort[0] >= 6 ? 'drop-shadow(0 0 4px rgba(244,63,94,0.5))' : undefined }} />
                             <span className="text-xs font-semibold">Pain Level</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border text-rose-600">
                             {comfort[0] === 0 ? "None" : comfort[0] <= 3 ? "Mild" : comfort[0] <= 6 ? "Moderate" : "Severe"}
                          </span>
                       </div>
                       <Slider value={comfort} onValueChange={setComfort} max={10} step={1} className="h-4 [&_.bg-primary]:bg-rose-500" />
                    </div>

                    {/* Sleep Hours */}
                    <div 
                      className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30 transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-700"
                      style={{ 
                        boxShadow: sleep[0] >= 7 ? '0 0 25px -8px rgba(99,102,241,0.35)' : undefined,
                        background: sleep[0] >= 7 ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-indigo-600">
                             <Moon className="w-3.5 h-3.5" style={{ filter: sleep[0] >= 7 ? 'drop-shadow(0 0 4px rgba(99,102,241,0.5))' : undefined }} />
                             <span className="text-xs font-semibold">Sleep Hours</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border">
                             {sleep[0]}h
                          </span>
                       </div>
                       <Slider value={sleep} onValueChange={setSleep} max={12} step={0.5} className="h-4 [&_.bg-primary]:bg-indigo-500" />
                    </div>

                    {/* Sleep Quality */}
                    <div 
                      className="bg-violet-50/50 dark:bg-violet-900/10 p-3 rounded-lg border border-violet-100 dark:border-violet-900/30 transition-all duration-300 hover:border-violet-300 dark:hover:border-violet-700"
                      style={{ 
                        boxShadow: sleepQuality[0] >= 7 ? '0 0 25px -8px rgba(139,92,246,0.35)' : undefined,
                        background: sleepQuality[0] >= 7 ? 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-violet-600">
                             <BedDouble className="w-3.5 h-3.5" style={{ filter: sleepQuality[0] >= 7 ? 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' : undefined }} />
                             <span className="text-xs font-semibold">Sleep Quality</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border text-violet-600">
                             {sleepQuality[0] <= 3 ? "Poor" : sleepQuality[0] <= 5 ? "Fair" : sleepQuality[0] <= 7 ? "Good" : "Excellent"}
                          </span>
                       </div>
                       <Slider value={sleepQuality} onValueChange={setSleepQuality} max={10} step={1} className="h-4 [&_.bg-primary]:bg-violet-500" />
                    </div>

                    {/* Energy */}
                    <div 
                      className="bg-yellow-50/50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30 transition-all duration-300 hover:border-yellow-300 dark:hover:border-yellow-700"
                      style={{ 
                        boxShadow: motivation[0] >= 7 ? '0 0 25px -8px rgba(234,179,8,0.35)' : undefined,
                        background: motivation[0] >= 7 ? 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-yellow-600">
                             <Zap className="w-3.5 h-3.5" style={{ filter: motivation[0] >= 7 ? 'drop-shadow(0 0 4px rgba(234,179,8,0.5))' : undefined }} />
                             <span className="text-xs font-semibold">Energy</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border text-yellow-600">
                             {motivation[0] <= 3 ? "Drained" : motivation[0] <= 5 ? "Low" : motivation[0] <= 7 ? "Moderate" : "High"}
                          </span>
                       </div>
                       <Slider value={motivation} onValueChange={setMotivation} max={10} step={1} className="h-4 [&_.bg-primary]:bg-yellow-500" />
                    </div>

                    {/* Stress Level */}
                    <div 
                      className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30 transition-all duration-300 hover:border-orange-300 dark:hover:border-orange-700"
                      style={{ 
                        boxShadow: stress[0] >= 7 ? '0 0 25px -8px rgba(249,115,22,0.35)' : undefined,
                        background: stress[0] >= 7 ? 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-orange-600">
                             <Activity className="w-3.5 h-3.5" style={{ filter: stress[0] >= 7 ? 'drop-shadow(0 0 4px rgba(249,115,22,0.5))' : undefined }} />
                             <span className="text-xs font-semibold">Stress Level</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border text-orange-600">
                             {stress[0] <= 3 ? "Calm" : stress[0] <= 5 ? "Mild" : stress[0] <= 7 ? "Elevated" : "High"}
                          </span>
                       </div>
                       <Slider value={stress} onValueChange={setStress} max={10} step={1} className="h-4 [&_.bg-primary]:bg-orange-500" />
                    </div>

                    {/* Work Environment Load */}
                    <div 
                      className="bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700"
                      style={{ 
                        boxShadow: workLoad[0] >= 7 ? '0 0 25px -8px rgba(245,158,11,0.4)' : undefined,
                        background: workLoad[0] >= 7 ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-amber-700">
                             <span className="text-sm" style={{ filter: workLoad[0] >= 7 ? 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' : undefined }}>💼</span>
                             <span className="text-xs font-semibold">Work Environment Load</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border text-amber-700">
                             {workLoad[0] === 0 ? "No work" : workLoad[0] <= 3 ? "Manageable" : workLoad[0] <= 6 ? "Difficult" : "Toxic"}
                          </span>
                       </div>
                       <Slider value={workLoad} onValueChange={setWorkLoad} max={10} step={1} className="h-4 [&_.bg-primary]:bg-amber-500" />
                       <p className="text-[9px] text-muted-foreground mt-1.5">How hostile or draining was work today? (0 = no work/neutral)</p>
                       
                       {/* Work-specific tags (optional) */}
                       {workLoad[0] > 0 && (
                          <div className="mt-2 pt-2 border-t border-amber-200/50">
                             <p className="text-[9px] text-muted-foreground mb-1.5">What made it hard? (optional, pick one):</p>
                             <div className="flex flex-wrap gap-1">
                                {workTags.map(tag => (
                                   <button
                                      key={tag.value}
                                      onClick={() => setWorkTag(workTag === tag.value ? null : tag.value)}
                                      data-testid={`button-work-${tag.value}`}
                                      className={cn(
                                         "text-[9px] px-1.5 py-0.5 rounded border transition-all",
                                         workTag === tag.value
                                            ? "bg-amber-500 text-white border-amber-500"
                                            : "bg-background border-amber-200 text-amber-700 hover:border-amber-300"
                                      )}
                                   >
                                      {tag.label}
                                   </button>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>
                </div>

                {/* 3. Intensity & Notes */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Intensity & Context</h4>

                    {/* Capacity (0-5) - Key metric for DID */}
                    <div 
                      className="bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30 transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-700"
                      style={{ 
                        boxShadow: capacity[0] >= 4 ? '0 0 25px -8px rgba(16,185,129,0.4)' : undefined,
                        background: capacity[0] >= 4 ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-emerald-600">
                             <BatteryFull className="w-3.5 h-3.5" style={{ filter: capacity[0] >= 4 ? 'drop-shadow(0 0 4px rgba(16,185,129,0.5))' : undefined }} />
                             <span className="text-xs font-semibold">Capacity</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border text-emerald-700">
                             {capacity[0] === 0 ? "Empty" : capacity[0] <= 2 ? "Low" : capacity[0] <= 4 ? "Moderate" : "Full"}
                          </span>
                       </div>
                       <Slider value={capacity} onValueChange={setCapacity} max={5} step={1} className="h-4 [&_.bg-primary]:bg-emerald-500" />
                       <p className="text-[9px] text-muted-foreground mt-1.5">How much can you handle right now? (Not mood or energy)</p>
                    </div>

                    {/* What influenced this entry? (trigger tag) */}
                    <div 
                      className="bg-violet-50/50 dark:bg-violet-900/10 p-3 rounded-lg border border-violet-100 dark:border-violet-900/30 transition-all duration-300 hover:border-violet-300 dark:hover:border-violet-700"
                      style={{ 
                        boxShadow: triggerTag ? '0 0 25px -8px rgba(139,92,246,0.35)' : undefined,
                        background: triggerTag ? 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex items-center gap-1.5 text-violet-600 mb-2">
                          <AlertCircle className="w-3.5 h-3.5" style={{ filter: triggerTag ? 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' : undefined }} />
                          <span className="text-xs font-semibold">What influenced this?</span>
                          <span className="text-[9px] text-muted-foreground ml-1">(optional)</span>
                       </div>
                       <div className="flex flex-wrap gap-1.5">
                          {triggerTags.map(tag => (
                             <motion.button
                                key={tag.value}
                                onClick={() => setTriggerTag(triggerTag === tag.value ? null : tag.value)}
                                data-testid={`button-trigger-${tag.value}`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                   "text-[10px] px-2 py-1 rounded-full border transition-all flex items-center gap-1",
                                   triggerTag === tag.value
                                      ? "bg-violet-500 text-white border-violet-500"
                                      : "bg-background border-violet-200 text-violet-600 hover:border-violet-300"
                                )}
                                style={triggerTag === tag.value ? {
                                  boxShadow: '0 0 15px -3px rgba(139,92,246,0.5)'
                                } : undefined}
                             >
                                <span>{tag.icon}</span>
                                {tag.label}
                             </motion.button>
                          ))}
                       </div>
                    </div>

                    {/* Urges */}
                    <div 
                      className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30 transition-all duration-300 hover:border-orange-300 dark:hover:border-orange-700"
                      style={{ 
                        boxShadow: urges[0] >= 7 ? '0 0 25px -8px rgba(249,115,22,0.4)' : undefined,
                        background: urges[0] >= 7 ? 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, transparent 100%)' : undefined
                      }}
                    >
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-orange-600">
                             <Flame className="w-3.5 h-3.5" style={{ filter: urges[0] >= 7 ? 'drop-shadow(0 0 4px rgba(249,115,22,0.5))' : undefined }} />
                             <span className="text-xs font-semibold">Intrusive Urges</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border text-orange-700">
                             {urges[0] < 3 ? "Quiet" : urges[0] < 7 ? "Present" : "Intense"}
                          </span>
                       </div>
                       <Slider value={urges} onValueChange={setUrges} max={10} step={1} className="h-4 [&_.bg-primary]:bg-orange-500" />
                    </div>
                </div>
              </div>

              {/* Tags Footer */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row justify-between gap-4">
                 <div className="flex flex-wrap gap-2 flex-1">
                    {tags.map(tag => (
                        <motion.button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                            "text-[10px] px-2.5 py-1 rounded-full border transition-all duration-300",
                            selectedTags.includes(tag)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50 text-muted-foreground"
                        )}
                        style={selectedTags.includes(tag) ? {
                          boxShadow: '0 0 15px -3px rgba(6,182,212,0.4)'
                        } : undefined}
                        >
                        {tag}
                        </motion.button>
                    ))}
                    <button className="text-[10px] px-2.5 py-1 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground transition-colors">
                        + Add
                    </button>
                 </div>
                 
                 <Button 
                    size="sm" 
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.5)]"
                    style={{ boxShadow: '0 0 20px -8px rgba(99,102,241,0.4)' }}
                    onClick={handleAddEntry}
                    disabled={createEntryMutation.isPending}
                    data-testid="button-add-entry"
                 >
                    {createEntryMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Add Entry at {entryTime}
                 </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Detailed Entries List */}
    <Card className="mt-6" data-testid="card-mood-entries">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-primary" />
          Recent Entries
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entriesLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading entries...
          </div>
        ) : (trackerEntries || []).length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No entries yet. Start tracking above!</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {(trackerEntries || []).map((entry) => {
              const moodValue = entry.mood;
              const moodLabel = moodValue <= 2 ? "Terrible" : moodValue <= 4 ? "Low" : moodValue <= 6 ? "Okay" : moodValue <= 8 ? "Good" : "Great";
              const MoodIcon = moodValue <= 3 ? Frown : moodValue <= 5 ? Meh : moodValue <= 7 ? Smile : Zap;
              const moodColor = moodValue <= 3 ? "text-red-500" : moodValue <= 5 ? "text-yellow-500" : moodValue <= 7 ? "text-green-500" : "text-blue-500";
              const fronter = members?.find(m => m.id === entry.frontingMemberId);
              
              const parsed = parseTrackerNotes(entry.notes);
              
              return (
                <motion.div 
                  key={entry.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 transition-all duration-300 hover:border-cyan-500/30"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.02) 0%, transparent 100%)'
                  }}
                  data-testid={`entry-detail-${entry.id}`}
                >
                  {/* Header: Mood, Time, Fronter */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className={cn("p-2 rounded-lg relative", moodValue <= 3 ? "bg-red-100 dark:bg-red-900/20" : moodValue <= 5 ? "bg-yellow-100 dark:bg-yellow-900/20" : moodValue <= 7 ? "bg-green-100 dark:bg-green-900/20" : "bg-blue-100 dark:bg-blue-900/20")}
                        style={{
                          boxShadow: moodValue >= 7 
                            ? '0 0 20px -5px rgba(34,197,94,0.4)' 
                            : moodValue >= 5 
                            ? '0 0 15px -5px rgba(234,179,8,0.3)' 
                            : '0 0 15px -5px rgba(239,68,68,0.3)'
                        }}
                      >
                        <MoodIcon 
                          className={cn("w-5 h-5", moodColor)} 
                          style={{ 
                            filter: moodValue >= 7 
                              ? 'drop-shadow(0 0 3px rgba(34,197,94,0.5))' 
                              : undefined 
                          }}
                        />
                      </div>
                      <div>
                        <span className="font-semibold">{moodLabel}</span>
                        <span className="text-muted-foreground ml-2 text-sm">{moodValue}/10</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {entry.timeOfDay && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                          {entry.timeOfDay}
                        </span>
                      )}
                      {entry.triggerTag && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 capitalize">
                          {entry.triggerTag}
                        </span>
                      )}
                      {fronter && (
                        <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fronter.color }} />
                          {fronter.name}
                        </span>
                      )}
                      <span>{format(new Date(entry.timestamp), "MMM d, h:mm a")}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(entry)}
                        data-testid={`button-edit-entry-${entry.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingEntryId(entry.id)}
                        data-testid={`button-delete-entry-${entry.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {entry.capacity !== null && entry.capacity !== undefined && (
                      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                        <BatteryFull className="w-4 h-4 text-emerald-500" />
                        <div className="text-xs">
                          <span className="text-muted-foreground">Capacity</span>
                          <span className="font-semibold ml-1 text-emerald-700">{entry.capacity}/5</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <div className="text-xs">
                        <span className="text-muted-foreground">Energy</span>
                        <span className="font-semibold ml-1">{entry.energy}/10</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                      <Activity className="w-4 h-4 text-red-500" />
                      <div className="text-xs">
                        <span className="text-muted-foreground">Stress</span>
                        <span className="font-semibold ml-1">{entry.stress}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                      <CloudFog className="w-4 h-4 text-purple-500" />
                      <div className="text-xs">
                        <span className="text-muted-foreground">Dissociation</span>
                        <span className="font-semibold ml-1">{entry.dissociation}%</span>
                      </div>
                    </div>
                    {parsed.metrics["Comfort"] && (
                      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                        <HeartPulse className="w-4 h-4 text-pink-500" />
                        <div className="text-xs">
                          <span className="text-muted-foreground">Pain</span>
                          <span className="font-semibold ml-1">{parsed.metrics["Comfort"]}</span>
                        </div>
                      </div>
                    )}
                    {parsed.metrics["Sleep"] && (
                      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                        <Moon className="w-4 h-4 text-indigo-500" />
                        <div className="text-xs">
                          <span className="text-muted-foreground">Sleep</span>
                          <span className="font-semibold ml-1">{parsed.metrics["Sleep"]}</span>
                        </div>
                      </div>
                    )}
                    {parsed.metrics["System Comm"] && (
                      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        <div className="text-xs">
                          <span className="text-muted-foreground">Comm</span>
                          <span className="font-semibold ml-1">{parsed.metrics["System Comm"]}</span>
                        </div>
                      </div>
                    )}
                    {parsed.metrics["Urges"] && (
                      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <div className="text-xs">
                          <span className="text-muted-foreground">Urges</span>
                          <span className="font-semibold ml-1">{parsed.metrics["Urges"]}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags and Triggers */}
                  {(parsed.tags.length > 0 || parsed.triggers.length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.tags.map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {tag}
                        </span>
                      ))}
                      {parsed.triggers.map((trigger, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                          {trigger}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {parsed.text && (
                    <p className="text-sm text-muted-foreground bg-background p-2 rounded-lg border italic">
                      "{parsed.text}"
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Edit Entry Dialog */}
    <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mood (1-10)</label>
            <Slider
              value={editMood}
              onValueChange={setEditMood}
              min={1}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-edit-mood"
            />
            <div className="text-xs text-muted-foreground text-center">{editMood[0]}/10</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Energy (1-10)</label>
            <Slider
              value={editEnergy}
              onValueChange={setEditEnergy}
              min={1}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-edit-energy"
            />
            <div className="text-xs text-muted-foreground text-center">{editEnergy[0]}/10</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Stress (0-10)</label>
            <Slider
              value={editStress}
              onValueChange={setEditStress}
              min={0}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-edit-stress"
            />
            <div className="text-xs text-muted-foreground text-center">{editStress[0] * 10}%</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dissociation (0-10)</label>
            <Slider
              value={editDissociation}
              onValueChange={setEditDissociation}
              min={0}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-edit-dissociation"
            />
            <div className="text-xs text-muted-foreground text-center">{editDissociation[0] * 10}%</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Capacity (0-5)</label>
            <Slider
              value={editCapacity}
              onValueChange={setEditCapacity}
              min={0}
              max={5}
              step={1}
              className="w-full"
              data-testid="slider-edit-capacity"
            />
            <div className="text-xs text-muted-foreground text-center">{editCapacity[0]}/5</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Update your notes..."
              className="min-h-[80px]"
              data-testid="input-edit-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingEntry(null)} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateEntry} 
            disabled={updateEntryMutation.isPending}
            data-testid="button-save-edit"
          >
            {updateEntryMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={!!deletingEntryId} onOpenChange={(open) => !open && setDeletingEntryId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this mood entry.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteEntry}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete"
          >
            {deleteEntryMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
