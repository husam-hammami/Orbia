import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { User, Shield, Ghost, Brain, Zap, Plus, MoreHorizontal, UserCog, Crown, Eye, Mic, Armchair, DoorOpen, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SYSTEM_MEMBERS } from "@/lib/mock-data";

// --- Headspace Rooms ---
const ROOMS = [
  { id: 'front', name: 'Front Room', icon: Armchair, description: "Direct control of the body", color: "border-indigo-500/50 bg-indigo-500/5" },
  { id: 'meeting', name: 'Meeting Room', icon: Coffee, description: "Internal communication", color: "border-amber-500/50 bg-amber-500/5" },
  { id: 'inner', name: 'Inner World', icon: DoorOpen, description: "Deep resting place", color: "border-purple-500/50 bg-purple-500/5" },
];

export function HeadspaceMap() {
  // Initialize members with locations
  const [members, setMembers] = useState(SYSTEM_MEMBERS.map(m => ({ 
    ...m, 
    location: m.role.includes('Daily') ? 'front' : m.role.includes('Trauma') ? 'inner' : 'meeting' 
  })));

  const moveMember = (memberId: string, roomId: string) => {
    setMembers(members.map(m => m.id === memberId ? { ...m, location: roomId } : m));
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm min-h-[500px] flex flex-col relative overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
        <div className="flex items-center gap-2">
           <Brain className="w-5 h-5 text-indigo-500" />
           <div>
             <h3 className="font-display font-semibold text-lg leading-none">Visual Headspace</h3>
             <p className="text-xs text-muted-foreground">Drag & Drop Simulation (Click to move)</p>
           </div>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Resting</span>
        </div>
      </div>

      {/* Visualization Area */}
      <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/50 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
         
         {ROOMS.map(room => {
            const RoomIcon = room.icon;
            const roomMembers = members.filter(m => m.location === room.id);

            return (
                <div key={room.id} className={cn("rounded-xl border-2 border-dashed p-4 flex flex-col gap-4 transition-colors relative group", room.color)}>
                    {/* Room Label */}
                    <div className="flex items-center justify-between text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="flex items-center gap-2">
                            <RoomIcon className="w-4 h-4" />
                            <span className="font-semibold text-sm">{room.name}</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider opacity-50">{roomMembers.length}</span>
                    </div>

                    {/* Drop Zone */}
                    <div className="flex-1 flex flex-wrap content-start gap-3 min-h-[100px]">
                        <AnimatePresence>
                            {roomMembers.map(member => (
                                <motion.div
                                    key={member.id}
                                    layoutId={member.id}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className="relative group/avatar"
                                >
                                    {/* Action Menu (Hover) */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                                        {member.role}
                                    </div>

                                    {/* Avatar */}
                                    <div 
                                        className="w-12 h-12 rounded-full border-2 flex items-center justify-center bg-background shadow-sm cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                                        style={{ borderColor: member.color }}
                                        // Simple click-to-move logic for prototype
                                        onClick={() => {
                                            const nextRoomIndex = (ROOMS.findIndex(r => r.id === room.id) + 1) % ROOMS.length;
                                            moveMember(member.id, ROOMS[nextRoomIndex].id);
                                        }}
                                    >
                                        <User className="w-6 h-6" style={{ color: member.color }} />
                                        
                                        {/* Crown for Front */}
                                        {room.id === 'front' && (
                                            <div className="absolute -top-2 -right-1 text-yellow-500 drop-shadow-sm">
                                                <Crown className="w-4 h-4 fill-yellow-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-center font-medium mt-1 truncate max-w-[60px]">{member.name}</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        {roomMembers.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-xs italic">
                                Empty
                            </div>
                        )}
                    </div>
                </div>
            )
         })}

      </div>
      
      <div className="p-4 border-t border-border bg-muted/10 text-xs text-center text-muted-foreground">
        Click on an alter to move them to the next room. (Front → Meeting → Inner → Front)
      </div>
    </div>
  );
}
