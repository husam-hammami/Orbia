function getEnv(key: string): string {
  return process.env[key] || "";
}

export function isConfigured(): boolean {
  return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_REDIRECT_URI);
}

export function getAuthUrl(state: string): string {
  const clientId = getEnv("GITHUB_CLIENT_ID");
  const redirectUri = getEnv("GITHUB_REDIRECT_URI");
  if (!clientId) throw new Error("GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
}> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: getEnv("GITHUB_CLIENT_ID"),
      client_secret: getEnv("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: getEnv("GITHUB_REDIRECT_URI"),
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  return data;
}

export async function getGithubUser(accessToken: string): Promise<{
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
  name: string | null;
}> {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export async function listRepos(accessToken: string, page = 1, perPage = 30): Promise<any[]> {
  const res = await fetch(
    `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}&type=all`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export async function getRepo(accessToken: string, owner: string, repo: string): Promise<any> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export async function listBranches(accessToken: string, owner: string, repo: string): Promise<any[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}
