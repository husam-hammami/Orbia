import { simpleGit, SimpleGit } from "simple-git";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const REPOS_BASE = path.join(os.tmpdir(), "orbia-agent-repos");

function ensureBaseDir() {
  if (!fs.existsSync(REPOS_BASE)) {
    fs.mkdirSync(REPOS_BASE, { recursive: true });
  }
}

function repoPath(agentId: string): string {
  return path.join(REPOS_BASE, agentId);
}

export function getGitToken(oauthToken?: string): string | undefined {
  return oauthToken || process.env.GITHUB_PAT || undefined;
}

export function embedTokenInUrl(repoUrl: string, token?: string): string {
  if (!token || !repoUrl.startsWith("https://github.com/")) return repoUrl;
  return repoUrl.replace("https://github.com/", `https://x-access-token:${token}@github.com/`);
}

export async function cloneRepo(agentId: string, repoUrl: string, branch = "main", token?: string): Promise<string> {
  ensureBaseDir();
  const dest = repoPath(agentId);
  if (fs.existsSync(dest)) {
    await deleteRepo(agentId);
  }
  const effectiveToken = getGitToken(token);
  const cloneUrl = embedTokenInUrl(repoUrl, effectiveToken);
  await simpleGit().clone(cloneUrl, dest, ["--branch", branch, "--single-branch", "--depth", "1"]);
  if (effectiveToken && repoUrl.startsWith("https://github.com/")) {
    const authedUrl = embedTokenInUrl(repoUrl, effectiveToken);
    const git = simpleGit(dest);
    await git.remote(["set-url", "origin", authedUrl]);
  }
  return dest;
}

export async function pullRepo(agentId: string): Promise<string> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) throw new Error("Repo not cloned");
  const git: SimpleGit = simpleGit(dest);
  const result = await git.pull();
  return `${result.summary.changes} changes, ${result.summary.insertions} insertions, ${result.summary.deletions} deletions`;
}

export async function getStatus(agentId: string): Promise<{ modified: string[]; created: string[]; deleted: string[]; staged: string[] }> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) throw new Error("Repo not cloned");
  const git: SimpleGit = simpleGit(dest);
  const status = await git.status();
  return {
    modified: status.modified,
    created: status.created,
    deleted: status.deleted,
    staged: status.staged,
  };
}

export async function getDiff(agentId: string, staged = false): Promise<string> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) throw new Error("Repo not cloned");
  const git: SimpleGit = simpleGit(dest);
  return staged ? await git.diff(["--staged"]) : await git.diff();
}

export async function commitChanges(agentId: string, message: string): Promise<string> {
  const dest = repoPath(agentId);
  const git: SimpleGit = simpleGit(dest);
  await git.add(".");
  const result = await git.commit(message);
  return result.commit || "no changes";
}

export async function ensureRemoteAuth(agentId: string, repoUrl?: string): Promise<void> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) return;
  const token = getGitToken();
  if (!token) return;
  const git = simpleGit(dest);
  const remotes = await git.getRemotes(true);
  const origin = remotes.find(r => r.name === "origin");
  if (origin && origin.refs.push && !origin.refs.push.includes("x-access-token")) {
    const url = repoUrl || origin.refs.push;
    if (url.startsWith("https://github.com/")) {
      await git.remote(["set-url", "origin", embedTokenInUrl(url, token)]);
    }
  }
}

export async function pushChanges(agentId: string, branch?: string): Promise<void> {
  const dest = repoPath(agentId);
  const git: SimpleGit = simpleGit(dest);
  await ensureRemoteAuth(agentId);
  if (branch) {
    await git.push("origin", branch);
  } else {
    await git.push();
  }
}

export async function checkoutBranch(agentId: string, branch: string, create = false): Promise<void> {
  const dest = repoPath(agentId);
  const git: SimpleGit = simpleGit(dest);
  if (create) {
    await git.checkoutLocalBranch(branch);
  } else {
    try { await git.fetch(["--unshallow"]); } catch (e) {}
    const localBranches = await git.branchLocal();
    if (localBranches.all.includes(branch)) {
      await git.checkout(branch);
    } else {
      await git.checkout(["-b", branch, `origin/${branch}`]);
    }
  }
}

export async function getLog(agentId: string, maxCount = 20): Promise<any[]> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) throw new Error("Repo not cloned");
  const git: SimpleGit = simpleGit(dest);
  const log = await git.log({ maxCount });
  return log.all.map((e) => ({
    hash: e.hash.substring(0, 8),
    message: e.message,
    author: e.author_name,
    date: e.date,
  }));
}

export async function listBranches(agentId: string): Promise<{ current: string; all: string[]; remote: string[] }> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) throw new Error("Repo not cloned");
  const git: SimpleGit = simpleGit(dest);
  try {
    await git.remote(["set-branches", "origin", "*"]);
    await git.fetch(["origin"]);
  } catch (e) {
  }
  const summary = await git.branch(["-a"]);
  const remoteBranches = summary.all
    .filter(b => b.startsWith("remotes/origin/") && !b.includes("HEAD"))
    .map(b => b.replace("remotes/origin/", ""));
  return {
    current: summary.current,
    all: summary.all.filter(b => !b.startsWith("remotes/")),
    remote: remoteBranches,
  };
}

export async function resetToCommit(agentId: string, commitHash: string, hard = true): Promise<void> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) throw new Error("Repo not cloned");
  const git: SimpleGit = simpleGit(dest);
  await git.reset(hard ? ["--hard", commitHash] : ["--soft", commitHash]);
}

export async function stashChanges(agentId: string): Promise<string> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) throw new Error("Repo not cloned");
  const git: SimpleGit = simpleGit(dest);
  const result = await git.stash();
  return result;
}

export async function stashPop(agentId: string): Promise<string> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) throw new Error("Repo not cloned");
  const git: SimpleGit = simpleGit(dest);
  const result = await git.stash(["pop"]);
  return result;
}

export async function getCurrentBranch(agentId: string): Promise<string> {
  const dest = repoPath(agentId);
  if (!fs.existsSync(dest)) throw new Error("Repo not cloned");
  const git: SimpleGit = simpleGit(dest);
  const summary = await git.branch();
  return summary.current;
}

export async function deleteRepo(agentId: string): Promise<void> {
  const dest = repoPath(agentId);
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
}

export function getRepoDir(agentId: string): string {
  return repoPath(agentId);
}

export function isRepoCloned(agentId: string): boolean {
  return fs.existsSync(repoPath(agentId));
}
