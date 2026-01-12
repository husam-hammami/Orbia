import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Smile, Frown, Meh, Zap, Sun, Cloud, Heart, Sparkles, ChevronDown, ChevronUp, Clock, Loader2, Moon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useTrackerEntries, useCreateTrackerEntry, useUpdateTrackerEntry, useDeleteTrackerEntry } from "@/lib/api-hooks";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { TrackerEntry } from "@shared/schema";

export function MoodTracker() {
  const { data: trackerEntries, isLoading: entriesLoading } = useTrackerEntries(30);
  const createEntryMutation = useCreateTrackerEntry();
  const updateEntryMutation = useUpdateTrackerEntry();
  const deleteEntryMutation = useDeleteTrackerEntry();

  const [isExpanded, setIsExpanded] = useState(true);
  const [editingEntry, setEditingEntry] = useState<TrackerEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [editMood, setEditMood] = useState([5]);
  const [editEnergy, setEditEnergy] = useState([5]);
  const [editNotes, setEditNotes] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState([5]);
  const [sleep, setSleep] = useState([7.5]);
  const [note, setNote] = useState("");
  const [entryTime, setEntryTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const getTimeOfDay = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
  };

  const entriesToday = (trackerEntries || []).filter(entry => {
    const entryDate = format(new Date(entry.timestamp), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    return entryDate === today;
  }).map(entry => ({
    time: format(new Date(entry.timestamp), "HH:mm"),
    mood: entry.mood <= 3 ? "rough" : entry.mood <= 5 ? "okay" : entry.mood <= 7 ? "good" : "great"
  }));

  const emotionalStates = [
    { value: "rough", icon: Cloud, color: "text-slate-500", bg: "bg-slate-100", label: "Rough Day", emoji: "😔" },
    { value: "meh", icon: Meh, color: "text-amber-500", bg: "bg-amber-100", label: "Just Meh", emoji: "😐" },
    { value: "okay", icon: Sun, color: "text-yellow-500", bg: "bg-yellow-100", label: "Doing Okay", emoji: "🙂" },
    { value: "good", icon: Smile, color: "text-green-500", bg: "bg-green-100", label: "Good!", emoji: "😊" },
    { value: "great", icon: Sparkles, color: "text-pink-500", bg: "bg-pink-100", label: "Wonderful!", emoji: "✨" },
  ];

  const quickTags = [
    "Productive", "Tired", "Excited", "Relaxed", "Anxious", "Motivated", 
    "Creative", "Social", "Cozy", "Focused"
  ];

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddEntry = () => {
    const moodValue = mood === "rough" ? 2 : mood === "meh" ? 4 : mood === "okay" ? 5 : mood === "good" ? 7 : mood === "great" ? 9 : 5;
    
    const noteParts = [];
    if (note) noteParts.push(note);
    if (selectedTags.length > 0) noteParts.push(`Feeling: ${selectedTags.join(", ")}`);
    if (sleep[0] > 0) noteParts.push(`Sleep: ${sleep[0]}h`);

    createEntryMutation.mutate({
      frontingMemberId: null,
      mood: moodValue,
      energy: energy[0],
      stress: 0,
      dissociation: 0,
      sleepHours: sleep[0] > 0 ? sleep[0] : null,
      sleepQuality: null,
      capacity: null,
      pain: null,
      triggerTag: null,
      workLoad: null,
      workTag: null,
      timeOfDay: getTimeOfDay(),
      notes: noteParts.join(" | "),
      timestamp: new Date(),
    }, {
      onSuccess: () => {
        toast.success("How you're feeling has been logged!");
        setNote("");
        setSelectedTags([]);
        setMood(null);
      },
      onError: () => toast.error("Oops! Something went wrong"),
    });
  };

  const openEditDialog = (entry: TrackerEntry) => {
    setEditingEntry(entry);
    setEditMood([entry.mood]);
    setEditEnergy([entry.energy]);
    setEditNotes(entry.notes || "");
  };

  const handleUpdateEntry = () => {
    if (!editingEntry) return;
    
    updateEntryMutation.mutate({
      id: editingEntry.id,
      data: {
        mood: editMood[0],
        energy: editEnergy[0],
        notes: editNotes,
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
      <div className="p-4 flex items-center justify-between gap-4">
         <div className="flex items-center gap-4 flex-1">
            <div>
                <h3 className="font-display font-semibold text-lg hidden sm:block">How are you feeling?</h3>
                <p className="text-[10px] text-muted-foreground hidden sm:block">
                    {entriesToday.length} check-ins today{entriesToday.length > 0 ? ` • Last at ${entriesToday[entriesToday.length-1]?.time}` : ''}
                </p>
            </div>
            
            <div className="flex gap-1.5 bg-muted/30 p-1.5 rounded-full">
                {emotionalStates.map((m) => {
                  const Icon = m.icon;
                  const isSelected = mood === m.value;
                  return (
                    <motion.button
                      key={m.value}
                      onClick={(e) => { e.stopPropagation(); setMood(m.value); }}
                      title={m.label}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "p-2.5 rounded-full transition-all duration-300 relative",
                        isSelected 
                          ? `${m.bg} ${m.color} ring-2 ring-offset-1` 
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      data-testid={`button-mood-${m.value}`}
                    >
                      <span className="text-lg">{m.emoji}</span>
                    </motion.button>
                  );
                })}
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
            {isExpanded ? "Close" : "Check In"}
            {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
         </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-border"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-4 rounded-xl border border-purple-100/50 dark:border-purple-900/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">Energy Level</span>
                      <span className="ml-auto text-sm font-mono text-amber-600">
                        {energy[0] <= 3 ? "Low" : energy[0] <= 6 ? "Medium" : "High"}
                      </span>
                    </div>
                    <Slider 
                      value={energy} 
                      onValueChange={setEnergy} 
                      max={10} 
                      step={1} 
                      className="h-3"
                      data-testid="slider-energy"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Running on empty</span>
                      <span>Full of energy!</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-medium">Sleep Last Night</span>
                      <span className="ml-auto text-sm font-mono text-indigo-600">{sleep[0]}h</span>
                    </div>
                    <Slider 
                      value={sleep} 
                      onValueChange={setSleep} 
                      max={12} 
                      step={0.5} 
                      className="h-3"
                      data-testid="slider-sleep"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-sm font-medium block mb-3">Quick Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {quickTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          data-testid={`button-tag-${tag.toLowerCase()}`}
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-full transition-all",
                            selectedTags.includes(tag)
                              ? "bg-teal-100 text-teal-700 ring-1 ring-teal-300 dark:bg-teal-900/50 dark:text-teal-300"
                              : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Textarea 
                    placeholder="What's on your mind? (optional)"
                    className="bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/50 resize-none h-24 text-sm"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    data-testid="textarea-note"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={handleAddEntry}
                  disabled={!mood || createEntryMutation.isPending}
                  className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 shadow-lg shadow-teal-600/20"
                  data-testid="button-log-entry"
                >
                  {createEntryMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Heart className="w-4 h-4 mr-2" />
                  )}
                  Log Check-In
                </Button>
              </div>

              {entriesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : trackerEntries && trackerEntries.length > 0 ? (
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground">Recent Check-Ins</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {trackerEntries.slice(0, 5).map((entry) => {
                      const moodState = entry.mood <= 3 ? emotionalStates[0] : 
                                       entry.mood <= 4 ? emotionalStates[1] : 
                                       entry.mood <= 5 ? emotionalStates[2] : 
                                       entry.mood <= 7 ? emotionalStates[3] : emotionalStates[4];
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                        >
                          <span className="text-xl">{moodState.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{moodState.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(entry.timestamp), "MMM d, h:mm a")}
                              </span>
                            </div>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground truncate">{entry.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(entry)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingEntryId(entry.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Check-In</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mood (1-10)</label>
            <Slider value={editMood} onValueChange={setEditMood} max={10} step={1} />
            <span className="text-xs text-muted-foreground">{editMood[0]}/10</span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Energy (1-10)</label>
            <Slider value={editEnergy} onValueChange={setEditEnergy} max={10} step={1} />
            <span className="text-xs text-muted-foreground">{editEnergy[0]}/10</span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea 
              value={editNotes} 
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="How were you feeling?"
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
          <Button onClick={handleUpdateEntry} disabled={updateEntryMutation.isPending}>
            {updateEntryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!deletingEntryId} onOpenChange={() => setDeletingEntryId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this check-in?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this mood entry.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteEntry} className="bg-red-500 hover:bg-red-600">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
