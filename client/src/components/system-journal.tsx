import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, StickyNote, UserCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  content: string;
  author: string; // The alter/identity who wrote it
  timestamp: Date;
  type: "note" | "alert";
}

export function SystemJournal() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      content: "Feeling a bit disoriented today. Let's focus on grounding exercises.",
      author: "Protector",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      type: "note"
    },
    {
        id: "2",
        content: "Don't forget the therapy appointment at 3pm!",
        author: "Admin",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
        type: "alert"
      }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [currentFront, setCurrentFront] = useState("Unknown");

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const newNote: Note = {
      id: Math.random().toString(),
      content: newMessage,
      author: currentFront,
      timestamp: new Date(),
      type: "note"
    };

    setNotes([newNote, ...notes]);
    setNewMessage("");
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col h-[500px]">
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 rounded-t-2xl">
        <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-lg">System Journal</h3>
        </div>
        <div className="flex items-center gap-2">
             <UserCircle2 className="w-4 h-4 text-muted-foreground" />
             <Input 
                value={currentFront} 
                onChange={(e) => setCurrentFront(e.target.value)}
                className="h-8 w-32 text-xs bg-background"
                placeholder="Who is fronting?"
             />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className={cn(
                "flex flex-col gap-1 p-3 rounded-xl max-w-[85%]",
                note.author === currentFront ? "ml-auto bg-primary/10 border border-primary/20" : "bg-muted/30 border border-border"
            )}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-primary">{note.author}</span>
                <span className="text-[10px] text-muted-foreground">{format(note.timestamp, "MMM d, h:mm a")}</span>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{note.content}</p>
            </div>
          ))}
          {notes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm italic">
                  No notes yet. Start a conversation.
              </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-background rounded-b-2xl">
        <div className="flex gap-2">
          <Textarea 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Write a note to the system..."
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
          />
          <Button size="icon" className="h-[80px] w-12" onClick={handleSend}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
