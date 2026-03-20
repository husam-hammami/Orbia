import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import sphereUrl from '@assets/orbia_sphere_transparent.png';

interface WelcomePageProps {
  onAuthenticated: () => void;
}

export default function WelcomePage({ onAuthenticated }: WelcomePageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
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
        setError("Access denied");
      } else {
        setError("Connection failed. Try again.");
      }
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 40%, #0f1a3a 0%, #080e1f 40%, #040812 100%)" }}
    >
      {/* Deep fog layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            left: "50%",
            top: "35%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.02) 40%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[600px] h-[400px] rounded-full"
          style={{
            left: "30%",
            top: "60%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
          animate={{ x: [0, 40, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[300px] rounded-full"
          style={{
            right: "20%",
            top: "30%",
            background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 60%)",
            filter: "blur(50px)",
          }}
          animate={{ x: [0, -30, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Particle dots */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(${150 + Math.random() * 100}, ${150 + Math.random() * 100}, 255, ${0.15 + Math.random() * 0.25})`,
            }}
            animate={{
              y: [0, -(20 + Math.random() * 30), 0],
              opacity: [0.1, 0.4 + Math.random() * 0.3, 0.1],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex flex-col items-center max-w-sm w-full z-10"
      >
        {/* Orbia sphere — big, glowing, pulsing */}
        <div className="relative mb-6">
          {/* Outer glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              width: 220,
              height: 220,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)",
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img
            src={sphereUrl}
            alt="Orbia"
            className="w-48 h-48 relative z-10"
            style={{
              filter: "drop-shadow(0 0 40px rgba(99,102,241,0.5)) drop-shadow(0 0 80px rgba(139,92,246,0.3))",
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: 1,
              filter: [
                "drop-shadow(0 0 30px rgba(99,102,241,0.4)) drop-shadow(0 0 60px rgba(139,92,246,0.2))",
                "drop-shadow(0 0 50px rgba(99,102,241,0.7)) drop-shadow(0 0 100px rgba(139,92,246,0.4))",
                "drop-shadow(0 0 30px rgba(99,102,241,0.4)) drop-shadow(0 0 60px rgba(139,92,246,0.2))",
              ],
            }}
            transition={{
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              filter: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 1, ease: "easeOut" },
            }}
          />
        </div>

        {/* ORBIA text */}
        <motion.span
          initial={{ opacity: 0, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, letterSpacing: "0.35em" }}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-3xl font-display font-bold mb-2"
          style={{
            background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 30%, #c4b5fd 60%, #818cf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ORBIA
        </motion.span>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.5 }}
          className="text-sm font-light tracking-widest mb-10"
          style={{ color: "rgba(165, 180, 252, 0.5)" }}
        >
          UNIFIED INTELLIGENCE
        </motion.p>

        {/* Login form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className={`w-full space-y-4 ${isShaking ? "animate-shake" : ""}`}
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(165, 180, 252, 0.4)" }} />
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="pl-10 h-12 text-base rounded-xl border-0 focus:ring-2 focus:ring-indigo-500/30"
              style={{
                background: "rgba(15, 23, 60, 0.6)",
                backdropFilter: "blur(12px)",
                color: "#e0e7ff",
                border: "1px solid rgba(99, 102, 241, 0.15)",
              }}
              data-testid="input-password"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-center"
              style={{ color: "#f87171" }}
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 text-base rounded-xl border-0 transition-all duration-300"
            style={{
              background: isLoading
                ? "rgba(99, 102, 241, 0.3)"
                : "linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(139,92,246,0.4) 100%)",
              backdropFilter: "blur(12px)",
              color: "#e0e7ff",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              boxShadow: "0 0 30px rgba(99, 102, 241, 0.15)",
            }}
            data-testid="button-enter"
          >
            <span>{isLoading ? "Authenticating..." : "Enter"}</span>
            {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </motion.form>
      </motion.div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
