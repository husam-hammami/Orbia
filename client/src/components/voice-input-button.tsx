import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, Square, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import sphereUrl from "@assets/orbia_sphere_transparent.png";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

type OverlayPhase = "listening" | "transcribing" | "thinking" | "speaking";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  conversationMode?: boolean;
  onConversationResponse?: (userText: string, assistantText: string) => void;
  chatHistory?: Array<{ role: string; content: string }>;
  therapyMode?: boolean;
  aiMode?: "orbit" | "work" | "medical";
}

const idleMessages = [
  "I'm right here...",
  "Take your time...",
  "I'm listening...",
  "Tell me everything...",
  "Go ahead, I'm here...",
];

const thinkingMessages = [
  "Let me think about that...",
  "Processing what you said...",
  "One moment...",
  "Thinking...",
];

const SpeechRecognitionAPI: SpeechRecognitionConstructor | null =
  typeof window !== "undefined"
    ? ((window as Record<string, unknown>).SpeechRecognition || (window as Record<string, unknown>).webkitSpeechRecognition) as SpeechRecognitionConstructor | null
    : null;

interface ListeningOverlayProps {
  phase: OverlayPhase;
  onStop: () => void;
  onInterrupt: () => void;
  onEndCall: () => void;
  liveTranscript: string;
  interimText: string;
  orbiaResponse: string;
  conversationMode: boolean;
}

