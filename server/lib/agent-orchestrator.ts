import { storage } from "../storage";
import * as repoManager from "./repo-manager";
import { injectCommand, hasActiveSession, subscribeToOutput, broadcastBootstrapEventById } from "./agent-terminal";
import type { Response } from "express";

export interface AgentActionEvent {
  action: string;
  [key: string]: any;
}

const pendingFollowUps = new Map<string, { actions: string[]; userId: string; agentName: string }>();

async function findAgentByKeyword(userId: string, keyword: string): Promise<any | null> {
  const agents = await storage.getAllAgentProfiles(userId);
  if (!keyword && agents.length === 1) return agents[0];
  if (!keyword) return null;

  const kw = keyword.toLowerCase();
  const exact = agents.find((a: any) => a.name.toLowerCase() === kw);
  if (exact) return exact;

  const matches = agents.filter((a: any) =>
    a.name.toLowerCase().includes(kw) ||
    (a.designation && a.designation.toLowerCase().includes(kw)) ||
    (a.repoUrl && a.repoUrl.toLowerCase().includes(kw))
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return matches[0];

  if (agents.length === 1) return agents[0];
  return null;
}

async function getAgentDiff(agentId: string): Promise<string> {
  try {
    if (!repoManager.isRepoCloned(agentId)) {
      return "No repository cloned for this agent.";
    }
    const diff = await repoManager.getDiff(agentId);
    if (!diff || diff.trim() === "") {
      const stagedDiff = await repoManager.getDiff(agentId, true);
      if (stagedDiff && stagedDiff.trim() !== "") return stagedDiff;
      return "No changes detected (clean working tree).";
    }
    return diff;
  } catch (err: any) {
    return `Error getting diff: ${err.message}`;
  }
}

async function runAgentReview(agentId: string, agentName: string): Promise<string> {
  try {
    const diff = await getAgentDiff(agentId);
    if (diff.startsWith("No changes") || diff.startsWith("No repository") || diff.startsWith("Error")) {
      return diff;
    }

    const status = await repoManager.getStatus(agentId);
    const filesChanged = [...status.modified, ...status.created, ...status.deleted, ...status.staged];

    const truncatedDiff = diff.length > 15000 ? diff.slice(0, 15000) + "\n... (diff truncated)" : diff;

    let review = `## Code Review for "${agentName}"\n\n`;
    review += `**Files changed (${filesChanged.length}):** ${filesChanged.join(", ")}\n\n`;
    review += `**Diff summary:**\n\`\`\`diff\n${truncatedDiff}\n\`\`\`\n`;

    const additions = (diff.match(/^\+[^+]/gm) || []).length;
    const deletions = (diff.match(/^-[^-]/gm) || []).length;
    review += `\n**Stats:** +${additions} additions, -${deletions} deletions across ${filesChanged.length} files`;

    return review;
  } catch (err: any) {
    return `Review failed: ${err.message}`;
  }
}

async function runAgentTests(agentId: string): Promise<string> {
  return new Promise((resolve) => {
    if (!hasActiveSession(agentId)) {
      resolve("Agent has no active terminal session.");
      return;
    }

    const testOutput: string[] = [];
    let timeout: ReturnType<typeof setTimeout>;

    const unsub = subscribeToOutput(agentId, (data: string) => {
      testOutput.push(data);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        unsub?.();
        resolve(testOutput.join("").slice(-5000));
      }, 10000);
    });

    if (!unsub) {
      resolve("Could not connect to agent terminal.");
      return;
    }

    injectCommand(agentId, "npm test 2>&1 || echo 'Tests complete (or no test script)'");

    timeout = setTimeout(() => {
      unsub();
      resolve(testOutput.length > 0 ? testOutput.join("").slice(-5000) : "Test command sent but no output received within timeout.");
    }, 60000);
  });
}

async function pushAgent(agentId: string, branch?: string): Promise<string> {
  try {
    if (!repoManager.isRepoCloned(agentId)) {
      return "No repository cloned.";
    }
    if (branch) {
      await repoManager.checkoutBranch(agentId, branch, true);
    }
    const currentBranch = await repoManager.getCurrentBranch(agentId);
    await repoManager.pushChanges(agentId, currentBranch);
    return `Pushed to ${currentBranch}`;
  } catch (err: any) {
    return `Push failed: ${err.message}`;
  }
}

async function executeFollowUpActions(agentId: string, actions: string[], userId: string, agentName: string): Promise<void> {
  const results: string[] = [];

  for (const action of actions) {
    try {
      if (action === "review") {
        const review = await runAgentReview(agentId, agentName);
        results.push(`Review: ${review.slice(0, 500)}`);
      } else if (action === "test") {
        const testResult = await runAgentTests(agentId);
        results.push(`Tests: ${testResult.slice(0, 500)}`);
      } else if (action === "push") {
        const pushResult = await pushAgent(agentId);
        results.push(`Push: ${pushResult}`);
      } else if (action.startsWith("push_branch:")) {
        const branchName = action.split(":")[1];
        const pushResult = await pushAgent(agentId, branchName);
        results.push(`Push: ${pushResult}`);
      } else if (action === "notify") {
        broadcastBootstrapEventById(agentId, {
          type: "notification",
          message: `Follow-up actions completed for "${agentName}": ${results.join(" | ")}`,
        });
      }
    } catch (err: any) {
      results.push(`${action} failed: ${err.message}`);
    }
  }

  console.log(`[agent-orchestrator] Follow-up actions for "${agentName}": ${results.join(" | ")}`);
}

