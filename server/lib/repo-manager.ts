import { simpleGit, SimpleGit } from "simple-git";
import * as fs from "fs";
import * as path from "path";

const REPOS_BASE = path.join(process.cwd(), ".agent-repos");

function ensureBaseDir() {
  if (!fs.existsSync(REPOS_BASE)) {
    fs.mkdirSync(REPOS_BASE, { recursive: true });
  }
}

function repoPath(agentId: string): string {
  return path.join(REPOS_BASE, agentId);
}

export async function cloneRepo(agentId: string, repoUrl: string, branch = "main", token?: string): Promise<string> {
  ensureBaseDir();
  const dest = repoPath(agentId);
  if (fs.existsSync(dest)) {
    await deleteRepo(agentId);
  }
  let cloneUrl = repoUrl;
  if (token && repoUrl.startsWith("https://github.com/")) {
    cloneUrl = repoUrl.replace("https://github.com/", `https://x-access-token:${token}@github.com/`);
  }
  await simpleGit().clone(cloneUrl, dest, ["--branch", branch, "--single-branch"]);
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

export async function pushChanges(agentId: string, branch?: string): Promise<void> {
  const dest = repoPath(agentId);
  const git: SimpleGit = simpleGit(dest);
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
    await git.checkout(branch);
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
