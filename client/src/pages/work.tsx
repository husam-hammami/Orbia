import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Calendar, MessageSquare, Send, Loader2,
  Link2, Unlink, ChevronRight, Clock, Video,
  MapPin, Users, Sparkles, ArrowRight, Zap,
  RefreshCw, ExternalLink, BarChart3, Coffee,
  ChevronDown, AlertCircle, Mail, MailOpen,
  Reply, ArrowLeft, Paperclip, Rocket
} from "lucide-react";
import ProjectsTab from "@/components/projects-tab";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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

function parseEventDate(dateTime: string, timeZone?: string): Date {
  if (timeZone === "UTC") return new Date(dateTime + "Z");
  return new Date(dateTime);
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
          "w-2 h-2 rounded-full transition-all",
          connected
            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
            : "bg-zinc-500"
        )} />
      </div>

      {connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/25 flex items-center justify-center">
              <span className="text-sm font-bold text-indigo-300">
                {(displayName || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground/90 truncate">{displayName || "Connected"}</p>
              {email && <p className="text-[11px] text-muted-foreground truncate">{email}</p>}
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

const EMOJI_LIST = ["👍","❤️","😂","🎉","🙏","🔥","👀","✅","💯","👋","😊","🤝","⭐","💪","🚀","😅","🤔","👏","😎","💡"];

function TeamsPanel({ chats, onSelectChat, selectedChatId, chatMessages, onSendMessage, loadingMessages, loadingChats, error }: {
  chats: any[];
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null;
  chatMessages: any[];
  onSendMessage: (chatId: string, content: string) => Promise<void>;
  loadingMessages: boolean;
  loadingChats: boolean;
  error?: string | null;
}) {
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"sent" | "failed" | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && !loadingMessages && chatMessages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [chatMessages, loadingMessages, selectedChatId]);

  const handleSend = useCallback(async () => {
    if (!replyText.trim() || !selectedChatId || isSending) return;
    setIsSending(true);
    setSendStatus(null);
    try {
      await onSendMessage(selectedChatId, replyText.trim());
      setReplyText("");
      setSendStatus("sent");
      setTimeout(() => setSendStatus(null), 3000);
    } catch {
      setSendStatus("failed");
      setTimeout(() => setSendStatus(null), 4000);
    } finally {
      setIsSending(false);
    }
  }, [replyText, selectedChatId, isSending, onSendMessage]);

  if (loadingChats) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400/30 mb-2" />
        <p className="text-xs text-red-400/70">Failed to load conversations</p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">Try refreshing</p>
      </div>
    );
  }

  if (!chats.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/8 border border-indigo-500/10 flex items-center justify-center mb-3">
          <MessageSquare className="w-5 h-5 text-indigo-400/40" />
        </div>
        <p className="text-xs text-muted-foreground">No recent conversations</p>
      </div>
    );
  }

  if (selectedChatId) {
    const selectedChat = chats.find((c: any) => c.id === selectedChatId);
    const chatName = selectedChat?.topic || selectedChat?.resolvedName || "Conversation";

    return (
      <div className="flex flex-col h-full" data-testid="panel-chat-messages">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-500/10">
          <button
            onClick={() => onSelectChat("")}
            className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-indigo-500/10 transition-colors"
            data-testid="button-back-to-chats"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180 text-indigo-400" />
          </button>
          <span className="text-sm font-medium text-foreground/85 truncate">{chatName}</span>
        </div>

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 mb-3 max-h-[350px] scrollbar-themed">
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
                <div className="text-foreground/70 leading-relaxed break-words overflow-hidden [&_img[itemtype*='emoji']]:inline [&_img[itemtype*='emoji']]:w-4 [&_img[itemtype*='emoji']]:h-4 [&_img[itemtype*='emoji']]:align-text-bottom [&_img]:max-w-[200px] [&_img]:max-h-[200px] [&_img]:rounded-md [&_img]:my-1 [&_img]:block" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                  dangerouslySetInnerHTML={{ __html: (msg.body?.content || "")
                    .replace(/<\/?div[^>]*>/gi, "")
                    .replace(/<\/?p[^>]*>/gi, "")
                    .replace(/<\/?span[^>]*>/gi, "")
                    .replace(/<br\s*\/?>/gi, " ")
                    .replace(/<attachment[^>]*>.*?<\/attachment>/gi, "[attachment]")
                    .trim()
                  }}
                />
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {sendStatus && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "text-[11px] px-3 py-1.5 rounded-lg mb-2 text-center",
              sendStatus === "sent" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}
          >
            {sendStatus === "sent" ? "Message sent to Teams" : "Failed to send — try again"}
          </motion.div>
        )}

        <div className="relative pt-2 border-t border-indigo-500/10">
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full mb-2 left-0 right-0 p-2 rounded-xl bg-black/80 backdrop-blur-lg border border-indigo-500/20 shadow-xl z-10"
                data-testid="panel-emoji-picker"
              >
                <div className="grid grid-cols-10 gap-0.5">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { setReplyText(prev => prev + emoji); setShowEmoji(false); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-500/20 transition-colors text-sm"
                      data-testid={`button-emoji-${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmoji(prev => !prev)}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg border transition-colors shrink-0",
                showEmoji ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-300" : "bg-black/30 border-indigo-500/15 text-muted-foreground hover:text-indigo-400 hover:border-indigo-500/25"
              )}
              data-testid="button-toggle-emoji"
            >
              <span className="text-sm">😊</span>
            </button>
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${chatName}...`}
              className="text-xs bg-black/30 border-indigo-500/15 focus:border-indigo-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && replyText.trim() && !isSending) {
                  handleSend();
                }
              }}
              onFocus={() => setShowEmoji(false)}
              disabled={isSending}
              data-testid="input-teams-reply"
            />
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500"
              onClick={handleSend}
              disabled={!replyText.trim() || isSending}
              data-testid="button-send-teams-reply"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-testid="list-teams-chats">
      {chats.map((chat: any, i: number) => {
        const rawPreview = chat.lastMessagePreview?.body?.content?.replace(/<[^>]*>/g, "")?.replace(/&nbsp;/g, " ")?.replace(/&amp;/g, "&")?.replace(/&lt;/g, "<")?.replace(/&gt;/g, ">")?.trim();
        const preview = rawPreview?.substring(0, 80) || "No messages";
        const chatType = chat.chatType;
        const topic = chat.topic || chat.resolvedName || (chatType === "oneOnOne" ? "Direct Message" : chatType === "group" ? "Group Chat" : "Chat");
        const msgDate = chat.lastMessagePreview?.createdDateTime || chat.lastUpdatedDateTime;
        const lastActive = msgDate ? new Date(msgDate) : null;
        const timeStr = lastActive
          ? lastActive.toLocaleDateString() === new Date().toLocaleDateString()
            ? lastActive.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            : lastActive.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "";

        return (
          <motion.button
            key={chat.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              "w-full text-left p-3 rounded-xl border transition-all group",
              "bg-indigo-500/5 border-indigo-500/10 hover:border-indigo-500/25 hover:bg-indigo-500/8"
            )}
            data-testid={`button-teams-chat-${i}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  {chatType === "oneOnOne" ? (
                    <Users className="w-3 h-3 text-violet-400" />
                  ) : (
                    <MessageSquare className="w-3 h-3 text-violet-400" />
                  )}
                </div>
                <span className="text-[13px] font-medium text-foreground/85 truncate">{topic}</span>
              </div>
              <span className="text-[9px] text-muted-foreground flex-shrink-0 ml-2" style={mono}>{timeStr}</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate pl-9">{preview}</p>
            <ChevronRight className="w-3 h-3 text-indigo-400/0 group-hover:text-indigo-400/50 absolute right-3 top-1/2 -translate-y-1/2 transition-all" />
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

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="text-indigo-300 font-semibold">{children}</strong>,
        em: ({ children }) => <em className="text-foreground/70 italic">{children}</em>,
        h1: ({ children }) => <h1 className="text-base font-bold text-indigo-200 mt-3 mb-1.5">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold text-indigo-300 mt-3 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-indigo-300/80 mt-2 mb-1">{children}</h3>,
        ul: ({ children }) => <ul className="my-1.5 space-y-1 list-none">{children}</ul>,
        ol: ({ children }) => <ol className="my-1.5 space-y-1 list-none counter-reset-item">{children}</ol>,
        li: ({ children, ...props }) => {
          const ordered = (props as any).ordered;
          const index = (props as any).index;
          return (
            <li className="flex gap-2 text-sm">
              <span className="text-indigo-400/60 flex-shrink-0 mt-0.5" style={mono}>
                {ordered ? `${(index || 0) + 1}.` : "•"}
              </span>
              <span className="flex-1">{children}</span>
            </li>
          );
        },
        code: ({ children, className }) => {
          if (className?.includes("language-")) {
            return (
              <code className="block bg-black/40 border border-indigo-500/10 rounded-lg p-3 text-xs overflow-x-auto" style={mono}>
                {children}
              </code>
            );
          }
          return (
            <code className="bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded text-xs" style={mono}>
              {children}
            </code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-indigo-500/30 pl-3 my-2 text-foreground/60 italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-indigo-500/10 my-3" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function EmailDetail({ emailId, onBack }: { emailId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: email, isLoading } = useQuery({
    queryKey: ["/api/work/emails", emailId],
    queryFn: () => workApi(`/api/work/emails/${emailId}`),
  });

  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [sending, setSending] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const fullUrl = API_BASE_URL ? `${API_BASE_URL}/api/work/emails/${emailId}/reply` : `/api/work/emails/${emailId}/reply`;
      const res = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comment: replyText.trim() }),
      });
      if (!res.ok) throw new Error("Reply failed");
      setReplyText("");
      setShowReply(false);
      queryClient.invalidateQueries({ queryKey: ["/api/work/emails"] });
      onBack();
    } catch (err) {
      console.error("Reply error:", err);
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn(cmdPanel, "p-4")} data-testid="panel-email-detail">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 mb-3 transition-colors" data-testid="button-email-back">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400/40" />
        </div>
      </div>
    );
  }

  if (!email) return null;

  const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Unknown";
  const senderEmail = email.from?.emailAddress?.address || "";
  const receivedDate = new Date(email.receivedDateTime);
  const bodyHtml = email.body?.content || "";
  const isHtml = email.body?.contentType === "html";

  return (
    <div className={cn(cmdPanel, "p-4 flex flex-col")} data-testid="panel-email-detail">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 mb-3 transition-colors" data-testid="button-email-back">
        <ArrowLeft className="w-3 h-3" /> Back to Inbox
      </button>

      <div className="mb-3">
        <h4 className="text-[13px] font-semibold text-foreground/90 leading-tight mb-2">{email.subject}</h4>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-indigo-400">{senderName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground/80">{senderName}</p>
            <p className="text-[9px] text-muted-foreground truncate">{senderEmail}</p>
          </div>
          <span className="text-[9px] text-muted-foreground ml-auto shrink-0" style={mono}>
            {receivedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} {receivedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        {email.hasAttachments && (
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-1">
            <Paperclip className="w-2.5 h-2.5" /> Has attachments
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden max-h-[200px] mb-3 rounded-lg bg-black/20 border border-white/5 p-3 scrollbar-themed">
        {isHtml ? (
          <div
            className="text-[11px] text-foreground/70 leading-relaxed break-words overflow-hidden [&_a]:text-indigo-400 [&_a]:underline [&_a]:break-all [&_img]:max-w-full [&_img]:h-auto [&_table]:text-[10px] [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_td]:overflow-hidden [&_th]:break-words [&_*]:max-w-full [&_*]:overflow-hidden [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_div]:max-w-full"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <p className="text-[11px] text-foreground/70 leading-relaxed whitespace-pre-wrap break-words">{bodyHtml}</p>
        )}
      </div>

      {!showReply ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 self-start"
          onClick={() => setShowReply(true)}
          data-testid="button-email-reply"
        >
          <Reply className="w-3 h-3 mr-1.5" /> Reply
        </Button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            className="w-full text-[11px] bg-black/30 border border-indigo-500/15 focus:border-indigo-500/30 rounded-lg p-2.5 text-foreground/80 placeholder:text-muted-foreground/40 resize-none outline-none min-h-[80px]"
            data-testid="input-email-reply"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="text-[11px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/20"
              onClick={handleReply}
              disabled={!replyText.trim() || sending}
              data-testid="button-send-reply"
            >
              {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
              {sending ? "Sending..." : "Send Reply"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => { setShowReply(false); setReplyText(""); }}
              data-testid="button-cancel-reply"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function EmailInbox({ userEmail }: { userEmail?: string }) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const { data: emails, isLoading } = useQuery({
    queryKey: ["/api/work/emails"],
    queryFn: () => workApi("/api/work/emails?top=20"),
    refetchInterval: 120000,
  });

  const directEmails = useMemo(() => {
    const all = emails?.value || [];
    if (!userEmail) return [];
    const myEmail = userEmail.toLowerCase();
    return all.filter((email: any) => {
      const toRecipients = email.toRecipients || [];
      return toRecipients.some((r: any) =>
        r.emailAddress?.address?.toLowerCase() === myEmail
      );
    });
  }, [emails, userEmail]);

  const { data: summaries, isLoading: loadingSummaries } = useQuery({
    queryKey: ["/api/work/emails/summaries"],
    queryFn: async () => {
      const fullUrl = API_BASE_URL ? `${API_BASE_URL}/api/work/emails/summarize` : "/api/work/emails/summarize";
      const res = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) return {};
      return res.json();
    },
    enabled: directEmails.length > 0,
    staleTime: 300000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const unreadCount = directEmails.filter((e: any) => !e.isRead).length;

  if (selectedEmailId) {
    return <EmailDetail emailId={selectedEmailId} onBack={() => setSelectedEmailId(null)} />;
  }

  return (
    <div className={cn(cmdPanel, "p-4 h-full flex flex-col")} data-testid="panel-email-inbox">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-indigo-400" />
          <CmdLabel>Inbox</CmdLabel>
          {loadingSummaries && directEmails.length > 0 && (
            <Sparkles className="w-3 h-3 text-indigo-400/50 animate-pulse" />
          )}
        </div>
        {unreadCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400" style={mono} data-testid="text-unread-count">
            {unreadCount} new
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400/40" />
        </div>
      ) : directEmails.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No direct emails</p>
      ) : (
        <div className="space-y-1 flex-1 overflow-y-auto scrollbar-themed">
          {directEmails.slice(0, 10).map((email: any, i: number) => {
            const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Unknown";
            const aiSummary = summaries?.[email.id];
            const displayText = aiSummary || email.subject || "(no subject)";
            return (
              <div
                key={email.id || i}
                onClick={() => setSelectedEmailId(email.id)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all cursor-pointer group",
                  email.isRead
                    ? "bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]"
                    : "bg-indigo-500/5 border-indigo-500/15 hover:border-indigo-500/30 hover:bg-indigo-500/10"
                )}
                data-testid={`card-email-${i}`}
              >
                {!email.isRead && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                )}
                <span className={cn("text-[11px] shrink-0 font-medium", email.isRead ? "text-muted-foreground" : "text-foreground/90")}>
                  {senderName.length > 18 ? senderName.substring(0, 18) + "…" : senderName}
                </span>
                <span className="text-muted-foreground/30 shrink-0">·</span>
                <span className={cn("text-[11px] truncate min-w-0", aiSummary ? "text-indigo-300/70" : "text-foreground/50")} data-testid={`text-email-summary-${i}`}>
                  {displayText}
                </span>
                <span className="text-[9px] text-muted-foreground shrink-0 ml-auto" style={mono}>
                  {new Date(email.receivedDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkstationClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const mins = time.getMinutes().toString().padStart(2, "0");
  const secs = time.getSeconds().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;

  return (
    <div className="flex flex-col items-center" data-testid="workstation-clock">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl lg:text-3xl font-display font-bold text-foreground tabular-nums tracking-tight">
          {h12}:{mins}
        </span>
        <span className="text-xs lg:text-sm font-medium text-indigo-400 tabular-nums">{secs}</span>
        <span className="text-xs lg:text-sm font-semibold text-muted-foreground ml-0.5">{period}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase">
        {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </p>
    </div>
  );
}

function MeetingsStrip({ events }: { events: any[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const nextMeetings = useMemo(() => {
    return events
      .map((e: any) => {
        const start = parseEventDate(e.start.dateTime, e.start.timeZone);
        const end = parseEventDate(e.end.dateTime, e.end.timeZone);
        return { ...e, _start: start, _end: end };
      })
      .filter((e) => e._end > now)
      .sort((a, b) => a._start.getTime() - b._start.getTime())
      .slice(0, 4);
  }, [events, now]);

  if (!nextMeetings.length) return null;

  const timeUntil = (start: Date) => {
    const diff = start.getTime() - now.getTime();
    if (diff <= 0) return "Now";
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `in ${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4" data-testid="strip-upcoming-meetings">
      {nextMeetings.map((event, i) => {
        const isLive = event._start <= now && event._end > now;
        const startStr = event._start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        const endStr = event._end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        const mins = Math.round((event._end.getTime() - event._start.getTime()) / 60000);
        const durStr = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}` : `${mins}m`;

        return (
          <motion.div
            key={event.id || i}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              cmdPanel,
              "p-3 relative overflow-hidden",
              isLive && "border-indigo-400/30 shadow-[0_0_15px_rgba(100,80,255,0.1)]"
            )}
            data-testid={`strip-meeting-${i}`}
          >
            {isLive && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-400 to-violet-400 rounded-full" />
            )}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-[12px] font-semibold text-foreground/90 leading-tight line-clamp-1">
                {event.subject || "Meeting"}
              </p>
              {isLive ? (
                <span className="flex items-center gap-1 text-[8px] text-indigo-300 font-semibold bg-indigo-500/20 px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="text-[9px] text-indigo-400/80 shrink-0 font-medium whitespace-nowrap" style={mono}>
                  {timeUntil(event._start)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-foreground/60" style={mono}>
              <Clock className="w-2.5 h-2.5 text-indigo-400/50" />
              <span>{startStr} – {endStr}</span>
              <span className="text-muted-foreground/40">({durStr})</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {event.isOnlineMeeting ? (
                <Video className="w-2.5 h-2.5 text-violet-400/60" />
              ) : event.location?.displayName ? (
                <MapPin className="w-2.5 h-2.5 text-indigo-400/50" />
              ) : null}
              <span className="text-[9px] text-foreground/50 truncate">
                {event.isOnlineMeeting ? "Online" : event.location?.displayName || ""}
                {(event.attendees?.length > 0) && ` · ${event.attendees.length} attendees`}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function NexusChat({ connected }: { connected: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickChips = [
    { label: "What's my day look like?", icon: Calendar },
    { label: "Prep me for my next meeting", icon: Sparkles },
    { label: "Find free slots this week", icon: Clock },
    { label: "How's my work-life balance?", icon: BarChart3 },
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
              if (data.action) {
                const actionConfirms: Record<string, string> = {
                  teams_sent: `\n\n✅ **Message sent to Teams**: "${data.message}"`,
                  teams_send_failed: `\n\n❌ **Failed to send Teams message**: ${data.error || "Unknown error"}`,
                  event_created: `\n\n📅 **Calendar event created**: ${data.subject}`,
                  create_event_failed: `\n\n❌ **Failed to create event**: ${data.error || "Unknown error"}`,
                  task_created: `\n\n✅ **Task created**: ${data.title}${data.due ? ` (due ${data.due})` : ""}`,
                  create_task_failed: `\n\n❌ **Failed to create task**: ${data.error || "Unknown error"}`,
                  email_sent: `\n\n📧 **Email sent** to ${data.to}: "${data.subject}"`,
                  send_email_failed: `\n\n❌ **Failed to send email**: ${data.error || "Unknown error"}`,
                  message_scheduled: `\n\n🔁 **Scheduled message set up** — "${data.message}" will be sent to ${data.recipient} every ${data.recurrence === "weekdays" ? "weekday" : "day"} at ${data.time}`,
                  schedule_message_failed: `\n\n❌ **Failed to schedule message**: ${data.error || "Unknown error"}`,
                };
                const confirm = actionConfirms[data.action];
                if (confirm) {
                  assistantContent += confirm;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                    return updated;
                  });
                }
              } else if (data.content) {
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0 scroll-smooth scrollbar-themed">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <h3 className="text-lg font-display font-semibold text-foreground/90 mb-1">Orbia Professional</h3>
            <p className="text-xs text-muted-foreground text-center max-w-[260px] leading-relaxed">
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
                  ? "ml-12 p-3 rounded-2xl rounded-tr-sm bg-indigo-600/20 border border-indigo-500/20 text-foreground/90"
                  : "mr-4 text-foreground/80"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="relative">
                  <MarkdownContent content={msg.content} />
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
        <div className="grid grid-cols-2 gap-2 mb-3">
          {quickChips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => sendMessage(chip.label)}
              className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl border border-indigo-500/15 text-indigo-300/80 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all text-left"
              data-testid={`chip-${chip.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
            >
              <chip.icon className="w-3.5 h-3.5 text-indigo-400/50 flex-shrink-0" />
              {chip.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-indigo-500/10">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Orbia Professional anything..."
          className="text-sm bg-black/30 border-indigo-500/15 focus:border-indigo-500/30 placeholder:text-muted-foreground/40 rounded-xl"
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
          className="bg-indigo-600 hover:bg-indigo-500 px-3 rounded-xl shadow-lg shadow-indigo-500/15"
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

          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Workstation</h1>
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

type MobileTab = "today" | "nexus" | "comms" | "projects";
type WorkView = "office" | "projects";

export default function WorkPage() {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("nexus");
  const [workView, setWorkView] = useState<WorkView>("office");
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const { data: teamsData, isLoading: loadingTeams, error: teamsError } = useQuery({
    queryKey: ["/api/work/teams/chats"],
    queryFn: () => workApi("/api/work/teams/chats"),
    enabled: connected,
    refetchInterval: 2 * 60 * 1000,
    retry: 1,
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
    await workApi(`/api/work/teams/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    queryClient.invalidateQueries({ queryKey: ["/api/work/teams/chats", chatId, "messages"] });
  }, [queryClient]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const data = await workApi("/api/work/microsoft/auth");
      if (data?.authUrl) {
        window.open(data.authUrl, "_blank", "noopener,noreferrer");
        setIsConnecting(false);
        const pollInterval = setInterval(async () => {
          try {
            const status = await workApi("/api/work/microsoft/status");
            if (status?.connected) {
              clearInterval(pollInterval);
              queryClient.invalidateQueries({ queryKey: ["/api/work/microsoft/status"] });
            }
          } catch {}
        }, 3000);
        setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
      }
    } catch (error) {
      console.error("Failed to initiate Microsoft auth:", error);
      setIsConnecting(false);
    }
  }, [queryClient]);

  const handleDisconnect = useCallback(() => {
    disconnectMutation.mutate();
  }, [disconnectMutation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/work/calendar"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/work/teams/chats"] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [queryClient]);

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
    const eventDate = parseEventDate(e.start.dateTime, e.start.timeZone).toDateString();
    return eventDate === new Date().toDateString();
  });

  const weekEvents = calendarEvents;

  const meetingCount = todayEvents.length;
  const totalMeetingHours = todayEvents.reduce((acc: number, e: any) => {
    const start = parseEventDate(e.start.dateTime, e.start.timeZone);
    const end = parseEventDate(e.end.dateTime, e.end.timeZone);
    return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);
  const freeHours = Math.max(0, 8 - totalMeetingHours);

  const mobileTabItems: { key: MobileTab; label: string; icon: typeof Calendar }[] = [
    { key: "today", label: "Today", icon: Calendar },
    { key: "nexus", label: "Professional", icon: Sparkles },
    { key: "comms", label: "Comms", icon: MessageSquare },
    { key: "projects", label: "Projects", icon: Rocket },
  ];

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={cn(cmdPanelGlow, "p-2.5")}>
                <Monitor className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-display font-bold text-foreground" data-testid="text-page-title">Workstation</h1>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>

            <WorkstationClock />

            <div className="flex items-center gap-3">
              {connected && workView === "office" && (
                <div className="hidden sm:flex items-center gap-3 mr-2">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/15" style={mono}>
                    {meetingCount} meetings
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" style={mono}>
                    {freeHours.toFixed(1)}h free
                  </span>
                </div>
              )}
              {workView === "office" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  data-testid="button-refresh-data"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 mr-1", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Syncing..." : "Refresh"}
                </Button>
              )}
            </div>
          </div>

          {/* Desktop view switcher */}
          <div className="hidden lg:flex gap-1 mb-4 p-1 bg-black/30 rounded-xl border border-indigo-500/10 w-fit">
            {([
              { key: "office" as WorkView, label: "Office", icon: Monitor },
              { key: "projects" as WorkView, label: "Projects", icon: Rocket },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setWorkView(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                  workView === tab.key
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`tab-desktop-${tab.key}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile tab bar */}
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

          {/* === OFFICE VIEW (Desktop) === */}
          {workView === "office" && (
            <>
              {!loadingCalendar && weekEvents.length > 0 && (
                <MeetingsStrip events={weekEvents} />
              )}

              <div className="hidden lg:grid lg:grid-cols-[minmax(280px,1fr)_minmax(350px,1.4fr)_minmax(280px,1fr)] gap-5" style={{ minHeight: "calc(100vh - 220px)" }}>
                <div className="flex flex-col gap-4 min-h-0">
                  <div className="flex-1 min-h-0">
                    {connected && <EmailInbox userEmail={connectionStatus?.email} />}
                  </div>

                  <div className="shrink-0">
                    <ConnectionCard
                      connected={connected}
                      displayName={connectionStatus?.displayName}
                      email={connectionStatus?.email}
                      onConnect={handleConnect}
                      onDisconnect={handleDisconnect}
                      isConnecting={isConnecting}
                    />
                  </div>
                </div>

                <div className={cn(cmdPanelGlow, "p-5 flex flex-col")}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <CmdLabel>Orbia Professional</CmdLabel>
                  </div>
                  <NexusChat connected={connected} />
                </div>

                <div className={cn(cmdPanel, "p-4 flex flex-col min-h-0")}>
                  <div className="flex items-center justify-between mb-3 shrink-0">
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

                  <div className="flex-1 overflow-y-auto scrollbar-themed">
                    <TeamsPanel
                      chats={teamsChats}
                      onSelectChat={(id) => setSelectedChatId(id || null)}
                      selectedChatId={selectedChatId}
                      chatMessages={chatMessages}
                      onSendMessage={sendTeamsMessage}
                      loadingMessages={loadingChatMessages}
                      loadingChats={loadingTeams}
                      error={teamsError ? "Failed to load" : null}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* === PROJECTS VIEW (Desktop) === */}
          {workView === "projects" && (
            <div className="hidden lg:block" style={{ minHeight: "calc(100vh - 220px)" }}>
              <ProjectsTab />
            </div>
          )}

          {/* === MOBILE CONTENT === */}
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
                  {!loadingCalendar && weekEvents.length > 0 && (
                    <MeetingsStrip events={weekEvents} />
                  )}
                  {connected && <EmailInbox userEmail={connectionStatus?.email} />}

                  <ConnectionCard
                    connected={connected}
                    displayName={connectionStatus?.displayName}
                    email={connectionStatus?.email}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    isConnecting={isConnecting}
                  />
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
                    <CmdLabel>Orbia Professional</CmdLabel>
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
                  <TeamsPanel
                    chats={teamsChats}
                    onSelectChat={(id) => setSelectedChatId(id || null)}
                    selectedChatId={selectedChatId}
                    chatMessages={chatMessages}
                    onSendMessage={sendTeamsMessage}
                    loadingMessages={loadingChatMessages}
                    loadingChats={loadingTeams}
                    error={teamsError ? "Failed to load" : null}
                  />
                </motion.div>
              )}

              {mobileTab === "projects" && (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <ProjectsTab />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}
