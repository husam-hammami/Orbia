import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Eye, EyeOff, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoUrl from '@assets/ChatGPT_Image_Jan_10,_2026,_05_13_01_PM_1768050787078.png';

interface LockScreenProps {
  onUnlock: () => void;
}

const LOCK_PASSWORD_KEY = "orbia_lock_password";
const LOCK_STATE_KEY = "orbia_is_locked";

export function useLockScreen() {
  const [isLocked, setIsLocked] = useState(() => {
    const saved = localStorage.getItem(LOCK_STATE_KEY);
    return saved === "true";
  });
  
  const [hasPassword, setHasPassword] = useState(() => {
    return !!localStorage.getItem(LOCK_PASSWORD_KEY);
  });

  const lock = () => {
    if (hasPassword) {
      localStorage.setItem(LOCK_STATE_KEY, "true");
      setIsLocked(true);
    }
  };

  const unlock = () => {
    localStorage.setItem(LOCK_STATE_KEY, "false");
    setIsLocked(false);
  };

  const setPassword = (password: string) => {
    localStorage.setItem(LOCK_PASSWORD_KEY, password);
    setHasPassword(true);
  };

  const checkPassword = (password: string): boolean => {
    const saved = localStorage.getItem(LOCK_PASSWORD_KEY);
    return saved === password;
  };

  const removePassword = () => {
    localStorage.removeItem(LOCK_PASSWORD_KEY);
    localStorage.removeItem(LOCK_STATE_KEY);
    setHasPassword(false);
    setIsLocked(false);
  };

  return { isLocked, hasPassword, lock, unlock, setPassword, checkPassword, removePassword };
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const { checkPassword } = useLockScreen();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkPassword(password)) {
      onUnlock();
    } else {
      setError("Incorrect password");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-pink-100/30"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-primary/20"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: window.innerHeight + 20 
            }}
            animate={{ 
              y: -20,
              x: Math.random() * window.innerWidth
            }}
            transition={{ 
              duration: 8 + Math.random() * 4, 
              repeat: Infinity, 
              delay: i * 1.5,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-primary/10 border border-white/50 w-full max-w-sm mx-4 ${shake ? 'animate-shake' : ''}`}
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ 
              scale: [1, 1.06, 1],
              filter: [
                "brightness(1) drop-shadow(0 0 12px rgba(139, 92, 246, 0.3))",
                "brightness(1.2) drop-shadow(0 0 30px rgba(139, 92, 246, 0.6))",
                "brightness(1) drop-shadow(0 0 12px rgba(139, 92, 246, 0.3))"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block mb-4"
          >
            <img src={logoUrl} alt="Orbia" className="w-40 h-40 object-contain mx-auto" />
          </motion.div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Welcome Back!</h2>
          </div>
          <p className="text-sm text-muted-foreground">Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Enter password"
              className="pr-10 h-12 rounded-xl bg-white/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
              data-testid="input-lock-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-500 text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25"
            data-testid="button-unlock"
          >
            <Unlock className="w-4 h-4 mr-2" />
            Unlock
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Heart className="w-3 h-3 text-pink-400" />
            Your personal space is safe
            <Sparkles className="w-3 h-3 text-amber-400" />
          </p>
        </div>
      </motion.div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </motion.div>
  );
}

interface SetPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSetPassword: (password: string) => void;
  hasExistingPassword: boolean;
  onRemovePassword?: () => void;
}

export function SetPasswordDialog({ isOpen, onClose, onSetPassword, hasExistingPassword, onRemovePassword }: SetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    onSetPassword(password);
    setPassword("");
    setConfirmPassword("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">{hasExistingPassword ? "Change Password" : "Set Password"}</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="New password"
              className="pr-10"
              data-testid="input-new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
            placeholder="Confirm password"
            data-testid="input-confirm-password"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" data-testid="button-save-password">
              Save
            </Button>
          </div>

          {hasExistingPassword && onRemovePassword && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => { onRemovePassword(); onClose(); }}
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
              data-testid="button-remove-password"
            >
              Remove Password
            </Button>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
}
