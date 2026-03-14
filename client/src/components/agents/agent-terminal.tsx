import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface AgentTerminalProps {
  agentId: string;
  agentName: string;
}

export function AgentTerminal({ agentId, agentName }: AgentTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);

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
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);

    try { fitAddon.fit(); } catch {}

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/agent-terminal/${agentId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      setConnected(false);
      term.write("\r\n\x1b[31m[Disconnected]\x1b[0m\r\n");
    };

    ws.onerror = () => {
      setConnected(false);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows,
          }));
        }
      } catch {}
    });

    resizeObserver.observe(termRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
      terminalRef.current = null;
      wsRef.current = null;
      fitAddonRef.current = null;
    };
  }, [agentId]);

  return (
    <div className="flex flex-col h-full" data-testid={`terminal-${agentId}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-indigo-500/15">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
        <span className="text-xs text-white/60 font-mono">
          {connected ? "connected" : "disconnected"}
        </span>
        <span className="text-xs text-white/30 ml-auto font-mono">{agentName}</span>
      </div>
      <div ref={termRef} className="flex-1 min-h-0" />
    </div>
  );
}
