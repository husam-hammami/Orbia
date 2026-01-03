import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { User, Shield, Ghost, Brain, Zap, Plus, MoreHorizontal, UserCog, Crown, Eye, Mic, Armchair, DoorOpen, Coffee, Edit, Trash2, Settings2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from "@/lib/api-hooks";
import { toast } from "sonner";

// --- Headspace Rooms Configuration ---
const DEFAULT_ROOMS = [
  { id: 'front', name: 'Front Room', icon: Armchair, description: "Direct control of the body", color: "border-indigo-500/50 bg-indigo-500/5" },
  { id: 'meeting', name: 'Meeting Room', icon: Coffee, description: "Internal communication", color: "border-amber-500/50 bg-amber-500/5" },
  { id: 'inner', name: 'Inner World', icon: DoorOpen, description: "Deep resting place", color: "border-purple-500/50 bg-purple-500/5" },
];

export function HeadspaceMap() {
  const { data: members = [], isLoading } = useMembers();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  // State for customizable rooms
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [isEditingRooms, setIsEditingRooms] = useState(false);

  const moveMember = (memberId: string, roomId: string) => {
    updateMember.mutate({ 
      id: memberId, 
      data: { location: roomId } 
    });
  };

  const roomOrder = ['front', 'meeting', 'inner'];

  const getNextRoomId = (currentRoomId: string | null) => {
    if (!currentRoomId) return 'front';
    const currentIndex = roomOrder.indexOf(currentRoomId);
    if (currentIndex === -1) return 'front';
    return roomOrder[(currentIndex + 1) % roomOrder.length];
  };
  
  // Manage Member State
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "Unknown", color: "#6366f1", traits: [""], avatar: "user", description: "" });

  const handleAddMember = () => {
     createMember.mutate({
         name: editForm.name || "New Alter",
         role: editForm.role,
         color: editForm.color,
         traits: editForm.traits.filter(t => t.trim()),
         avatar: editForm.avatar,
         description: editForm.description || "New system member.",
         location: 'meeting'
     }, {
       onSuccess: () => {
         setIsAdding(false);
         setEditForm({ name: "", role: "Unknown", color: "#6366f1", traits: [""], avatar: "user", description: "" });
         toast.success("Member added");
       }
     });
  };

  const handleUpdateMember = () => {
      if (!isEditing) return;
      updateMember.mutate({ 
        id: isEditing, 
        data: {
          name: editForm.name,
          role: editForm.role,
          color: editForm.color,
          traits: editForm.traits.filter(t => t.trim()),
          avatar: editForm.avatar,
          description: editForm.description
        }
      }, {
        onSuccess: () => {
          setIsEditing(null);
          toast.success("Member updated");
        }
      });
  };
  
  const handleDeleteMember = (id: string) => {
      deleteMember.mutate(id, {
        onSuccess: () => {
          setIsEditing(null);
          toast.success("Member removed");
        }
      });
  };

  const openEdit = (member: any) => {
      setEditForm({ 
        name: member.name, 
        role: member.role, 
        color: member.color,
        traits: member.traits || [""],
        avatar: member.avatar || "user",
        description: member.description || ""
      });
      setIsEditing(member.id);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading headspace...</div>;
  }

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
        
        <div className="flex items-center gap-4">
             <div className="flex gap-2 text-xs text-muted-foreground mr-4 hidden md:flex">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Active</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Resting</span>
            </div>

            <Dialog open={isEditingRooms} onOpenChange={setIsEditingRooms}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Settings2 className="w-4 h-4" /> Config
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configure Headspace Areas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <p className="text-sm text-muted-foreground">Customize these areas to match your own internal landscape. Not every system uses "Rooms" - feel free to rename them to Zones, States, or Locations.</p>
                        {rooms.map((room) => (
                            <div key={room.id} className="space-y-2 border-b border-border/50 pb-4 last:border-0">
                                <div className="flex items-center gap-2 font-medium text-sm">
                                    <room.icon className="w-4 h-4 text-muted-foreground" />
                                    <span className="capitalize">{room.id} Area</span>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs">Display Name</Label>
                                    <Input 
                                        value={room.name} 
                                        onChange={(e) => handleUpdateRoom(room.id, 'name', e.target.value)}
                                        className="h-8"
                                    />
                                    <Label className="text-xs">Description</Label>
                                    <Input 
                                        value={room.description} 
                                        onChange={(e) => handleUpdateRoom(room.id, 'description', e.target.value)}
                                        className="h-8 text-xs text-muted-foreground"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Member
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New System Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Alter name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                             <Select value={editForm.role} onValueChange={v => setEditForm({...editForm, role: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Host">Host</SelectItem>
                                    <SelectItem value="Protector">Protector</SelectItem>
                                    <SelectItem value="Little">Little</SelectItem>
                                    <SelectItem value="Trauma Holder">Trauma Holder</SelectItem>
                                    <SelectItem value="Gatekeeper">Gatekeeper</SelectItem>
                                    <SelectItem value="Manager">Manager</SelectItem>
                                    <SelectItem value="Unknown">Unknown</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Color (Hex)</Label>
                            <div className="flex gap-2">
                                <Input type="color" className="w-12 p-1 cursor-pointer" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
                                <Input value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} placeholder="#000000" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddMember}>Create Member</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Edit Dialog */}
            <Dialog open={!!isEditing} onOpenChange={(open) => !open && setIsEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Member Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                         <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                             <Select value={editForm.role} onValueChange={v => setEditForm({...editForm, role: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Host">Host</SelectItem>
                                    <SelectItem value="Protector">Protector</SelectItem>
                                    <SelectItem value="Little">Little</SelectItem>
                                    <SelectItem value="Trauma Holder">Trauma Holder</SelectItem>
                                    <SelectItem value="Gatekeeper">Gatekeeper</SelectItem>
                                    <SelectItem value="Manager">Manager</SelectItem>
                                    <SelectItem value="Unknown">Unknown</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                             <div className="flex gap-2">
                                <Input type="color" className="w-12 p-1 cursor-pointer" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
                                <Input value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between sm:justify-between w-full">
                        <Button variant="destructive" size="sm" onClick={() => isEditing && handleDeleteMember(isEditing)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                        <Button onClick={handleUpdateMember}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Visualization Area */}
      <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/50 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
         
         {rooms.map(room => {
            const RoomIcon = room.icon;
            const roomMembers = (members || []).filter(m => {
              const memberLocation = m.location || 'front';
              return memberLocation === room.id;
            });

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
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] p-1 rounded shadow-md opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20 whitespace-nowrap flex gap-1 items-center border">
                                        <span className="px-1">{member.role}</span>
                                        <div className="w-[1px] h-3 bg-border"></div>
                                        <button onClick={(e) => { e.stopPropagation(); openEdit(member); }} className="hover:bg-muted p-1 rounded cursor-pointer">
                                            <Edit className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Avatar */}
                                    <div 
                                        className="w-12 h-12 rounded-full border-2 flex items-center justify-center bg-background shadow-sm cursor-grab active:cursor-grabbing hover:scale-110 transition-transform relative"
                                        style={{ borderColor: member.color || "#6366f1" }}
                                        // Simple click-to-move logic for prototype
                                        onClick={() => {
                                            const nextRoomId = getNextRoomId(member.location);
                                            moveMember(member.id, nextRoomId);
                                        }}
                                    >
                                        <User className="w-6 h-6" style={{ color: member.color || "#6366f1" }} />
                                        
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
        Click on an alter to move them to the next room. ({rooms.map(r => r.name).join(' → ')} → {rooms[0].name})
      </div>
    </div>
  );
}
