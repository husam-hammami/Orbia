import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Watch, Wifi, CheckCircle2, AlertCircle, Loader2, X, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WatchStatus {
  hasWatch: boolean;
  watchAppInstalled: boolean;
  watchNodeId: string | null;
  watchName: string | null;
}

function isCapacitorAvailable(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.Plugins?.WearCompanion;
}

function getWearCompanion() {
  return (window as any).Capacitor?.Plugins?.WearCompanion;
}

type Step = "checking" | "no-watch" | "not-installed" | "ready" | "sending" | "sent" | "error";

export function WatchCompanionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>("checking");
  const [watchStatus, setWatchStatus] = useState<WatchStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const checkStatus = useCallback(async () => {
    if (!isCapacitorAvailable()) {
      setStep("no-watch");
      return;
    }
    setStep("checking");
    try {
      const companion = getWearCompanion();
      const status: WatchStatus = await companion.checkWatchStatus();
      setWatchStatus(status);
      if (!status.hasWatch) {
        setStep("no-watch");
      } else if (!status.watchAppInstalled) {
        setStep("not-installed");
      } else {
        setStep("ready");
      }
    } catch (e: any) {
      setStep("error");
      setErrorMsg(e?.message || "Failed to check watch");
    }
  }, []);

  useEffect(() => {
    if (open) checkStatus();
  }, [open, checkStatus]);

  const handleInstall = async () => {
    if (!isCapacitorAvailable()) return;
    try {
      const companion = getWearCompanion();
      await companion.installOnWatch();
      setStep("not-installed");
    } catch (e: any) {
      setErrorMsg(e?.message || "Install failed");
      setStep("error");
    }
  };

  const handleSendAuth = async () => {
    if (!isCapacitorAvailable() || !watchStatus?.watchNodeId) return;
    setStep("sending");
    try {
      const companion = getWearCompanion();
      await companion.sendAuthToWatch({ nodeId: watchStatus.watchNodeId });
      setStep("sent");
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to send login");
      setStep("error");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[101] px-4 pb-6"
          >
            <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-w-md mx-auto">
              <div className="flex items-center justify-between px-5 pt-5 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Watch className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Watch Companion</h3>
                    <p className="text-xs text-muted-foreground">Orbia on your wrist</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-close-watch-sheet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-5">
                {step === "checking" && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Looking for your watch...</p>
                  </div>
                )}

                {step === "no-watch" && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <Wifi className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No watch detected</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isCapacitorAvailable()
                          ? "Make sure your Wear OS watch is paired and nearby"
                          : "Open this page in the Orbia mobile app to connect your watch"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={checkStatus} data-testid="button-retry-watch">
                      Try Again
                    </Button>
                  </div>
                )}

                {step === "not-installed" && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Download className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {watchStatus?.watchName ? `${watchStatus.watchName} connected` : "Watch connected"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Orbia voice assistant isn't installed on your watch yet
                      </p>
                    </div>
                    <Button onClick={handleInstall} size="sm" data-testid="button-install-watch-app">
                      <Download className="w-4 h-4 mr-1.5" />
                      Install on Watch
                    </Button>
                    <Button variant="ghost" size="sm" onClick={checkStatus} className="text-xs" data-testid="button-recheck-watch">
                      Re-check
                    </Button>
                  </div>
                )}

                {step === "ready" && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {watchStatus?.watchName || "Watch"} is ready
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Send your login to the watch so it can access Orbia without signing in separately
                      </p>
                    </div>
                    <Button onClick={handleSendAuth} size="sm" data-testid="button-send-auth-watch">
                      <Send className="w-4 h-4 mr-1.5" />
                      Send Login to Watch
                    </Button>
                  </div>
                )}

                {step === "sending" && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Sending login to watch...</p>
                  </div>
                )}

                {step === "sent" && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </div>
                    </motion.div>
                    <div>
                      <p className="text-sm font-medium text-foreground">You're all set!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your watch is connected and logged in. Tap the orb on your watch to talk to Orbia.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={onClose} data-testid="button-done-watch">
                      Done
                    </Button>
                  </div>
                )}

                {step === "error" && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Something went wrong</p>
                      <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={checkStatus} data-testid="button-retry-watch-error">
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function WatchIconButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        data-testid="button-watch-companion"
        className={cn(
          "p-2 rounded-full",
          "bg-background/50 backdrop-blur-xl border border-border/30",
          "shadow-lg hover:shadow-xl transition-all duration-300",
          "text-muted-foreground hover:text-primary"
        )}
        title="Watch companion"
      >
        <Watch className="w-4 h-4" />
      </motion.button>

      <WatchCompanionSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
