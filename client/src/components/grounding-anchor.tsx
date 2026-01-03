import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Anchor, Wind, Eye, Ear, Hand, Coffee, Music, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function GroundingAnchor() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeExercise, setActiveExercise] = useState<"breathing" | "54321" | null>(null);

  // Breathing logic
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [count, setCount] = useState(4);

  useEffect(() => {
    if (activeExercise !== "breathing" || !isOpen) return;

    let interval: NodeJS.Timeout;
    
    if (breathPhase === "inhale") {
      interval = setInterval(() => {
        setCount((prev) => {
          if (prev <= 1) {
            setBreathPhase("hold");
            return 4; // Hold for 4
          }
          return prev - 1;
        });
      }, 1000);
    } else if (breathPhase === "hold") {
      interval = setInterval(() => {
        setCount((prev) => {
          if (prev <= 1) {
            setBreathPhase("exhale");
            return 6; // Exhale for 6
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      interval = setInterval(() => {
        setCount((prev) => {
          if (prev <= 1) {
            setBreathPhase("inhale");
            return 4; // Reset to Inhale 4
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [breathPhase, activeExercise, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if(!open) setActiveExercise(null);
    }}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-cyan-600 hover:bg-cyan-700 text-white z-50 animate-in zoom-in duration-300"
          title="Emergency Grounding"
        >
          <Anchor className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-900 text-slate-50 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-2xl tracking-wide flex items-center justify-center gap-2">
            <Anchor className="w-5 h-5 text-cyan-400" />
            Ground Yourself
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 min-h-[300px] flex flex-col items-center justify-center">
          {!activeExercise ? (
            <div className="grid grid-cols-1 gap-4 w-full">
              <button
                onClick={() => setActiveExercise("54321")}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-left group"
              >
                <div className="h-12 w-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">5-4-3-2-1 Technique</h3>
                  <p className="text-slate-400 text-sm">Engage your senses to return to the present.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveExercise("breathing")}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-left group"
              >
                <div className="h-12 w-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wind className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Box Breathing</h3>
                  <p className="text-slate-400 text-sm">Regulate your nervous system with breath.</p>
                </div>
              </button>
            </div>
          ) : activeExercise === "breathing" ? (
            <div className="flex flex-col items-center w-full">
               <motion.div
                 animate={{
                    scale: breathPhase === "inhale" ? 1.5 : breathPhase === "exhale" ? 1 : 1.5,
                    opacity: breathPhase === "hold" ? 0.8 : 1
                 }}
                 transition={{ duration: breathPhase === "inhale" ? 4 : breathPhase === "exhale" ? 6 : 0, ease: "linear" }}
                 className="w-32 h-32 rounded-full bg-cyan-500/30 flex items-center justify-center mb-8 relative"
               >
                  <motion.div 
                    className="absolute inset-0 bg-cyan-400 rounded-full blur-xl opacity-20"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-4xl font-mono font-bold text-cyan-50">{count}</span>
               </motion.div>
               
               <h3 className="text-2xl font-display font-medium text-cyan-200 mb-2 capitalize">
                 {breathPhase}...
               </h3>
               <p className="text-slate-400 text-center max-w-xs">
                 {breathPhase === "inhale" && "Breathe in deeply through your nose."}
                 {breathPhase === "hold" && "Hold your breath gently."}
                 {breathPhase === "exhale" && "Exhale slowly through your mouth."}
               </p>
               
               <Button variant="ghost" onClick={() => setActiveExercise(null)} className="mt-8 text-slate-500 hover:text-slate-300">
                 Stop Exercise
               </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6 w-full px-2">
               <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-200">
                     <Eye className="w-5 h-5 text-purple-400" />
                     <span className="font-medium">5 things you can <span className="text-purple-400">see</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-200">
                     <Hand className="w-5 h-5 text-blue-400" />
                     <span className="font-medium">4 things you can <span className="text-blue-400">touch</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-200">
                     <Ear className="w-5 h-5 text-green-400" />
                     <span className="font-medium">3 things you can <span className="text-green-400">hear</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-200">
                     <Coffee className="w-5 h-5 text-yellow-400" />
                     <span className="font-medium">2 things you can <span className="text-yellow-400">smell</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-200">
                     <HeartPulse className="w-5 h-5 text-red-400" />
                     <span className="font-medium">1 thing you can <span className="text-red-400">feel (emotion)</span></span>
                  </div>
               </div>
               
               <Button variant="ghost" onClick={() => setActiveExercise(null)} className="mt-4 text-slate-500 hover:text-slate-300 self-center">
                 Done
               </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for icon imports
import { HeartPulse } from "lucide-react";
