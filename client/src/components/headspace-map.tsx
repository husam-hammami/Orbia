import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { User, Shield, Baby, Brain, Zap, Plus, MoreHorizontal, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Types for our Headspace
export type AlterRole = "Host" | "Protector" | "Little" | "Trauma Holder" | "Gatekeeper" | "Unknown";

export interface SystemMember {
  id: string;
  name: string;
  role: AlterRole;
  color: string;
  isFronting: boolean;
  avatar?: string; // Emoji or simple visual
}

const DEFAULT_MEMBERS: SystemMember[] = [
  { id: "1", name: "Host", role: "Host", color: "hsl(200 60% 60%)", isFronting: true, avatar: "👤" },
  { id: "2", name: "Protector", role: "Protector", color: "hsl(142 40% 45%)", isFronting: false, avatar: "🛡️" },
  { id: "3", name: "Little", role: "Little", color: "hsl(32 60% 60%)", isFronting: false, avatar: "🧸" },
];

export function HeadspaceMap() {
  const [members, setMembers] = useState<SystemMember[]>(DEFAULT_MEMBERS);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AlterRole>("Unknown");

  const toggleFront = (id: string) => {
    setMembers(members.map(m => 
      m.id === id ? { ...m, isFronting: !m.isFronting } : m
    ));
  };

  const addMember = () => {
    if (!newName) return;
    const newMember: SystemMember = {
      id: Math.random().toString(),
      name: newName,
      role: newRole,
      color: "hsl(260 20% 60%)",
      isFronting: false,
      avatar: "✨"
    };
    setMembers([...members, newMember]);
    setIsAdding(false);
    setNewName("");
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm min-h-[400px] flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between z-10 mb-6">
        <div className="flex items-center gap-2">
           <Brain className="w-5 h-5 text-primary" />
           <h3 className="font-display font-semibold text-lg">Headspace Map</h3>
        </div>
        
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Welcome a new member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name or identifier..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role (Optional)</label>
                <Select value={newRole} onValueChange={(v: AlterRole) => setNewRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Host">Host</SelectItem>
                    <SelectItem value="Protector">Protector</SelectItem>
                    <SelectItem value="Little">Little</SelectItem>
                    <SelectItem value="Trauma Holder">Trauma Holder</SelectItem>
                    <SelectItem value="Gatekeeper">Gatekeeper</SelectItem>
                    <SelectItem value="Unknown">Unknown / Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addMember}>Add to System</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visualization Area */}
      <div className="flex-1 relative bg-muted/10 rounded-xl border border-dashed border-border/50 p-8 flex items-center justify-center">
         {/* Center "Front" Zone */}
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full border-2 border-primary/10 flex items-center justify-center">
               <div className="text-xs font-bold text-primary/20 uppercase tracking-widest mt-32">The Front</div>
            </div>
         </div>

         {/* Members */}
         <div className="flex flex-wrap justify-center gap-8 z-10 w-full">
            <AnimatePresence>
              {members.map((member) => (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative group cursor-pointer"
                  onClick={() => toggleFront(member.id)}
                >
                   {/* Avatar Bubble */}
                   <div 
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-sm border-2 transition-all duration-300 relative bg-card",
                        member.isFronting 
                          ? "border-primary shadow-[0_0_20px_-5px_var(--glow-color)] scale-110" 
                          : "border-border hover:border-primary/50 grayscale hover:grayscale-0 opacity-70 hover:opacity-100"
                      )}
                      style={{ "--glow-color": member.color } as any}
                   >
                      {member.avatar}
                      
                      {/* Active Indicator */}
                      {member.isFronting && (
                        <div className="absolute -bottom-1 w-full flex justify-center">
                           <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">FRONT</span>
                        </div>
                      )}
                   </div>
                   
                   {/* Name Label */}
                   <div className="text-center mt-3">
                      <p className="font-semibold text-sm leading-tight">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">{member.role}</p>
                   </div>
                </motion.div>
              ))}
            </AnimatePresence>
         </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Tap a member to move them to the front. This helps track who is active.
      </p>
    </div>
  );
}
