import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

function ListeningOverlay({ onStop, isTranscribing }: { onStop: () => void; isTranscribing: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isTranscribing) return;
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isTranscribing]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, rgba(0,0,0,0.85) 70%)" }}
      onClick={!isTranscribing ? onStop : undefined}
    >
      <div className="relative flex items-center justify-center mb-8">
        {!isTranscribing && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border"
                style={{
                  borderColor: i % 2 === 0 
                    ? "rgba(139, 92, 246, 0.3)" 
                    : "rgba(168, 85, 247, 0.2)",
                }}
                initial={{ width: 80, height: 80, opacity: 0.6 }}
                animate={{
                  width: [80 + i * 40, 120 + i * 50, 80 + i * 40],
                  height: [80 + i * 40, 120 + i * 50, 80 + i * 40],
                  opacity: [0.6 - i * 0.1, 0.3 - i * 0.05, 0.6 - i * 0.1],
                }}
                transition={{
                  duration: 2.5 + i * 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
              />
            ))}
          </>
        )}

        <motion.div
          className="relative z-10 rounded-full flex items-center justify-center"
          style={{
            width: 90,
            height: 90,
            background: isTranscribing
              ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(79,70,229,0.3))"
              : "linear-gradient(135deg, rgba(139,92,246,0.5), rgba(236,72,153,0.4))",
            boxShadow: isTranscribing
              ? "0 0 40px rgba(139,92,246,0.2)"
              : "0 0 60px rgba(139,92,246,0.4), 0 0 120px rgba(139,92,246,0.15)",
          }}
          animate={
            isTranscribing
              ? { scale: [1, 1.05, 1] }
              : {
                  scale: [1, 1.12, 1],
                  boxShadow: [
                    "0 0 60px rgba(139,92,246,0.4), 0 0 120px rgba(139,92,246,0.15)",
                    "0 0 80px rgba(139,92,246,0.6), 0 0 160px rgba(139,92,246,0.25)",
                    "0 0 60px rgba(139,92,246,0.4), 0 0 120px rgba(139,92,246,0.15)",
                  ],
                }
          }
          transition={{ duration: isTranscribing ? 1.5 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {isTranscribing ? (
            <Loader2 className="w-10 h-10 text-white/90 animate-spin" />
          ) : (
            <Mic className="w-10 h-10 text-white/90" />
          )}
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-white/90 text-xl font-medium mb-2"
      >
        {isTranscribing ? "Understanding you..." : "Listening..."}
      </motion.p>

      {!isTranscribing && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/40 text-sm mb-8"
        >
          {formatTime(elapsed)} — tap anywhere to stop
        </motion.p>
      )}

      {isTranscribing && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-violet-300/60 text-sm mb-8"
        >
          Processing your voice...
        </motion.p>
      )}

      {!isTranscribing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
            className="rounded-full border-white/20 text-white/80 hover:text-white hover:bg-white/10 gap-2 px-6"
          >
            <MicOff className="w-5 h-5" />
            Stop Recording
          </Button>
        </motion.div>
      )}
    </motion.div>,
    document.body
  );
}

export function VoiceInputButton({
  onTranscript,
  disabled,
  className,
  variant = "outline",
  size = "icon",
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size < 1000) {
          toast.error("Recording too short, try again");
          return;
        }

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioData: base64, mimeType }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Transcription failed");
          }

          const { text } = await res.json();
          if (text?.trim()) {
            onTranscript(text.trim());
          } else {
            toast.error("Could not understand the audio, try again");
          }
        } catch (err: any) {
          console.error("Transcription error:", err);
          toast.error(err.message || "Voice transcription failed");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone error:", err);
      if (err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings.");
      } else {
        toast.error("Could not access microphone");
      }
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={cn(
          "relative transition-all duration-300",
          isTranscribing && "opacity-70",
          className
        )}
        data-testid="button-voice-input"
      >
        {isTranscribing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      <AnimatePresence>
        {(isRecording || isTranscribing) && (
          <ListeningOverlay onStop={stopRecording} isTranscribing={isTranscribing} />
        )}
      </AnimatePresence>
    </>
  );
}
