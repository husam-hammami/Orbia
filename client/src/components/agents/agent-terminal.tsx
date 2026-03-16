import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { RefreshCw } from "lucide-react";
import { API_BASE_URL } from "@/lib/queryClient";
import "@xterm/xterm/css/xterm.css";

interface BootstrapEvent {
  type: "login_required" | "token_needed" | "ready" | "task_sent" | "timeout" | "notification" | "permission_risky";
  url?: string;
  message: string;
}

interface AgentTerminalProps {
  agentId: string;
  agentName: string;
  onBootstrapEvent?: (event: BootstrapEvent) => void;
}

export function AgentTerminal({ agentId, agentName, onBootstrapEvent }: AgentTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [bootstrapStatus, setBootstrapStatus] = useState<string | null>(null);
  const onBootstrapEventRef = useRef(onBootstrapEvent);
  onBootstrapEventRef.current = onBootstrapEvent;

  const sendResize = useCallback((ws: WebSocket, cols: number, rows: number) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  }, []);

  const connect = useCallback((term: Terminal) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/agent-terminal/${agentId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      sendResize(ws, term.cols, term.rows);
    };

    ws.onmessage = (event) => {
      const data: string = event.data;
      const bootstrapMatch = data.match(/\x1b\]bootstrap:(.*?)\x07/);
      if (bootstrapMatch) {
        try {
          const parsed = JSON.parse(bootstrapMatch[1]);
          if (parsed.bootstrap) {
            const evt = parsed.bootstrap as BootstrapEvent;
            if (onBootstrapEventRef.current) onBootstrapEventRef.current(evt);

            if (evt.type === "login_required" && evt.url) {
              setBootstrapStatus("Login required — opening browser...");
              window.open(evt.url, "_blank");
            } else if (evt.type === "token_needed") {
              setBootstrapStatus("Paste auth token in terminal");
            } else if (evt.type === "ready") {
              setBootstrapStatus("Claude Code ready");
              setTimeout(() => setBootstrapStatus(null), 3000);
            } else if (evt.type === "task_sent") {
              setBootstrapStatus("Task sent to Claude");
              setTimeout(() => setBootstrapStatus(null), 5000);
            } else if (evt.type === "timeout") {
              setBootstrapStatus(null);
            } else if (evt.type === "notification" || evt.type === "permission_risky") {
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`${agentName}`, {
                  body: evt.message,
                  icon: "/favicon.ico",
                  tag: `agent-${agentId}`,
                });
              }
              if (evt.type === "permission_risky") {
                setBootstrapStatus("Risky op — manual approval needed");
                setTimeout(() => setBootstrapStatus(null), 10000);
              }
            }
          }
        } catch {}
        const cleaned = data.replace(/\x1b\]bootstrap:.*?\x07/g, "");
        if (cleaned) term.write(cleaned);
      } else {
        term.write(data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimerRef.current = setTimeout(() => connect(term), 3000);
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, [agentId, sendResize]);

  const restartTerminal = useCallback(async () => {
    setRestarting(true);
    try {
      await fetch(`${API_BASE_URL}/api/agents/${agentId}/terminal/restart`, {
        method: "POST",
        credentials: "include",
      });
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      const term = terminalRef.current;
      if (term) {
        term.clear();
        setTimeout(() => connect(term), 500);
      }
    } catch {}
    setTimeout(() => setRestarting(false), 1000);
  }, [agentId, connect]);

  useEffect(() => {
    if (!termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      theme: {
        background: "#0a0a1a",
        foreground: "#e0e0ff",
        cursor: "#8b5cf6",
        selectionBackground: "#8b5cf640",
        black: "#0a0a1a",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#8b5cf6",
        cyan: "#06b6d4",
        white: "#e0e0ff",
        brightBlack: "#4b5563",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#fde047",
        brightBlue: "#60a5fa",
        brightMagenta: "#a78bfa",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);

    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch {}
    });

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        try {
          fitAddon.fit();
          const ws = wsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            sendResize(ws, term.cols, term.rows);
          }
        } catch {}
      }, 100);
    });

    resizeObserver.observe(termRef.current);

    connect(term);

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
      term.dispose();
      terminalRef.current = null;
      wsRef.current = null;
      fitAddonRef.current = null;
    };
  }, [agentId, connect, sendResize]);

  return (
    <div className="flex flex-col h-full" data-testid={`terminal-${agentId}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-indigo-500/15 bg-black/30">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
        <span className="text-xs text-white/60 font-mono">
          {connected ? "live" : "reconnecting..."}
        </span>
        {bootstrapStatus && (
          <span className="text-xs text-amber-400/80 font-mono animate-pulse" data-testid="text-bootstrap-status">
            {bootstrapStatus}
          </span>
        )}
        <span className="text-xs text-white/30 ml-auto font-mono truncate max-w-[200px]">{agentName}</span>
        <button
          onClick={restartTerminal}
          disabled={restarting}
          className="ml-1 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          title="Restart terminal"
          data-testid="btn-restart-terminal"
        >
          <RefreshCw className={`w-3 h-3 ${restarting ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div ref={termRef} className="flex-1 min-h-0" />
    </div>
  );
}
