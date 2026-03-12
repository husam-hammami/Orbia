import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import logoUrl from "@assets/ChatGPT_Image_Jan_10,_2026,_05_13_01_PM_1768050787078.png";

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
  liveTranscript: string;
  interimText: string;
  orbiaResponse: string;
  conversationMode: boolean;
}

function ListeningOverlay({ phase, onStop, onInterrupt, liveTranscript, interimText, orbiaResponse, conversationMode }: ListeningOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [idleMsgIndex, setIdleMsgIndex] = useState(0);
  const [thinkMsgIndex] = useState(() => Math.floor(Math.random() * thinkingMessages.length));
  const responseRef = useRef<HTMLDivElement>(null);
  const [displayedWordCount, setDisplayedWordCount] = useState(0);
  const streamingStartedRef = useRef(false);

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

  useEffect(() => {
    if (phase === "speaking" && orbiaResponse && !streamingStartedRef.current) {
      streamingStartedRef.current = true;
      setDisplayedWordCount(0);
      const words = orbiaResponse.split(/\s+/);
      const totalWords = words.length;
      const msPerWord = Math.max(60, Math.min(150, 8000 / totalWords));
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setDisplayedWordCount(count);
        if (count >= totalWords) clearInterval(interval);
      }, msPerWord);
      return () => clearInterval(interval);
    }
    if (phase !== "speaking") {
      streamingStartedRef.current = false;
      setDisplayedWordCount(0);
    }
  }, [phase, orbiaResponse]);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [displayedWordCount]);

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
    else if (isProcessing) onInterrupt();
    else if (isSpeaking) onInterrupt();
  };

  const ringAnimation = isProcessing || isSpeaking
    ? { width: [120, 140, 120], height: [120, 140, 120], opacity: [0.5, 0.3, 0.5], rotate: [0, 5, 0] }
    : hasLiveText
      ? { width: [120, 170, 120], height: [120, 170, 120], opacity: [0.7, 0.35, 0.7], rotate: [0, 10, 0] }
      : { width: [120, 170, 120], height: [120, 170, 120], opacity: [0.6, 0.25, 0.6], rotate: [0, 8, 0] };

  const ringDuration = isProcessing ? 2 : isSpeaking ? 1.5 : hasLiveText ? 2 : 3;

  const logoAnimation = isSpeaking
    ? {
        scale: [1, 1.12, 1],
        filter: [
          "brightness(1.1) drop-shadow(0 0 50px rgba(139,92,246,0.6))",
          "brightness(1.35) drop-shadow(0 0 100px rgba(139,92,246,0.8)) drop-shadow(0 0 140px rgba(168,85,247,0.4))",
          "brightness(1.1) drop-shadow(0 0 50px rgba(139,92,246,0.6))",
        ],
      }
    : isProcessing
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
      onClick={handleOverlayClick}
    >
      <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              background: `radial-gradient(circle, transparent 60%, ${
                i % 2 === 0
                  ? isSpeaking ? "rgba(168, 85, 247, 0.12)" : "rgba(139, 92, 246, 0.08)"
                  : isSpeaking ? "rgba(216, 180, 254, 0.08)" : "rgba(192, 132, 252, 0.06)"
              } 100%)`,
              border: `1px solid ${
                i % 2 === 0
                  ? isSpeaking ? "rgba(168, 85, 247, 0.25)" : "rgba(139, 92, 246, 0.15)"
                  : isSpeaking ? "rgba(216, 180, 254, 0.15)" : "rgba(192, 132, 252, 0.1)"
              }`,
            }}
            animate={{
              width: [ringAnimation.width[0] + i * 30, ringAnimation.width[1] + i * (isSpeaking ? 45 : 40), ringAnimation.width[2] + i * 30],
              height: [ringAnimation.height[0] + i * 30, ringAnimation.height[1] + i * (isSpeaking ? 45 : 40), ringAnimation.height[2] + i * 30],
              opacity: [ringAnimation.opacity[0] - i * 0.08, ringAnimation.opacity[1] - i * 0.04, ringAnimation.opacity[2] - i * 0.08],
              rotate: [0, i % 2 === 0 ? ringAnimation.rotate[1] : -ringAnimation.rotate[1], 0],
            }}
            transition={{
              duration: ringDuration + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
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
            src={logoUrl}
            alt="Orbia"
            className="w-28 h-28 object-contain"
          />
        </motion.div>

        {isActive && !hasLiveText && (
          <motion.div
            className="absolute z-20"
            style={{ bottom: 15 }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-violet-400"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
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
            className="text-violet-200/90 text-xl font-light tracking-wide mt-2 mb-2"
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
          <div className="relative rounded-2xl bg-white/[0.03] backdrop-blur-md border border-violet-500/10 px-5 py-4 min-h-[60px] max-h-[160px] overflow-y-auto">
            <p className="text-violet-100/90 text-base leading-relaxed font-light">
              {liveTranscript}
              {interimText && (
                <span className="text-violet-300/50">{liveTranscript ? " " : ""}{interimText}</span>
              )}
              <motion.span
                className="inline-block w-0.5 h-4 bg-violet-400/70 ml-0.5 align-text-bottom"
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
            <span className="text-violet-300/50 text-sm">Transcribing...</span>
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
            className="text-violet-200/80 text-lg font-light tracking-wide"
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
              onInterrupt();
            }}
            className="rounded-full border-violet-500/20 bg-violet-500/10 text-violet-200/60 hover:text-white hover:bg-violet-500/20 text-xs px-4"
          >
            Cancel
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
            className="relative rounded-2xl bg-violet-500/[0.06] backdrop-blur-md border border-violet-400/15 px-5 py-4 max-h-[180px] overflow-y-auto"
          >
            <p className="text-violet-100 text-base leading-relaxed font-light">
              {orbiaResponse.split(/\s+/).slice(0, displayedWordCount).join(" ")}
              {displayedWordCount < orbiaResponse.split(/\s+/).length && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-violet-400/70 ml-0.5 align-text-bottom"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "steps(2)" }}
                />
              )}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <motion.div
              className="flex items-center gap-1"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full bg-violet-400"
                  animate={{ height: [3, 12 + Math.random() * 8, 3] }}
                  transition={{ duration: 0.5 + Math.random() * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                />
              ))}
            </motion.div>
            <span className="text-violet-300/40 text-xs ml-1">Speaking...</span>
          </div>
        </motion.div>
      )}

      {isActive && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white/25 text-xs mb-6 mt-1"
        >
          {formatTime(elapsed)}
        </motion.p>
      )}

      {isActive && (
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
              onInterrupt();
            }}
            className="rounded-full border-violet-500/20 bg-violet-500/10 text-violet-200/80 hover:text-white hover:bg-violet-500/20 gap-2 px-8 backdrop-blur-sm"
          >
            <Square className="w-3 h-3 fill-current" />
            Stop
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

      if (onConversationResponse) {
        onConversationResponse(transcribedText, responseText);
      }

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
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      cleanup();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Voice conversation failed";
      console.error("[Voice] Conversation error:", err);
      toast.error(message);
      cleanup();
    }
  }, [chatHistory, therapyMode, aiMode, onConversationResponse, playAudio, cleanup]);

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

  const handleClick = () => {
    if (phase === "listening") {
      stopRecording();
    } else if (phase === "thinking" || phase === "transcribing") {
      cleanup();
    } else if (phase === "speaking") {
      interruptSpeaking();
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