export function registerFollowUp(agentId: string, actions: string[], userId: string, agentName: string): void {
  pendingFollowUps.set(agentId, { actions, userId, agentName });
  console.log(`[agent-orchestrator] Registered follow-up for "${agentName}": ${actions.join(", ")}`);
}

export function triggerFollowUp(agentId: string): void {
  const followUp = pendingFollowUps.get(agentId);
  if (!followUp) return;
  pendingFollowUps.delete(agentId);
  console.log(`[agent-orchestrator] Triggering follow-up for "${followUp.agentName}"`);
  executeFollowUpActions(agentId, followUp.actions, followUp.userId, followUp.agentName);
}

export function hasPendingFollowUp(agentId: string): boolean {
  return pendingFollowUps.has(agentId);
}

export async function handleAgentAction(
  actionName: string,
  args: any,
  userId: string,
  res?: Response,
  sseMode: boolean = true
): Promise<{ name: string; title: string; success: boolean; error?: string; events: AgentActionEvent[] }> {
  const events: AgentActionEvent[] = [];

  function emit(event: AgentActionEvent) {
    events.push(event);
    if (sseMode && res) {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {}
    }
  }

  try {
    const agent = await findAgentByKeyword(userId, args.agent_keyword || args.agent_id || "");
    if (!agent) {
      const msg = `Could not find an agent matching "${args.agent_keyword || args.agent_id || ""}". Check the agent name.`;
      emit({ action: "agent_error", message: msg });
      return { name: actionName, title: "agent action", success: false, error: msg, events };
    }

    switch (actionName) {
      case "agent_review": {
        const review = await runAgentReview(agent.id, agent.name);
        emit({ action: "agent_review", agentName: agent.name, review });
        return { name: actionName, title: `reviewed ${agent.name}`, success: true, events };
      }

      case "agent_git_diff": {
        const diff = await getAgentDiff(agent.id);
        const truncated = diff.length > 8000 ? diff.slice(0, 8000) + "\n... (truncated)" : diff;
        emit({ action: "agent_diff", agentName: agent.name, diff: truncated });
        return { name: actionName, title: `diff for ${agent.name}`, success: true, events };
      }

      case "agent_git_push": {
        const result = await pushAgent(agent.id, args.branch);
        emit({ action: "agent_pushed", agentName: agent.name, result });
        return { name: actionName, title: `pushed ${agent.name}`, success: true, events };
      }

      case "agent_git_push_branch": {
        const result = await pushAgent(agent.id, args.branch);
        emit({ action: "agent_pushed", agentName: agent.name, branch: args.branch, result });
        return { name: actionName, title: `pushed ${agent.name} to ${args.branch}`, success: true, events };
      }

      case "agent_run_tests": {
        emit({ action: "agent_testing", agentName: agent.name, message: "Running tests..." });
        const testResult = await runAgentTests(agent.id);
        emit({ action: "agent_test_result", agentName: agent.name, result: testResult.slice(0, 5000) });
        return { name: actionName, title: `tested ${agent.name}`, success: true, events };
      }

      case "agent_send_command": {
        if (!args.command) {
          return { name: actionName, title: "send command", success: false, error: "No command specified", events };
        }
        const sent = injectCommand(agent.id, args.command);
        if (sent) {
          emit({ action: "agent_command_sent", agentName: agent.name, command: args.command });
          return { name: actionName, title: `sent command to ${agent.name}`, success: true, events };
        } else {
          return { name: actionName, title: "send command", success: false, error: "Agent has no active terminal", events };
        }
      }

      case "agent_on_done": {
        if (!args.actions || !Array.isArray(args.actions) || args.actions.length === 0) {
          return { name: actionName, title: "on-done", success: false, error: "No follow-up actions specified", events };
        }
        registerFollowUp(agent.id, args.actions, userId, agent.name);

        const actionsStr = args.actions.join(" → ");
        emit({
          action: "agent_follow_up_registered",
          agentName: agent.name,
          actions: args.actions,
          message: `When "${agent.name}" finishes, I'll automatically: ${actionsStr}`,
        });
        return { name: actionName, title: `queued ${actionsStr} for ${agent.name}`, success: true, events };
      }

      default:
        return { name: actionName, title: "unknown agent action", success: false, error: `Unknown action: ${actionName}`, events };
    }
  } catch (err: any) {
    console.error(`[agent-orchestrator] Action ${actionName} failed:`, err.message);
    return { name: actionName, title: "agent action", success: false, error: err.message, events };
  }
}