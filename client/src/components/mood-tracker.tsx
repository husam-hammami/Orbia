import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Smile, Frown, Meh, Zap, BatteryLow, BatteryFull, Activity, HeartPulse, UserCircle2, CloudFog, Moon, BedDouble, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function MoodTracker() {
  const [mood, setMood] = useState<string | null>(null);
  const [motivation, setMotivation] = useState([5]);
  const [comfort, setComfort] = useState([5]); 
  const [dissociation, setDissociation] = useState([2]); // Low dissociation by default
  const [sleep, setSleep] = useState([7]); 
  const [whoIsFronting, setWhoIsFronting] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-semibold text-lg">Daily Check-in</h3>
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
           {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Mental & Emotional */}
        <div className="space-y-8">
            {/* Mood Selector */}
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-3 block">Mental State</label>
              <div className="flex justify-between gap-2">
                {moods.map((m) => {
                  const Icon = m.icon;
                  const isSelected = mood === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      title={m.label}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl transition-all w-full relative group",
                        isSelected 
                          ? `${m.bg} ring-2 ring-offset-2 ring-${m.color.split('-')[1]}-500` 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Icon className={cn("w-6 h-6 transition-transform", isSelected ? `scale-110 ${m.color}` : "text-muted-foreground")} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dissociation Scale (New) */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CloudFog className="w-4 h-4 text-purple-500" />
                    <label className="text-sm font-medium">Dissociation Level</label>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    dissociation[0] < 3 ? "bg-green-100 text-green-700" :
                    dissociation[0] < 7 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                  )}>
                    {dissociation[0] < 3 ? "Grounded" : dissociation[0] < 7 ? "Blurry" : "Dissociated"}
                  </span>
               </div>
               
               <Slider
                  value={dissociation}
                  onValueChange={setDissociation}
                  max={10}
                  step={1}
                  className="cursor-pointer mb-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  <span>Present</span>
                  <span>Switched / Lost Time</span>
                </div>
            </div>

            {/* Fronting Input */}
            <div>
                <label className="text-sm text-muted-foreground font-medium mb-2 block flex items-center gap-2">
                   <UserCircle2 className="w-4 h-4" />
                   Who is fronting?
                </label>
                <Input 
                   placeholder="Name or role (optional)..." 
                   value={whoIsFronting}
                   onChange={(e) => setWhoIsFronting(e.target.value)}
                   className="bg-muted/30 border-muted-foreground/20"
                />
            </div>
        </div>

        {/* Right Column: Physical & Factors */}
        <div className="space-y-8">
            {/* Physical Comfort */}
            <div>
               <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-muted-foreground font-medium">Physical Comfort (Pain)</label>
                  <span className="text-sm font-mono font-bold text-primary">{comfort[0]}/10</span>
               </div>
               <Slider
                  value={comfort}
                  onValueChange={setComfort}
                  max={10}
                  step={1}
                  className="cursor-pointer"
               />
               <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1 text-red-400"><Activity className="w-3 h-3" /> High Pain</span>
                  <span className="flex items-center gap-1 text-green-600">Comfortable <HeartPulse className="w-3 h-3" /></span>
               </div>
            </div>

            {/* Sleep Quality (New) */}
            <div>
               <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-muted-foreground font-medium">Sleep Quality</label>
                  <span className="text-sm font-mono font-bold text-primary">{sleep[0]}/10</span>
               </div>
               <Slider
                  value={sleep}
                  onValueChange={setSleep}
                  max={10}
                  step={1}
                  className="cursor-pointer"
               />
               <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Restless</span>
                  <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" /> Rested</span>
               </div>
            </div>

            {/* Energy Level */}
            <div>
               <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-muted-foreground font-medium">Energy Level</label>
                  <span className="text-sm font-mono font-bold">{motivation[0]}/10</span>
               </div>
               <Slider
                  value={motivation}
                  onValueChange={setMotivation}
                  max={10}
                  step={1}
                  className="cursor-pointer"
               />
               <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><BatteryLow className="w-3 h-3" /> Low</span>
                  <span className="flex items-center gap-1"><BatteryFull className="w-3 h-3" /> High</span>
               </div>
            </div>
        </div>
      </div>

      {/* Tags Section (New) */}
      <div className="mt-8 pt-6 border-t border-border">
          <label className="text-sm text-muted-foreground font-medium mb-3 block flex items-center gap-2">
             <Sparkles className="w-3.5 h-3.5" />
             Factors & Triggers
          </label>
          <div className="flex flex-wrap gap-2">
             {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-all",
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50 text-muted-foreground"
                  )}
                >
                  {tag}
                </button>
             ))}
             <button className="text-xs px-3 py-1.5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground transition-colors">
                + Add Custom
             </button>
          </div>
      </div>
    </div>
  );
}
