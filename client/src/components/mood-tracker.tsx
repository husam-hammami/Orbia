import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap, Heart, Moon, Loader2, Pencil, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTrackerEntries, useCreateTrackerEntry, useUpdateTrackerEntry, useDeleteTrackerEntry } from "@/lib/api-hooks";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { TrackerEntry } from "@shared/schema";

// Clean horizontal emoji selector
interface EmojiSelectorProps {
  options: { value: number; emoji: string; label: string }[];
  selected: number | null;
  onSelect: (value: number) => void;
  label: string;
  icon: ReactNode;
}

function EmojiSelector({ options, selected, onSelect, label, icon }: EmojiSelectorProps) {
  const selectedOption = options.find(o => o.value === selected);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="text-xs text-primary font-medium min-w-[70px] text-right">
          {selectedOption?.label || "Select"}
        </span>
      </div>
      <div className="flex gap-1.5">
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <motion.button
              key={option.value}
              onClick={() => onSelect(option.value)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xl transition-all border-2",
                isSelected 
                  ? "bg-primary/15 border-primary shadow-sm scale-105" 
                  : "bg-muted/30 border-transparent hover:bg-muted/50 hover:border-border"
              )}
              data-testid={`selector-${label.toLowerCase()}-${option.value}`}
            >
              {option.emoji}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// Quick-tap sleep selector
interface SleepSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

function SleepSelector({ value, onChange }: SleepSelectorProps) {
  const options = [4, 5, 6, 7, 8, 9, 10];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Moon className="w-3.5 h-3.5" />
          Sleep
        </span>
        <span className="text-xs font-medium text-primary">{value}h</span>
      </div>
      <div className="flex gap-1">
        {options.map((hours) => (
          <motion.button
            key={hours}
            onClick={() => onChange(hours)}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-all border",
              value === hours 
                ? "bg-primary border-primary text-primary-foreground shadow-sm" 
                : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
            )}
            data-testid={`sleep-${hours}`}
          >
            {hours}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function MoodTracker() {
  const { data: trackerEntries, isLoading: entriesLoading } = useTrackerEntries(30);
  const createEntryMutation = useCreateTrackerEntry();
  const updateEntryMutation = useUpdateTrackerEntry();
  const deleteEntryMutation = useDeleteTrackerEntry();

  const [editingEntry, setEditingEntry] = useState<TrackerEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [editMood, setEditMood] = useState([5]);
  const [editEnergy, setEditEnergy] = useState([5]);
  const [editNotes, setEditNotes] = useState("");
  
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState(7);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

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
  });

  const moodOptions = [
    { value: 2, emoji: "😢", label: "Struggling" },
    { value: 4, emoji: "😔", label: "Rough" },
    { value: 5, emoji: "😐", label: "Meh" },
    { value: 6, emoji: "🙂", label: "Okay" },
    { value: 8, emoji: "😊", label: "Good" },
    { value: 10, emoji: "😄", label: "Great" },
  ];

  const energyOptions = [
    { value: 2, emoji: "🪫", label: "Drained" },
    { value: 4, emoji: "😴", label: "Tired" },
    { value: 5, emoji: "😌", label: "Calm" },
    { value: 6, emoji: "⚡", label: "Active" },
    { value: 8, emoji: "🔥", label: "Energized" },
    { value: 10, emoji: "🚀", label: "Supercharged" },
  ];

  const findClosestOption = (value: number, options: typeof moodOptions) => {
    return options.reduce((prev, curr) => 
      Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
    );
  };

  const handleAddEntry = () => {
    if (!mood || !energy) {
      toast.error("Please select both mood and energy");
      return;
    }

    createEntryMutation.mutate({
      frontingMemberId: null,
      mood: mood,
      energy: energy,
      stress: 0,
      dissociation: 0,
      sleepHours: sleep,
      sleepQuality: null,
      capacity: null,
      pain: null,
      triggerTag: null,
      workLoad: null,
      workTag: null,
      timeOfDay: getTimeOfDay(),
      notes: note || null,
      timestamp: new Date(),
    }, {
      onSuccess: () => {
        toast.success("Check-in logged! 💫");
        setNote("");
        setMood(null);
        setEnergy(null);
        setShowNote(false);
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

  const canSubmit = mood !== null && energy !== null;

  return (
    <>
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/15">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">How are you?</h3>
                <p className="text-xs text-muted-foreground">
                  {entriesToday.length} check-in{entriesToday.length !== 1 ? "s" : ""} today
                </p>
              </div>
            </div>
            
            <AnimatePresence>
              {canSubmit && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button 
                    onClick={handleAddEntry}
                    disabled={createEntryMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="button-log-entry"
                  >
                    {createEntryMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Log
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <EmojiSelector
            options={moodOptions}
            selected={mood}
            onSelect={setMood}
            label="Mood"
            icon={<span className="text-sm">💭</span>}
          />
          
          <EmojiSelector
            options={energyOptions}
            selected={energy}
            onSelect={setEnergy}
            label="Energy"
            icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
          />
          
          <SleepSelector value={sleep} onChange={setSleep} />
          
          <motion.div 
            initial={false}
            animate={{ height: showNote ? "auto" : 0, opacity: showNote ? 1 : 0 }}
            className="overflow-hidden"
          >
            <Textarea 
              placeholder="Quick note (optional)..."
              className="bg-muted/30 border-border resize-none h-20 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="textarea-note"
            />
          </motion.div>
          
          <button
            onClick={() => setShowNote(!showNote)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            {showNote ? "Hide note" : "Add note"}
          </button>
        </div>
        
        {entriesToday.length > 0 && (
          <div className="border-t border-border/50 px-4 py-3 bg-muted/20">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-muted-foreground shrink-0">Today:</span>
              {entriesToday.map((entry) => {
                const moodEmoji = findClosestOption(entry.mood, moodOptions).emoji;
                const energyEmoji = findClosestOption(entry.energy, energyOptions).emoji;
                return (
                  <motion.button
                    key={entry.id}
                    onClick={() => openEditDialog(entry)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1 px-2 py-1 bg-card rounded-full border border-border text-xs shrink-0 hover:border-primary/50 transition-colors"
                  >
                    <span>{moodEmoji}</span>
                    <span>{energyEmoji}</span>
                    <span className="text-muted-foreground">{format(new Date(entry.timestamp), "HH:mm")}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Check-In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mood</label>
              <div className="flex gap-1">
                {moodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setEditMood([option.value])}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-lg transition-all border",
                      findClosestOption(editMood[0], moodOptions).value === option.value 
                        ? "bg-primary/15 border-primary" 
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                    )}
                  >
                    {option.emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Energy</label>
              <div className="flex gap-1">
                {energyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setEditEnergy([option.value])}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-lg transition-all border",
                      findClosestOption(editEnergy[0], energyOptions).value === option.value 
                        ? "bg-primary/15 border-primary" 
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                    )}
                  >
                    {option.emoji}
                  </button>
                ))}
              </div>
            </div>
            <Textarea 
              placeholder="Notes..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (editingEntry) {
                  setDeletingEntryId(editingEntry.id);
                  setEditingEntry(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <Button 
              onClick={handleUpdateEntry}
              disabled={updateEntryMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {updateEntryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEntryId} onOpenChange={(open) => !open && setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete check-in?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
