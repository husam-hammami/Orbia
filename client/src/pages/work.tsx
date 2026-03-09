import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Calendar, MessageSquare, Send, Loader2,
  Link2, Unlink, ChevronRight, Clock, Video,
  MapPin, Users, Sparkles, ArrowRight, Zap,
  RefreshCw, ExternalLink
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import logoUrl from '@assets/ChatGPT_Image_Jan_10,_2026,_05_13_01_PM_1768050787078.png';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";

async function workApi(url: string, opts?: RequestInit) {
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  const res = await fetch(fullUrl, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (!res.ok && res.status !== 204) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const cmdPanel = "bg-black/40 backdrop-blur-xl border border-indigo-500/15 shadow-[0_0_15px_rgba(100,80,255,0.04)] rounded-2xl";
const cmdPanelGlow = "bg-black/40 backdrop-blur-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(100,80,255,0.06)] rounded-2xl";

function CmdLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[10px] uppercase tracking-[0.15em] text-indigo-400/60", className)} style={mono}>
      {children}
    </span>
  );
}

function ConnectionCard({ connected, displayName, email, onConnect, onDisconnect, isConnecting }: {
  connected: boolean;
  displayName?: string;
  email?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}) {
  return (
    <div className={cn(cmdPanel, "p-4")} data-testid="card-microsoft-connection">
      <div className="flex items-center justify-between mb-3">
        <CmdLabel>Microsoft 365</CmdLabel>
        <div className={cn(
          "w-2 h-2 rounded-full",
          connected
            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
            : "bg-zinc-500"
        )} />
      </div>

      {connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground/90 truncate">{displayName || "Connected"}</p>
              {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={onDisconnect}
            data-testid="button-disconnect-microsoft"
          >
            <Unlink className="w-3 h-3 mr-1.5" />
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Connect your Microsoft account to access Outlook Calendar and Teams.
          </p>
          <Button
            size="sm"
            className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
            onClick={onConnect}
            disabled={isConnecting}
            data-testid="button-connect-microsoft"
          >
            {isConnecting ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Link2 className="w-3 h-3 mr-1.5" />
            )}
            Connect Microsoft
          </Button>
        </div>
      )}
    </div>
  );
}

