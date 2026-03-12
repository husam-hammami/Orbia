import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import logoUrl from "@assets/ChatGPT_Image_Jan_10,_2026,_05_13_01_PM_1768050787078.png";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const listeningMessages = [
  "I'm right here...",
  "Take your time...",
  "I'm listening...",
  "Tell me everything...",
  "Go ahead, I'm here...",
];

const transcribingMessages = [
  "Let me think about that...",
  "Processing what you said...",
  "I heard you...",
  "One moment...",
];

function ListeningOverlay({ onStop, isTranscribing }: { onStop: () => void; isTranscribing: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMessageIndex(Math.floor(Math.random() * listeningMessages.length));
  }, []);

  useEffect(() => {
    if (isTranscribing) {
      setMessageIndex(Math.floor(Math.random() * transcribingMessages.length));
      return;
    }
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isTranscribing]);

  useEffect(() => {
    if (isTranscribing) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % listeningMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isTranscribing]);

  const messages = isTranscribing ? transcribingMessages : listeningMessages;

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
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, rgba(88, 28, 135, 0.25) 0%, rgba(15, 10, 30, 0.95) 60%, rgba(5, 2, 15, 0.98) 100%)",
      }}
      onClick={!isTranscribing ? onStop : undefined}
    >
      <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              background: `radial-gradient(circle, transparent 60%, ${
                i % 2 === 0
                  ? "rgba(139, 92, 246, 0.08)"
                  : "rgba(192, 132, 252, 0.06)"
              } 100%)`,
              border: `1px solid ${
                i % 2 === 0
                  ? "rgba(139, 92, 246, 0.15)"
                  : "rgba(192, 132, 252, 0.1)"
              }`,
            }}
            animate={
              isTranscribing
                ? {
                    width: [140 + i * 35, 160 + i * 35, 140 + i * 35],
                    height: [140 + i * 35, 160 + i * 35, 140 + i * 35],
                    opacity: [0.5 - i * 0.08, 0.3 - i * 0.05, 0.5 - i * 0.08],
                    rotate: [0, i % 2 === 0 ? 5 : -5, 0],
                  }
                : {
                    width: [140 + i * 35, 190 + i * 45, 140 + i * 35],
                    height: [140 + i * 35, 190 + i * 45, 140 + i * 35],
                    opacity: [0.6 - i * 0.08, 0.25 - i * 0.04, 0.6 - i * 0.08],
                    rotate: [0, i % 2 === 0 ? 8 : -8, 0],
                  }
            }
            transition={{
              duration: isTranscribing ? 2 + i * 0.3 : 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}

        <motion.div
          className="relative z-10"
          animate={
            isTranscribing
              ? {
                  scale: [1, 1.04, 1],
                  filter: [
                    "brightness(1) drop-shadow(0 0 30px rgba(139,92,246,0.4))",
                    "brightness(1.1) drop-shadow(0 0 50px rgba(139,92,246,0.5))",
                    "brightness(1) drop-shadow(0 0 30px rgba(139,92,246,0.4))",
                  ],
                }
              : {
                  scale: [1, 1.08, 1],
                  filter: [
                    "brightness(1.05) drop-shadow(0 0 40px rgba(139,92,246,0.5))",
                    "brightness(1.25) drop-shadow(0 0 80px rgba(139,92,246,0.7)) drop-shadow(0 0 120px rgba(168,85,247,0.3))",
                    "brightness(1.05) drop-shadow(0 0 40px rgba(139,92,246,0.5))",
                  ],
                }
          }
          transition={{
            duration: isTranscribing ? 2 : 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <img
            src={logoUrl}
            alt="Orbia"
            className="w-32 h-32 object-contain"
          />
        </motion.div>

        {!isTranscribing && (
          <motion.div
            className="absolute z-20"
            style={{ bottom: 20 }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.9, 1, 0.9],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-violet-400"
                  animate={{
                    scale: [1, 1.8, 1],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5 }}
          className="text-violet-200/90 text-xl font-light tracking-wide mt-2 mb-2"
        >
          {messages[messageIndex % messages.length]}
        </motion.p>
      </AnimatePresence>

      {!isTranscribing && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white/25 text-xs mb-10"
        >
          {formatTime(elapsed)}
        </motion.p>
      )}

      {isTranscribing && (
        <motion.div
          className="flex items-center gap-2 mb-10 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-3.5 h-3.5 text-violet-400/60 animate-spin" />
          <span className="text-violet-300/40 text-xs">Transcribing...</span>
        </motion.div>
      )}

      {!isTranscribing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
            className="rounded-full border-violet-500/20 bg-violet-500/10 text-violet-200/80 hover:text-white hover:bg-violet-500/20 gap-2 px-8 backdrop-blur-sm"
          >
            <MicOff className="w-4 h-4" />
            Done
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
  const streamRef = useRef<MediaStream | null>(null);
  const stoppingRef = useRef(false);

  const processRecording = useCallback(async (chunks: Blob[], mimeType: string) => {
    const blob = new Blob(chunks, { type: mimeType });
    console.log("[Voice] Processing recording:", { chunkCount: chunks.length, blobSize: blob.size, mimeType });

    if (blob.size < 100) {
      console.error("[Voice] Blob too small:", blob.size, "bytes from", chunks.length, "chunks");
      toast.error("Recording too short, try again");
      setIsRecording(false);
      return;
    }

    setIsTranscribing(true);
    setIsRecording(false);

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      console.log("[Voice] Base64 size:", base64.length, "chars");

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ audioData: base64, mimeType }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Transcription failed" }));
        throw new Error(err.error || "Transcription failed");
      }

      const data = await res.json();
      const text = data.text?.trim();
      console.log("[Voice] Transcription result:", text ? text.substring(0, 50) + "..." : "(empty)");

      if (text) {
        onTranscript(text);
      } else {
        toast.error("Could not understand the audio, try again");
      }
    } catch (err: any) {
      console.error("[Voice] Transcription error:", err);
      toast.error(err.message || "Voice transcription failed");
    } finally {
      setIsTranscribing(false);
    }
  }, [onTranscript]);

  const startRecording = useCallback(async () => {
    if (stoppingRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];
      let mimeType = "";
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      if (!mimeType) {
        mimeType = "audio/webm";
      }
      console.log("[Voice] Using MIME type:", mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      stoppingRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        console.log("[Voice] Data chunk received:", e.data.size, "bytes");
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("[Voice] MediaRecorder stopped. Total chunks:", chunksRef.current.length);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const chunks = [...chunksRef.current];
        const mt = mimeType;
        processRecording(chunks, mt);
      };

      mediaRecorder.onerror = (e: any) => {
        console.error("[Voice] MediaRecorder error:", e.error || e);
        toast.error("Recording error occurred");
        setIsRecording(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(500);
      setIsRecording(true);
      console.log("[Voice] Recording started");
    } catch (err: any) {
      console.error("[Voice] Microphone error:", err);
      if (err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings.");
      } else {
        toast.error("Could not access microphone");
      }
    }
  }, [processRecording]);

  const stopRecording = useCallback(() => {
    if (stoppingRef.current) return;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    stoppingRef.current = true;
    console.log("[Voice] Stopping recording...");

    try {
      recorder.requestData();
    } catch (e) {
      console.warn("[Voice] requestData failed (harmless):", e);
    }

    setTimeout(() => {
      try {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      } catch (e) {
        console.error("[Voice] stop() failed:", e);
        setIsRecording(false);
        stoppingRef.current = false;
      }
    }, 100);
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing) {
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
