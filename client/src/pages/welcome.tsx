import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, Star, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import sphereUrl from '@assets/orbia_sphere_transparent.png';

interface WelcomePageProps {
  onAuthenticated: () => void;
}

const MOTIVATIONAL_MESSAGES = [
  "Every small step counts",
  "You've got this!",
  "Today is full of possibilities",
  "Be kind to yourself today",
  "Your dreams are within reach",
  "Progress, not perfection",
  "You are capable of amazing things",
];

export default function WelcomePage({ onAuthenticated }: WelcomePageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const { apiRequest } = await import("@/lib/queryClient");
      await apiRequest("POST", "/api/auth/login", { password });
      onAuthenticated();
    } catch (err: any) {
      const message = err?.message || "";
      if (message.includes("401")) {
        setError("That's not quite right. Remember your commitment!");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-10 text-primary/40"
        >
          <Star className="w-8 h-8" />
        </motion.div>
        <motion.div
          animate={{
            y: [0, 15, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-40 right-20 text-accent/60"
        >
          <Sparkles className="w-10 h-10" />
        </motion.div>
        <motion.div
          animate={{
            y: [0, -10, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-32 left-1/4 text-pink-300"
        >
          <Heart className="w-6 h-6" />
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center max-w-md w-full z-10"
      >
        <motion.img
          src={sphereUrl}
          alt="Orbia"
          className="w-40 h-40 mb-2 drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [1, 1.06, 1],
            opacity: 1,
            filter: [
              "brightness(1) drop-shadow(0 0 12px rgba(139, 92, 246, 0.3))",
              "brightness(1.2) drop-shadow(0 0 30px rgba(139, 92, 246, 0.6))",
              "brightness(1) drop-shadow(0 0 12px rgba(139, 92, 246, 0.3))"
            ]
          }}
          transition={{ 
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            filter: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.6, ease: "easeOut" }
          }}
        />

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold tracking-[0.3em] mb-4 bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--accent))] to-[hsl(var(--primary))] bg-clip-text text-transparent"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          ORBIA
        </motion.span>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-slate-500 text-center mb-8 text-lg"
        >
          Your personal companion for growth and joy
        </motion.p>

        <AnimatePresence mode="wait">
          <motion.p
            key={currentMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-primary font-medium text-center mb-8 h-6"
          >
            {MOTIVATIONAL_MESSAGES[currentMessage]}
          </motion.p>
        </AnimatePresence>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`w-full space-y-4 ${isShaking ? "animate-shake" : ""}`}
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="password"
              placeholder="Enter your commitment phrase..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="pl-10 h-12 text-lg bg-card/80 border-border focus:border-primary focus:ring-primary/20 rounded-xl"
              data-testid="input-password"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 text-lg bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 transition-all"
            data-testid="button-enter"
          >
            <span>{isLoading ? "Entering..." : "Enter Orbia"}</span>
            {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-slate-400 text-sm mt-8 text-center"
        >Made with care, for you</motion.p>
      </motion.div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
