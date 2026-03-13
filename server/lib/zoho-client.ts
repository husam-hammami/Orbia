const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com/oauth/v2/token";
const ZOHO_API_BASE = "https://projectsapi.zoho.com/api/v3";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Zoho OAuth credentials not configured");
  }

  const res = await fetch(ZOHO_ACCOUNTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoho token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`Zoho token error: ${data.error}`);
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.accessToken;
}

async function zohoRequest(method: string, path: string, body?: any): Promise<any> {
  const portalId = process.env.ZOHO_PORTAL_ID || "905717188";
  const token = await getAccessToken();
  const url = `${ZOHO_API_BASE}/portal/${portalId}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    cachedToken = null;
    const retryToken = await getAccessToken();
    const retryRes = await fetch(url, {
      method,
      headers: {
        Authorization: `Zoho-oauthtoken ${retryToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!retryRes.ok) {
      const err = await retryRes.text();
      throw new Error(`Zoho API error (${retryRes.status}): ${err}`);
    }
    if (retryRes.status === 204) return null;
    return retryRes.json();
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoho API error (${res.status}): ${err}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function getZohoStatus(): Promise<{ configured: boolean }> {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  return { configured: !!(clientId && clientSecret && refreshToken) };
}

export async function getProjects(): Promise<any> {
  return zohoRequest("GET", "/projects?status=active");
}

export async function getTasklists(projectId: string): Promise<any> {
  return zohoRequest("GET", `/projects/${projectId}/tasklists`);
}

export async function getTasks(projectId: string, params?: { status?: string; tasklist?: string }): Promise<any> {
  const query = new URLSearchParams();
  query.set("range", "1-100");
  if (params?.status) {
    if (params.status === "overdue") {
      query.set("status", "open");
    } else {
      query.set("status", params.status);
    }
  }
  if (params?.tasklist) query.set("tasklist_id", params.tasklist);

  return zohoRequest("GET", `/projects/${projectId}/tasks?${query.toString()}`);
}

export async function createTask(projectId: string, taskData: {
  name: string;
  tasklist?: { id: string };
  description?: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  person_responsible?: string;
}): Promise<any> {
  return zohoRequest("POST", `/projects/${projectId}/tasks`, taskData);
}

export async function updateTask(projectId: string, taskId: string, taskData: {
  name?: string;
  description?: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  person_responsible?: string;
  status?: { id: string };
}): Promise<any> {
  return zohoRequest("PUT", `/projects/${projectId}/tasks/${taskId}`, taskData);
}

export async function getProjectMembers(projectId: string): Promise<any> {
  return zohoRequest("GET", `/projects/${projectId}/users`);
}