function ListeningOverlay({ phase, onStop, onInterrupt, onEndCall, liveTranscript, interimText, orbiaResponse, conversationMode }: ListeningOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [idleMsgIndex, setIdleMsgIndex] = useState(0);
  const [thinkMsgIndex] = useState(() => Math.floor(Math.random() * thinkingMessages.length));
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIdleMsgIndex(Math.floor(Math.random() * idleMessages.length));
  }, []);

  useEffect(() => {
    if (phase !== "listening") return;
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "listening") return;
    const interval = setInterval(() => {
      setIdleMsgIndex((prev) => (prev + 1) % idleMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const hasLiveText = liveTranscript.length > 0 || interimText.length > 0;
  const isActive = phase === "listening";
  const isProcessing = phase === "transcribing" || phase === "thinking";
  const isSpeaking = phase === "speaking";

  const handleOverlayClick = () => {
    if (isActive) onStop();
    else if (isProcessing) onEndCall();
    else if (isSpeaking) onEndCall();
  };

  const ringAnimation = isProcessing
    ? { width: [125, 135, 125], height: [125, 135, 125], opacity: [0.3, 0.2, 0.3], rotate: [0, 2, 0] }
    : isSpeaking
      ? { width: [120, 140, 120], height: [120, 140, 120], opacity: [0.5, 0.3, 0.5], rotate: [0, 5, 0] }
      : hasLiveText
        ? { width: [120, 170, 120], height: [120, 170, 120], opacity: [0.7, 0.35, 0.7], rotate: [0, 10, 0] }
        : { width: [120, 170, 120], height: [120, 170, 120], opacity: [0.6, 0.25, 0.6], rotate: [0, 8, 0] };

  const ringDuration = isProcessing ? 3 : isSpeaking ? 1.5 : hasLiveText ? 2 : 3;

  const logoAnimation = isSpeaking
    ? { scale: [1, 1.06, 1] }
    : isProcessing
      ? { scale: [1, 1.03, 1] }
      : { scale: [1, 1.05, 1] };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      style={{
        background: "radial-gradient(ellipse at center, hsl(var(--background)) 0%, hsl(var(--background)) 60%, hsl(var(--background)) 100%)",
      }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Voice input"
    >
      <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
        {[0, 1, 2].map((i) => (
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
            animate={{
              width: [ringAnimation.width[0] + i * 40, ringAnimation.width[1] + i * 50, ringAnimation.width[2] + i * 40],
              height: [ringAnimation.height[0] + i * 40, ringAnimation.height[1] + i * 50, ringAnimation.height[2] + i * 40],
              opacity: [ringAnimation.opacity[0] - i * 0.1, ringAnimation.opacity[1] - i * 0.05, ringAnimation.opacity[2] - i * 0.1],
            }}
            transition={{
              duration: ringDuration + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}

        <motion.div
          className="relative z-10"
          animate={logoAnimation}
          transition={{
            duration: isSpeaking ? 2 : isProcessing ? 2 : 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <img
            src={sphereUrl}
            alt="Orbia"
            className="w-28 h-28 object-contain drop-shadow-[0_0_16px_hsl(var(--primary)/0.4)]"
          />
        </motion.div>

        {isActive && !hasLiveText && (
          <div
            className="absolute z-20 flex items-center gap-1.5"
            style={{ bottom: 15 }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {isActive && !hasLiveText && (
        <AnimatePresence mode="wait">
          <motion.p
            key={idleMsgIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="text-foreground/80 text-xl font-light tracking-wide mt-2 mb-2"
          >
            {idleMessages[idleMsgIndex % idleMessages.length]}
          </motion.p>
        </AnimatePresence>
      )}

      {isActive && hasLiveText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 mb-2 px-8 max-w-lg w-full"
        >
          <div className="relative rounded-2xl bg-card/30 backdrop-blur-md border border-primary/10 px-5 py-4 min-h-[60px] max-h-[160px] overflow-y-auto">
            <p className="text-foreground/80 text-base leading-relaxed font-light">
              {liveTranscript}
              {interimText && (
                <span className="text-muted-foreground/50">{liveTranscript ? " " : ""}{interimText}</span>
              )}
              <motion.span
                className="inline-block w-0.5 h-4 bg-primary/70 ml-0.5 align-text-bottom"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: "steps(2)" }}
              />
            </p>
          </div>
        </motion.div>
      )}

      {phase === "transcribing" && (
        <motion.div
          className="mt-2 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-violet-400/60 animate-spin" />
            <span className="text-muted-foreground/50 text-sm">Transcribing...</span>
          </div>
        </motion.div>
      )}

      {phase === "thinking" && (
        <motion.div
          className="mt-2 mb-2 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.p
            className="text-foreground/70 text-lg font-light tracking-wide"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {thinkingMessages[thinkMsgIndex]}
          </motion.p>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEndCall();
            }}
            className="rounded-full border-red-500/30 bg-red-500/15 text-red-300/80 hover:text-white hover:bg-red-500/30 text-xs px-4"
          >
            <PhoneOff className="w-3 h-3 mr-1" />
            End Call
          </Button>
        </motion.div>
      )}

      {isSpeaking && orbiaResponse && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 mb-2 px-8 max-w-lg w-full"
        >
          <div
            ref={responseRef}
            className="relative rounded-2xl bg-card/30 backdrop-blur-md border border-primary/15 px-5 py-4 max-h-[180px] overflow-y-auto"
          >
            <p className="text-foreground/90 text-base leading-relaxed font-light">
              {orbiaResponse}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-2 rounded-full bg-primary/60"
                />
              ))}
            </div>
            <span className="text-muted-foreground/40 text-xs ml-1">Speaking...</span>
          </div>
        </motion.div>
      )}

      {isActive && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-foreground/25 text-xs mb-4 mt-1"
        >
          {formatTime(elapsed)}
        </motion.p>
      )}

      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
            className="rounded-full border-primary/20 bg-primary/10 text-foreground/70 hover:text-foreground hover:bg-primary/20 gap-2 px-6 backdrop-blur-sm"
          >
            <MicOff className="w-4 h-4" />
            Done Speaking
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onEndCall();
            }}
            className="rounded-full border-red-500/30 bg-red-500/15 text-red-300/90 hover:text-white hover:bg-red-500/30 gap-2 px-6 backdrop-blur-sm"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </Button>
        </motion.div>
      )}

      {isSpeaking && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onEndCall();
            }}
            className="rounded-full border-red-500/30 bg-red-500/15 text-red-300/90 hover:text-white hover:bg-red-500/30 gap-2 px-6 backdrop-blur-sm"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
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
  conversationMode = false,
  onConversationResponse,
  chatHistory,
  therapyMode = false,
  aiMode = "orbit",
}: VoiceInputButtonProps) {
  const [phase, setPhase] = useState<OverlayPhase | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [orbiaResponse, setOrbiaResponse] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stoppingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startRecordingRef = useRef<(() => void) | null>(null);
  const userCanceledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPhase(null);
    setLiveTranscript("");
    setInterimText("");
    setOrbiaResponse("");
    finalTranscriptRef.current = "";
    stoppingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const interruptSpeaking = useCallback(() => {
    userCanceledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    cleanup();
  }, [cleanup]);

  const playAudio = useCallback((base64Audio: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audioRef.current = audio;
        audio.onended = () => {
          audioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          audioRef.current = null;
          resolve();
        };
        audio.onpause = () => {
          if (!audio.ended) {
            audioRef.current = null;
            resolve();
          }
        };
        audio.play().catch(() => {
          audioRef.current = null;
          resolve();
        });
      } catch {
        resolve();
      }
    });
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
  }, []);

  const startSpeechRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return;
    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = finalTranscriptRef.current;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += (finalText ? " " : "") + transcript.trim();
            finalTranscriptRef.current = finalText;
          } else {
            interim += transcript;
          }
        }
        setLiveTranscript(finalText);
        setInterimText(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== "aborted" && event.error !== "no-speech") {
          console.warn("[Voice] SpeechRecognition error:", event.error);
        }
      };

      recognition.onend = () => {
        if (!stoppingRef.current && recognitionRef.current) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("[Voice] Could not start SpeechRecognition:", e);
    }
  }, []);

  const doConversation = useCallback(async (transcribedText: string) => {
    setPhase("thinking");
    setOrbiaResponse("");

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/voice/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: transcribedText,
          history: chatHistory?.slice(-6) || [],
          therapyMode,
          mode: aiMode,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Conversation failed" }));
        throw new Error(err.error || "Conversation failed");
      }

      const data = await res.json();
      const responseText = data.text || "";

      if (data.audio) {
        setPhase("speaking");
        setOrbiaResponse(responseText);
        try {
          await playAudio(data.audio);
        } catch (audioErr) {
          console.warn("[Voice] Audio playback failed:", audioErr);
        }
      } else {
        setOrbiaResponse(responseText);
        setPhase("speaking");
        const readTimeMs = Math.max(3000, Math.min(15000, responseText.split(/\s+/).length * 200));
        await new Promise(resolve => setTimeout(resolve, readTimeMs));
      }

      if (onConversationResponse && !userCanceledRef.current) {
        onConversationResponse(transcribedText, responseText);
      }

      if (conversationMode && !userCanceledRef.current) {
        setOrbiaResponse("");
        setLiveTranscript("");
        setInterimText("");
        finalTranscriptRef.current = "";
        stoppingRef.current = false;
        setPhase(null);
        setTimeout(() => {
          if (!userCanceledRef.current) {
            startRecordingRef.current?.();
          }
        }, 300);
      } else {
        cleanup();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Voice conversation failed";
      console.error("[Voice] Conversation error:", err);
      toast.error(message);
      cleanup();
    }
  }, [chatHistory, therapyMode, aiMode, onConversationResponse, playAudio, cleanup, conversationMode]);

  const processRecording = useCallback(async (chunks: Blob[], mimeType: string) => {
    const blob = new Blob(chunks, { type: mimeType });

    if (blob.size < 100) {
      toast.error("Recording too short, try again");
      cleanup();
      return;
    }

    setPhase("transcribing");
    setInterimText("");

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ audioData: base64, mimeType }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Transcription failed" }));
        throw new Error(err.error || "Transcription failed");
      }

      const data = await res.json();
      const text = data.text?.trim();

      if (!text) {
        toast.error("Could not understand the audio, try again");
        cleanup();
        return;
      }

      if (conversationMode && onConversationResponse) {
        await doConversation(text);
      } else {
        onTranscript(text);
        cleanup();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Voice transcription failed";
      console.error("[Voice] Transcription error:", err);
      toast.error(message);
      cleanup();
    }
  }, [onTranscript, conversationMode, onConversationResponse, doConversation, cleanup]);

  const startRecording = useCallback(async () => {
    if (stoppingRef.current || phase) return;

    userCanceledRef.current = false;
    setLiveTranscript("");
    setInterimText("");
    setOrbiaResponse("");
    finalTranscriptRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;

      const supportedTypes = [
        "audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg",
      ];
      let mimeType = supportedTypes.find(t => MediaRecorder.isTypeSupported(t)) || "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      stoppingRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (userCanceledRef.current) return;
        const chunks = [...chunksRef.current];
        processRecording(chunks, mimeType);
      };

      mediaRecorder.onerror = (e: Event) => {
        console.error("[Voice] MediaRecorder error:", e);
        toast.error("Recording error occurred");
        cleanup();
      };

      mediaRecorder.start(500);
      setPhase("listening");
      startSpeechRecognition();
    } catch (err: unknown) {
      console.error("[Voice] Microphone error:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings.");
      } else {
        toast.error("Could not access microphone");
      }
    }
  }, [processRecording, startSpeechRecognition, cleanup, phase]);

  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  const stopRecording = useCallback(() => {
    if (stoppingRef.current) return;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    stoppingRef.current = true;
    stopSpeechRecognition();

    try { recorder.requestData(); } catch (e) {}
    setTimeout(() => {
      try {
        if (recorder.state === "recording") recorder.stop();
      } catch (e) {
        cleanup();
      }
    }, 100);
  }, [stopSpeechRecognition, cleanup]);

  const endCall = useCallback(() => {
    userCanceledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      stoppingRef.current = true;
      stopSpeechRecognition();
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    cleanup();
  }, [cleanup, stopSpeechRecognition]);

  const handleClick = () => {
    if (phase === "listening") {
      stopRecording();
    } else if (phase === "thinking" || phase === "transcribing") {
      userCanceledRef.current = true;
      cleanup();
    } else if (phase === "speaking") {
      endCall();
    } else if (!phase) {
      startRecording();
    }
  };

  const isActive = !!phase;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || phase === "transcribing"}
        className={cn(
          "relative transition-all duration-300",
          isActive && "opacity-70",
          className
        )}
        data-testid="button-voice-input"
      >
        {phase === "transcribing" || phase === "thinking" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      <AnimatePresence>
        {phase && (
          <ListeningOverlay
            phase={phase}
            onStop={stopRecording}
            onInterrupt={interruptSpeaking}
            onEndCall={endCall}
            liveTranscript={liveTranscript}
            interimText={interimText}
            orbiaResponse={orbiaResponse}
            conversationMode={conversationMode}
          />
        )}
      </AnimatePresence>
    </>
  );
}
