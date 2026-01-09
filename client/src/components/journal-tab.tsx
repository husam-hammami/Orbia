import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, startOfWeek, isAfter } from "date-fns";
import { 
  BookOpen, 
  Plus, 
  Sparkles, 
  Heart, 
  Flame, 
  Leaf, 
  Brain, 
  Users,
  Sun,
  Moon,
  Sunset,
  Cloud,
  Trash2,
  Edit,
  Send,
  Lock,
  Unlock,
  Calendar,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { useJournalEntries, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry, useMembers } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

const entryTypes = [
  { value: "reflection", label: "Daily Reflection", icon: BookOpen, color: "bg-blue-500", gradient: "from-blue-400 to-blue-600", borderColor: "border-blue-400", description: "End of day thoughts" },
  { value: "vent", label: "Vent / Release", icon: Flame, color: "bg-red-500", gradient: "from-red-400 to-red-600", borderColor: "border-red-400", description: "Let it out safely" },
  { value: "gratitude", label: "Gratitude", icon: Heart, color: "bg-pink-500", gradient: "from-pink-400 to-pink-600", borderColor: "border-pink-400", description: "What you're thankful for" },
  { value: "grounding", label: "Grounding Note", icon: Leaf, color: "bg-green-500", gradient: "from-green-400 to-green-600", borderColor: "border-green-400", description: "Anchor yourself" },
  { value: "memory", label: "Memory / Flashback", icon: Brain, color: "bg-purple-500", gradient: "from-purple-400 to-purple-600", borderColor: "border-purple-400", description: "Processing the past" },
  { value: "system_note", label: "System Note", icon: Users, color: "bg-indigo-500", gradient: "from-indigo-400 to-indigo-600", borderColor: "border-indigo-400", description: "For the system" },
];

const timeOfDayOptions = [
  { value: "morning", label: "Morning", icon: Sun, color: "text-amber-500", bgTint: "bg-amber-50/50" },
  { value: "afternoon", label: "Afternoon", icon: Cloud, color: "text-blue-400", bgTint: "bg-blue-50/50" },
  { value: "evening", label: "Evening", icon: Sunset, color: "text-orange-500", bgTint: "bg-orange-50/50" },
  { value: "night", label: "Night", icon: Moon, color: "text-indigo-400", bgTint: "bg-indigo-50/50" },
];

const tagOptions = [
  "anxiety", "calm", "dissociation", "grounded", "triggered", "safe", 
  "switching", "co-conscious", "pain", "tired", "hopeful", "overwhelmed",
  "productive", "creative", "lonely", "connected"
];

const moodEmojis = ["😢", "😕", "😐", "🙂", "😊"];
const energyEmojis = ["🪫", "🔋", "⚡"];

function getTimeOfDayAuto(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function MoodEnergyBar({ value, type }: { value: number; type: "mood" | "energy" }) {
  const percentage = ((value - 1) / 9) * 100;
  const gradientClass = type === "energy" 
    ? "from-cyan-400 to-indigo-500" 
    : "from-amber-400 to-rose-500";
  const emoji = type === "mood" 
    ? moodEmojis[Math.round((value - 1) / 2.25)]
    : energyEmojis[Math.min(2, Math.floor((value - 1) / 3.5))];
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{emoji}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          className={cn("h-full rounded-full bg-gradient-to-r", gradientClass)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs text-slate-500 font-medium w-6">{value}</span>
    </div>
  );
}

export function JournalTab() {
  const { data: entries, isLoading } = useJournalEntries();
  const { data: members } = useMembers();
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [entryType, setEntryType] = useState("reflection");
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDayAuto());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);

  const stats = useMemo(() => {
    if (!entries) return { total: 0, thisWeek: 0 };
    const weekStart = startOfWeek(new Date());
    const thisWeek = entries.filter(e => isAfter(new Date(e.createdAt), weekStart)).length;
    return { total: entries.length, thisWeek };
  }, [entries]);

  const resetForm = () => {
    setContent("");
    setEntryType("reflection");
    setMood(null);
    setEnergy(null);
    setAuthorId(null);
    setTimeOfDay(getTimeOfDayAuto());
    setSelectedTags([]);
    setIsPrivate(false);
    setEditingId(null);
    setIsWriting(false);
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Please write something first");
      return;
    }

    const data = {
      content: content.trim(),
      entryType,
      mood,
      energy,
      authorId,
      timeOfDay,
      tags: selectedTags,
      isPrivate: isPrivate ? 1 : 0,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data }, {
        onSuccess: () => {
          toast.success("Entry updated");
          resetForm();
        },
        onError: () => toast.error("Failed to update entry"),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Entry saved");
          resetForm();
        },
        onError: () => toast.error("Failed to save entry"),
      });
    }
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setContent(entry.content);
    setEntryType(entry.entryType);
    setMood(entry.mood);
    setEnergy(entry.energy);
    setAuthorId(entry.authorId);
    setTimeOfDay(entry.timeOfDay || getTimeOfDayAuto());
    setSelectedTags(entry.tags || []);
    setIsPrivate(entry.isPrivate === 1);
    setIsWriting(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Entry deleted"),
      onError: () => toast.error("Failed to delete entry"),
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getTypeConfig = (type: string) => entryTypes.find(t => t.value === type) || entryTypes[0];
  const getAuthor = (id: string | null) => members?.find(m => m.id === id);
  const currentTypeConfig = getTypeConfig(entryType);

  return (
    <div className="space-y-5">
      <div className="relative bg-gradient-to-br from-white/80 via-slate-50/80 to-indigo-50/50 rounded-2xl border border-slate-200/60 p-5 backdrop-blur-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-200/20 to-violet-200/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Your Journal
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Express yourself freely, track your inner world
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-slate-200/60">
                <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                <span className="font-semibold text-slate-700">{stats.total}</span>
                <span className="text-slate-500 text-xs">total</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-slate-200/60">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-slate-700">{stats.thisWeek}</span>
                <span className="text-slate-500 text-xs">this week</span>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={() => setIsWriting(true)} 
                className="gap-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all"
                data-testid="button-new-entry"
              >
                <Plus className="w-4 h-4" />
                New Entry
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isWriting && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div 
              className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden"
              style={{ borderLeftWidth: "4px", borderLeftColor: `var(--${currentTypeConfig.value}-color, #6366f1)` }}
            >
              <style>{`
                :root {
                  --reflection-color: #3b82f6;
                  --vent-color: #ef4444;
                  --gratitude-color: #ec4899;
                  --grounding-color: #22c55e;
                  --memory-color: #a855f7;
                  --system_note-color: #6366f1;
                }
              `}</style>
              
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {editingId ? "Edit Entry" : "Write New Entry"}
                  </h3>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      isPrivate 
                        ? "bg-violet-100 text-violet-700 border border-violet-200" 
                        : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                    )}
                    data-testid="button-toggle-private"
                  >
                    {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    {isPrivate ? "Private" : "Shared"}
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {entryTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = entryType === type.value;
                    return (
                      <motion.button
                        key={type.value}
                        onClick={() => setEntryType(type.value)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200",
                          "bg-white/60 backdrop-blur-sm",
                          isSelected 
                            ? `${type.borderColor} border-2 shadow-lg` 
                            : "border-slate-200/60 hover:border-slate-300 hover:shadow-md"
                        )}
                        style={isSelected ? { 
                          boxShadow: `0 10px 40px -10px ${type.value === 'reflection' ? 'rgba(59,130,246,0.3)' : 
                            type.value === 'vent' ? 'rgba(239,68,68,0.3)' : 
                            type.value === 'gratitude' ? 'rgba(236,72,153,0.3)' : 
                            type.value === 'grounding' ? 'rgba(34,197,94,0.3)' : 
                            type.value === 'memory' ? 'rgba(168,85,247,0.3)' : 
                            'rgba(99,102,241,0.3)'}`
                        } : {}}
                        data-testid={`button-type-${type.value}`}
                      >
                        <div className={cn(
                          "p-2.5 rounded-xl bg-gradient-to-br text-white shadow-md",
                          type.gradient
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-semibold text-slate-700 block">{type.label}</span>
                          <span className="text-[10px] text-slate-500">{type.description}</span>
                        </div>
                        {isSelected && (
                          <motion.div 
                            layoutId="selectedType"
                            className="absolute inset-0 rounded-xl border-2"
                            style={{ 
                              borderColor: type.value === 'reflection' ? '#3b82f6' : 
                                type.value === 'vent' ? '#ef4444' : 
                                type.value === 'gratitude' ? '#ec4899' : 
                                type.value === 'grounding' ? '#22c55e' : 
                                type.value === 'memory' ? '#a855f7' : '#6366f1'
                            }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <label className="text-xs font-medium text-slate-500 mb-2 block">Who is writing?</label>
                    <Select value={authorId || "__none__"} onValueChange={(v) => setAuthorId(v === "__none__" ? null : v)}>
                      <SelectTrigger data-testid="select-author" className="bg-white/80 border-slate-200">
                        <SelectValue placeholder="Select alter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unknown / Blended</SelectItem>
                        {members?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                              {m.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <label className="text-xs font-medium text-slate-500 mb-2 block">Time of Day</label>
                    <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                      <SelectTrigger data-testid="select-time-of-day" className="bg-white/80 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOfDayOptions.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-2">
                                <Icon className={cn("w-4 h-4", opt.color)} />
                                {opt.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <label className="text-xs font-medium text-slate-500 mb-2 block">
                      Mood: {mood !== null ? moodEmojis[Math.round((mood - 1) / 2.25)] : "—"}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-200 via-amber-300 to-rose-400 rounded-full opacity-30" />
                      <Slider
                        value={mood !== null ? [mood] : [5]}
                        onValueChange={([v]) => setMood(v)}
                        min={1}
                        max={10}
                        step={1}
                        className="py-2"
                        data-testid="slider-mood"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">
                    Energy: {energy !== null ? energyEmojis[Math.min(2, Math.floor((energy - 1) / 3.5))] : "—"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-200 via-blue-300 to-indigo-400 rounded-full opacity-30" />
                    <Slider
                      value={energy !== null ? [energy] : [5]}
                      onValueChange={([v]) => setEnergy(v)}
                      min={1}
                      max={10}
                      step={1}
                      className="py-2"
                      data-testid="slider-energy"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 mb-2 block">Tags (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <motion.button
                          key={tag}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                            isSelected 
                              ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white border-transparent shadow-md" 
                              : "bg-white/60 backdrop-blur-sm text-slate-600 border-slate-200 hover:border-cyan-300 hover:bg-white"
                          )}
                          data-testid={`tag-${tag}`}
                        >
                          {tag}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <Textarea
                  placeholder="Write freely... this is your safe space."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[150px] resize-none bg-white/80 backdrop-blur-sm border-slate-200 focus:border-cyan-300 focus:ring-cyan-200"
                  data-testid="textarea-content"
                />

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetForm} className="border-slate-200" data-testid="button-cancel">
                    Cancel
                  </Button>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="gap-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 shadow-lg shadow-cyan-500/20"
                      data-testid="button-save-entry"
                    >
                      <Send className="w-4 h-4" />
                      {editingId ? "Update" : "Save Entry"}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-700">Past Entries</h2>
        </div>
        
        {isLoading ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8">
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5 text-cyan-500" />
              </motion.div>
              <span className="text-slate-500">Loading entries...</span>
            </div>
          </div>
        ) : entries?.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-gradient-to-br from-white/80 to-slate-50/80 rounded-2xl border border-slate-200/60 p-12 text-center overflow-hidden backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/20 via-transparent to-violet-100/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-cyan-200/30 to-violet-200/30 rounded-full blur-3xl" />
            
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex p-4 rounded-full bg-gradient-to-br from-cyan-100 to-violet-100 mb-4"
              >
                <Sparkles className="w-10 h-10 text-cyan-600" />
              </motion.div>
              
              <h3 className="text-lg font-semibold bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent mb-2">
                No journal entries yet
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Start writing to track your journey
              </p>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={() => setIsWriting(true)}
                  className="gap-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600"
                  data-testid="button-first-entry"
                >
                  <Plus className="w-4 h-4" />
                  Write your first entry
                </Button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <ScrollArea className="h-[450px]">
            <div className="space-y-3 pr-4">
              <TooltipProvider>
                {entries?.map((entry, index) => {
                  const typeConfig = getTypeConfig(entry.entryType);
                  const Icon = typeConfig.icon;
                  const author = getAuthor(entry.authorId);
                  const timeOption = timeOfDayOptions.find(t => t.value === entry.timeOfDay);
                  const TimeIcon = timeOption?.icon || Sun;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ y: -2, boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)" }}
                      className={cn(
                        "relative bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 overflow-hidden group transition-shadow",
                        timeOption?.bgTint
                      )}
                      style={{ borderLeftWidth: "4px", borderLeftColor: `var(--${entry.entryType}-color, #6366f1)` }}
                      data-testid={`entry-${entry.id}`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-xl bg-gradient-to-br text-white shadow-md shrink-0",
                            typeConfig.gradient
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-sm font-semibold text-slate-700">{typeConfig.label}</span>
                              {author && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: author.color }} />
                                  {author.name}
                                </span>
                              )}
                              {entry.isPrivate === 1 && (
                                <Lock className="w-3 h-3 text-violet-500" />
                              )}
                              <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                                <TimeIcon className={cn("w-3 h-3", timeOption?.color)} />
                                {format(new Date(entry.createdAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                            
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                            
                            <div className="flex flex-col gap-2 mt-3">
                              {(entry.mood || entry.energy) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {entry.mood && (
                                    <div className="bg-white/60 rounded-lg p-2 border border-slate-100">
                                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Mood</span>
                                      <MoodEnergyBar value={entry.mood} type="mood" />
                                    </div>
                                  )}
                                  {entry.energy && (
                                    <div className="bg-white/60 rounded-lg p-2 border border-slate-100">
                                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Energy</span>
                                      <MoodEnergyBar value={entry.energy} type="energy" />
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {entry.tags && entry.tags.length > 0 && (
                                <div className="flex gap-1.5 flex-wrap">
                                  {entry.tags.map((tag: string) => (
                                    <span 
                                      key={tag} 
                                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border border-slate-200/60"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50"
                                  onClick={() => handleEdit(entry)}
                                  aria-label="Edit entry"
                                  data-testid={`button-edit-${entry.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit entry</TooltipContent>
                            </Tooltip>
                            
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                      aria-label="Delete entry"
                                      data-testid={`button-delete-${entry.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Delete entry</TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This entry will be permanently deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(entry.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </TooltipProvider>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