function CalendarTimeline({ events }: { events: any[] }) {
  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="w-8 h-8 text-indigo-400/30 mb-2" />
        <p className="text-xs text-muted-foreground">No events today</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="list-calendar-events">
      {events.map((event: any, i: number) => {
        const startTime = new Date(event.start.dateTime + (event.start.timeZone === "UTC" ? "Z" : "")).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const endTime = new Date(event.end.dateTime + (event.end.timeZone === "UTC" ? "Z" : "")).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const isOnline = event.isOnlineMeeting;
        const location = event.location?.displayName;

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "p-3 rounded-xl border transition-all",
              "bg-indigo-500/5 border-indigo-500/10 hover:border-indigo-500/25"
            )}
            data-testid={`card-calendar-event-${i}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 pt-0.5">
                <div className="text-[11px] font-mono text-indigo-300/70" style={mono}>
                  {startTime}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground/90 truncate">{event.subject}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-muted-foreground" style={mono}>
                    {startTime} – {endTime}
                  </span>
                  {isOnline && (
                    <span className="flex items-center gap-0.5 text-[10px] text-indigo-400/70">
                      <Video className="w-2.5 h-2.5" /> Online
                    </span>
                  )}
                  {location && !isOnline && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground truncate max-w-[120px]">
                      <MapPin className="w-2.5 h-2.5" /> {location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function TeamsPanel({ chats, onSelectChat, selectedChatId, chatMessages, onSendMessage, loadingMessages }: {
  chats: any[];
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null;
  chatMessages: any[];
  onSendMessage: (chatId: string, content: string) => void;
  loadingMessages: boolean;
}) {
  const [replyText, setReplyText] = useState("");

  if (!chats.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="w-8 h-8 text-indigo-400/30 mb-2" />
        <p className="text-xs text-muted-foreground">No recent conversations</p>
      </div>
    );
  }

  if (selectedChatId) {
    return (
      <div className="flex flex-col h-full" data-testid="panel-chat-messages">
        <button
          onClick={() => onSelectChat("")}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mb-3 transition-colors"
          data-testid="button-back-to-chats"
        >
          <ChevronRight className="w-3 h-3 rotate-180" /> Back to chats
        </button>

        <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-[350px]">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400/50" />
            </div>
          ) : (
            [...chatMessages].reverse().map((msg: any, i: number) => (
              <div
                key={msg.id || i}
                className={cn(
                  "p-2.5 rounded-lg text-xs",
                  "bg-indigo-500/5 border border-indigo-500/10"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-medium text-foreground/80 text-[11px]">
                    {msg.from?.user?.displayName || "Unknown"}
                  </span>
                  <span className="text-[9px] text-muted-foreground" style={mono}>
                    {msg.createdDateTime ? new Date(msg.createdDateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <p className="text-foreground/70 leading-relaxed">
                  {(msg.body?.content || "").replace(/<[^>]*>/g, "")}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type a reply..."
            className="text-xs bg-black/30 border-indigo-500/15 focus:border-indigo-500/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && replyText.trim()) {
                onSendMessage(selectedChatId, replyText.trim());
                setReplyText("");
              }
            }}
            data-testid="input-teams-reply"
          />
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500"
            onClick={() => {
              if (replyText.trim()) {
                onSendMessage(selectedChatId, replyText.trim());
                setReplyText("");
              }
            }}
            data-testid="button-send-teams-reply"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-testid="list-teams-chats">
      {chats.map((chat: any, i: number) => {
        const preview = chat.lastMessagePreview?.body?.content?.replace(/<[^>]*>/g, "")?.substring(0, 80) || "No messages";
        const topic = chat.topic || "Direct message";
        const time = chat.lastUpdatedDateTime
          ? new Date(chat.lastUpdatedDateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : "";

        return (
          <motion.button
            key={chat.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              "w-full text-left p-3 rounded-xl border transition-all",
              "bg-indigo-500/5 border-indigo-500/10 hover:border-indigo-500/25 hover:bg-indigo-500/8"
            )}
            data-testid={`button-teams-chat-${i}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground/85 truncate max-w-[180px]">{topic}</span>
              <span className="text-[9px] text-muted-foreground flex-shrink-0" style={mono}>{time}</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{preview}</p>
          </motion.button>
        );
      })}
    </div>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function NexusChat({ connected }: { connected: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickChips = [
    "What's my day look like?",
    "Prep me for my next meeting",
    "Find free slots this week",
    "How's my work-life balance?",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    try {
      const fullUrl = API_BASE_URL ? `${API_BASE_URL}/api/work/chat` : "/api/work/chat";
      const res = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming]);

  return (
    <div className="flex flex-col h-full" data-testid="panel-nexus-chat">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
              <img src={logoUrl} alt="Orbia" className="w-14 h-14 rounded-2xl relative" />
            </div>
            <h3 className="text-base font-display font-semibold text-foreground/90 mb-1">Nexus</h3>
            <p className="text-xs text-muted-foreground text-center max-w-[240px] leading-relaxed">
              {connected
                ? "Your work intelligence layer. I can see your calendar and Teams — just ask."
                : "Connect your Microsoft account to unlock calendar and Teams intelligence."
              }
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-sm leading-relaxed",
                msg.role === "user"
                  ? "ml-8 p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/20 text-foreground/90"
                  : "mr-4 text-foreground/80"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_strong]:text-indigo-300 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-indigo-300 [&_h2]:mt-3 [&_h2]:mb-1 [&_p]:my-1 [&_li]:my-0.5 [&_ol]:my-1 [&_ul]:my-1 whitespace-pre-wrap">
                  {msg.content}
                  {isStreaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle rounded-sm" />
                  )}
                </div>
              ) : (
                msg.content
              )}
            </motion.div>
          ))
        )}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              className="text-[11px] px-3 py-1.5 rounded-full border border-indigo-500/20 text-indigo-300/80 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all"
              data-testid={`chip-${chip.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Nexus anything..."
          className="text-sm bg-black/30 border-indigo-500/15 focus:border-indigo-500/30 placeholder:text-muted-foreground/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          disabled={isStreaming}
          data-testid="input-nexus-chat"
        />
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-500 px-3"
          onClick={() => sendMessage(input)}
          disabled={isStreaming || !input.trim()}
          data-testid="button-send-nexus"
        >
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function SetupScreen({ onConnect, isConnecting }: { onConnect: () => void; isConnecting: boolean }) {
  const features = [
    { icon: Calendar, title: "Outlook Calendar", desc: "See your schedule, prep for meetings" },
    { icon: MessageSquare, title: "Teams Messages", desc: "Read and reply to conversations" },
    { icon: Sparkles, title: "AI Work Assistant", desc: "Smart briefings, meeting prep, day strategy" },
  ];

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-indigo-500/25 blur-3xl rounded-full scale-150" />
            <div className={cn(cmdPanelGlow, "p-5 inline-flex relative")}>
              <Monitor className="w-10 h-10 text-indigo-400" />
            </div>
          </div>

          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Command Center</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-[320px] mx-auto leading-relaxed">
            Connect your Microsoft 365 account to bring your work life into Orbia.
          </p>

          <div className="space-y-3 mb-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={cn(cmdPanel, "p-4 flex items-center gap-4 text-left")}
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-500/12 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4.5 h-4.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/90">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20"
            onClick={onConnect}
            disabled={isConnecting}
            data-testid="button-setup-connect"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Connect Microsoft 365
          </Button>

          <p className="text-[10px] text-muted-foreground/50 mt-4 leading-relaxed">
            We'll request access to your calendar and Teams messages. You can disconnect at any time.
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}

type MobileTab = "today" | "nexus" | "comms";

export default function WorkPage() {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("nexus");

  const { data: connectionStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ["/api/work/microsoft/status"],
    queryFn: () => workApi("/api/work/microsoft/status"),
  });

  const connected = connectionStatus?.connected || false;

  const { data: calendarData, isLoading: loadingCalendar } = useQuery({
    queryKey: ["/api/work/calendar"],
    queryFn: () => workApi("/api/work/calendar"),
    enabled: connected,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ["/api/work/teams/chats"],
    queryFn: () => workApi("/api/work/teams/chats"),
    enabled: connected,
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: chatMessagesData, isLoading: loadingChatMessages } = useQuery({
    queryKey: ["/api/work/teams/chats", selectedChatId, "messages"],
    queryFn: () => workApi(`/api/work/teams/chats/${selectedChatId}/messages`),
    enabled: !!selectedChatId,
  });

  const disconnectMutation = useMutation({
    mutationFn: () => workApi("/api/work/microsoft/disconnect", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work/microsoft/status"] });
    },
  });

  const sendTeamsMessage = useCallback(async (chatId: string, content: string) => {
    try {
      await workApi(`/api/work/teams/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work/teams/chats", chatId, "messages"] });
    } catch (error) {
      console.error("Failed to send Teams message:", error);
    }
  }, [queryClient]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const data = await workApi("/api/work/microsoft/auth");
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Failed to initiate Microsoft auth:", error);
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnectMutation.mutate();
  }, [disconnectMutation]);

  if (loadingStatus) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400/50" />
        </div>
      </Layout>
    );
  }

  if (!connected) {
    return <SetupScreen onConnect={handleConnect} isConnecting={isConnecting} />;
  }

  const calendarEvents = calendarData?.value || [];
  const teamsChats = teamsData?.value || [];
  const chatMessages = chatMessagesData?.value || [];

  const todayEvents = calendarEvents.filter((e: any) => {
    const eventDate = new Date(e.start.dateTime).toDateString();
    return eventDate === new Date().toDateString();
  });

  const meetingCount = todayEvents.length;
  const totalMeetingHours = todayEvents.reduce((acc: number, e: any) => {
    const start = new Date(e.start.dateTime);
    const end = new Date(e.end.dateTime);
    return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);
  const freeHours = Math.max(0, 8 - totalMeetingHours);

  const mobileTabItems: { key: MobileTab; label: string; icon: typeof Calendar }[] = [
    { key: "today", label: "Today", icon: Calendar },
    { key: "nexus", label: "Nexus", icon: Sparkles },
    { key: "comms", label: "Comms", icon: MessageSquare },
  ];

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={cn(cmdPanelGlow, "p-2.5")}>
                <Monitor className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-display font-bold text-foreground" data-testid="text-page-title">Command Center</h1>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/work/calendar"] });
                queryClient.invalidateQueries({ queryKey: ["/api/work/teams/chats"] });
              }}
              data-testid="button-refresh-data"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>

          {/* Mobile tabs */}
          <div className="lg:hidden flex gap-1 mb-4 p-1 bg-black/30 rounded-xl border border-indigo-500/10">
            {mobileTabItems.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                  mobileTab === tab.key
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`tab-mobile-${tab.key}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Desktop: 3-column layout */}
          <div className="hidden lg:grid lg:grid-cols-[280px_1fr_300px] gap-4">
            {/* Left: Today */}
            <div className="space-y-4">
              <ConnectionCard
                connected={connected}
                displayName={connectionStatus?.displayName}
                email={connectionStatus?.email}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                isConnecting={isConnecting}
              />

              <div className={cn(cmdPanel, "p-4")}>
                <div className="flex items-center justify-between mb-3">
                  <CmdLabel>Today's Schedule</CmdLabel>
                  <span className="text-[10px] text-muted-foreground" style={mono}>
                    {meetingCount} meeting{meetingCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {loadingCalendar ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400/40" />
                  </div>
                ) : (
                  <CalendarTimeline events={todayEvents} />
                )}
              </div>

              <div className={cn(cmdPanel, "p-4")}>
                <CmdLabel>Quick Stats</CmdLabel>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center">
                    <p className="text-lg font-display font-bold text-indigo-300" data-testid="stat-meetings">{meetingCount}</p>
                    <p className="text-[10px] text-muted-foreground" style={mono}>Meetings</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <p className="text-lg font-display font-bold text-emerald-300" data-testid="stat-free-hours">{freeHours.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground" style={mono}>Free hrs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Nexus AI */}
            <div className={cn(cmdPanelGlow, "p-5 flex flex-col min-h-[600px]")}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <CmdLabel>Nexus AI</CmdLabel>
              </div>
              <NexusChat connected={connected} />
            </div>

            {/* Right: Comms */}
            <div className={cn(cmdPanel, "p-4 flex flex-col min-h-[600px]")}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <CmdLabel>Teams</CmdLabel>
                </div>
                {teamsChats.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400" style={mono}>
                    {teamsChats.length}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingTeams ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400/40" />
                  </div>
                ) : (
                  <TeamsPanel
                    chats={teamsChats}
                    onSelectChat={(id) => setSelectedChatId(id || null)}
                    selectedChatId={selectedChatId}
                    chatMessages={chatMessages}
                    onSendMessage={sendTeamsMessage}
                    loadingMessages={loadingChatMessages}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mobile: tab content */}
          <div className="lg:hidden">
            <AnimatePresence mode="wait">
              {mobileTab === "today" && (
                <motion.div
                  key="today"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <ConnectionCard
                    connected={connected}
                    displayName={connectionStatus?.displayName}
                    email={connectionStatus?.email}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    isConnecting={isConnecting}
                  />

                  <div className={cn(cmdPanel, "p-4")}>
                    <div className="flex items-center justify-between mb-3">
                      <CmdLabel>Today's Schedule</CmdLabel>
                      <span className="text-[10px] text-muted-foreground" style={mono}>
                        {meetingCount} meeting{meetingCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {loadingCalendar ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400/40" />
                      </div>
                    ) : (
                      <CalendarTimeline events={todayEvents} />
                    )}
                  </div>

                  <div className={cn(cmdPanel, "p-4")}>
                    <CmdLabel>Quick Stats</CmdLabel>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center">
                        <p className="text-lg font-display font-bold text-indigo-300">{meetingCount}</p>
                        <p className="text-[10px] text-muted-foreground" style={mono}>Meetings</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                        <p className="text-lg font-display font-bold text-emerald-300">{freeHours.toFixed(1)}</p>
                        <p className="text-[10px] text-muted-foreground" style={mono}>Free hrs</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {mobileTab === "nexus" && (
                <motion.div
                  key="nexus"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(cmdPanelGlow, "p-4 min-h-[500px] flex flex-col")}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <CmdLabel>Nexus AI</CmdLabel>
                  </div>
                  <NexusChat connected={connected} />
                </motion.div>
              )}

              {mobileTab === "comms" && (
                <motion.div
                  key="comms"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(cmdPanel, "p-4 min-h-[500px]")}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <CmdLabel>Teams</CmdLabel>
                    </div>
                  </div>
                  {loadingTeams ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400/40" />
                    </div>
                  ) : (
                    <TeamsPanel
                      chats={teamsChats}
                      onSelectChat={(id) => setSelectedChatId(id || null)}
                      selectedChatId={selectedChatId}
                      chatMessages={chatMessages}
                      onSendMessage={sendTeamsMessage}
                      loadingMessages={loadingChatMessages}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}
