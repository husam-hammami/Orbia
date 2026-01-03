import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Smile, Frown, Meh, Zap, BatteryLow, BatteryFull, Activity, HeartPulse, UserCircle2, CloudFog, Moon, BedDouble, AlertCircle, Sparkles, Flame, MessageSquare, MicOff, Mic, ChevronDown, ChevronUp, Utensils, Coffee, Sun, MoonStar, Cookie, Clock, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMembers, useTrackerEntries, useCreateTrackerEntry } from "@/lib/api-hooks";
import { toast } from "sonner";
import { format } from "date-fns";

export function MoodTracker() {
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: trackerEntries } = useTrackerEntries(5);
  const createEntryMutation = useCreateTrackerEntry();

  const [isExpanded, setIsExpanded] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [motivation, setMotivation] = useState([5]);
  const [comfort, setComfort] = useState([5]); 
  const [dissociation, setDissociation] = useState([2]); 
  const [urges, setUrges] = useState([1]); 
  const [stress, setStress] = useState([3]);
  const [sleep, setSleep] = useState([7]); 
  const [systemComm, setSystemComm] = useState([5]); 
  const [selectedFronterId, setSelectedFronterId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stressCauses, setStressCauses] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false, snack: false });
  const [entryTime, setEntryTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const selectedFronter = members?.find(m => m.id === selectedFronterId) || members?.[0];

  const entriesToday = (trackerEntries || []).filter(entry => {
    const entryDate = format(new Date(entry.timestamp), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    return entryDate === today;
  }).map(entry => ({
    time: format(new Date(entry.timestamp), "HH:mm"),
    mood: entry.mood <= 2 ? "bad" : entry.mood <= 3 ? "neutral" : "good"
  }));

  const toggleMeal = (meal: keyof typeof meals) => {
    setMeals(prev => ({ ...prev, [meal]: !prev[meal] }));
  };

  const toggleStressCause = (cause: string) => {
    if (stressCauses.includes(cause)) {
        setStressCauses(stressCauses.filter(c => c !== cause));
    } else {
        setStressCauses([...stressCauses, cause]);
    }
  };

  const moods = [
    { value: "terrible", icon: Frown, color: "text-red-500", bg: "bg-red-100", label: "Terrible" },
    { value: "bad", icon: Meh, color: "text-orange-500", bg: "bg-orange-100", label: "Bad" },
    { value: "neutral", icon: Meh, color: "text-yellow-500", bg: "bg-yellow-100", label: "Okay" },
    { value: "good", icon: Smile, color: "text-green-500", bg: "bg-green-100", label: "Good" },
    { value: "excellent", icon: Zap, color: "text-blue-500", bg: "bg-blue-100", label: "Great" },
  ];

  const tags = [
    "Therapy", "Pain Spike", "Insomnia", "Triggered", "Switchy", "Productive", 
    "Socializing", "Medication", "Grounding", "Flashback", "Rest"
  ];

  const stressTriggers = [
    "Work", "Loneliness", "Horniness", "Finance", "Family", "Health", "Social"
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddEntry = () => {
    const moodValue = mood === "terrible" ? 1 : mood === "bad" ? 2 : mood === "neutral" ? 3 : mood === "good" ? 4 : mood === "excellent" ? 5 : 3;
    
    const noteParts = [];
    if (note) noteParts.push(note);
    if (selectedTags.length > 0) noteParts.push(`Tags: ${selectedTags.join(", ")}`);
    if (stressCauses.length > 0) noteParts.push(`Stress triggers: ${stressCauses.join(", ")}`);
    const mealsEaten = Object.entries(meals).filter(([_, eaten]) => eaten).map(([meal]) => meal);
    if (mealsEaten.length > 0) noteParts.push(`Meals: ${mealsEaten.join(", ")}`);

    createEntryMutation.mutate({
      frontingMemberId: selectedFronter?.id || null,
      mood: moodValue,
      energy: motivation[0],
      stress: stress[0] * 10,
      dissociation: dissociation[0] * 10,
      notes: noteParts.join(" | "),
      timestamp: new Date(),
    }, {
      onSuccess: () => {
        toast.success("Entry logged successfully!");
        setNote("");
        setSelectedTags([]);
        setStressCauses([]);
        setIsExpanded(false);
      },
      onError: () => toast.error("Failed to log entry"),
    });
  };

  return (
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
            
            {/* Quick Mood Select */}
            <div className="flex gap-1 bg-muted/30 p-1 rounded-full">
                {moods.map((m) => {
                  const Icon = m.icon;
                  const isSelected = mood === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={(e) => { e.stopPropagation(); setMood(m.value); }}
                      title={m.label}
                      className={cn(
                        "p-2 rounded-full transition-all",
                        isSelected 
                          ? `${m.bg} ${m.color} shadow-sm ring-1 ring-inset ring-black/5` 
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isSelected && "scale-110")} />
                    </button>
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
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-purple-600">
                             <CloudFog className="w-3.5 h-3.5" />
                             <span className="text-xs font-semibold">Dissociation</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border">
                             {dissociation[0]}/10
                          </span>
                       </div>
                       <Slider value={dissociation} onValueChange={setDissociation} max={10} step={1} className="h-4" />
                    </div>

                    {/* System Comm */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-indigo-600">
                             <MessageSquare className="w-3.5 h-3.5" />
                             <span className="text-xs font-semibold">Communication</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border">
                             {systemComm[0]}/10
                          </span>
                       </div>
                       <Slider value={systemComm} onValueChange={setSystemComm} max={10} step={1} className="h-4 [&_.bg-primary]:bg-indigo-500" />
                    </div>
                    
                    {/* Mobile Fronting Input (visible if hidden in header) */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Who is fronting?</label>
                        {membersLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                          </div>
                        ) : members && members.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                              {members.map(member => (
                                  <button
                                      key={member.id}
                                      onClick={() => setSelectedFronterId(member.id)}
                                      data-testid={`button-fronter-${member.id}`}
                                      className={cn(
                                          "text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5",
                                          selectedFronter?.id === member.id 
                                              ? "bg-background shadow-sm border-indigo-500 ring-1 ring-indigo-500/20" 
                                              : "bg-muted/30 border-transparent hover:bg-muted"
                                      )}
                                      style={{ color: selectedFronter?.id === member.id ? member.color : undefined }}
                                  >
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: member.color }} />
                                      {member.name}
                                  </button>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No members yet. Add members in System Insight.</p>
                        )}
                    </div>
                </div>

                {/* 2. Physical Body */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Body Vitals</h4>
                    
                    {/* Meal Tracking (New) */}
                    <div className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30">
                       <div className="flex items-center gap-1.5 text-orange-600 mb-2">
                          <Utensils className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">Nourishment</span>
                       </div>
                       
                       <div className="flex justify-between gap-1">
                          {[
                            { key: 'breakfast', icon: Coffee, label: 'AM' },
                            { key: 'lunch', icon: Sun, label: 'Noon' },
                            { key: 'dinner', icon: MoonStar, label: 'PM' },
                            { key: 'snack', icon: Cookie, label: 'Snack' },
                          ].map((meal) => {
                             const Icon = meal.icon;
                             const isActive = meals[meal.key as keyof typeof meals];
                             return (
                                <button
                                  key={meal.key}
                                  onClick={() => toggleMeal(meal.key as keyof typeof meals)}
                                  className={cn(
                                    "flex-1 flex flex-col items-center gap-1 p-1.5 rounded-md border transition-all",
                                    isActive
                                      ? "bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/40 dark:text-orange-100"
                                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                                  )}
                                  title={`Did you eat ${meal.key}?`}
                                >
                                   <Icon className={cn("w-3.5 h-3.5", isActive && "fill-current")} />
                                   <span className="text-[9px] font-medium uppercase">{meal.label}</span>
                                </button>
                             );
                          })}
                       </div>
                    </div>

                    {/* Pain */}
                    <div>
                       <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Pain Level</span>
                          <span className="font-mono">{comfort[0]}/10</span>
                       </div>
                       <Slider value={comfort} onValueChange={setComfort} max={10} step={1} />
                    </div>

                    {/* Sleep */}
                    <div>
                       <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Sleep Quality</span>
                          <span className="font-mono">{sleep[0]}/10</span>
                       </div>
                       <Slider value={sleep} onValueChange={setSleep} max={10} step={1} />
                    </div>

                    {/* Energy */}
                    <div>
                       <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Energy</span>
                          <span className="font-mono">{motivation[0]}/10</span>
                       </div>
                       <Slider value={motivation} onValueChange={setMotivation} max={10} step={1} />
                    </div>
                </div>

                {/* 3. Intensity & Notes */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Intensity & Context</h4>

                    {/* Urges */}
                    <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-orange-600">
                             <Flame className="w-3.5 h-3.5" />
                             <span className="text-xs font-semibold">Intrusive Urges</span>
                          </div>
                          <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border text-orange-700">
                             {urges[0] < 3 ? "Quiet" : urges[0] < 7 ? "Present" : "Intense"}
                          </span>
                       </div>
                       <Slider value={urges} onValueChange={setUrges} max={10} step={1} className="h-4 [&_.bg-primary]:bg-orange-500" />
                    </div>

                    {/* Stress Monitor (New) */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/10 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <Activity className="w-3.5 h-3.5" />
                                <span className="text-xs font-semibold">Stress Load</span>
                            </div>
                            <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border">
                                {stress[0]}/10
                            </span>
                        </div>
                        <Slider value={stress} onValueChange={setStress} max={10} step={1} className="h-4 [&_.bg-primary]:bg-slate-500" />
                        
                        {/* Stress Triggers */}
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                            {stressTriggers.map(trigger => (
                                <button
                                    key={trigger}
                                    onClick={() => toggleStressCause(trigger)}
                                    className={cn(
                                        "text-[9px] px-2 py-0.5 rounded-full border transition-all",
                                        stressCauses.includes(trigger)
                                            ? "bg-slate-500 text-white border-slate-500"
                                            : "bg-background border-slate-200 text-slate-500 hover:border-slate-300"
                                    )}
                                >
                                    {trigger}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note */}
                    <Textarea 
                         placeholder="Daily Note..."
                         className="bg-muted/30 resize-none h-[88px] text-xs"
                         value={note}
                         onChange={(e) => setNote(e.target.value)}
                    />
                </div>
              </div>

              {/* Tags Footer */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row justify-between gap-4">
                 <div className="flex flex-wrap gap-2 flex-1">
                    {tags.map(tag => (
                        <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                            "text-[10px] px-2.5 py-1 rounded-full border transition-all",
                            selectedTags.includes(tag)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50 text-muted-foreground"
                        )}
                        >
                        {tag}
                        </button>
                    ))}
                    <button className="text-[10px] px-2.5 py-1 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground">
                        + Add
                    </button>
                 </div>
                 
                 <Button 
                    size="sm" 
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
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
  );
}
