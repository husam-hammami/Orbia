import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, StickyNote, UserCircle2, AlertTriangle, CheckCircle2, Bookmark, Pin, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NoteType = "general" | "emergency" | "memory" | "task";

interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
  type: NoteType;
  isPinned?: boolean;
}

const TYPE_CONFIG = {
  general: { icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-200" },
  emergency: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-200" },
  memory: { icon: StickyNote, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-200" },
  task: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-200" },
};

export function SystemJournal() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      content: "Feeling a bit disoriented today. Let's focus on grounding exercises.",
      author: "Protector",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), 
      type: "general",
      isPinned: false
    },
    {
      id: "2",
      content: "Don't forget the therapy appointment at 3pm!",
      author: "Admin",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      type: "task",
      isPinned: true
    },
     {
      id: "3",
      content: "IF WE SWITCH: Please check the oven is off. I was baking cookies.",
      author: "Host",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      type: "emergency",
      isPinned: true
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [currentFront, setCurrentFront] = useState("Unknown");
  const [selectedType, setSelectedType] = useState<NoteType>("general");
  const [filter, setFilter] = useState<NoteType | "all">("all");

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const newNote: Note = {
      id: Math.random().toString(),
      content: newMessage,
      author: currentFront || "Unknown",
      timestamp: new Date(),
      type: selectedType,
      isPinned: false
    };

    setNotes([newNote, ...notes]);
    setNewMessage("");
  };

  const togglePin = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const filteredNotes = notes
    .filter(n => filter === "all" || n.type === filter)
    .sort((a, b) => (b.isPinned === a.isPinned ? 0 : b.isPinned ? 1 : -1)); // Pinned first

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/20 flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-lg">System Journal</h3>
            </div>
            
            {/* Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                  <Filter className="w-3.5 h-3.5" />
                  {filter === "all" ? "All Notes" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter("all")}>All Notes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("general")}>General</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("emergency")}>Emergency</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("memory")}>Memories</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("task")}>Tasks</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Quick Author Input */}
        <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border">
             <UserCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
             <Input 
                value={currentFront} 
                onChange={(e) => setCurrentFront(e.target.value)}
                className="h-8 border-none bg-transparent focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50"
                placeholder="Who is writing this?"
             />
        </div>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1 p-4 bg-muted/5">
        <div className="space-y-4">
          {filteredNotes.map((note) => {
            const TypeIcon = TYPE_CONFIG[note.type].icon;
            return (
                <div key={note.id} className={cn(
                    "relative group flex flex-col gap-2 p-4 rounded-xl border transition-all hover:shadow-sm",
                    note.isPinned ? "bg-background border-yellow-200 shadow-sm ring-1 ring-yellow-100" : "bg-background border-border"
                )}>
                  {/* Pin Indicator */}
                  {note.isPinned && (
                    <div className="absolute -top-2 -right-2 bg-yellow-100 text-yellow-600 p-1.5 rounded-full shadow-sm border border-yellow-200 z-10">
                        <Pin className="w-3 h-3 fill-current" />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-md", TYPE_CONFIG[note.type].bg, TYPE_CONFIG[note.type].color)}>
                            <TypeIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-bold text-foreground">{note.author}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{format(note.timestamp, "MMM d, h:mm a")}</span>
                  </div>
                  
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pl-1">{note.content}</p>
                  
                  {/* Actions (visible on hover) */}
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-2 mt-2 border-t border-border/50">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-yellow-600"
                        onClick={() => togglePin(note.id)}
                        title={note.isPinned ? "Unpin" : "Pin to top"}
                     >
                        <Pin className={cn("w-3.5 h-3.5", note.isPinned && "fill-current")} />
                     </Button>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-red-600"
                        onClick={() => deleteNote(note.id)}
                        title="Delete note"
                     >
                        <Trash2 className="w-3.5 h-3.5" />
                     </Button>
                  </div>
                </div>
            );
          })}
          
          {filteredNotes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                  <MessageSquare className="w-12 h-12 mb-2 stroke-1" />
                  <p className="text-sm">No notes found.</p>
              </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex flex-col gap-3">
          {/* Type Selector */}
          <div className="flex gap-2">
             {(Object.keys(TYPE_CONFIG) as NoteType[]).map((type) => {
                 const config = TYPE_CONFIG[type];
                 const Icon = config.icon;
                 const isSelected = selectedType === type;
                 return (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                            isSelected 
                                ? `${config.bg} ${config.color} ${config.border} ring-1 ring-inset ring-black/5` 
                                : "bg-transparent border-transparent hover:bg-muted text-muted-foreground"
                        )}
                    >
                        <Icon className="w-3 h-3" />
                        <span className="capitalize">{type}</span>
                    </button>
                 );
             })}
          </div>

          <div className="flex gap-2">
            <Textarea 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Write a ${selectedType} note...`}
                className="min-h-[80px] resize-none bg-muted/30 focus:bg-background transition-colors"
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
            />
            <Button size="icon" className="h-[80px] w-12 shrink-0" onClick={handleSend}>
                <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
