import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Smile, Frown, Meh, Zap, BatteryLow, BatteryFull, Activity, HeartPulse, UserCircle2, CloudFog, Moon, BedDouble, AlertCircle, Sparkles, Flame, MessageSquare, MicOff, Mic, ChevronDown, ChevronUp, Utensils, Coffee, Sun, MoonStar, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function MoodTracker() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [motivation, setMotivation] = useState([5]);
  const [comfort, setComfort] = useState([5]); 
  const [dissociation, setDissociation] = useState([2]); 
  const [urges, setUrges] = useState([1]); 
  const [sleep, setSleep] = useState([7]); 
  const [systemComm, setSystemComm] = useState([5]); 
  const [whoIsFronting, setWhoIsFronting] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false, snack: false });

  const toggleMeal = (meal: keyof typeof meals) => {
    setMeals(prev => ({ ...prev, [meal]: !prev[meal] }));
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

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-300">
      {/* Compact Header - Always Visible */}
      <div className="p-4 flex items-center justify-between gap-4">
         <div className="flex items-center gap-4 flex-1">
            <h3 className="font-display font-semibold text-lg hidden sm:block">Check-in</h3>
            
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
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-[200px]">
               <UserCircle2 className="w-4 h-4 text-muted-foreground" />
               <Input 
                   placeholder="Fronting?" 
                   value={whoIsFronting}
                   onChange={(e) => setWhoIsFronting(e.target.value)}
                   className="h-9 bg-transparent border-transparent hover:border-border focus:bg-background focus:border-input transition-all px-2"
                />
            </div>
         </div>

         <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground shrink-0"
         >
            {isExpanded ? "Close" : "Details"}
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
                    <div className="md:hidden">
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Who is fronting?</label>
                        <Input 
                           value={whoIsFronting}
                           onChange={(e) => setWhoIsFronting(e.target.value)}
                           className="h-8 bg-muted/30"
                        />
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
              <div className="pt-4 border-t border-border flex flex-wrap gap-2">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
