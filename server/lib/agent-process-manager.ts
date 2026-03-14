import { spawn, ChildProcess, execSync } from "child_process";
import { EventEmitter } from "events";

interface AgentProcess {
  process: ChildProcess;
  agentId: string;
  taskId: string;
  sessionId: string;
  startedAt: Date;
  outputBuffer: string[];
}

class AgentProcessManager extends EventEmitter {
  private processes: Map<string, AgentProcess> = new Map();
  private maxConcurrent = 3;

  isRunning(agentId: string): boolean {
    return this.processes.has(agentId);
  }

  getRunningCount(): number {
    return this.processes.size;
  }

  private claudeAvailable: boolean | null = null;

  private checkClaudeAvailable(): boolean {
    if (this.claudeAvailable !== null) return this.claudeAvailable;
    try {
      execSync("which claude", { stdio: "pipe" });
      this.claudeAvailable = true;
    } catch {
      this.claudeAvailable = false;
    }
    return this.claudeAvailable;
  }

  async startAgent(options: {
    agentId: string;
    taskId: string;
    sessionId: string;
    workdir: string;
    prompt: string;
    conversationId?: string;
  }): Promise<void> {
    if (!this.checkClaudeAvailable()) {
      throw new Error("Claude CLI is not installed. Install it with: npm install -g @anthropic-ai/claude-code");
    }
    if (this.processes.has(options.agentId)) {
      throw new Error(`Agent ${options.agentId} is already running`);
    }
    if (this.processes.size >= this.maxConcurrent) {
      throw new Error(`Maximum concurrent agents (${this.maxConcurrent}) reached`);
    }

    const args = [
      "-p",
      "--output-format", "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
    ];
    if (options.conversationId) {
      args.push("--resume", options.conversationId);
    }
    args.push(options.prompt);

    console.log(`[agent-pm] Starting claude for agent ${options.agentId}, cwd: ${options.workdir}`);

    const proc = spawn("claude", args, {
      cwd: options.workdir,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const agentProcess: AgentProcess = {
      process: proc,
      agentId: options.agentId,
      taskId: options.taskId,
      sessionId: options.sessionId,
      startedAt: new Date(),
      outputBuffer: [],
    };

    this.processes.set(options.agentId, agentProcess);

    this.emit("agent:started", { agentId: options.agentId, taskId: options.taskId });

    let jsonBuffer = "";
    let hasReceivedOutput = false;

    const startupTimeout = setTimeout(() => {
      if (!hasReceivedOutput && this.processes.has(options.agentId)) {
        console.log(`[agent-pm] Startup timeout for agent ${options.agentId} — no output after 60s, killing process`);
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (this.processes.has(options.agentId)) proc.kill("SIGKILL");
        }, 5000);
      }
    }, 60000);

    proc.stdout?.on("data", (chunk: Buffer) => {
      hasReceivedOutput = true;
      clearTimeout(startupTimeout);
      const text = chunk.toString();
      jsonBuffer += text;

      const lines = jsonBuffer.split("\n");
      jsonBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          this.handleStreamEvent(options.agentId, options.taskId, event);
        } catch {
          agentProcess.outputBuffer.push(trimmed);
          this.emit("agent:output", {
            agentId: options.agentId,
            taskId: options.taskId,
            type: "raw",
            content: trimmed,
          });
        }
      }
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      console.log(`[agent-pm] stderr (${options.agentId}): ${text.trim()}`);
      this.emit("agent:output", {
        agentId: options.agentId,
        taskId: options.taskId,
        type: "stderr",
        content: text,
      });
    });

    proc.on("close", (code) => {
      clearTimeout(startupTimeout);
      console.log(`[agent-pm] Process closed for agent ${options.agentId}, exit code: ${code}`);
      this.processes.delete(options.agentId);
      this.emit("agent:completed", {
        agentId: options.agentId,
        taskId: options.taskId,
        exitCode: code,
        outputBuffer: agentProcess.outputBuffer,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(startupTimeout);
      console.log(`[agent-pm] Process error for agent ${options.agentId}: ${err.message}`);
      this.processes.delete(options.agentId);
      this.emit("agent:error", {
        agentId: options.agentId,
        taskId: options.taskId,
        error: err.message,
      });
    });
  }

  private handleStreamEvent(agentId: string, taskId: string, event: any) {
    const ap = this.processes.get(agentId);
    if (!ap) return;

    switch (event.type) {
      case "assistant":
        if (event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === "text") {
              ap.outputBuffer.push(block.text);
              this.emit("agent:output", { agentId, taskId, type: "text", content: block.text });
            } else if (block.type === "tool_use") {
              this.emit("agent:output", {
                agentId, taskId,
                type: "tool_call",
                content: `${block.name}: ${JSON.stringify(block.input).substring(0, 200)}`,
                metadata: { tool: block.name, input: block.input },
              });
            }
          }
        }
        break;
      case "result":
        if (event.subtype === "success") {
          this.emit("agent:output", {
            agentId, taskId,
            type: "result",
            content: event.result || "Task completed",
            metadata: { conversationId: event.session_id, costUsd: event.cost_usd, duration: event.duration_ms },
          });
        } else {
          this.emit("agent:output", {
            agentId, taskId,
            type: "error",
            content: event.error || "Task failed",
          });
        }
        break;
      default:
        this.emit("agent:output", {
          agentId, taskId,
          type: "stream",
          content: JSON.stringify(event).substring(0, 500),
        });
    }
  }

  stopAgent(agentId: string): boolean {
    const ap = this.processes.get(agentId);
    if (!ap) return false;
    ap.process.kill("SIGTERM");
    setTimeout(() => {
      if (this.processes.has(agentId)) {
        ap.process.kill("SIGKILL");
        this.processes.delete(agentId);
      }
    }, 5000);
    return true;
  }

  getAgentOutput(agentId: string): string[] {
    return this.processes.get(agentId)?.outputBuffer || [];
  }

  getRunningAgents(): { agentId: string; taskId: string; startedAt: Date }[] {
    return Array.from(this.processes.values()).map((p) => ({
      agentId: p.agentId,
      taskId: p.taskId,
      startedAt: p.startedAt,
    }));
  }
}

export const agentProcessManager = new AgentProcessManager();
